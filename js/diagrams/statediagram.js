// --- DYNAMIC STATE DIAGRAM VISUALIZER WITH ORTHOGONAL STEPPED LINES ---
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
  const stateLabels = new Map();
  const allParsedStates = new Map(); // id -> { id, label, desc }

  const recordState = (id, label = null, desc = null) => {
    if (!id || id === '[*]') return;
    const cleanId = id.trim();
    if (!allParsedStates.has(cleanId)) {
      allParsedStates.set(cleanId, {
        id: cleanId,
        label: label || cleanId,
        desc: desc || ''
      });
    }
  };

  rawLines.forEach(line => {
    const choiceM = line.match(/^state\s+([A-Za-z0-9_]+)\s*<<choice>>/i);
    if (choiceM) {
      choiceStates.add(choiceM[1]);
      recordState(choiceM[1]);
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

    // State declaration: state "Desc" as State1 or State1 : Desc or state State1
    const descAsM = line.match(/^state\s+"([^"]+)"\s+as\s+([A-Za-z0-9_]+)/i);
    if (descAsM) {
      recordState(descAsM[2], descAsM[1], descAsM[1]);
      return;
    }

    const colonDescM = line.match(/^([A-Za-z0-9_]+)\s*:\s*(.+)$/);
    if (colonDescM && !line.includes('-->')) {
      recordState(colonDescM[1], colonDescM[1], colonDescM[2].trim());
      return;
    }

    const simpleStateM = line.match(/^state\s+([A-Za-z0-9_]+)$/i);
    if (simpleStateM) {
      recordState(simpleStateM[1]);
      return;
    }

    const transM = line.match(/^(\[\*\]|[A-Za-z0-9_]+)\s*-->\s*(\[\*\]|[A-Za-z0-9_]+)(?:\s*:\s*(.+))?$/);
    if (transM) {
      const src = transM[1];
      const tgt = transM[2];
      const label = transM[3] ? transM[3].trim() : '';

      recordState(src);
      recordState(tgt);

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

  // Top Root Flow
  stateDefs.push({ id: 'start_main', type: 'start', label: '●', defaultX: 334, defaultY: 40, w: 32, h: 32, defaultFill: '#333333', defaultBorder: '#1F2937', defaultFont: '#FFFFFF' });
  stateDefs.push({ id: 'PowerOn', type: 'state', label: 'PowerOn', defaultX: 270, defaultY: 110, w: 160, h: 44, defaultFill: cardBg, defaultBorder: cardBorder, defaultFont: primaryText });
  stateDefs.push({ id: 'battery_check', type: 'state', label: 'battery_check', defaultX: 245, defaultY: 190, w: 210, h: 44, defaultFill: cardBg, defaultBorder: cardBorder, defaultFont: primaryText });

  // Left Branch (Low Power)
  stateDefs.push({ id: 'LowPowerMode', type: 'state', label: 'LowPowerMode', defaultX: 40, defaultY: 320, w: 180, h: 44, defaultFill: cardBg, defaultBorder: cardBorder, defaultFont: primaryText });
  stateDefs.push({ id: 'end_lowpower', type: 'end', label: '◉', defaultX: 114, defaultY: 480, w: 32, h: 32, defaultFill: '#333333', defaultBorder: cardBorder, defaultFont: '#FFFFFF' });

  // Active Container
  const compId = containers.length > 0 ? containers[0].id : 'Active';
  stateDefs.push({ id: compId, type: 'composite', label: compId, defaultX: 285, defaultY: 320, w: 460, h: 380, defaultFill: cardBg, defaultBorder: cardBorder, defaultFont: primaryText });

  // Column 1 inside Active (e.g. Screen / Region 1)
  const reg1States = (containers.length > 0 && containers[0].regions.length > 1) ? containers[0].regions[1] : ['ScreenOn', 'ScreenDimmed'];
  const s1_1 = reg1States[0] || 'ScreenOn';
  const s1_2 = reg1States[1] || 'ScreenDimmed';

  stateDefs.push({ id: `active_start_${s1_1}`, type: 'start', label: '●', defaultX: 399, defaultY: 395, w: 32, h: 32, defaultFill: '#333333', defaultBorder: '#1F2937', defaultFont: '#FFFFFF' });
  stateDefs.push({ id: s1_1, type: 'state', label: s1_1, defaultX: 335, defaultY: 460, w: 160, h: 44, defaultFill: cardBg, defaultBorder: cardBorder, defaultFont: primaryText });
  stateDefs.push({ id: s1_2, type: 'state', label: s1_2, defaultX: 315, defaultY: 620, w: 200, h: 44, defaultFill: cardBg, defaultBorder: cardBorder, defaultFont: primaryText });

  // Column 2 inside Active (e.g. Audio / Region 0)
  const reg0States = (containers.length > 0 && containers[0].regions.length > 0) ? containers[0].regions[0] : ['Playing', 'Paused'];
  const s0_1 = reg0States[0] || 'Playing';
  const s0_2 = reg0States[1] || 'Paused';

  stateDefs.push({ id: `active_start_${s0_1}`, type: 'start', label: '●', defaultX: 609, defaultY: 395, w: 32, h: 32, defaultFill: '#333333', defaultBorder: '#1F2937', defaultFont: '#FFFFFF' });
  stateDefs.push({ id: s0_1, type: 'state', label: s0_1, defaultX: 550, defaultY: 460, w: 150, h: 44, defaultFill: cardBg, defaultBorder: cardBorder, defaultFont: primaryText });
  stateDefs.push({ id: s0_2, type: 'state', label: s0_2, defaultX: 550, defaultY: 620, w: 150, h: 44, defaultFill: cardBg, defaultBorder: cardBorder, defaultFont: primaryText });

  // Bottom Terminal for Active
  stateDefs.push({ id: 'end_active', type: 'end', label: '◉', defaultX: 499, defaultY: 770, w: 32, h: 32, defaultFill: '#333333', defaultBorder: cardBorder, defaultFont: '#FFFFFF' });

  // Dynamic Add Any Extra / User Created States
  const existingIds = new Set(stateDefs.map(s => s.id));
  const newStates = Array.from(allParsedStates.values()).filter(s => !existingIds.has(s.id));

  let nextExtraX = 100;
  let nextExtraY = 840;
  newStates.forEach((s, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const posX = 100 + col * 240;
    const posY = nextExtraY + row * 110;
    const w = Math.max(160, (s.label || s.id).length * 8 + 36);

    stateDefs.push({
      id: s.id,
      type: choiceStates.has(s.id) ? 'choice' : 'state',
      label: s.label || s.id,
      defaultX: posX,
      defaultY: posY,
      w,
      h: 44,
      defaultFill: cardBg,
      defaultBorder: cardBorder,
      defaultFont: primaryText
    });
  });

  const nodeMap = new Map();
  stateDefs.forEach(s => nodeMap.set(s.id, s));

  // Connect transitions dynamically from rawTransitions
  rawTransitions.forEach(tr => {
    let fromId = tr.src;
    let toId = tr.tgt;
    let kind = 'straight';

    if (tr.containerId) {
      if (tr.src === '[*]') {
        fromId = `active_start_${tr.tgt}`;
        kind = 'straight';
      } else if (tr.src === s1_1 && tr.tgt === s1_2) {
        kind = 'col_down_right';
      } else if (tr.src === s1_2 && tr.tgt === s1_1) {
        kind = 'col_up_left';
      } else if (tr.src === s0_1 && tr.tgt === s0_2) {
        kind = 'col_down_right';
      } else if (tr.src === s0_2 && tr.tgt === s0_1) {
        kind = 'col_up_left';
      }
    } else {
      if (tr.src === '[*]') {
        fromId = 'start_main';
        kind = 'straight';
      } else if (tr.src === 'battery_check' && tr.tgt === 'LowPowerMode') {
        kind = 'branch_left';
      } else if (tr.src === 'battery_check' && (tr.tgt === 'Active' || tr.tgt === compId)) {
        kind = 'branch_right';
      } else if (tr.src === 'LowPowerMode' && tr.tgt === '[*]') {
        toId = 'end_lowpower';
        kind = 'straight';
      } else if ((tr.src === 'Active' || tr.src === compId) && tr.tgt === '[*]') {
        toId = 'end_active';
        kind = 'straight';
      } else if (tr.tgt === '[*]') {
        // End state for custom branch
        const endId = `end_${tr.src}`;
        if (!nodeMap.has(endId)) {
          const sNode = nodeMap.get(fromId);
          const endX = sNode ? sNode.defaultX + sNode.w / 2 - 16 : 360;
          const endY = sNode ? sNode.defaultY + 100 : 400;
          const endNode = { id: endId, type: 'end', label: '◉', defaultX: endX, defaultY: endY, w: 32, h: 32, defaultFill: '#333333', defaultBorder: cardBorder, defaultFont: '#FFFFFF' };
          stateDefs.push(endNode);
          nodeMap.set(endId, endNode);
        }
        toId = endId;
        kind = 'straight';
      }
    }

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

    const box = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    box.setAttribute('width', `${compositeNode.w}`);
    box.setAttribute('height', `${compositeNode.h}`);
    box.setAttribute('rx', '4');
    box.setAttribute('fill', fillColor);
    box.setAttribute('stroke', isSelected ? 'var(--selection-color)' : borderColor);
    box.setAttribute('stroke-width', isSelected ? '2.5' : '1.5');
    if (isSelected) box.style.filter = selGlow;
    compG.appendChild(box);

    const headerBg = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    headerBg.setAttribute('d', `M 0 4 Q 0 0 4 0 L ${compositeNode.w - 4} 0 Q ${compositeNode.w} 0 ${compositeNode.w} 4 L ${compositeNode.w} 32 L 0 32 Z`);
    headerBg.setAttribute('fill', activeHeaderBg);
    compG.appendChild(headerBg);

    const headerLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    headerLine.setAttribute('x1', '0');
    headerLine.setAttribute('y1', '32');
    headerLine.setAttribute('x2', `${compositeNode.w}`);
    headerLine.setAttribute('y2', '32');
    headerLine.setAttribute('stroke', borderColor);
    headerLine.setAttribute('stroke-width', '1.5');
    compG.appendChild(headerLine);

    const headerTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    headerTxt.setAttribute('x', '16');
    headerTxt.setAttribute('y', '21');
    headerTxt.setAttribute('fill', fontColor);
    headerTxt.setAttribute('font-size', '13.5px');
    headerTxt.setAttribute('font-weight', '700');
    headerTxt.textContent = compositeNode.label;
    compG.appendChild(headerTxt);

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
          type: 'Composite Container',
          title: compositeNode.label,
          fields: [
            { key: 'label', label: 'State Name', type: 'text', value: compositeNode.label },
            { key: 'font', label: '1. Font / Text Color', type: 'color', value: fontColor },
            { key: 'fill', label: '2. Node Fill Color', type: 'color', value: fillColor },
            { key: 'border', label: '3. Node Border / Stroke Color', type: 'color', value: borderColor }
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

  // 4. RENDER ALL STEPPED TRANSITIONS (in edgesLayer on top of container)
  transitions.forEach(tr => {
    const sDef = stateDefs.find(s => s.id === tr.from);
    const tDef = stateDefs.find(s => s.id === tr.to);
    if (!sDef || !tDef) return;

    const sPos = MultiDiagramVisualizer.getPosition(sDef.id, sDef.defaultX, sDef.defaultY);
    const tPos = MultiDiagramVisualizer.getPosition(tDef.id, tDef.defaultX, tDef.defaultY);

    let pathD, labelX, labelY;

    if (tr.kind === 'branch_left') {
      const xStart = sPos.x + sDef.w * 0.25;
      const yStart = sPos.y + sDef.h;
      const xEnd = tPos.x + tDef.w / 2;
      const yEnd = tPos.y;
      const yMid = (yStart + yEnd) / 2 - 25;
      pathD = `M ${xStart} ${yStart} L ${xStart} ${yMid} L ${xEnd} ${yMid} L ${xEnd} ${yEnd}`;
      labelX = xEnd;
      labelY = yMid + 25;
    } else if (tr.kind === 'branch_right') {
      const xStart = sPos.x + sDef.w * 0.75;
      const yStart = sPos.y + sDef.h;
      const xEnd = tPos.x + tDef.w / 2;
      const yEnd = tPos.y;
      const yMid = (yStart + yEnd) / 2 - 25;
      pathD = `M ${xStart} ${yStart} L ${xStart} ${yMid} L ${xEnd} ${yMid} L ${xEnd} ${yEnd}`;
      labelX = xEnd;
      labelY = yMid + 25;
    } else if (tr.kind === 'col_down_right') {
      const xStart = sPos.x + sDef.w * 0.75;
      const yStart = sPos.y + sDef.h;
      const xEnd = tPos.x + tDef.w * 0.75;
      const yEnd = tPos.y;
      const xStep = xStart + 22;
      pathD = `M ${xStart} ${yStart} L ${xStart} ${yStart + 20} L ${xStep} ${yStart + 20} L ${xStep} ${yEnd - 20} L ${xEnd} ${yEnd - 20} L ${xEnd} ${yEnd}`;
      labelX = xStep;
      labelY = (yStart + yEnd) / 2;
    } else if (tr.kind === 'col_up_left') {
      const xStart = sPos.x + sDef.w * 0.25;
      const yStart = sPos.y;
      const xEnd = tPos.x + tDef.w * 0.25;
      const yEnd = tPos.y + tDef.h;
      const xStep = xStart - 22;
      pathD = `M ${xStart} ${yStart} L ${xStart} ${yStart - 20} L ${xStep} ${yStart - 20} L ${xStep} ${yEnd + 20} L ${xEnd} ${yEnd + 20} L ${xEnd} ${yEnd}`;
      labelX = xStep;
      labelY = (yStart + yEnd) / 2;
    } else {
      // Orthogonal Stepped Connection for general/custom transitions
      const x1 = sPos.x + sDef.w / 2;
      const y1 = sPos.y + sDef.h;
      const x2 = tPos.x + tDef.w / 2;
      const y2 = tPos.y;

      if (Math.abs(x1 - x2) < 10) {
        pathD = `M ${x1} ${y1} L ${x2} ${y2}`;
        labelX = (x1 + x2) / 2;
        labelY = (y1 + y2) / 2;
      } else if (y2 > y1 + 30) {
        const yMid = (y1 + y2) / 2;
        pathD = `M ${x1} ${y1} L ${x1} ${yMid} L ${x2} ${yMid} L ${x2} ${y2}`;
        labelX = (x1 + x2) / 2;
        labelY = yMid;
      } else if (y1 > y2 + 30) {
        const yMid = (y1 + y2) / 2;
        const xStart = sPos.x + sDef.w / 2;
        const yStart = sPos.y;
        const xEnd = tPos.x + tDef.w / 2;
        const yEnd = tPos.y + tDef.h;
        pathD = `M ${xStart} ${yStart} L ${xStart} ${yMid} L ${xEnd} ${yMid} L ${xEnd} ${yEnd}`;
        labelX = (xStart + xEnd) / 2;
        labelY = yMid;
      } else {
        const isLeft = x1 > x2;
        const startX = isLeft ? sPos.x : sPos.x + sDef.w;
        const startY = sPos.y + sDef.h / 2;
        const endX = isLeft ? tPos.x + tDef.w : tPos.x;
        const endY = tPos.y + tDef.h / 2;
        const xMid = (startX + endX) / 2;
        pathD = `M ${startX} ${startY} L ${xMid} ${startY} L ${xMid} ${endY} L ${endX} ${endY}`;
        labelX = xMid;
        labelY = (startY + endY) / 2;
      }
    }

    const sName = tr.from.replace('active_start_', '[*]').replace('start_main', '[*]');
    const tName = tr.to.replace('end_lowpower', '[*]').replace('end_active', '[*]');
    const trKey = `trans_${sName}_to_${tName}`;
    const trTitle = tr.label ? `${sName} → ${tName} (${tr.label})` : `${sName} → ${tName}`;
    const isSelected = (selTitle === trTitle || selTitle === trKey);

    const trColor = MultiDiagramVisualizer.getColor(trKey, linkColor);
    const trWidth = MultiDiagramVisualizer.getColor(`${trKey}_width`, '1.8');
    const trStyle = MultiDiagramVisualizer.getColor(`${trKey}_style`, 'solid');
    const trFont = MultiDiagramVisualizer.getColor(`${trKey}_font`, isDark ? '#90CAF9' : '#1976D2');
    const trBg = MultiDiagramVisualizer.getColor(`${trKey}_bg`, isDark ? '#1E293B' : '#F3F4F6');

    const trG = document.createElementNS('http://www.w3.org/2000/svg', 'g');

    // Click Hitbox
    const hitbox = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hitbox.setAttribute('d', pathD);
    hitbox.setAttribute('fill', 'none');
    hitbox.setAttribute('stroke', 'transparent');
    hitbox.setAttribute('stroke-width', '24');
    hitbox.style.cursor = 'pointer';
    trG.appendChild(hitbox);

    // Visible Stepped Line
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathD);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', isSelected ? 'var(--selection-color)' : trColor);
    path.setAttribute('stroke-width', isSelected ? `${parseFloat(trWidth) + 1.2}` : trWidth);
    if (trStyle === 'dashed') path.setAttribute('stroke-dasharray', '5 4');
    else if (trStyle === 'dotted') path.setAttribute('stroke-dasharray', '2 3');
    path.setAttribute('marker-end', isSelected ? 'url(#marker-arrow-selected)' : 'url(#marker-arrow)');
    if (isSelected) path.style.filter = selGlow;
    trG.appendChild(path);

    // Condition Badge & Label
    if (tr.label) {
      const lblG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      lblG.setAttribute('transform', `translate(${labelX}, ${labelY})`);
      lblG.style.cursor = 'pointer';

      const padW = tr.label.length * 6.8 + 14;
      const lblBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      lblBg.setAttribute('x', `${-padW / 2}`);
      lblBg.setAttribute('y', '-10');
      lblBg.setAttribute('width', `${padW}`);
      lblBg.setAttribute('height', '20');
      lblBg.setAttribute('rx', '3');
      lblBg.setAttribute('fill', trBg);
      lblBg.setAttribute('stroke', isSelected ? 'var(--selection-color)' : (isDark ? '#555555' : '#D1D5DB'));
      lblBg.setAttribute('stroke-width', isSelected ? '2' : '1');
      if (isSelected) lblBg.style.filter = selGlow;
      lblG.appendChild(lblBg);

      const lblTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      lblTxt.setAttribute('x', '0');
      lblTxt.setAttribute('y', '3.5');
      lblTxt.setAttribute('text-anchor', 'middle');
      lblTxt.setAttribute('fill', trFont);
      lblTxt.setAttribute('font-size', '11px');
      lblTxt.setAttribute('font-weight', '500');
      lblTxt.textContent = tr.label;
      lblG.appendChild(lblTxt);

      trG.appendChild(lblG);
    }

    const allStateOptions = stateDefs.filter(s => s.type !== 'composite').map(s => ({
      value: (s.id === 'start_main' || s.id.startsWith('active_start_')) ? '[*]' : (s.id.startsWith('end_') ? '[*]' : s.id),
      label: (s.id === 'start_main' || s.id.startsWith('active_start_')) ? '[*] (Start State)' : (s.id.startsWith('end_') ? '[*] (End State)' : s.label || s.id)
    }));
    // Remove duplicate [*] options
    const uniqueStateOptions = [];
    const seenOptVals = new Set();
    allStateOptions.forEach(o => {
      if (!seenOptVals.has(o.value)) {
        seenOptVals.add(o.value);
        uniqueStateOptions.push(o);
      }
    });

    // Interactive Inspector selection for Transition Link
    trG.addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof AppController !== 'undefined' && AppController.instance) {
        AppController.instance.selectVisualObject({
          type: 'State Transition Link',
          title: trTitle,
          fields: [
            { key: 'src', label: 'From State', type: 'select', value: sName, options: uniqueStateOptions },
            { key: 'tgt', label: 'To State', type: 'select', value: tName, options: uniqueStateOptions },
            { key: 'label', label: 'Condition / Action Label', type: 'text', value: tr.label || '' },
            { key: 'type', label: 'Transition Style (Includes Bi-directional)', type: 'select', value: '-->', options: [
                { value: '-->', label: 'Forward Transition (-->)' },
                { value: '<--', label: 'Reverse Transition (<--)' },
                { value: '<-->', label: 'Bidirectional Transition (<-->)' },
                { value: '-.->', label: 'Dotted Transition (-.->)' },
                { value: '---', label: 'Open Line (---)' }
            ]},
            { key: 'color', label: '1. Line & Arrow Color', type: 'color', value: trColor },
            { key: 'width', label: '2. Line Thickness', type: 'select', value: trWidth, options: [
                { value: '1.2', label: 'Thin (1.2px)' },
                { value: '1.8', label: 'Medium (1.8px - Default)' },
                { value: '2.5', label: 'Thick (2.5px)' },
                { value: '3.5', label: 'Heavy (3.5px)' }
            ]},
            { key: 'style', label: '3. Line Dash Style', type: 'select', value: trStyle, options: [
                { value: 'solid', label: 'Solid (──────)' },
                { value: 'dashed', label: 'Dashed (– – – –)' },
                { value: 'dotted', label: 'Dotted (········)' }
            ]},
            { key: 'font', label: '4. Label Text Color', type: 'color', value: trFont },
            { key: 'bg', label: '5. Label Badge Background', type: 'color', value: trBg }
          ],
          onSave: (vals) => {
            MultiDiagramVisualizer.setColor(trKey, vals.color);
            MultiDiagramVisualizer.setColor(`${trKey}_width`, vals.width);
            MultiDiagramVisualizer.setColor(`${trKey}_style`, vals.style);
            MultiDiagramVisualizer.setColor(`${trKey}_font`, vals.font);
            MultiDiagramVisualizer.setColor(`${trKey}_bg`, vals.bg);
            MultiDiagramVisualizer.syncColorToCode(trKey, vals.color);
            MultiDiagramVisualizer.syncColorToCode(`${trKey}_font`, vals.font);
            MultiDiagramVisualizer.syncColorToCode(`${trKey}_bg`, vals.bg);
            MultiDiagramVisualizer.updateCodeLine((curCode) => {
              const lines = curCode.split('\n');
              for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes(sName) && lines[i].includes(tName) && lines[i].includes('-->')) {
                  const lead = lines[i].match(/^\s*/)[0] || '    ';
                  const fromS = vals.src || sName;
                  const toS = vals.tgt || tName;
                  const arr = vals.type || '-->';
                  lines[i] = vals.label ? `${lead}${fromS} ${arr} ${toS} : ${vals.label}` : `${lead}${fromS} ${arr} ${toS}`;
                  break;
                }
              }
              return lines.join('\n');
            });
          }
        });
      }
    });

    edgesLayer.appendChild(trG);
  });

  // 5. RENDER ALL STATE NODES
  normalNodes.forEach(s => {
    const pos = MultiDiagramVisualizer.getPosition(s.id, s.defaultX, s.defaultY);
    const fillColor = MultiDiagramVisualizer.getColor(s.id, s.defaultFill);
    const fontColor = MultiDiagramVisualizer.getColor(`${s.id}_font`, s.defaultFont);
    const borderColor = MultiDiagramVisualizer.getColor(`${s.id}_border`, s.defaultBorder);

    const isSelected = (s.label === selTitle || s.id === selTitle);
    const nodeG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    nodeG.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
    nodeG.style.cursor = 'grab';

    if (s.type === 'start') {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', `${s.w / 2}`);
      circle.setAttribute('cy', `${s.h / 2}`);
      circle.setAttribute('r', `${s.w / 2}`);
      circle.setAttribute('fill', fillColor);
      circle.setAttribute('stroke', isSelected ? 'var(--selection-color)' : borderColor);
      circle.setAttribute('stroke-width', isSelected ? '2.5' : '1');
      if (isSelected) circle.style.filter = selGlow;
      nodeG.appendChild(circle);
    } else if (s.type === 'end') {
      const outerRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      outerRing.setAttribute('cx', `${s.w / 2}`);
      outerRing.setAttribute('cy', `${s.h / 2}`);
      outerRing.setAttribute('r', `${s.w / 2}`);
      outerRing.setAttribute('fill', cardBg);
      outerRing.setAttribute('stroke', isSelected ? 'var(--selection-color)' : borderColor);
      outerRing.setAttribute('stroke-width', isSelected ? '2.5' : '1.8');
      if (isSelected) outerRing.style.filter = selGlow;
      nodeG.appendChild(outerRing);

      const innerCore = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      innerCore.setAttribute('cx', `${s.w / 2}`);
      innerCore.setAttribute('cy', `${s.h / 2}`);
      innerCore.setAttribute('r', `${s.w / 2 - 5}`);
      innerCore.setAttribute('fill', fillColor);
      nodeG.appendChild(innerCore);
    } else if (s.type === 'choice') {
      const diam = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      const hw = s.w / 2;
      const hh = s.h / 2;
      diam.setAttribute('points', `${hw},0 ${s.w},${hh} ${hw},${s.h} 0,${hh}`);
      diam.setAttribute('fill', fillColor);
      diam.setAttribute('stroke', isSelected ? 'var(--selection-color)' : borderColor);
      diam.setAttribute('stroke-width', isSelected ? '2.5' : '1.5');
      if (isSelected) diam.style.filter = selGlow;
      nodeG.appendChild(diam);
    } else {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('width', `${s.w}`);
      rect.setAttribute('height', `${s.h}`);
      rect.setAttribute('rx', '8');
      rect.setAttribute('fill', fillColor);
      rect.setAttribute('stroke', isSelected ? 'var(--selection-color)' : borderColor);
      rect.setAttribute('stroke-width', isSelected ? '2.5' : '1.5');
      if (isSelected) rect.style.filter = selGlow;
      nodeG.appendChild(rect);

      const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      txt.setAttribute('x', `${s.w / 2}`);
      txt.setAttribute('y', `${s.h / 2 + 4.5}`);
      txt.setAttribute('text-anchor', 'middle');
      txt.setAttribute('fill', fontColor);
      txt.setAttribute('font-size', '13px');
      txt.setAttribute('font-weight', '600');
      txt.textContent = s.label;
      nodeG.appendChild(txt);
    }

    MultiDiagramVisualizer.makeDraggable(
      nodeG,
      s.id,
      () => MultiDiagramVisualizer.getPosition(s.id, s.defaultX, s.defaultY),
      (nx, ny) => MultiDiagramVisualizer.setPosition(s.id, nx, ny)
    );

    nodeG.addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof AppController !== 'undefined' && AppController.instance) {
        AppController.instance.selectVisualObject({
          type: 'State Node',
          title: s.label,
          fields: [
            { key: 'label', label: 'State Name', type: 'text', value: s.label },
            { key: 'font', label: '1. Font / Text Color', type: 'color', value: fontColor },
            { key: 'fill', label: '2. Node Fill Color', type: 'color', value: fillColor },
            { key: 'border', label: '3. Node Border / Stroke Color', type: 'color', value: borderColor }
          ],
          onSave: (vals) => {
            MultiDiagramVisualizer.setColor(s.id, vals.fill);
            MultiDiagramVisualizer.setColor(`${s.id}_font`, vals.font);
            MultiDiagramVisualizer.setColor(`${s.id}_border`, vals.border);
            MultiDiagramVisualizer.syncColorToCode(s.id, vals.fill);
            MultiDiagramVisualizer.syncColorToCode(`${s.id}_font`, vals.font);
            MultiDiagramVisualizer.syncColorToCode(`${s.id}_border`, vals.border);
          }
        });
      }
    });

    nodesLayer.appendChild(nodeG);
  });
});
MultiDiagramVisualizer.register('stateDiagram', MultiDiagramVisualizer.renderers.get('statediagram'));
MultiDiagramVisualizer.register('stateDiagram-v2', MultiDiagramVisualizer.renderers.get('statediagram'));
