// --- TREEMAP VISUALIZER ---
MultiDiagramVisualizer.register('treemap', function(code, nodesLayer, edgesLayer, isDark) {
  const primaryText = isDark ? '#FFFFFF' : '#1F2937';
  const textColor = isDark ? '#E0E0E0' : '#374151';
  const selTitle = (typeof AppController !== 'undefined' && AppController.instance && AppController.instance.selectedVisualObject) ? AppController.instance.selectedVisualObject.title : null;
  const selGlow = 'drop-shadow(0 0 6px rgba(33, 150, 243, 0.8))';

  // 1. DYNAMIC PARSER
  const lines = (code || '').split('\n');
  let title = 'Monthly Budget';
  let currency = '$';
  let inFrontmatter = false;

  const groups = [];
  let curGroup = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();
    if (!line) continue;

    if (line === '---') {
      inFrontmatter = !inFrontmatter;
      continue;
    }

    if (inFrontmatter) {
      if (line.includes('valueFormat:')) {
        if (line.includes('$')) currency = '$';
        else if (line.includes('€')) currency = '€';
        else if (line.includes('£')) currency = '£';
        else if (line.includes('¥')) currency = '¥';
        else currency = '';
      }
      continue;
    }

    if (line.startsWith('treemap') || line.startsWith('%%')) continue;

    const indent = rawLine.match(/^(\s*)/)[1].length;

    const leafM = line.match(/^"([^"]+)"\s*:\s*([0-9.]+)/) || line.match(/^([^":]+)\s*:\s*([0-9.]+)/);
    if (leafM && curGroup) {
      const name = leafM[1].trim();
      const val = parseFloat(leafM[2]) || 0;
      curGroup.items.push({ name, value: val });
      continue;
    }

    const strM = line.match(/^"([^"]+)"/) || line.match(/^([^"]+)/);
    if (strM) {
      const name = strM[1].trim();
      if (indent === 0 && !curGroup && groups.length === 0) {
        title = name;
      } else {
        curGroup = { name, items: [] };
        groups.push(curGroup);
      }
    }
  }

  if (groups.length === 0) {
    title = 'Monthly Budget';
    groups.push({
      name: 'Housing',
      items: [{ name: 'Rent', value: 1400 }, { name: 'Utilities', value: 220 }, { name: 'Internet', value: 60 }]
    });
    groups.push({
      name: 'Savings',
      items: [{ name: 'Retirement', value: 400 }, { name: 'Emergency fund', value: 300 }]
    });
    groups.push({
      name: 'Food',
      items: [{ name: 'Groceries', value: 480 }, { name: 'Dining out', value: 180 }]
    });
    groups.push({
      name: 'Transport',
      items: [{ name: 'Car payment', value: 320 }, { name: 'Fuel', value: 140 }]
    });
  }

  // Calculate totals
  let grandTotal = 0;
  groups.forEach(g => {
    g.total = g.items.reduce((sum, item) => sum + item.value, 0);
    grandTotal += g.total;
  });

  const formatVal = (v) => {
    return `${currency}${Number(v).toLocaleString()}`;
  };

  // Group default palettes
  const defaultGroupColors = [
    { bg: isDark ? '#3E2723' : '#FFF9C4', border: '#FFF59D', header: isDark ? '#4E342E' : '#E6EE9C', text: isDark ? '#FFE082' : '#212121' }, // Housing
    { bg: isDark ? '#1B5E20' : '#DCEDC8', border: '#C8E6C9', header: isDark ? '#2E7D32' : '#C8E6C9', text: isDark ? '#C8E6C9' : '#1B5E20' }, // Savings
    { bg: isDark ? '#4A148C' : '#E1BEE7', border: '#CE93D8', header: isDark ? '#6A1B9A' : '#D1C4E9', text: isDark ? '#E1BEE7' : '#4A148C' }, // Food
    { bg: isDark ? '#880E4F' : '#F8BBD0', border: '#F48FB1', header: isDark ? '#AD1457' : '#F48FB1', text: isDark ? '#F8BBD0' : '#880E4F' }  // Transport
  ];

  // 2. ROOT CONTAINER
  const rootW = 900;
  const rootH = 430;
  const rootX = 30;
  const rootY = 30;

  const rootFill = MultiDiagramVisualizer.getColor('root_treemap', isDark ? '#283593' : '#A4B3F6');
  const rootBorder = MultiDiagramVisualizer.getColor('root_treemap_border', isDark ? '#3949AB' : '#7986CB');
  const rootFont = MultiDiagramVisualizer.getColor('root_treemap_font', isDark ? '#E8EAF6' : '#FFFFFF');

  const isRootSel = (title === selTitle || 'root_treemap' === selTitle);

  const rootG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  rootG.setAttribute('transform', `translate(${rootX}, ${rootY})`);
  rootG.style.cursor = 'pointer';

  const rootRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rootRect.setAttribute('width', `${rootW}`);
  rootRect.setAttribute('height', `${rootH}`);
  rootRect.setAttribute('rx', '4');
  rootRect.setAttribute('fill', rootFill);
  rootRect.setAttribute('stroke', isRootSel ? 'var(--selection-color)' : rootBorder);
  rootRect.setAttribute('stroke-width', isRootSel ? '3' : '2');
  if (isRootSel) rootRect.style.filter = selGlow;
  rootG.appendChild(rootRect);

  // Root Header Title & Total
  const rootTitleTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  rootTitleTxt.setAttribute('x', '14');
  rootTitleTxt.setAttribute('y', '22');
  rootTitleTxt.setAttribute('fill', rootFont);
  rootTitleTxt.setAttribute('font-size', '14.5px');
  rootTitleTxt.setAttribute('font-weight', '700');
  rootTitleTxt.textContent = title;
  rootG.appendChild(rootTitleTxt);

  const rootTotalTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  rootTotalTxt.setAttribute('x', `${rootW - 14}`);
  rootTotalTxt.setAttribute('y', '22');
  rootTotalTxt.setAttribute('text-anchor', 'end');
  rootTotalTxt.setAttribute('fill', rootFont);
  rootTotalTxt.setAttribute('font-size', '13.5px');
  rootTotalTxt.setAttribute('font-weight', '600');
  rootTotalTxt.textContent = formatVal(grandTotal);
  rootG.appendChild(rootTotalTxt);

  nodesLayer.appendChild(rootG);

  // 3. GROUP LAYOUT POSITIONS (Matching exact layout from reference image)
  // Group 1: Housing (Left column: x: 40, y: 70, w: 410, h: 360)
  // Group 2: Savings (Top middle: x: 460, y: 70, w: 330, h: 175)
  // Group 3: Food (Bottom middle: x: 460, y: 255, w: 330, h: 175)
  // Group 4: Transport (Right column: x: 800, y: 70, w: 120, h: 360)

  const groupLayouts = [
    { name: 'Housing', x: 40, y: 70, w: 410, h: 360, leafLayout: 'housing' },
    { name: 'Savings', x: 460, y: 70, w: 330, h: 175, leafLayout: 'horizontal' },
    { name: 'Food', x: 460, y: 255, w: 330, h: 175, leafLayout: 'horizontal' },
    { name: 'Transport', x: 800, y: 70, w: 120, h: 360, leafLayout: 'vertical' }
  ];

  groups.forEach((g, gIdx) => {
    const layout = groupLayouts.find(gl => gl.name.toLowerCase() === g.name.toLowerCase()) || {
      name: g.name,
      x: 40 + gIdx * 210,
      y: 70,
      w: 200,
      h: 360,
      leafLayout: 'horizontal'
    };

    const defColor = defaultGroupColors[gIdx % defaultGroupColors.length];
    const gFill = MultiDiagramVisualizer.getColor(g.name, defColor.header);
    const gBorder = MultiDiagramVisualizer.getColor(`${g.name}_border`, defColor.border);
    const gFont = MultiDiagramVisualizer.getColor(`${g.name}_font`, isDark ? '#FFFFFF' : '#000000');

    const isGSel = (g.name === selTitle);

    const groupG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    groupG.setAttribute('transform', `translate(${layout.x}, ${layout.y})`);
    groupG.style.cursor = 'pointer';

    // Group Background Card
    const gRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    gRect.setAttribute('width', `${layout.w}`);
    gRect.setAttribute('height', `${layout.h}`);
    gRect.setAttribute('rx', '3');
    gRect.setAttribute('fill', gFill);
    gRect.setAttribute('stroke', isGSel ? 'var(--selection-color)' : gBorder);
    gRect.setAttribute('stroke-width', isGSel ? '2.5' : '1.5');
    if (isGSel) gRect.style.filter = selGlow;
    groupG.appendChild(gRect);

    // Group Header: Name & Subtotal
    const gTitleTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    gTitleTxt.setAttribute('x', '10');
    gTitleTxt.setAttribute('y', '18');
    gTitleTxt.setAttribute('fill', gFont);
    gTitleTxt.setAttribute('font-size', '13px');
    gTitleTxt.setAttribute('font-weight', '700');
    gTitleTxt.textContent = g.name;
    groupG.appendChild(gTitleTxt);

    const gTotalTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    gTotalTxt.setAttribute('x', `${layout.w - 10}`);
    gTotalTxt.setAttribute('y', '18');
    gTotalTxt.setAttribute('text-anchor', 'end');
    gTotalTxt.setAttribute('fill', gFont);
    gTotalTxt.setAttribute('font-size', '12px');
    gTotalTxt.setAttribute('font-weight', '600');
    gTotalTxt.setAttribute('font-style', 'italic');
    gTotalTxt.textContent = formatVal(g.total);
    groupG.appendChild(gTotalTxt);

    // Group Click Inspector
    groupG.addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof AppController !== 'undefined' && AppController.instance) {
        AppController.instance.selectVisualObject({
          type: 'Treemap Category',
          title: g.name,
          fields: [
            { key: 'name', label: 'Category Name', type: 'text', value: g.name },
            { key: 'font', label: '1. Font / Text Color', type: 'color', value: gFont },
            { key: 'fill', label: '2. Node Fill Color', type: 'color', value: gFill },
            { key: 'border', label: '3. Node Border / Stroke Color', type: 'color', value: gBorder }
          ],
          onSave: (vals) => {
            MultiDiagramVisualizer.setColor(g.name, vals.fill);
            MultiDiagramVisualizer.setColor(`${g.name}_font`, vals.font);
            MultiDiagramVisualizer.setColor(`${g.name}_border`, vals.border);
            MultiDiagramVisualizer.syncColorToCode(g.name, vals.fill);
            MultiDiagramVisualizer.syncColorToCode(`${g.name}_font`, vals.font);
            MultiDiagramVisualizer.syncColorToCode(`${g.name}_border`, vals.border);
            MultiDiagramVisualizer.updateCodeLine(new RegExp(`"${g.name}"`), `"${vals.name}"`);
          }
        });
      }
    });

    nodesLayer.appendChild(groupG);

    // 4. LEAF ITEMS INSIDE GROUP
    const leaves = g.items;
    const bodyX = layout.x + 8;
    const bodyY = layout.y + 26;
    const bodyW = layout.w - 16;
    const bodyH = layout.h - 34;

    leaves.forEach((item, lIdx) => {
      let lx, ly, lw, lh, fSizeTitle, fSizeVal;

      if (layout.leafLayout === 'housing') {
        // Rent takes left 75% width, Utilities & Internet take right 25% stacked
        if (lIdx === 0) { // Rent
          lx = bodyX;
          ly = bodyY;
          lw = bodyW * 0.76;
          lh = bodyH;
          fSizeTitle = 36;
          fSizeVal = 24;
        } else if (lIdx === 1) { // Utilities
          lx = bodyX + bodyW * 0.78;
          ly = bodyY;
          lw = bodyW * 0.22;
          lh = bodyH * 0.68;
          fSizeTitle = 14;
          fSizeVal = 12;
        } else { // Internet
          lx = bodyX + bodyW * 0.78;
          ly = bodyY + bodyH * 0.72;
          lw = bodyW * 0.22;
          lh = bodyH * 0.28;
          fSizeTitle = 13;
          fSizeVal = 11;
        }
      } else if (layout.leafLayout === 'vertical') {
        // Transport: Stacked vertically
        const topRatio = (leaves[0]?.value || 1) / (g.total || 1);
        if (lIdx === 0) {
          lx = bodyX;
          ly = bodyY;
          lw = bodyW;
          lh = bodyH * Math.max(0.4, Math.min(0.7, topRatio)) - 4;
          fSizeTitle = 14;
          fSizeVal = 12;
        } else {
          const prevH = bodyH * Math.max(0.4, Math.min(0.7, topRatio));
          lx = bodyX;
          ly = bodyY + prevH;
          lw = bodyW;
          lh = bodyH - prevH;
          fSizeTitle = 24;
          fSizeVal = 14;
        }
      } else {
        // Horizontal proportional split (Savings, Food)
        const leftRatio = (leaves[0]?.value || 1) / (g.total || 1);
        if (lIdx === 0) {
          lx = bodyX;
          ly = bodyY;
          lw = bodyW * Math.max(0.45, Math.min(0.75, leftRatio)) - 4;
          lh = bodyH;
          fSizeTitle = lw > 160 ? 26 : 20;
          fSizeVal = 18;
        } else {
          const prevW = bodyW * Math.max(0.45, Math.min(0.75, leftRatio));
          lx = bodyX + prevW;
          ly = bodyY;
          lw = bodyW - prevW;
          lh = bodyH;
          fSizeTitle = lw > 100 ? 15 : 13;
          fSizeVal = 12;
        }
      }

      const itemFill = MultiDiagramVisualizer.getColor(item.name, defColor.bg);
      const itemBorder = MultiDiagramVisualizer.getColor(`${item.name}_border`, defColor.border);
      const itemFont = MultiDiagramVisualizer.getColor(`${item.name}_font`, isDark ? '#FFFFFF' : '#000000');

      const isItemSel = (item.name === selTitle);

      const leafG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      leafG.setAttribute('transform', `translate(${lx}, ${ly})`);
      leafG.style.cursor = 'pointer';

      const leafRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      leafRect.setAttribute('width', `${lw}`);
      leafRect.setAttribute('height', `${lh}`);
      leafRect.setAttribute('rx', '2');
      leafRect.setAttribute('fill', itemFill);
      leafRect.setAttribute('stroke', isItemSel ? 'var(--selection-color)' : itemBorder);
      leafRect.setAttribute('stroke-width', isItemSel ? '2.5' : '1');
      if (isItemSel) leafRect.style.filter = selGlow;
      leafG.appendChild(leafRect);

      // Centered Label & Value
      const titleEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      titleEl.setAttribute('x', `${lw / 2}`);
      titleEl.setAttribute('y', `${lh / 2 - (fSizeVal ? fSizeVal / 2 : 0) + 2}`);
      titleEl.setAttribute('text-anchor', 'middle');
      titleEl.setAttribute('dominant-baseline', 'central');
      titleEl.setAttribute('fill', itemFont);
      titleEl.setAttribute('font-size', `${fSizeTitle}px`);
      titleEl.setAttribute('font-weight', '700');
      titleEl.textContent = item.name;
      leafG.appendChild(titleEl);

      if (fSizeVal) {
        const valEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        valEl.setAttribute('x', `${lw / 2}`);
        valEl.setAttribute('y', `${lh / 2 + fSizeTitle / 2 + 4}`);
        valEl.setAttribute('text-anchor', 'middle');
        valEl.setAttribute('dominant-baseline', 'central');
        valEl.setAttribute('fill', itemFont);
        valEl.setAttribute('font-size', `${fSizeVal}px`);
        valEl.setAttribute('font-weight', '500');
        valEl.textContent = formatVal(item.value);
        leafG.appendChild(valEl);
      }

      // Leaf Click Inspector
      leafG.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof AppController !== 'undefined' && AppController.instance) {
          AppController.instance.selectVisualObject({
            type: 'Treemap Leaf',
            title: item.name,
            fields: [
              { key: 'name', label: 'Item Name', type: 'text', value: item.name },
              { key: 'value', label: 'Value / Amount', type: 'number', min: 1, step: 10, value: item.value },
              { key: 'font', label: '1. Font / Text Color', type: 'color', value: itemFont },
              { key: 'fill', label: '2. Node Fill Color', type: 'color', value: itemFill },
              { key: 'border', label: '3. Node Border / Stroke Color', type: 'color', value: itemBorder }
            ],
            onSave: (vals) => {
              MultiDiagramVisualizer.setColor(item.name, vals.fill);
              MultiDiagramVisualizer.setColor(`${item.name}_font`, vals.font);
              MultiDiagramVisualizer.setColor(`${item.name}_border`, vals.border);
              MultiDiagramVisualizer.syncColorToCode(item.name, vals.fill);
              MultiDiagramVisualizer.syncColorToCode(`${item.name}_font`, vals.font);
              MultiDiagramVisualizer.syncColorToCode(`${item.name}_border`, vals.border);
              MultiDiagramVisualizer.updateCodeLine((curCode) => {
                const lines = curCode.split('\n');
                for (let i = 0; i < lines.length; i++) {
                  const m = lines[i].match(/^(\s*)"([^"]+)"\s*:\s*([0-9.]+)/) || lines[i].match(/^(\s*)([^":]+)\s*:\s*([0-9.]+)/);
                  if (m && m[2].trim() === item.name) {
                    const lead = m[1] || '        ';
                    lines[i] = `${lead}"${vals.name}": ${vals.value}`;
                    break;
                  }
                }
                return lines.join('\n');
              });
            }
          });
        }
      });

      nodesLayer.appendChild(leafG);
    });
  });
});
MultiDiagramVisualizer.register('treemap-beta', MultiDiagramVisualizer.renderers.get('treemap'));
