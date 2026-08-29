// --- FULLY DYNAMIC STATE DIAGRAM VISUALIZER ---
MultiDiagramVisualizer.register('statediagram', function(code, nodesLayer, edgesLayer, isDark) {
  const primaryText = isDark ? '#FFFFFF' : '#1F2937';
  const textColor = isDark ? '#E0E0E0' : '#374151';
  const cardBg = isDark ? '#262A36' : '#EEF2FF';
  const cardBorder = isDark ? '#757575' : '#333333';
  const activeHeaderBg = isDark ? '#2D2D2D' : '#F3F4F6';
  const linkColor = isDark ? '#90CAF9' : '#333333';
  const selTitle = (typeof AppController !== 'undefined' && AppController.instance && AppController.instance.selectedVisualObject) ? AppController.instance.selectedVisualObject.title : null;
  const selGlow = 'drop-shadow(0 0 6px rgba(33, 150, 243, 0.8))';

  // 1. DYNAMIC PARSER FOR STATE DIAGRAM
  const rawLines = (code || '').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('%%') && !l.startsWith('stateDiagram'));

  const containers = [];
  let curContainer = null;
  let curRegionIdx = 0;
  const rawTransitions = [];
  const choiceStates = new Set();
  const forkStates = new Set();
  const joinStates = new Set();
  const customStates = new Map(); // id -> { id, label, desc, type, containerId, regionIdx }

  const ensureState = (id, label = null, desc = null) => {
    if (!id || id === '[*]') return null;
    const cleanId = id.replace(/^[<"']|[>"']$/g, '').trim();
    if (!cleanId) return null;
    if (!customStates.has(cleanId)) {
      customStates.set(cleanId, {
        id: cleanId,
        label: label || cleanId,
        desc: desc || '',
        type: 'state',
        containerId: curContainer ? curContainer.id : null,
        regionIdx: curContainer ? curRegionIdx : null
      });
    } else {
      const s = customStates.get(cleanId);
      if (label && s.label === s.id) s.label = label;
      if (desc && !s.desc) s.desc = desc;
      if (curContainer && !s.containerId) {
        s.containerId = curContainer.id;
        s.regionIdx = curRegionIdx;
      }
    }
    return customStates.get(cleanId);
  };

  rawLines.forEach(line => {
    const choiceM = line.match(/^state\s+([A-Za-z0-9_]+)\s*<<choice>>/i);
    if (choiceM) {
      choiceStates.add(choiceM[1]);
      const s = ensureState(choiceM[1]);
      if (s) s.type = 'choice';
      return;
    }

    const forkM = line.match(/^state\s+([A-Za-z0-9_]+)\s*<<fork>>/i);
    if (forkM) {
      forkStates.add(forkM[1]);
      const s = ensureState(forkM[1]);
      if (s) s.type = 'fork';
      return;
    }

    const joinM = line.match(/^state\s+([A-Za-z0-9_]+)\s*<<join>>/i);
    if (joinM) {
      joinStates.add(joinM[1]);
      const s = ensureState(joinM[1]);
      if (s) s.type = 'join';
      return;
    }

    const startCompM = line.match(/^state\s+([A-Za-z0-9_]+)\s*\{/i);
    if (startCompM) {
      curContainer = {
        id: startCompM[1],
        label: startCompM[1],
        regions: [[]]
      };
      containers.push(curContainer);
      curRegionIdx = 0;
      return;
    }

    if (line === '--') {
      if (curContainer) {
        curContainer.regions.push([]);
        curRegionIdx = curContainer.regions.length - 1;
      }
      return;
    }

    if (line === '}') {
      curContainer = null;
      return;
    }

    // State declaration with description: state "Desc" as State1 or State1 : Desc
    const descAsM = line.match(/^state\s+"([^"]+)"\s+as\s+([A-Za-z0-9_]+)/i);
    if (descAsM) {
      ensureState(descAsM[2], descAsM[1], descAsM[1]);
      return;
    }

    const colonDescM = line.match(/^([A-Za-z0-9_]+)\s*:\s*(.+)$/);
    if (colonDescM && !line.includes('-->')) {
      ensureState(colonDescM[1], colonDescM[1], colonDescM[2].trim());
      return;
    }

    const simpleStateM = line.match(/^state\s+([A-Za-z0-9_]+)$/i);
    if (simpleStateM) {
      ensureState(simpleStateM[1]);
      return;
    }

    // Transitions: e.g. [*] --> State1 or State1 --> State2 : label or State2 --> [*]
    const transM = line.match(/^(\[\*\]|[A-Za-z0-9_]+)\s*-->\s*(\[\*\]|[A-Za-z0-9_]+)(?:\s*:\s*(.+))?$/);
    if (transM) {
      const src = transM[1];
      const tgt = transM[2];
      const label = transM[3] ? transM[3].trim() : '';

      if (src !== '[*]') ensureState(src);
      if (tgt !== '[*]') ensureState(tgt);

      rawTransitions.push({
        src,
        tgt,
        label,
        containerId: curContainer ? curContainer.id : null,
        regionIdx: curContainer ? curRegionIdx : null
      });

      if (curContainer) {
        if (src !== '[*]' && !curContainer.regions[curRegionIdx].includes(src)) {
          curContainer.regions[curRegionIdx].push(src);
        }
        if (tgt !== '[*]' && !curContainer.regions[curRegionIdx].includes(tgt)) {
          curContainer.regions[curRegionIdx].push(tgt);
        }
      }
    }
  });

  // 2. DYNAMIC NODE AND POSITION MAPPING
  const stateDefs = [];
  const transitions = [];

  // Check if standard template states exist
  const hasPowerTemplate = customStates.has('PowerOn') && customStates.has('battery_check');

  if (hasPowerTemplate) {
    // Reference Template Base
    stateDefs.push({ id: 'start_main', type: 'start', label: '●', defaultX: 334, defaultY: 40, w: 32, h: 32, defaultFill: '#333333', defaultBorder: '#1F2937', defaultFont: '#FFFFFF' });
    stateDefs.push({ id: 'PowerOn', type: 'state', label: 'PowerOn', defaultX: 270, defaultY: 110, w: 160, h: 44, defaultFill: cardBg, defaultBorder: cardBorder, defaultFont: primaryText });
    stateDefs.push({ id: 'battery_check', type: 'state', label: 'battery_check', defaultX: 245, defaultY: 190, w: 210, h: 44, defaultFill: cardBg, defaultBorder: cardBorder, defaultFont: primaryText });

    if (customStates.has('LowPowerMode')) {
      stateDefs.push({ id: 'LowPowerMode', type: 'state', label: 'LowPowerMode', defaultX: 40, defaultY: 320, w: 180, h: 44, defaultFill: cardBg, defaultBorder: cardBorder, defaultFont: primaryText });
      stateDefs.push({ id: 'end_lowpower', type: 'end', label: '◉', defaultX: 114, defaultY: 480, w: 32, h: 32, defaultFill: '#333333', defaultBorder: cardBorder, defaultFont: '#FFFFFF' });
    }

    const compId = containers.length > 0 ? containers[0].id : 'Active';
    stateDefs.push({ id: compId, type: 'composite', label: compId, defaultX: 285, defaultY: 320, w: 460, h: 380, defaultFill: cardBg, defaultBorder: cardBorder, defaultFont: primaryText });

    const reg1States = (containers.length > 0 && containers[0].regions.length > 1) ? containers[0].regions[1] : ['ScreenOn', 'ScreenDimmed'];
    const s1_1 = reg1States[0] || 'ScreenOn';
    const s1_2 = reg1States[1] || 'ScreenDimmed';

    stateDefs.push({ id: `active_start_${s1_1}`, type: 'start', label: '●', defaultX: 399, defaultY: 395, w: 32, h: 32, defaultFill: '#333333', defaultBorder: '#1F2937', defaultFont: '#FFFFFF' });
    stateDefs.push({ id: s1_1, type: 'state', label: s1_1, defaultX: 335, defaultY: 460, w: 160, h: 44, defaultFill: cardBg, defaultBorder: cardBorder, defaultFont: primaryText });
    stateDefs.push({ id: s1_2, type: 'state', label: s1_2, defaultX: 315, defaultY: 620, w: 200, h: 44, defaultFill: cardBg, defaultBorder: cardBorder, defaultFont: primaryText });

    const reg0States = (containers.length > 0 && containers[0].regions.length > 0) ? containers[0].regions[0] : ['Playing', 'Paused'];
    const s0_1 = reg0States[0] || 'Playing';
    const s0_2 = reg0States[1] || 'Paused';

    stateDefs.push({ id: `active_start_${s0_1}`, type: 'start', label: '●', defaultX: 609, defaultY: 395, w: 32, h: 32, defaultFill: '#333333', defaultBorder: '#1F2937', defaultFont: '#FFFFFF' });
    stateDefs.push({ id: s0_1, type: 'state', label: s0_1, defaultX: 550, defaultY: 460, w: 150, h: 44, defaultFill: cardBg, defaultBorder: cardBorder, defaultFont: primaryText });
    stateDefs.push({ id: s0_2, type: 'state', label: s0_2, defaultX: 550, defaultY: 620, w: 150, h: 44, defaultFill: cardBg, defaultBorder: cardBorder, defaultFont: primaryText });

    stateDefs.push({ id: 'end_active', type: 'end', label: '◉', defaultX: 499, defaultY: 770, w: 32, h: 32, defaultFill: '#333333', defaultBorder: cardBorder, defaultFont: '#FFFFFF' });
  }

  // Dynamic Auto-Layout for ALL user-defined / extra states
  const existingIds = new Set(stateDefs.map(s => s.id));
  const unpositionedStates = Array.from(customStates.values()).filter(s => !existingIds.has(s.id));

  if (unpositionedStates.length > 0) {
    let currentY = hasPowerTemplate ? 840 : 120;
    if (!hasPowerTemplate) {
      stateDefs.push({ id: 'start_main', type: 'start', label: '●', defaultX: 360, defaultY: 40, w: 32, h: 32, defaultFill: '#333333', defaultBorder: '#1F2937', defaultFont: '#FFFFFF' });
    }

    // Rank layout for new states
    const numCols = 3;
    unpositionedStates.forEach((s, idx) => {
      const col = idx % numCols;
      const row = Math.floor(idx / numCols);
      const posX = 100 + col * 240;
      const posY = currentY + row * 110;
      const w = Math.max(150, (s.label || s.id).length * 8 + 36);

      stateDefs.push({
        id: s.id,
        type: s.type || 'state',
        label: s.label || s.id,
        desc: s.desc || '',
        defaultX: posX,
        defaultY: posY,
        w: s.type === 'choice' ? 44 : w,
        h: s.type === 'choice' ? 44 : 44,
        defaultFill: cardBg,
        defaultBorder: cardBorder,
        defaultFont: primaryText
      });
    });
  }

  // Map of all resolved nodes
  const nodeMap = new Map();
  stateDefs.forEach(s => nodeMap.set(s.id, s));

  // Connect transitions dynamically
  rawTransitions.forEach(tr => {
    let fromId = tr.src;
    let toId = tr.tgt;
    let kind = 'straight';

    if (tr.src === '[*]') {
      if (tr.containerId) {
        fromId = `active_start_${tr.tgt}`;
      } else {
        fromId = 'start_main';
      }
    }

    if (tr.tgt === '[*]') {
      if (tr.src === 'LowPowerMode') {
        toId = 'end_lowpower';
      } else if (tr.src === 'Active' || tr.containerId) {
        toId = 'end_active';
      } else {
        // Create end state if not exists
        const endId = `end_${tr.src}`;
        if (!nodeMap.has(endId)) {
          const srcNode = nodeMap.get(fromId);
          const endX = srcNode ? srcNode.defaultX + srcNode.w / 2 - 16 : 360;
          const endY = srcNode ? srcNode.defaultY + 100 : 400;
          const endNode = { id: endId, type: 'end', label: '◉', defaultX: endX, defaultY: endY, w: 32, h: 32, defaultFill: '#333333', defaultBorder: cardBorder, defaultFont: '#FFFFFF' };
          stateDefs.push(endNode);
          nodeMap.set(endId, endNode);
        }
        toId = endId;
      }
    }

    // Determine curve style
    if (fromId === 'battery_check' && toId === 'LowPowerMode') kind = 'branch_left';
    else if (fromId === 'battery_check' && toId === 'Active') kind = 'branch_right';
    else if (fromId === 'ScreenOn' && toId === 'ScreenDimmed') kind = 'col_down_right';
    else if (fromId === 'ScreenDimmed' && toId === 'ScreenOn') kind = 'col_up_left';
    else if (fromId === 'Playing' && toId === 'Paused') kind = 'col_down_right';
    else if (fromId === 'Paused' && toId === 'Playing') kind = 'col_up_left';

    transitions.push({
      from: fromId,
      to: toId,
      label: tr.label,
      kind
    });
  });

  const compositeNode = stateDefs.find(s => s.type === 'composite');
  const normalNodes = stateDefs.filter(s => s.type !== 'composite');

  // 3. RENDER COMPOSITE CONTAINER (in edgesLayer at bottom)
  if (compositeNode) {
    const pos = MultiDiagramVisualizer.getPosition(compositeNode.id, compositeNode.defaultX, compositeNode.defaultY);
    const fillColor = MultiDiagramVisualizer.getColor(compositeNode.id, compositeNode.defaultFill);
    const fontColor = MultiDiagramVisualizer.getColor(`${compositeNode.id}_font`, compositeNode.defaultFont);
    const borderColor = MultiDiagramVisualizer.getColor(`${compositeNode.id}_border`, compositeNode.defaultBorder);
    const isSelected = (compositeNode.label === selTitle || compositeNode.id === selTitle);

    const compG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    compG.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
    compG.style.cursor = 'grab';

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', `${compositeNode.w}`);
    rect.setAttribute('height', `${compositeNode.h}`);
    rect.setAttribute('rx', '8');
    rect.setAttribute('fill', fillColor);
    rect.setAttribute('stroke', isSelected ? 'var(--selection-color)' : borderColor);
    rect.setAttribute('stroke-width', isSelected ? '2.5' : '1.5');
    if (isSelected) rect.style.filter = selGlow;
    compG.appendChild(rect);

    // Header container title
    const headerRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    headerRect.setAttribute('x', '0');
    headerRect.setAttribute('y', '0');
    headerRect.setAttribute('width', `${compositeNode.w}`);
    headerRect.setAttribute('height', '36');
    headerRect.setAttribute('rx', '8');
    headerRect.setAttribute('fill', activeHeaderBg);
    compG.appendChild(headerRect);

    const titleTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    titleTxt.setAttribute('x', `${compositeNode.w / 2}`);
    titleTxt.setAttribute('y', '23');
    titleTxt.setAttribute('text-anchor', 'middle');
    titleTxt.setAttribute('fill', fontColor);
    titleTxt.setAttribute('font-size', '14px');
    titleTxt.setAttribute('font-weight', 'bold');
    titleTxt.textContent = compositeNode.label;
    compG.appendChild(titleTxt);

    // Dashed divider line for concurrent sub-regions
    const divider = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    divider.setAttribute('x1', `${compositeNode.w / 2}`);
    divider.setAttribute('y1', '36');
    divider.setAttribute('x2', `${compositeNode.w / 2}`);
    divider.setAttribute('y2', `${compositeNode.h}`);
    divider.setAttribute('stroke', borderColor);
    divider.setAttribute('stroke-width', '1.5');
    divider.setAttribute('stroke-dasharray', '5 4');
    compG.appendChild(divider);

    MultiDiagramVisualizer.makeDraggable(
      compG,
      compositeNode.id,
      () => MultiDiagramVisualizer.getPosition(compositeNode.id, compositeNode.defaultX, compositeNode.defaultY),
      (nx, ny) => MultiDiagramVisualizer.setPosition(compositeNode.id, nx, ny)
    );

    compG.addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof AppController !== 'undefined' && AppController.instance) {
        AppController.instance.selectVisualObject({
          type: 'Composite State Container',
          title: compositeNode.label,
          fields: [
            { key: 'label', label: 'Container Label', type: 'text', value: compositeNode.label },
            { key: 'font', label: '1. Header Text Color', type: 'color', value: fontColor },
            { key: 'fill', label: '2. Container Background', type: 'color', value: fillColor },
            { key: 'border', label: '3. Border Stroke Color', type: 'color', value: borderColor }
          ],
          onSave: (vals) => {
            MultiDiagramVisualizer.setColor(compositeNode.id, vals.fill);
            MultiDiagramVisualizer.setColor(`${compositeNode.id}_font`, vals.font);
            MultiDiagramVisualizer.setColor(`${compositeNode.id}_border`, vals.border);
            MultiDiagramVisualizer.syncColorToCode(compositeNode.id, vals.fill);
            MultiDiagramVisualizer.syncColorToCode(`${compositeNode.id}_font`, vals.font);
            MultiDiagramVisualizer.syncColorToCode(`${compositeNode.id}_border`, vals.border);
          }
        });
      }
    });

    edgesLayer.appendChild(compG);
  }

  // 4. RENDER TRANSITION ARROWS AND LABELS
  transitions.forEach((tr, trIdx) => {
    const fromNode = stateDefs.find(s => s.id === tr.from);
    const toNode = stateDefs.find(s => s.id === tr.to);
    if (!fromNode || !toNode) return;

    const fromPos = MultiDiagramVisualizer.getPosition(fromNode.id, fromNode.defaultX, fromNode.defaultY);
    const toPos = MultiDiagramVisualizer.getPosition(toNode.id, toNode.defaultX, toNode.defaultY);

    const fromCenterX = fromPos.x + fromNode.w / 2;
    const fromCenterY = fromPos.y + fromNode.h / 2;
    const toCenterX = toPos.x + toNode.w / 2;
    const toCenterY = toPos.y + toNode.h / 2;

    const linkKey = `trans_${tr.from}_to_${tr.to}_${trIdx}`;
    const linkTitle = tr.label ? `${tr.from} → ${tr.to} (${tr.label})` : `${tr.from} → ${tr.to}`;
    const isTransSel = (selTitle === linkTitle || selTitle === linkKey);

    const tColor = MultiDiagramVisualizer.getColor(linkKey, linkColor);
    const tWidth = MultiDiagramVisualizer.getColor(`${linkKey}_width`, '1.5');
    const tStyle = MultiDiagramVisualizer.getColor(`${linkKey}_style`, 'solid');

    let pathD;
    let labelPos = { x: (fromCenterX + toCenterX) / 2, y: (fromCenterY + toCenterY) / 2 };

    if (tr.kind === 'branch_left') {
      const startX = fromPos.x + 30;
      const startY = fromPos.y + fromNode.h;
      const endX = toCenterX;
      const endY = toPos.y;
      pathD = `M ${startX} ${startY} C ${startX} ${startY + 60}, ${endX} ${startY + 20}, ${endX} ${endY - 6}`;
      labelPos = { x: (startX + endX) / 2 - 25, y: startY + 40 };
    } else if (tr.kind === 'branch_right') {
      const startX = fromPos.x + fromNode.w - 30;
      const startY = fromPos.y + fromNode.h;
      const endX = toCenterX;
      const endY = toPos.y;
      pathD = `M ${startX} ${startY} C ${startX} ${startY + 60}, ${endX} ${startY + 20}, ${endX} ${endY - 6}`;
      labelPos = { x: (startX + endX) / 2 + 25, y: startY + 40 };
    } else if (tr.kind === 'col_down_right') {
      const startX = fromPos.x + fromNode.w - 20;
      const startY = fromPos.y + fromNode.h;
      const endX = toPos.x + toNode.w - 20;
      const endY = toPos.y;
      pathD = `M ${startX} ${startY} C ${startX + 50} ${startY + 40}, ${endX + 50} ${endY - 40}, ${endX} ${endY - 6}`;
      labelPos = { x: startX + 50, y: (startY + endY) / 2 };
    } else if (tr.kind === 'col_up_left') {
      const startX = toPos.x + 20;
      const startY = toPos.y + toNode.h;
      const endX = fromPos.x + 20;
      const endY = fromPos.y;
      pathD = `M ${startX} ${startY} C ${startX - 50} ${startY - 40}, ${endX - 50} ${endY + 40}, ${endX} ${endY + 6}`;
      labelPos = { x: startX - 45, y: (startY + endY) / 2 };
    } else {
      // General Dynamic Connection
      if (toCenterY > fromCenterY + 40) {
        // Vertical Top to Bottom
        const startX = fromCenterX;
        const startY = fromPos.y + fromNode.h;
        const endX = toCenterX;
        const endY = toPos.y;
        const midY = (startY + endY) / 2;
        pathD = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY - 6}`;
        labelPos = { x: (startX + endX) / 2, y: midY - 6 };
      } else if (fromCenterY > toCenterY + 40) {
        // Vertical Bottom to Top
        const startX = fromCenterX;
        const startY = fromPos.y;
        const endX = toCenterX;
        const endY = toPos.y + toNode.h;
        const midY = (startY + endY) / 2;
        pathD = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY + 6}`;
        labelPos = { x: (startX + endX) / 2, y: midY - 6 };
      } else {
        // Horizontal Left / Right
        const isLeft = fromCenterX > toCenterX;
        const startX = isLeft ? fromPos.x : fromPos.x + fromNode.w;
        const startY = fromCenterY;
        const endX = isLeft ? toPos.x + toNode.w : toPos.x;
        const endY = toCenterY;
        const midX = (startX + endX) / 2;
        pathD = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${isLeft ? endX + 6 : endX - 6} ${endY}`;
        labelPos = { x: midX, y: (startY + endY) / 2 - 10 };
      }
    }

    const transG = document.createElementNS('http://www.w3.org/2000/svg', 'g');

    // Click Hitbox
    const hitbox = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hitbox.setAttribute('d', pathD);
    hitbox.setAttribute('fill', 'none');
    hitbox.setAttribute('stroke', 'transparent');
    hitbox.setAttribute('stroke-width', '24');
    hitbox.style.cursor = 'pointer';
    transG.appendChild(hitbox);

    // Visible Path
    const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathEl.setAttribute('d', pathD);
    pathEl.setAttribute('fill', 'none');
    pathEl.setAttribute('stroke', isTransSel ? 'var(--selection-color)' : tColor);
    pathEl.setAttribute('stroke-width', isTransSel ? `${parseFloat(tWidth) + 1.2}` : tWidth);
    if (tStyle === 'dashed') pathEl.setAttribute('stroke-dasharray', '5 4');
    else if (tStyle === 'dotted') pathEl.setAttribute('stroke-dasharray', '2 3');
    pathEl.setAttribute('marker-end', 'url(#marker-arrow)');
    if (isTransSel) pathEl.style.filter = selGlow;
    transG.appendChild(pathEl);

    // Condition / Label Badge
    if (tr.label) {
      const lblG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      lblG.style.cursor = 'pointer';

      const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      textEl.setAttribute('x', `${labelPos.x}`);
      textEl.setAttribute('y', `${labelPos.y}`);
      textEl.setAttribute('text-anchor', 'middle');
      textEl.setAttribute('dominant-baseline', 'central');
      textEl.setAttribute('fill', isDark ? '#90CAF9' : '#1976D2');
      textEl.setAttribute('font-size', '11px');
      textEl.setAttribute('font-weight', '600');
      textEl.textContent = tr.label;

      const badgeW = tr.label.length * 6.5 + 14;
      const badgeH = 20;

      const badgeBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      badgeBg.setAttribute('x', `${labelPos.x - badgeW / 2}`);
      badgeBg.setAttribute('y', `${labelPos.y - badgeH / 2}`);
      badgeBg.setAttribute('width', `${badgeW}`);
      badgeBg.setAttribute('height', `${badgeH}`);
      badgeBg.setAttribute('rx', '4');
      badgeBg.setAttribute('fill', isDark ? '#1E293B' : '#F1F5F9');
      badgeBg.setAttribute('stroke', isDark ? '#475569' : '#CBD5E1');
      badgeBg.setAttribute('stroke-width', '1');

      lblG.appendChild(badgeBg);
      lblG.appendChild(textEl);
      transG.appendChild(lblG);
    }

    transG.addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof AppController !== 'undefined' && AppController.instance) {
        AppController.instance.selectVisualObject({
          type: 'State Transition',
          title: linkTitle,
          fields: [
            { key: 'label', label: 'Condition / Label', type: 'text', value: tr.label || '' },
            { key: 'color', label: '1. Line & Arrow Color', type: 'color', value: tColor },
            { key: 'width', label: '2. Line Thickness', type: 'select', value: tWidth, options: [
                { value: '1.2', label: 'Thin (1.2px)' },
                { value: '1.5', label: 'Medium (1.5px - Default)' },
                { value: '2.2', label: 'Thick (2.2px)' }
            ]},
            { key: 'style', label: '3. Line Dash Style', type: 'select', value: tStyle, options: [
                { value: 'solid', label: 'Solid (──────)' },
                { value: 'dashed', label: 'Dashed (– – – –)' },
                { value: 'dotted', label: 'Dotted (········)' }
            ]}
          ],
          onSave: (vals) => {
            MultiDiagramVisualizer.setColor(linkKey, vals.color);
            MultiDiagramVisualizer.setColor(`${linkKey}_width`, vals.width);
            MultiDiagramVisualizer.setColor(`${linkKey}_style`, vals.style);
            MultiDiagramVisualizer.syncColorToCode(linkKey, vals.color);
            if (vals.label !== (tr.label || '')) {
              MultiDiagramVisualizer.updateCodeLine((curCode) => {
                const lines = curCode.split('\n');
                for (let i = 0; i < lines.length; i++) {
                  if (lines[i].includes(tr.from) && lines[i].includes('-->') && lines[i].includes(tr.to)) {
                    const lead = lines[i].match(/^\s*/)[0] || '    ';
                    lines[i] = vals.label ? `${lead}${tr.from} --> ${tr.to} : ${vals.label}` : `${lead}${tr.from} --> ${tr.to}`;
                    break;
                  }
                }
                return lines.join('\n');
              });
            }
          }
        });
      }
    });

    edgesLayer.appendChild(transG);
  });

  // 5. RENDER ALL NORMAL STATES, CHOICES, FORKS, STARTS & ENDS
  normalNodes.forEach(node => {
    const pos = MultiDiagramVisualizer.getPosition(node.id, node.defaultX, node.defaultY);
    const fillColor = MultiDiagramVisualizer.getColor(node.id, node.defaultFill);
    const fontColor = MultiDiagramVisualizer.getColor(`${node.id}_font`, node.defaultFont);
    const borderColor = MultiDiagramVisualizer.getColor(`${node.id}_border`, node.defaultBorder);

    const isSelected = (node.label === selTitle || node.id === selTitle);
    const nodeG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    nodeG.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
    nodeG.style.cursor = 'grab';

    if (node.type === 'start') {
      // Start State (Solid filled circle)
      const circ = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circ.setAttribute('cx', `${node.w / 2}`);
      circ.setAttribute('cy', `${node.h / 2}`);
      circ.setAttribute('r', '14');
      circ.setAttribute('fill', fillColor);
      circ.setAttribute('stroke', isSelected ? 'var(--selection-color)' : borderColor);
      circ.setAttribute('stroke-width', isSelected ? '2.5' : '1.5');
      if (isSelected) circ.style.filter = selGlow;
      nodeG.appendChild(circ);
    } else if (node.type === 'end') {
      // End State (Double bullseye circle)
      const outer = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      outer.setAttribute('cx', `${node.w / 2}`);
      outer.setAttribute('cy', `${node.h / 2}`);
      outer.setAttribute('r', '14');
      outer.setAttribute('fill', isDark ? '#1E293B' : '#FFFFFF');
      outer.setAttribute('stroke', isSelected ? 'var(--selection-color)' : borderColor);
      outer.setAttribute('stroke-width', isSelected ? '2.5' : '1.5');
      if (isSelected) outer.style.filter = selGlow;
      nodeG.appendChild(outer);

      const inner = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      inner.setAttribute('cx', `${node.w / 2}`);
      inner.setAttribute('cy', `${node.h / 2}`);
      inner.setAttribute('r', '8');
      inner.setAttribute('fill', fillColor);
      nodeG.appendChild(inner);
    } else if (node.type === 'choice') {
      // Choice State (Diamond)
      const diam = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      const hw = node.w / 2;
      const hh = node.h / 2;
      diam.setAttribute('points', `${hw},0 ${node.w},${hh} ${hw},${node.h} 0,${hh}`);
      diam.setAttribute('fill', fillColor);
      diam.setAttribute('stroke', isSelected ? 'var(--selection-color)' : borderColor);
      diam.setAttribute('stroke-width', isSelected ? '2.5' : '1.5');
      if (isSelected) diam.style.filter = selGlow;
      nodeG.appendChild(diam);
    } else {
      // Standard Rounded State Box
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('width', `${node.w}`);
      rect.setAttribute('height', `${node.h}`);
      rect.setAttribute('rx', '8');
      rect.setAttribute('fill', fillColor);
      rect.setAttribute('stroke', isSelected ? 'var(--selection-color)' : borderColor);
      rect.setAttribute('stroke-width', isSelected ? '2.5' : '1.5');
      if (isSelected) rect.style.filter = selGlow;
      nodeG.appendChild(rect);

      const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      txt.setAttribute('x', `${node.w / 2}`);
      txt.setAttribute('y', `${node.h / 2}`);
      txt.setAttribute('text-anchor', 'middle');
      txt.setAttribute('dominant-baseline', 'central');
      txt.setAttribute('fill', fontColor);
      txt.setAttribute('font-size', '13.5px');
      txt.setAttribute('font-weight', '500');
      txt.textContent = node.label;
      nodeG.appendChild(txt);
    }

    MultiDiagramVisualizer.makeDraggable(
      nodeG,
      node.id,
      () => MultiDiagramVisualizer.getPosition(node.id, node.defaultX, node.defaultY),
      (nx, ny) => MultiDiagramVisualizer.setPosition(node.id, nx, ny)
    );

    nodeG.addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof AppController !== 'undefined' && AppController.instance) {
        AppController.instance.selectVisualObject({
          type: 'State Node',
          title: node.label,
          fields: [
            { key: 'label', label: 'State Name', type: 'text', value: node.label },
            { key: 'font', label: '1. Font / Text Color', type: 'color', value: fontColor },
            { key: 'fill', label: '2. Node Fill Color', type: 'color', value: fillColor },
            { key: 'border', label: '3. Border Stroke Color', type: 'color', value: borderColor }
          ],
          onSave: (vals) => {
            MultiDiagramVisualizer.setColor(node.id, vals.fill);
            MultiDiagramVisualizer.setColor(`${node.id}_font`, vals.font);
            MultiDiagramVisualizer.setColor(`${node.id}_border`, vals.border);
            MultiDiagramVisualizer.syncColorToCode(node.id, vals.fill);
            MultiDiagramVisualizer.syncColorToCode(`${node.id}_font`, vals.font);
            MultiDiagramVisualizer.syncColorToCode(`${node.id}_border`, vals.border);
          }
        });
      }
    });

    nodesLayer.appendChild(nodeG);
  });
});
MultiDiagramVisualizer.register('stateDiagram', MultiDiagramVisualizer.renderers.get('statediagram'));
MultiDiagramVisualizer.register('stateDiagram-v2', MultiDiagramVisualizer.renderers.get('statediagram'));
MultiDiagramVisualizer.register('statediagram-v2', MultiDiagramVisualizer.renderers.get('statediagram'));
