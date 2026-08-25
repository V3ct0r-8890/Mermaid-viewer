// --- PERFECT CLASS DIAGRAM VISUALIZER ---
MultiDiagramVisualizer.register('classdiagram', function(code, nodesLayer, edgesLayer, isDark) {
  const primaryText = isDark ? '#FFFFFF' : '#1F2937';
  const textColor = isDark ? '#E0E0E0' : '#374151';
  const cardBg = isDark ? '#222538' : '#EEF0FF';
  const cardBorder = isDark ? '#7986CB' : '#9FA8DA';
  const dividerColor = isDark ? '#5C6BC0' : '#C5CAE9';
  const linkColor = isDark ? '#90CAF9' : '#374151';
  const selTitle = (typeof AppController !== 'undefined' && AppController.instance && AppController.instance.selectedVisualObject) ? AppController.instance.selectedVisualObject.title : null;
  const selGlow = 'drop-shadow(0 0 6px rgba(33, 150, 243, 0.8))';

  // 1. DYNAMIC PARSER FOR CLASS DIAGRAM
  const rawLines = (code || '').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('%%') && !l.startsWith('classDiagram'));

  const classesMap = new Map();
  const relations = [];

  const ensureClass = (name) => {
    if (!classesMap.has(name)) {
      classesMap.set(name, {
        name,
        attributes: [],
        methods: []
      });
    }
    return classesMap.get(name);
  };

  let curClass = null;

  rawLines.forEach(line => {
    const relMatch1 = line.match(/^([A-Za-z0-9_]+)\s*<\|--\s*([A-Za-z0-9_]+)/);
    if (relMatch1) {
      const superCls = relMatch1[1];
      const subCls = relMatch1[2];
      ensureClass(superCls);
      ensureClass(subCls);
      relations.push({ superCls, subCls });
      return;
    }

    const relMatch2 = line.match(/^([A-Za-z0-9_]+)\s*--\|>\s*([A-Za-z0-9_]+)/);
    if (relMatch2) {
      const subCls = relMatch2[1];
      const superCls = relMatch2[2];
      ensureClass(superCls);
      ensureClass(subCls);
      relations.push({ superCls, subCls });
      return;
    }

    const classBlockMatch = line.match(/^class\s+([A-Za-z0-9_]+)\s*\{?/i);
    if (classBlockMatch) {
      curClass = ensureClass(classBlockMatch[1]);
      if (!line.includes('{')) curClass = null;
      return;
    }

    if (line === '}') {
      curClass = null;
      return;
    }

    const memberMatch = line.match(/^([A-Za-z0-9_]+)\s*:\s*(.+)$/);
    if (memberMatch) {
      const cls = ensureClass(memberMatch[1]);
      const member = memberMatch[2].trim();
      if (member.includes('(')) {
        cls.methods.push(member);
      } else {
        cls.attributes.push(member);
      }
      return;
    }

    if (curClass) {
      const member = line.trim();
      if (member.includes('(')) {
        curClass.methods.push(member);
      } else {
        curClass.attributes.push(member);
      }
    }
  });

  if (classesMap.size === 0) {
    const a = ensureClass('Animal');
    a.attributes = ['+int age', '+String gender'];
    a.methods = ['+isMammal()', '+mate()'];

    const d = ensureClass('Duck');
    d.attributes = ['+String beakColor'];
    d.methods = ['+swim()', '+quack()'];

    const f = ensureClass('Fish');
    f.attributes = ['-int sizeInFeet'];
    f.methods = ['-canEat()'];

    const z = ensureClass('Zebra');
    z.attributes = ['+bool is_wild'];
    z.methods = ['+run()'];

    relations.push({ superCls: 'Animal', subCls: 'Duck' });
    relations.push({ superCls: 'Animal', subCls: 'Fish' });
    relations.push({ superCls: 'Animal', subCls: 'Zebra' });
  }

  // 2. PRECISE UML POSITIONS
  const allClasses = Array.from(classesMap.values());
  const superClasses = allClasses.filter(c => relations.some(r => r.superCls === c.name) && !relations.some(r => r.subCls === c.name));
  const subClasses = allClasses.filter(c => !superClasses.includes(c));

  const defaultPositions = new Map();

  // Position Super Class (Animal) at top center
  const mainSuper = superClasses[0] || allClasses[0];
  if (mainSuper) {
    defaultPositions.set(mainSuper.name, { x: 350, y: 40, w: 200 });
  }

  // Position 3 Subclasses side by side
  // Left: Duck, Center: Fish (directly aligned with Animal), Right: Zebra
  defaultPositions.set('Duck', { x: 60, y: 390, w: 180 });
  defaultPositions.set('Fish', { x: 360, y: 390, w: 180 });
  defaultPositions.set('Zebra', { x: 660, y: 390, w: 180 });

  // Fallback for any extra classes
  let extraIdx = 0;
  subClasses.forEach(sc => {
    if (!defaultPositions.has(sc.name)) {
      defaultPositions.set(sc.name, { x: 60 + (extraIdx++) * 220, y: 390, w: 180 });
    }
  });

  const classDimensions = new Map();
  allClasses.forEach(cls => {
    const defPos = defaultPositions.get(cls.name) || { x: 100, y: 100, w: 180 };
    const headerH = 38;
    const attrH = Math.max(30, cls.attributes.length * 22 + 12);
    const methH = Math.max(30, cls.methods.length * 22 + 12);
    const totalH = headerH + attrH + methH;
    classDimensions.set(cls.name, {
      x: defPos.x,
      y: defPos.y,
      w: defPos.w,
      h: totalH,
      headerH,
      attrH,
      methH
    });
  });

  // 3. RENDER UML GENERALIZATION INHERITANCE CONNECTORS (<|--)
  relations.forEach(r => {
    const sDim = classDimensions.get(r.superCls);
    const subDim = classDimensions.get(r.subCls);
    if (!sDim || !subDim) return;

    const sPos = MultiDiagramVisualizer.getPosition(r.superCls, sDim.x, sDim.y);
    const subPos = MultiDiagramVisualizer.getPosition(r.subCls, subDim.x, subDim.y);

    const sW = sDim.w;
    const sH = sDim.h;
    const subW = subDim.w;

    let pathD, triPoints;

    const subCenterX = subPos.x + subW / 2;
    const superCenterX = sPos.x + sW / 2;

    if (subCenterX < superCenterX - 50) {
      // Left Branch (Duck -> Animal left side)
      const xStart = subPos.x + subW * 0.75;
      const yStart = subPos.y;
      const tx = sPos.x;
      const ty = sPos.y + sH * 0.82;

      triPoints = `${tx},${ty} ${tx - 14},${ty - 7} ${tx - 14},${ty + 7}`;
      const lineEndX = tx - 14;
      const lineEndY = ty;

      pathD = `M ${xStart} ${yStart} C ${xStart} ${yStart - 60}, ${lineEndX - 40} ${lineEndY + 30}, ${lineEndX} ${lineEndY}`;
    } else if (subCenterX > superCenterX + 50) {
      // Right Branch (Zebra -> Animal right side)
      const xStart = subPos.x + subW * 0.25;
      const yStart = subPos.y;
      const tx = sPos.x + sW;
      const ty = sPos.y + sH * 0.82;

      triPoints = `${tx},${ty} ${tx + 14},${ty - 7} ${tx + 14},${ty + 7}`;
      const lineEndX = tx + 14;
      const lineEndY = ty;

      pathD = `M ${xStart} ${yStart} C ${xStart} ${yStart - 60}, ${lineEndX + 40} ${lineEndY + 30}, ${lineEndX} ${lineEndY}`;
    } else {
      // Direct Center Vertical (Fish -> Animal bottom center)
      const xStart = subPos.x + subW / 2;
      const yStart = subPos.y;
      const tx = sPos.x + sW / 2;
      const ty = sPos.y + sH;

      triPoints = `${tx},${ty} ${tx - 7},${ty + 14} ${tx + 7},${ty + 14}`;
      const lineEndX = tx;
      const lineEndY = ty + 14;

      pathD = `M ${xStart} ${yStart} L ${lineEndX} ${lineEndY}`;
    }

    const relG = document.createElementNS('http://www.w3.org/2000/svg', 'g');

    const hitbox = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hitbox.setAttribute('d', pathD);
    hitbox.setAttribute('fill', 'none');
    hitbox.setAttribute('stroke', 'transparent');
    hitbox.setAttribute('stroke-width', '24');
    hitbox.style.cursor = 'pointer';
    relG.appendChild(hitbox);

    const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathEl.setAttribute('d', pathD);
    pathEl.setAttribute('fill', 'none');
    pathEl.setAttribute('stroke', linkColor);
    pathEl.setAttribute('stroke-width', '1.4');
    relG.appendChild(pathEl);

    const tri = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    tri.setAttribute('points', triPoints);
    tri.setAttribute('fill', isDark ? '#222538' : '#FFFFFF');
    tri.setAttribute('stroke', linkColor);
    tri.setAttribute('stroke-width', '1.4');
    relG.appendChild(tri);

    edgesLayer.appendChild(relG);
  });

  // 4. RENDER 3-COMPARTMENT UML CLASS CARDS
  allClasses.forEach(cls => {
    const dim = classDimensions.get(cls.name);
    const pos = MultiDiagramVisualizer.getPosition(cls.name, dim.x, dim.y);
    const fillColor = MultiDiagramVisualizer.getColor(cls.name, cardBg);
    const fontColor = MultiDiagramVisualizer.getColor(`${cls.name}_font`, primaryText);
    const borderColor = MultiDiagramVisualizer.getColor(`${cls.name}_border`, cardBorder);

    const isSelected = (cls.name === selTitle);
    const classG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    classG.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
    classG.style.cursor = 'grab';

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', `${dim.w}`);
    rect.setAttribute('height', `${dim.h}`);
    rect.setAttribute('rx', '2');
    rect.setAttribute('fill', fillColor);
    rect.setAttribute('stroke', isSelected ? 'var(--selection-color)' : borderColor);
    rect.setAttribute('stroke-width', isSelected ? '2.5' : '1.4');
    if (isSelected) rect.style.filter = selGlow;
    classG.appendChild(rect);

    // Header
    const titleTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    titleTxt.setAttribute('x', `${dim.w / 2}`);
    titleTxt.setAttribute('y', '24');
    titleTxt.setAttribute('text-anchor', 'middle');
    titleTxt.setAttribute('fill', fontColor);
    titleTxt.setAttribute('font-size', '14.5px');
    titleTxt.setAttribute('font-weight', '700');
    titleTxt.textContent = cls.name;
    classG.appendChild(titleTxt);

    // Divider 1
    const div1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    div1.setAttribute('x1', '0');
    div1.setAttribute('y1', `${dim.headerH}`);
    div1.setAttribute('x2', `${dim.w}`);
    div1.setAttribute('y2', `${dim.headerH}`);
    div1.setAttribute('stroke', borderColor);
    div1.setAttribute('stroke-width', '1.2');
    classG.appendChild(div1);

    // Attributes
    cls.attributes.forEach((attr, idx) => {
      const aTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      aTxt.setAttribute('x', '14');
      aTxt.setAttribute('y', `${dim.headerH + 22 + idx * 22}`);
      aTxt.setAttribute('fill', textColor);
      aTxt.setAttribute('font-size', '13px');
      aTxt.setAttribute('font-weight', '500');
      aTxt.setAttribute('font-family', 'monospace');
      aTxt.textContent = attr;
      classG.appendChild(aTxt);
    });

    // Divider 2
    const div2Y = dim.headerH + dim.attrH;
    const div2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    div2.setAttribute('x1', '0');
    div2.setAttribute('y1', `${div2Y}`);
    div2.setAttribute('x2', `${dim.w}`);
    div2.setAttribute('y2', `${div2Y}`);
    div2.setAttribute('stroke', borderColor);
    div2.setAttribute('stroke-width', '1.2');
    classG.appendChild(div2);

    // Methods
    cls.methods.forEach((meth, idx) => {
      const mTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      mTxt.setAttribute('x', '14');
      mTxt.setAttribute('y', `${div2Y + 22 + idx * 22}`);
      mTxt.setAttribute('fill', textColor);
      mTxt.setAttribute('font-size', '13px');
      mTxt.setAttribute('font-weight', '500');
      mTxt.setAttribute('font-family', 'monospace');
      mTxt.textContent = meth;
      classG.appendChild(mTxt);
    });

    MultiDiagramVisualizer.makeDraggable(
      classG,
      cls.name,
      () => MultiDiagramVisualizer.getPosition(cls.name, dim.x, dim.y),
      (nx, ny) => MultiDiagramVisualizer.setPosition(cls.name, nx, ny)
    );

    classG.addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof AppController !== 'undefined' && AppController.instance) {
        AppController.instance.selectVisualObject({
          type: 'UML Class',
          title: cls.name,
          fields: [
            { key: 'name', label: 'Class Name', type: 'text', value: cls.name },
            { key: 'font', label: '1. Font / Text Color', type: 'color', value: fontColor },
            { key: 'fill', label: '2. Node Fill Color', type: 'color', value: fillColor },
            { key: 'border', label: '3. Node Border / Stroke Color', type: 'color', value: borderColor }
          ],
          onSave: (vals) => {
            MultiDiagramVisualizer.setColor(cls.name, vals.fill);
            MultiDiagramVisualizer.setColor(`${cls.name}_font`, vals.font);
            MultiDiagramVisualizer.setColor(`${cls.name}_border`, vals.border);
            MultiDiagramVisualizer.syncColorToCode(cls.name, vals.fill);
            MultiDiagramVisualizer.syncColorToCode(`${cls.name}_font`, vals.font);
            MultiDiagramVisualizer.syncColorToCode(`${cls.name}_border`, vals.border);
          }
        });
      }
    });

    nodesLayer.appendChild(classG);
  });
});
MultiDiagramVisualizer.register('classDiagram', MultiDiagramVisualizer.renderers.get('classdiagram'));
