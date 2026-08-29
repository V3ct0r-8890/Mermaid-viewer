// --- PERFECT DYNAMIC CLASS DIAGRAM VISUALIZER ---
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
    if (!name) return null;
    const cleanName = name.replace(/^[<"']|[>"']$/g, '').trim();
    if (!cleanName) return null;
    if (!classesMap.has(cleanName)) {
      classesMap.set(cleanName, {
        name: cleanName,
        attributes: [],
        methods: []
      });
    }
    return classesMap.get(cleanName);
  };

  let curClass = null;

  rawLines.forEach(line => {
    // Check relations: e.g. Super <|-- Sub, ClassA *-- ClassB, ClassA --> ClassB, ClassA ..|> ClassB, etc.
    const relMatch = line.match(/^([A-Za-z0-9_]+)\s*(<\|--|--\|>|\*--|--\*|o--|--o|-->|<--|\.\.\|>|<\|\.\.|\.\.>|<\.\.|\.\.|--)\s*([A-Za-z0-9_]+)(?:\s*:\s*(.+))?$/);
    if (relMatch) {
      let src = relMatch[1];
      let relType = relMatch[2];
      let tgt = relMatch[3];
      const label = relMatch[4] ? relMatch[4].trim() : '';

      // Normalize super/sub for inheritance
      let superCls = src;
      let subCls = tgt;
      let normType = relType;

      if (relType === '--|>') {
        superCls = tgt;
        subCls = src;
        normType = '<|--';
      }

      ensureClass(src);
      ensureClass(tgt);
      relations.push({
        src,
        tgt,
        superCls,
        subCls,
        relType: normType,
        label
      });
      return;
    }

    // Class block start: e.g. class Animal { or class Animal
    const classBlockMatch = line.match(/^class\s+([A-Za-z0-9_]+)\s*(\{)?/i);
    if (classBlockMatch) {
      const c = ensureClass(classBlockMatch[1]);
      if (classBlockMatch[2] === '{') {
        curClass = c;
      } else {
        curClass = null;
      }
      return;
    }

    if (line === '}') {
      curClass = null;
      return;
    }

    // Member definition: e.g. Animal : +int age or Animal : +mate()
    const memberMatch = line.match(/^([A-Za-z0-9_]+)\s*:\s*(.+)$/);
    if (memberMatch) {
      const cls = ensureClass(memberMatch[1]);
      if (cls) {
        const member = memberMatch[2].trim();
        if (member.includes('(')) {
          if (!cls.methods.includes(member)) cls.methods.push(member);
        } else {
          if (!cls.attributes.includes(member)) cls.attributes.push(member);
        }
      }
      return;
    }

    // Inside class block
    if (curClass) {
      const member = line.trim();
      if (member && !member.startsWith('}')) {
        if (member.includes('(')) {
          if (!curClass.methods.includes(member)) curClass.methods.push(member);
        } else {
          if (!curClass.attributes.includes(member)) curClass.attributes.push(member);
        }
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

    relations.push({ src: 'Animal', tgt: 'Duck', superCls: 'Animal', subCls: 'Duck', relType: '<|--', label: '' });
    relations.push({ src: 'Animal', tgt: 'Fish', superCls: 'Animal', subCls: 'Fish', relType: '<|--', label: '' });
    relations.push({ src: 'Animal', tgt: 'Zebra', superCls: 'Animal', subCls: 'Zebra', relType: '<|--', label: '' });
  }

  // 2. DYNAMIC TOPOLOGICAL / GRID LAYOUT
  const allClasses = Array.from(classesMap.values());
  const defaultPositions = new Map();

  // Check if standard template classes exist
  const hasTemplateClasses = classesMap.has('Animal') && classesMap.has('Duck') && classesMap.has('Fish') && classesMap.has('Zebra');

  if (hasTemplateClasses) {
    defaultPositions.set('Animal', { x: 350, y: 40, w: 200 });
    defaultPositions.set('Duck', { x: 60, y: 390, w: 180 });
    defaultPositions.set('Fish', { x: 360, y: 390, w: 180 });
    defaultPositions.set('Zebra', { x: 660, y: 390, w: 180 });
  }

  // Rank-based auto-positioning for all classes
  const inDegree = new Map();
  const outDegree = new Map();
  allClasses.forEach(c => {
    inDegree.set(c.name, 0);
    outDegree.set(c.name, 0);
  });

  relations.forEach(r => {
    outDegree.set(r.src, (outDegree.get(r.src) || 0) + 1);
    inDegree.set(r.tgt, (inDegree.get(r.tgt) || 0) + 1);
  });

  // Calculate Ranks
  const ranks = new Map();
  allClasses.forEach(c => {
    if (inDegree.get(c.name) === 0) {
      ranks.set(c.name, 0);
    }
  });

  let changed = true;
  let iter = 0;
  while (changed && iter < 10) {
    changed = false;
    iter++;
    relations.forEach(r => {
      const srcRank = ranks.get(r.src) || 0;
      const tgtRank = ranks.get(r.tgt) || 0;
      if (tgtRank <= srcRank) {
        ranks.set(r.tgt, srcRank + 1);
        changed = true;
      }
    });
  }

  const rankGroups = new Map();
  allClasses.forEach(c => {
    const rk = ranks.get(c.name) || 0;
    if (!rankGroups.has(rk)) rankGroups.set(rk, []);
    rankGroups.get(rk).push(c);
  });

  let extraY = 40;
  const sortedRanks = Array.from(rankGroups.keys()).sort((a, b) => a - b);
  sortedRanks.forEach(rk => {
    const group = rankGroups.get(rk);
    const count = group.length;
    const totalW = count * 220;
    const startX = Math.max(60, 440 - totalW / 2);

    group.forEach((c, idx) => {
      if (!defaultPositions.has(c.name)) {
        defaultPositions.set(c.name, {
          x: startX + idx * 240,
          y: extraY,
          w: 190
        });
      }
    });
    extraY += 320;
  });

  const classDimensions = new Map();
  allClasses.forEach(cls => {
    const defPos = defaultPositions.get(cls.name) || { x: 100, y: 100, w: 190 };
    const maxTextLen = Math.max(
      cls.name.length,
      ...cls.attributes.map(a => a.length),
      ...cls.methods.map(m => m.length),
      12
    );
    const cardW = Math.max(180, maxTextLen * 7.5 + 32);
    const headerH = 38;
    const attrH = Math.max(28, cls.attributes.length * 22 + 10);
    const methH = Math.max(28, cls.methods.length * 22 + 10);
    const totalH = headerH + attrH + methH;

    classDimensions.set(cls.name, {
      x: defPos.x,
      y: defPos.y,
      w: cardW,
      h: totalH,
      headerH,
      attrH,
      methH
    });
  });

  // 3. RENDER ALL RELATIONS & CONNECTORS
  relations.forEach((r, rIdx) => {
    const srcDim = classDimensions.get(r.src);
    const tgtDim = classDimensions.get(r.tgt);
    if (!srcDim || !tgtDim) return;

    const sPos = MultiDiagramVisualizer.getPosition(r.src, srcDim.x, srcDim.y);
    const tPos = MultiDiagramVisualizer.getPosition(r.tgt, tgtDim.x, tgtDim.y);

    const sW = srcDim.w;
    const sH = srcDim.h;
    const tW = tgtDim.w;
    const tH = tgtDim.h;

    const sCenterX = sPos.x + sW / 2;
    const sCenterY = sPos.y + sH / 2;
    const tCenterX = tPos.x + tW / 2;
    const tCenterY = tPos.y + tH / 2;

    let pathD, markerPoints, isDiamond = false, isFilled = false;
    const linkKey = `rel_${r.src}_to_${r.tgt}_${rIdx}`;
    const linkTitle = `${r.src} ${r.relType} ${r.tgt}`;
    const isRelSel = (selTitle === linkTitle || selTitle === linkKey);

    const rColor = MultiDiagramVisualizer.getColor(linkKey, linkColor);
    const rWidth = MultiDiagramVisualizer.getColor(`${linkKey}_width`, '1.5');
    const isDashed = r.relType.startsWith('..') || r.relType.endsWith('..');

    if (tCenterY > sCenterY + 50) {
      // Top to Bottom
      const startX = sCenterX;
      const startY = sPos.y + sH;
      const endX = tCenterX;
      const endY = tPos.y;
      const midY = (startY + endY) / 2;

      pathD = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY - 12}`;
      markerPoints = `${endX},${endY} ${endX - 7},${endY - 14} ${endX + 7},${endY - 14}`;
    } else if (sCenterY > tCenterY + 50) {
      // Bottom to Top (Inheritance Sub -> Super)
      const startX = sCenterX;
      const startY = sPos.y;
      const endX = tCenterX;
      const endY = tPos.y + tH;
      const midY = (startY + endY) / 2;

      pathD = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY + 12}`;
      markerPoints = `${endX},${endY} ${endX - 7},${endY + 14} ${endX + 7},${endY + 14}`;
    } else {
      // Left / Right side by side
      const isLeft = sCenterX > tCenterX;
      const startX = isLeft ? sPos.x : sPos.x + sW;
      const startY = sCenterY;
      const endX = isLeft ? tPos.x + tW : tPos.x;
      const endY = tCenterY;
      const midX = (startX + endX) / 2;

      pathD = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${isLeft ? endX + 12 : endX - 12} ${endY}`;
      markerPoints = isLeft
        ? `${endX},${endY} ${endX + 14},${endY - 7} ${endX + 14},${endY + 7}`
        : `${endX},${endY} ${endX - 14},${endY - 7} ${endX - 14},${endY + 7}`;
    }

    const relG = document.createElementNS('http://www.w3.org/2000/svg', 'g');

    // Click Hitbox
    const hitbox = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hitbox.setAttribute('d', pathD);
    hitbox.setAttribute('fill', 'none');
    hitbox.setAttribute('stroke', 'transparent');
    hitbox.setAttribute('stroke-width', '24');
    hitbox.style.cursor = 'pointer';
    relG.appendChild(hitbox);

    // Visible Curve
    const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathEl.setAttribute('d', pathD);
    pathEl.setAttribute('fill', 'none');
    pathEl.setAttribute('stroke', isRelSel ? 'var(--selection-color)' : rColor);
    pathEl.setAttribute('stroke-width', isRelSel ? `${parseFloat(rWidth) + 1.2}` : rWidth);
    if (isDashed) pathEl.setAttribute('stroke-dasharray', '5 4');
    if (isRelSel) pathEl.style.filter = selGlow;
    relG.appendChild(pathEl);

    // Arrow Marker Polygon (UML Triangle)
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    marker.setAttribute('points', markerPoints);
    marker.setAttribute('fill', isDark ? '#222538' : '#FFFFFF');
    marker.setAttribute('stroke', isRelSel ? 'var(--selection-color)' : rColor);
    marker.setAttribute('stroke-width', rWidth);
    relG.appendChild(marker);

    // Optional Label
    if (r.label) {
      const midLabelX = (sCenterX + tCenterX) / 2;
      const midLabelY = (sCenterY + tCenterY) / 2;
      const lbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      lbl.setAttribute('x', `${midLabelX}`);
      lbl.setAttribute('y', `${midLabelY}`);
      lbl.setAttribute('text-anchor', 'middle');
      lbl.setAttribute('fill', textColor);
      lbl.setAttribute('font-size', '11px');
      lbl.setAttribute('font-style', 'italic');
      lbl.textContent = r.label;
      relG.appendChild(lbl);
    }

    relG.addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof AppController !== 'undefined' && AppController.instance) {
        AppController.instance.selectVisualObject({
          type: 'UML Relationship',
          title: linkTitle,
          fields: [
            { key: 'type', label: 'Relationship Type', type: 'select', value: r.relType, options: [
                { value: '<|--', label: 'Inheritance / Generalization (<|--)' },
                { value: '*--', label: 'Composition (*--)' },
                { value: 'o--', label: 'Aggregation (o--)' },
                { value: '-->', label: 'Association (-->)' },
                { value: '..|>', label: 'Realization (..|>)' },
                { value: '..>', label: 'Dependency (..>)' }
            ]},
            { key: 'color', label: 'Line & Arrow Color', type: 'color', value: rColor }
          ],
          onSave: (vals) => {
            MultiDiagramVisualizer.setColor(linkKey, vals.color);
            MultiDiagramVisualizer.syncColorToCode(linkKey, vals.color);
            MultiDiagramVisualizer.updateCodeLine((curCode) => {
              const lines = curCode.split('\n');
              for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes(r.src) && lines[i].includes(r.tgt)) {
                  const lead = lines[i].match(/^\s*/)[0] || '    ';
                  lines[i] = `${lead}${r.src} ${vals.type || '<|--'} ${r.tgt}${r.label ? ` : ${r.label}` : ''}`;
                  break;
                }
              }
              return lines.join('\n');
            });
          }
        });
      }
    });

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
    rect.setAttribute('rx', '4');
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
      aTxt.setAttribute('y', `${dim.headerH + 20 + idx * 22}`);
      aTxt.setAttribute('fill', textColor);
      aTxt.setAttribute('font-size', '12.5px');
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
      mTxt.setAttribute('y', `${div2Y + 20 + idx * 22}`);
      mTxt.setAttribute('fill', textColor);
      mTxt.setAttribute('font-size', '12.5px');
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
