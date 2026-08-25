// --- STATE DIAGRAM VISUALIZER ---
MultiDiagramVisualizer.register('statediagram', function(code, nodesLayer, edgesLayer, isDark) {
  const primaryText = isDark ? '#FFFFFF' : '#1F2937';
  const textColor = isDark ? '#E0E0E0' : '#374151';
  const cardBg = isDark ? '#252526' : '#FFFFFF';
  const cardBorder = isDark ? '#757575' : '#333333';
  const activeHeaderBg = isDark ? '#2D2D2D' : '#F3F4F6';
  const linkColor = isDark ? '#90CAF9' : '#333333';
  const selTitle = (typeof AppController !== 'undefined' && AppController.instance && AppController.instance.selectedVisualObject) ? AppController.instance.selectedVisualObject.title : null;
  const selGlow = 'drop-shadow(0 0 6px rgba(33, 150, 243, 0.8))';

  // Node definitions
  const stateDefs = [
    // Top Root Flow
    { id: 'start_main', type: 'start', label: '●', defaultX: 334, defaultY: 40, w: 32, h: 32, defaultFill: '#333333', defaultBorder: '#1F2937', defaultFont: '#FFFFFF' },
    { id: 'PowerOn', type: 'state', label: 'PowerOn', defaultX: 270, defaultY: 110, w: 160, h: 44, defaultFill: cardBg, defaultBorder: cardBorder, defaultFont: primaryText },
    { id: 'battery_check', type: 'state', label: 'battery_check', defaultX: 245, defaultY: 190, w: 210, h: 44, defaultFill: cardBg, defaultBorder: cardBorder, defaultFont: primaryText },

    // Left Branch (Low Power)
    { id: 'LowPowerMode', type: 'state', label: 'LowPowerMode', defaultX: 40, defaultY: 320, w: 180, h: 44, defaultFill: cardBg, defaultBorder: cardBorder, defaultFont: primaryText },
    { id: 'end_lowpower', type: 'end', label: '◉', defaultX: 114, defaultY: 480, w: 32, h: 32, defaultFill: '#333333', defaultBorder: cardBorder, defaultFont: '#FFFFFF' },

    // Active Composite State Container
    { id: 'Active', type: 'composite', label: 'Active', defaultX: 285, defaultY: 320, w: 460, h: 380, defaultFill: cardBg, defaultBorder: cardBorder, defaultFont: primaryText },

    // Left Column inside Active (Screen Display)
    { id: 'active_start_screen', type: 'start', label: '●', defaultX: 399, defaultY: 395, w: 32, h: 32, defaultFill: '#333333', defaultBorder: '#1F2937', defaultFont: '#FFFFFF' },
    { id: 'ScreenOn', type: 'state', label: 'ScreenOn', defaultX: 335, defaultY: 460, w: 160, h: 44, defaultFill: cardBg, defaultBorder: cardBorder, defaultFont: primaryText },
    { id: 'ScreenDimmed', type: 'state', label: 'ScreenDimmed', defaultX: 315, defaultY: 620, w: 200, h: 44, defaultFill: cardBg, defaultBorder: cardBorder, defaultFont: primaryText },

    // Right Column inside Active (Audio Playback)
    { id: 'active_start_audio', type: 'start', label: '●', defaultX: 609, defaultY: 395, w: 32, h: 32, defaultFill: '#333333', defaultBorder: '#1F2937', defaultFont: '#FFFFFF' },
    { id: 'Playing', type: 'state', label: 'Playing', defaultX: 550, defaultY: 460, w: 150, h: 44, defaultFill: cardBg, defaultBorder: cardBorder, defaultFont: primaryText },
    { id: 'Paused', type: 'state', label: 'Paused', defaultX: 550, defaultY: 620, w: 150, h: 44, defaultFill: cardBg, defaultBorder: cardBorder, defaultFont: primaryText },

    // Bottom Terminal for Active
    { id: 'end_active', type: 'end', label: '◉', defaultX: 499, defaultY: 770, w: 32, h: 32, defaultFill: '#333333', defaultBorder: cardBorder, defaultFont: '#FFFFFF' }
  ];

  const compositeNode = stateDefs.find(s => s.type === 'composite');
  const normalNodes = stateDefs.filter(s => s.type !== 'composite');

  // 1. RENDER COMPOSITE CONTAINER (in edgesLayer at the very bottom so all transitions render ON TOP)
  if (compositeNode) {
    const pos = MultiDiagramVisualizer.getPosition(compositeNode.id, compositeNode.defaultX, compositeNode.defaultY);
    const fillColor = MultiDiagramVisualizer.getColor(compositeNode.id, compositeNode.defaultFill);
    const fontColor = MultiDiagramVisualizer.getColor(`${compositeNode.id}_font`, compositeNode.defaultFont);
    const borderColor = MultiDiagramVisualizer.getColor(`${compositeNode.id}_border`, compositeNode.defaultBorder);
    const isSelected = (compositeNode.label === selTitle || compositeNode.id === selTitle);

    const compG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    compG.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
    compG.style.cursor = 'grab';

    // Main Box
    const box = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    box.setAttribute('width', `${compositeNode.w}`);
    box.setAttribute('height', `${compositeNode.h}`);
    box.setAttribute('rx', '4');
    box.setAttribute('fill', fillColor);
    box.setAttribute('stroke', isSelected ? 'var(--selection-color)' : borderColor);
    box.setAttribute('stroke-width', isSelected ? '2.5' : '1.5');
    if (isSelected) box.style.filter = selGlow;
    compG.appendChild(box);

    // Header Compartment Background
    const headerBg = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    headerBg.setAttribute('d', `M 0 4 Q 0 0 4 0 L ${compositeNode.w - 4} 0 Q ${compositeNode.w} 0 ${compositeNode.w} 4 L ${compositeNode.w} 32 L 0 32 Z`);
    headerBg.setAttribute('fill', activeHeaderBg);
    compG.appendChild(headerBg);

    // Header Compartment Border Line
    const headerLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    headerLine.setAttribute('x1', '0');
    headerLine.setAttribute('y1', '32');
    headerLine.setAttribute('x2', `${compositeNode.w}`);
    headerLine.setAttribute('y2', '32');
    headerLine.setAttribute('stroke', borderColor);
    headerLine.setAttribute('stroke-width', '1.5');
    compG.appendChild(headerLine);

    // Title Text
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

  // 2. RENDER ALL STEPPED & ORTHOGONAL TRANSITIONS (in edgesLayer on top of container)
  const transitions = [
    // Top Root Flow
    { from: 'start_main', to: 'PowerOn', label: '', kind: 'straight' },
    { from: 'PowerOn', to: 'battery_check', label: '', kind: 'straight' },
    { from: 'battery_check', to: 'LowPowerMode', label: 'battery < 20%', kind: 'branch_left' },
    { from: 'battery_check', to: 'Active', label: 'battery >= 20%', kind: 'branch_right' },
    { from: 'LowPowerMode', to: 'end_lowpower', label: 'power off', kind: 'straight' },

    // Left Column (Screen)
    { from: 'active_start_screen', to: 'ScreenOn', label: '', kind: 'straight' },
    { from: 'ScreenOn', to: 'ScreenDimmed', label: 'idle 30s', kind: 'col_down_right' },
    { from: 'ScreenDimmed', to: 'ScreenOn', label: 'touch', kind: 'col_up_left' },

    // Right Column (Audio)
    { from: 'active_start_audio', to: 'Playing', label: '', kind: 'straight' },
    { from: 'Playing', to: 'Paused', label: 'pause', kind: 'col_down_right' },
    { from: 'Paused', to: 'Playing', label: 'play', kind: 'col_up_left' },

    // Exit
    { from: 'Active', to: 'end_active', label: 'power off', kind: 'straight' }
  ];

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
      // Step down right: ScreenOn/Playing -> ScreenDimmed/Paused
      const xStart = sPos.x + sDef.w * 0.75;
      const yStart = sPos.y + sDef.h;
      const xEnd = tPos.x + tDef.w * 0.75;
      const yEnd = tPos.y;
      const xStep = xStart + 22;
      pathD = `M ${xStart} ${yStart} L ${xStart} ${yStart + 20} L ${xStep} ${yStart + 20} L ${xStep} ${yEnd - 20} L ${xEnd} ${yEnd - 20} L ${xEnd} ${yEnd}`;
      labelX = xStep;
      labelY = (yStart + yEnd) / 2;
    } else if (tr.kind === 'col_up_left') {
      // Step up left: ScreenDimmed/Paused -> ScreenOn/Playing
      const xStart = sPos.x + sDef.w * 0.25;
      const yStart = sPos.y;
      const xEnd = tPos.x + tDef.w * 0.25;
      const yEnd = tPos.y + tDef.h;
      const xStep = xStart - 22;
      pathD = `M ${xStart} ${yStart} L ${xStart} ${yStart - 20} L ${xStep} ${yStart - 20} L ${xStep} ${yEnd + 20} L ${xEnd} ${yEnd + 20} L ${xEnd} ${yEnd}`;
      labelX = xStep;
      labelY = (yStart + yEnd) / 2;
    } else {
      // Direct Straight Line
      const x1 = sPos.x + sDef.w / 2;
      const y1 = sPos.y + sDef.h;
      const x2 = tPos.x + tDef.w / 2;
      const y2 = tPos.y;
      pathD = `M ${x1} ${y1} L ${x2} ${y2}`;
      labelX = (x1 + x2) / 2;
      labelY = (y1 + y2) / 2;
    }

    const trG = document.createElementNS('http://www.w3.org/2000/svg', 'g');

    // Click hitbox
    const hitbox = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hitbox.setAttribute('d', pathD);
    hitbox.setAttribute('fill', 'none');
    hitbox.setAttribute('stroke', 'transparent');
    hitbox.setAttribute('stroke-width', '24');
    hitbox.style.cursor = 'pointer';
    trG.appendChild(hitbox);

    const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathEl.setAttribute('d', pathD);
    pathEl.setAttribute('fill', 'none');
    pathEl.setAttribute('stroke', linkColor);
    pathEl.setAttribute('stroke-width', '1.4');
    pathEl.setAttribute('marker-end', 'url(#marker-arrow)');
    trG.appendChild(pathEl);

    if (tr.label) {
      const lblG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      lblG.setAttribute('transform', `translate(${labelX}, ${labelY})`);

      const textLen = tr.label.length * 6.8 + 16;
      const lblBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      lblBg.setAttribute('x', `${-textLen / 2}`);
      lblBg.setAttribute('y', '-10');
      lblBg.setAttribute('width', `${textLen}`);
      lblBg.setAttribute('height', '20');
      lblBg.setAttribute('rx', '3');
      lblBg.setAttribute('fill', cardBg);
      lblBg.setAttribute('stroke', isDark ? '#555555' : '#D1D5DB');
      lblBg.setAttribute('stroke-width', '1');
      lblG.appendChild(lblBg);

      const lblTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      lblTxt.setAttribute('x', '0');
      lblTxt.setAttribute('y', '3.5');
      lblTxt.setAttribute('text-anchor', 'middle');
      lblTxt.setAttribute('fill', textColor);
      lblTxt.setAttribute('font-size', '11px');
      lblTxt.setAttribute('font-weight', '500');
      lblTxt.textContent = tr.label;
      lblG.appendChild(lblTxt);

      trG.appendChild(lblG);
    }

    edgesLayer.appendChild(trG);
  });

  // 3. RENDER ALL STATE CAPSULES & TERMINAL NODES (in nodesLayer on top of lines)
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
