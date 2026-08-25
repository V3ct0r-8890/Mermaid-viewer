// --- STATE DIAGRAM VISUALIZER ---
MultiDiagramVisualizer.register('statediagram', function(code, nodesLayer, edgesLayer, isDark) {
  const primaryText = isDark ? '#FFFFFF' : '#212121';
  const textColor = isDark ? '#E0E0E0' : '#424242';
  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const cardBorder = isDark ? '#424242' : '#E0E0E0';
  const primaryBorder = isDark ? '#1976D2' : '#0288D1';
  const primaryFill = isDark ? '#1E3A5F' : '#E3F2FD';
  const linkColor = isDark ? '#90CAF9' : '#1976D2';
  const selTitle = (typeof AppController !== 'undefined' && AppController.instance && AppController.instance.selectedVisualObject) ? AppController.instance.selectedVisualObject.title : null;
  const selGlow = 'drop-shadow(0 0 6px rgba(33, 150, 243, 0.8))';

  // State nodes configuration
  const stateDefs = [
    { id: 'start_main', type: 'start', label: '●', defaultX: 320, defaultY: 30, w: 32, h: 32, defaultFill: '#212121', defaultBorder: '#000000', defaultFont: '#FFFFFF' },
    { id: 'PowerOn', type: 'state', label: 'PowerOn', defaultX: 250, defaultY: 90, w: 140, h: 46, defaultFill: '#E3F2FD', defaultBorder: '#90CAF9', defaultFont: '#0D47A1' },
    { id: 'battery_check', type: 'choice', label: '◆', defaultX: 298, defaultY: 175, w: 44, h: 44, defaultFill: '#FFF3E0', defaultBorder: '#FF9800', defaultFont: '#E65100' },
    { id: 'LowPowerMode', type: 'state', label: 'LowPowerMode', defaultX: 60, defaultY: 270, w: 140, h: 46, defaultFill: '#FFEBEE', defaultBorder: '#EF9A9A', defaultFont: '#B71C1C' },
    { id: 'end_lowpower', type: 'end', label: '◉', defaultX: 112, defaultY: 370, w: 36, h: 36, defaultFill: '#212121', defaultBorder: '#000000', defaultFont: '#FFFFFF' },

    // Composite Active State Container
    { id: 'Active', type: 'composite', label: 'Active', defaultX: 250, defaultY: 255, w: 560, h: 310, defaultFill: isDark ? '#1A2332' : '#F4F9FF', defaultBorder: '#64B5F6', defaultFont: '#0D47A1' },

    // Region 1: Audio Playback
    { id: 'active_start_1', type: 'start', label: '●', defaultX: 280, defaultY: 315, w: 26, h: 26, defaultFill: '#212121', defaultBorder: '#000000', defaultFont: '#FFFFFF' },
    { id: 'Playing', type: 'state', label: 'Playing', defaultX: 350, defaultY: 305, w: 120, h: 44, defaultFill: '#E8F5E9', defaultBorder: '#A5D6A7', defaultFont: '#1B5E20' },
    { id: 'Paused', type: 'state', label: 'Paused', defaultX: 580, defaultY: 305, w: 120, h: 44, defaultFill: '#FFF8E1', defaultBorder: '#FFE082', defaultFont: '#F57F17' },

    // Region 2: Screen Display
    { id: 'active_start_2', type: 'start', label: '●', defaultX: 280, defaultY: 455, w: 26, h: 26, defaultFill: '#212121', defaultBorder: '#000000', defaultFont: '#FFFFFF' },
    { id: 'ScreenOn', type: 'state', label: 'ScreenOn', defaultX: 350, defaultY: 445, w: 120, h: 44, defaultFill: '#E1F5FE', defaultBorder: '#81D4FA', defaultFont: '#01579B' },
    { id: 'ScreenDimmed', type: 'state', label: 'ScreenDimmed', defaultX: 580, defaultY: 445, w: 130, h: 44, defaultFill: '#EDE7F6', defaultBorder: '#B39DDB', defaultFont: '#4A148C' },

    // Terminal for Active
    { id: 'end_active', type: 'end', label: '◉', defaultX: 512, defaultY: 605, w: 36, h: 36, defaultFill: '#212121', defaultBorder: '#000000', defaultFont: '#FFFFFF' }
  ];

  // Transitions
  const transitions = [
    { from: 'start_main', to: 'PowerOn', label: '', curve: 'straight' },
    { from: 'PowerOn', to: 'battery_check', label: '', curve: 'straight' },
    { from: 'battery_check', to: 'LowPowerMode', label: 'battery < 20%', curve: 'left_branch' },
    { from: 'battery_check', to: 'Active', label: 'battery >= 20%', curve: 'right_branch' },
    { from: 'LowPowerMode', to: 'end_lowpower', label: 'power off', curve: 'straight' },

    // Active Region 1
    { from: 'active_start_1', to: 'Playing', label: '', curve: 'straight' },
    { from: 'Playing', to: 'Paused', label: 'pause', curve: 'upper_arc' },
    { from: 'Paused', to: 'Playing', label: 'play', curve: 'lower_arc' },

    // Active Region 2
    { from: 'active_start_2', to: 'ScreenOn', label: '', curve: 'straight' },
    { from: 'ScreenOn', to: 'ScreenDimmed', label: 'idle 30s', curve: 'upper_arc' },
    { from: 'ScreenDimmed', to: 'ScreenOn', label: 'touch', curve: 'lower_arc' },

    // Active Exit
    { from: 'Active', to: 'end_active', label: 'power off', curve: 'bottom_exit' }
  ];

  // Render transitions
  transitions.forEach(tr => {
    const sDef = stateDefs.find(s => s.id === tr.from);
    const tDef = stateDefs.find(s => s.id === tr.to);
    if (!sDef || !tDef) return;

    const sPos = MultiDiagramVisualizer.getPosition(sDef.id, sDef.defaultX, sDef.defaultY);
    const tPos = MultiDiagramVisualizer.getPosition(tDef.id, tDef.defaultX, tDef.defaultY);

    let x1, y1, x2, y2, pathD, labelX, labelY;

    if (tr.curve === 'upper_arc') {
      x1 = sPos.x + sDef.w;
      y1 = sPos.y + 14;
      x2 = tPos.x;
      y2 = tPos.y + 14;
      const midX = (x1 + x2) / 2;
      pathD = `M ${x1} ${y1} C ${midX} ${y1 - 25}, ${midX} ${y2 - 25}, ${x2} ${y2}`;
      labelX = midX;
      labelY = y1 - 22;
    } else if (tr.curve === 'lower_arc') {
      x1 = sPos.x;
      y1 = sPos.y + sDef.h - 14;
      x2 = tPos.x + tDef.w;
      y2 = tPos.y + tDef.h - 14;
      const midX = (x1 + x2) / 2;
      pathD = `M ${x1} ${y1} C ${midX} ${y1 + 25}, ${midX} ${y2 + 25}, ${x2} ${y2}`;
      labelX = midX;
      labelY = y1 + 22;
    } else if (tr.curve === 'left_branch') {
      x1 = sPos.x;
      y1 = sPos.y + sDef.h / 2;
      x2 = sPos.x - 160;
      y2 = tPos.y;
      pathD = `M ${x1} ${y1} C ${x1 - 80} ${y1}, ${x2 + 70} ${y1 + 40}, ${x2 + 70} ${y2}`;
      labelX = x1 - 90;
      labelY = y1 + 35;
    } else if (tr.curve === 'right_branch') {
      x1 = sPos.x + sDef.w;
      y1 = sPos.y + sDef.h / 2;
      x2 = tPos.x + 80;
      y2 = tPos.y;
      pathD = `M ${x1} ${y1} C ${x1 + 60} ${y1}, ${x2} ${y1 + 40}, ${x2} ${y2}`;
      labelX = x1 + 65;
      labelY = y1 + 35;
    } else if (tr.curve === 'bottom_exit') {
      x1 = sPos.x + sDef.w / 2;
      y1 = sPos.y + sDef.h;
      x2 = tPos.x + tDef.w / 2;
      y2 = tPos.y;
      pathD = `M ${x1} ${y1} L ${x2} ${y2}`;
      labelX = x1 + 38;
      labelY = (y1 + y2) / 2;
    } else {
      // Standard direct transition
      if (sPos.y + sDef.h <= tPos.y) {
        x1 = sPos.x + sDef.w / 2;
        y1 = sPos.y + sDef.h;
        x2 = tPos.x + tDef.w / 2;
        y2 = tPos.y;
      } else {
        x1 = sPos.x + sDef.w;
        y1 = sPos.y + sDef.h / 2;
        x2 = tPos.x;
        y2 = tPos.y + tDef.h / 2;
      }
      pathD = `M ${x1} ${y1} L ${x2} ${y2}`;
      labelX = (x1 + x2) / 2 + 15;
      labelY = (y1 + y2) / 2;
    }

    const trG = document.createElementNS('http://www.w3.org/2000/svg', 'g');

    // Wide transparent hitbox for easy clicking
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
    pathEl.setAttribute('stroke-width', '1.8');
    pathEl.setAttribute('marker-end', 'url(#marker-arrow)');
    trG.appendChild(pathEl);

    if (tr.label) {
      const lblG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      lblG.setAttribute('transform', `translate(${labelX}, ${labelY})`);

      const textLen = tr.label.length * 6.5 + 14;
      const lblBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      lblBg.setAttribute('x', `${-textLen / 2}`);
      lblBg.setAttribute('y', '-9');
      lblBg.setAttribute('width', `${textLen}`);
      lblBg.setAttribute('height', '18');
      lblBg.setAttribute('rx', '4');
      lblBg.setAttribute('fill', isDark ? '#2C2C2C' : '#FFFFFF');
      lblBg.setAttribute('stroke', cardBorder);
      lblBg.setAttribute('stroke-width', '1');
      lblG.appendChild(lblBg);

      const lblTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      lblTxt.setAttribute('x', '0');
      lblTxt.setAttribute('y', '3.5');
      lblTxt.setAttribute('text-anchor', 'middle');
      lblTxt.setAttribute('fill', textColor);
      lblTxt.setAttribute('font-size', '10.5px');
      lblTxt.setAttribute('font-weight', '500');
      lblTxt.textContent = tr.label;
      lblG.appendChild(lblTxt);

      trG.appendChild(lblG);
    }

    edgesLayer.appendChild(trG);
  });

  // Render state nodes
  stateDefs.forEach(s => {
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
      circle.setAttribute('stroke-width', isSelected ? '3' : '1.5');
      if (isSelected) circle.style.filter = selGlow;
      nodeG.appendChild(circle);
    } else if (s.type === 'end') {
      const outerRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      outerRing.setAttribute('cx', `${s.w / 2}`);
      outerRing.setAttribute('cy', `${s.h / 2}`);
      outerRing.setAttribute('r', `${s.w / 2}`);
      outerRing.setAttribute('fill', isDark ? '#1E1E1E' : '#FFFFFF');
      outerRing.setAttribute('stroke', isSelected ? 'var(--selection-color)' : borderColor);
      outerRing.setAttribute('stroke-width', isSelected ? '3' : '2');
      if (isSelected) outerRing.style.filter = selGlow;
      nodeG.appendChild(outerRing);

      const innerCore = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      innerCore.setAttribute('cx', `${s.w / 2}`);
      innerCore.setAttribute('cy', `${s.h / 2}`);
      innerCore.setAttribute('r', `${s.w / 2 - 5}`);
      innerCore.setAttribute('fill', fillColor);
      nodeG.appendChild(innerCore);
    } else if (s.type === 'choice') {
      const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      const hw = s.w / 2;
      const hh = s.h / 2;
      poly.setAttribute('points', `${hw},0 ${s.w},${hh} ${hw},${s.h} 0 interior,${hh}`);
      poly.setAttribute('points', `${hw},0 ${s.w},${hh} ${hw},${s.h} 0,${hh}`);
      poly.setAttribute('fill', fillColor);
      poly.setAttribute('stroke', isSelected ? 'var(--selection-color)' : borderColor);
      poly.setAttribute('stroke-width', isSelected ? '3' : '2');
      if (isSelected) poly.style.filter = selGlow;
      nodeG.appendChild(poly);
    } else if (s.type === 'composite') {
      // Composite state container box
      const box = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      box.setAttribute('width', `${s.w}`);
      box.setAttribute('height', `${s.h}`);
      box.setAttribute('rx', '12');
      box.setAttribute('fill', fillColor);
      box.setAttribute('stroke', isSelected ? 'var(--selection-color)' : borderColor);
      box.setAttribute('stroke-width', isSelected ? '3' : '2');
      if (isSelected) box.style.filter = selGlow;
      nodeG.appendChild(box);

      // Header Banner
      const headerTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      headerTxt.setAttribute('x', '16');
      headerTxt.setAttribute('y', '26');
      headerTxt.setAttribute('fill', fontColor);
      headerTxt.setAttribute('font-size', '15px');
      headerTxt.setAttribute('font-weight', '700');
      headerTxt.textContent = `state ${s.label} { ... }`;
      nodeG.appendChild(headerTxt);

      const headerSub = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      headerSub.setAttribute('x', `${s.w - 16}`);
      headerSub.setAttribute('y', '26');
      headerSub.setAttribute('text-anchor', 'end');
      headerSub.setAttribute('fill', textColor);
      headerSub.setAttribute('font-size', '11.5px');
      headerSub.setAttribute('font-style', 'italic');
      headerSub.textContent = 'Concurrent Parallel Regions';
      nodeG.appendChild(headerSub);

      // Region 1 Label
      const reg1Txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      reg1Txt.setAttribute('x', '20');
      reg1Txt.setAttribute('y', '54');
      reg1Txt.setAttribute('fill', textColor);
      reg1Txt.setAttribute('font-size', '11px');
      reg1Txt.setAttribute('font-weight', '600');
      reg1Txt.textContent = 'Audio Playback Sub-machine:';
      nodeG.appendChild(reg1Txt);

      // Region Divider (--)
      const divider = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      divider.setAttribute('x1', '12');
      divider.setAttribute('y1', '155');
      divider.setAttribute('x2', `${s.w - 12}`);
      divider.setAttribute('y2', '155');
      divider.setAttribute('stroke', borderColor);
      divider.setAttribute('stroke-width', '1.5');
      divider.setAttribute('stroke-dasharray', '6 4');
      nodeG.appendChild(divider);

      // Region 2 Label
      const reg2Txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      reg2Txt.setAttribute('x', '20');
      reg2Txt.setAttribute('y', '178');
      reg2Txt.setAttribute('fill', textColor);
      reg2Txt.setAttribute('font-size', '11px');
      reg2Txt.setAttribute('font-weight', '600');
      reg2Txt.textContent = 'Display Sleep / Wake Sub-machine (--) :';
      nodeG.appendChild(reg2Txt);
    } else {
      // Standard state capsule
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('width', `${s.w}`);
      rect.setAttribute('height', `${s.h}`);
      rect.setAttribute('rx', '8');
      rect.setAttribute('fill', fillColor);
      rect.setAttribute('stroke', isSelected ? 'var(--selection-color)' : borderColor);
      rect.setAttribute('stroke-width', isSelected ? '3' : '1.8');
      if (isSelected) rect.style.filter = selGlow;
      nodeG.appendChild(rect);

      const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      txt.setAttribute('x', `${s.w / 2}`);
      txt.setAttribute('y', `${s.h / 2 + 4.5}`);
      txt.setAttribute('text-anchor', 'middle');
      txt.setAttribute('fill', fontColor);
      txt.setAttribute('font-size', '12.5px');
      txt.setAttribute('font-weight', '600');
      txt.textContent = s.label;
      nodeG.appendChild(txt);
    }

    // Drag and drop handler
    MultiDiagramVisualizer.makeDraggable(
      nodeG,
      s.id,
      () => MultiDiagramVisualizer.getPosition(s.id, s.defaultX, s.defaultY),
      (nx, ny) => MultiDiagramVisualizer.setPosition(s.id, nx, ny)
    );

    // Click inspector selection
    nodeG.addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof AppController !== 'undefined' && AppController.instance) {
        AppController.instance.selectVisualObject({
          type: s.type === 'composite' ? 'Composite State Container' : (s.type === 'choice' ? 'Choice Condition' : 'State Node'),
          title: s.label,
          fields: [
            { key: 'label', label: 'State Name / Label', type: 'text', value: s.label },
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
