// --- SANKEY DIAGRAM VISUALIZER ---
MultiDiagramVisualizer.register('sankey', function(code, nodesLayer, edgesLayer, isDark) {
  const primaryText = isDark ? '#FFFFFF' : '#212121';
  const textColor = isDark ? '#E0E0E0' : '#424242';
  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const cardBorder = isDark ? '#424242' : '#E0E0E0';
  const primaryBorder = isDark ? '#1976D2' : '#0288D1';
  const linkColor = isDark ? '#90CAF9' : '#1976D2';
  const selTitle = (typeof AppController !== 'undefined' && AppController.instance && AppController.instance.selectedVisualObject) ? AppController.instance.selectedVisualObject.title : null;
  const selGlow = 'drop-shadow(0 0 6px rgba(33, 150, 243, 0.8))';

  const rawLines = (code || '').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('%%') && !l.startsWith('sankey'));
  const colors = ['#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#00BCD4', '#E91E63', '#673AB7', '#009688', '#FF5722', '#3F51B5'];
  const flows = [];

  rawLines.forEach(line => {
    const parts = line.split(',').map(s => s.trim());
    if (parts.length >= 3) {
      flows.push({
        src: parts[0],
        tgt: parts[1],
        val: parseFloat(parts[2]) || 100
      });
    }
  });

  if (flows.length === 0) {
    flows.push({ src: 'Organic Search', tgt: 'Landing Page', val: 4500 });
    flows.push({ src: 'Social Ads', tgt: 'Landing Page', val: 3200 });
    flows.push({ src: 'Landing Page', tgt: 'Signup Form', val: 5800 });
    flows.push({ src: 'Landing Page', tgt: 'Dropoff', val: 3200 });
  }

  const sources = Array.from(new Set(flows.map(f => f.src)));
  const targets = Array.from(new Set(flows.map(f => f.tgt)));
  const allNodeOptions = Array.from(new Set([...sources, ...targets])).map(n => ({ value: n, label: n }));

  const leftNodes = sources.filter(s => !targets.includes(s));
  const rightNodes = targets.filter(t => !sources.includes(t));
  const midNodes = sources.filter(s => targets.includes(s));

  const leftYMap = new Map();
  const midYMap = new Map();
  const rightYMap = new Map();

  const boxW = 130;
  const boxH = 45;

  const drawBox = (name, x, y, defaultColor) => {
    const size = MultiDiagramVisualizer.getSize(name, boxW, boxH);
    // House rule: the node fill is a pastel tint of its band colour, while the border
    // keeps that colour at full strength (as do the flow bands themselves).
    const fillColor = MultiDiagramVisualizer.getColor(name, Utils.toPastel(defaultColor, isDark));
    const fontColor = MultiDiagramVisualizer.getColor(`${name}_font`, isDark ? '#FFFFFF' : '#1F2937');
    const borderColor = MultiDiagramVisualizer.getColor(`${name}_border`, defaultColor);

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.style.cursor = 'pointer';

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', `${x}`);
    rect.setAttribute('y', `${y}`);
    rect.setAttribute('width', `${size.width}`);
    rect.setAttribute('height', `${size.height}`);
    rect.setAttribute('rx', '4');
    const isSelSankey = (name === selTitle);
    rect.setAttribute('fill', fillColor);
    rect.setAttribute('stroke', isSelSankey ? 'var(--selection-color)' : borderColor);
    rect.setAttribute('stroke-width', isSelSankey ? '3' : '1.5');
    rect.setAttribute('opacity', isSelSankey ? '1' : '0.9');
    if (isSelSankey) rect.style.filter = selGlow;
    g.appendChild(rect);

    const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    txt.setAttribute('x', `${x + size.width / 2}`);
    txt.setAttribute('y', `${y + size.height / 2}`);
    txt.setAttribute('text-anchor', 'middle');
    txt.setAttribute('dominant-baseline', 'central');
    txt.setAttribute('fill', fontColor);
    txt.setAttribute('font-size', '11.5px');
    txt.setAttribute('font-weight', 'bold');
    txt.textContent = name;
    g.appendChild(txt);

    g.addEventListener('mousedown', (e) => e.stopPropagation());
    g.addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof AppController !== 'undefined' && AppController.instance) {
        AppController.instance.selectVisualObject({
          type: 'Sankey Node',
          title: name,
          fields: [
            { key: 'name', label: 'Node Name', type: 'text', value: name },
            ...Utils.sizeFields(size.width, size.height),
            { key: 'font', label: Utils.FIELD_LABELS.font, type: 'color', value: fontColor },
            { key: 'fill', label: Utils.FIELD_LABELS.fill, type: 'color', value: fillColor },
            { key: 'border', label: Utils.FIELD_LABELS.border, type: 'color', value: borderColor }
          ],
          onSave: (vals) => {
            MultiDiagramVisualizer.setSize(vals.name, vals.nodeW, vals.nodeH);
            MultiDiagramVisualizer.setColor(vals.name, vals.fill);
            MultiDiagramVisualizer.setColor(`${vals.name}_font`, vals.font);
            MultiDiagramVisualizer.setColor(`${vals.name}_border`, vals.border);
            MultiDiagramVisualizer.syncColorToCode(vals.name, vals.fill);
            MultiDiagramVisualizer.syncColorToCode(`${vals.name}_font`, vals.font);
            MultiDiagramVisualizer.syncColorToCode(`${vals.name}_border`, vals.border);
            MultiDiagramVisualizer.updateCodeLine((curCode) => {
              const lines = curCode.split('\n');
              for (let i = 0; i < lines.length; i++) {
                const parts = lines[i].split(',').map(s => s.trim());
                if (parts.length >= 3) {
                  let changed = false;
                  if (parts[0].toLowerCase() === name.toLowerCase()) { parts[0] = vals.name; changed = true; }
                  if (parts[1].toLowerCase() === name.toLowerCase()) { parts[1] = vals.name; changed = true; }
                  if (changed) {
                    const lead = lines[i].match(/^(\s*)/)[1] || '  ';
                    lines[i] = `${lead}${parts.join(', ')}`;
                  }
                }
              }
              return lines.join('\n');
            });
          }
        });
      }
    });

    nodesLayer.appendChild(g);
  };

  leftNodes.forEach((n, idx) => {
    const y = 80 + idx * 75;
    leftYMap.set(n, { x: 80, y, color: colors[idx % colors.length] });
    drawBox(n, 80, y, colors[idx % colors.length]);
  });

  midNodes.forEach((n, idx) => {
    const y = 100 + idx * 85;
    midYMap.set(n, { x: 350, y, color: colors[(idx + 3) % colors.length] });
    drawBox(n, 350, y, colors[(idx + 3) % colors.length]);
  });

  rightNodes.forEach((n, idx) => {
    const y = 80 + idx * 75;
    rightYMap.set(n, { x: 620, y, color: colors[(idx + 5) % colors.length] });
    drawBox(n, 620, y, colors[(idx + 5) % colors.length]);
  });

  flows.forEach(f => {
    const sInfo = leftYMap.get(f.src) || midYMap.get(f.src) || { x: 80, y: 100, color: '#2196F3' };
    const tInfo = rightYMap.get(f.tgt) || midYMap.get(f.tgt) || { x: 620, y: 100, color: '#4CAF50' };
    const flowKey = `${f.src}->${f.tgt}`;
    const flowColor = MultiDiagramVisualizer.getColor(flowKey, sInfo.color);
    const connStyle = Utils.normalizeConnector(MultiDiagramVisualizer.getColor(`${flowKey}_conn`, 'curve'), 'curve');

    const x1 = sInfo.x + 130;
    const y1 = sInfo.y + 22;
    const x2 = tInfo.x;
    const y2 = tInfo.y + 22;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', Utils.buildConnectorPath(x1, y1, x2, y2, connStyle, { orientation: 'h' }));
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', flowColor);
    path.setAttribute('stroke-width', `${Math.max(4, Math.min(26, f.val / 250))}`);
    path.setAttribute('opacity', '0.45');
    path.style.cursor = 'pointer';

    path.addEventListener('mousedown', (e) => e.stopPropagation());
    path.addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof AppController !== 'undefined' && AppController.instance) {
        AppController.instance.selectVisualObject({
          type: 'Sankey Flow',
          title: `${f.src} → ${f.tgt}`,
          fields: [
            { key: 'src', label: 'From (Source Node)', type: 'select', value: f.src, options: allNodeOptions },
            { key: 'tgt', label: 'To (Target Node)', type: 'select', value: f.tgt, options: allNodeOptions },
            { key: 'val', label: 'Flow Volume / Value', type: 'number', min: 1, step: 10, value: f.val },
            { key: 'color', label: Utils.FIELD_LABELS.lineColor, type: 'color', value: flowColor },
            { key: 'connector', label: Utils.FIELD_LABELS.connector, type: 'select', value: connStyle, options: Utils.CONNECTOR_OPTIONS }
          ],
          onSave: (vals) => {
            const newFlowKey = `${vals.src}->${vals.tgt}`;
            MultiDiagramVisualizer.setColor(newFlowKey, vals.color);
            MultiDiagramVisualizer.setColor(`${newFlowKey}_conn`, vals.connector);
            MultiDiagramVisualizer.syncColorToCode(newFlowKey, vals.color);
            MultiDiagramVisualizer.updateCodeLine((curCode) => {
              const lines = curCode.split('\n');
              for (let i = 0; i < lines.length; i++) {
                const parts = lines[i].split(',').map(s => s.trim());
                if (parts.length >= 3) {
                  if (parts[0].toLowerCase() === f.src.toLowerCase() && parts[1].toLowerCase() === f.tgt.toLowerCase()) {
                    const lead = lines[i].match(/^(\s*)/)[1] || '  ';
                    lines[i] = `${lead}${vals.src}, ${vals.tgt}, ${vals.val}`;
                    break;
                  }
                }
              }
              return lines.join('\n');
            });
          }
        });
      }
    });

    edgesLayer.appendChild(path);
  });
});
MultiDiagramVisualizer.register('sankey-beta', MultiDiagramVisualizer.renderers.get('sankey'));
