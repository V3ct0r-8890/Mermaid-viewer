// --- PERFECT DYNAMIC CLASS DIAGRAM VISUALIZER ---
MultiDiagramVisualizer.register('classdiagram', function(code, nodesLayer, edgesLayer, isDark) {
  const primaryText = isDark ? '#FFFFFF' : '#1F2937';
  const textColor = isDark ? '#E0E0E0' : '#374151';
  const cardBg = isDark ? '#222538' : '#EEF0FF';
  const cardBorder = isDark ? '#7986CB' : '#5C6BC0';
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
    const relMatch = line.match(/^([A-Za-z0-9_]+)\s*(<\|--|--\|>|\*--|--\*|o--|--o|-->|<--|\.\.\|>|<\|\.\.|\.\.>|<\.\.|\.\.|--)\s*([A-Za-z0-9_]+)(?:\s*:\s*(.+))?$/);
    if (relMatch) {
      const src = relMatch[1];
      const relType = relMatch[2];
      const tgt = relMatch[3];
      const label = relMatch[4] ? relMatch[4].trim() : '';

      ensureClass(src);
      ensureClass(tgt);
      relations.push({
        src,
        tgt,
        relType,
        label
      });
      return;
    }

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

    relations.push({ src: 'Animal', tgt: 'Duck', relType: '<|--', label: '' });
    relations.push({ src: 'Animal', tgt: 'Fish', relType: '<|--', label: '' });
    relations.push({ src: 'Animal', tgt: 'Zebra', relType: '<|--', label: '' });
  }

  // 2. DYNAMIC TOPOLOGICAL / GRID LAYOUT
  const allClasses = Array.from(classesMap.values());
  const defaultPositions = new Map();

  const hasTemplateClasses = classesMap.has('Animal') && classesMap.has('Duck') && classesMap.has('Fish') && classesMap.has('Zebra');

  if (hasTemplateClasses) {
    defaultPositions.set('Animal', { x: 350, y: 40, w: 200 });
    defaultPositions.set('Duck', { x: 60, y: 390, w: 180 });
    defaultPositions.set('Fish', { x: 360, y: 390, w: 180 });
    defaultPositions.set('Zebra', { x: 660, y: 390, w: 180 });
  }

  // Auto-positioning for all classes
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

  const nodeObstacles = allClasses.map(cls => {
    const dim = classDimensions.get(cls.name);
    const pos = MultiDiagramVisualizer.getPosition(cls.name, dim.x, dim.y);
    return { x: pos.x, y: pos.y, width: dim.w, height: dim.h };
  });
  const placedLabelRects = [];

  // 3. RENDER ALL RELATIONS & CONNECTORS (WITH ACCURATE UML ARROWHEAD ORIENTATIONS)
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

    const linkKey = `rel_${r.src}_to_${r.tgt}_${rIdx}`;
    const linkTitle = `${r.src} ${r.relType} ${r.tgt}`;
    const isRelSel = (selTitle === linkTitle || selTitle === linkKey);

    const rColor = MultiDiagramVisualizer.getColor(linkKey, linkColor);
    const rWidth = MultiDiagramVisualizer.getColor(`${linkKey}_width`, '1.5');
    const isDashed = r.relType.startsWith('..') || r.relType.endsWith('..');

    // Determine which end the marker belongs to:
    // Left-marker types (pointing to src): <|--, <|.., *--, o--, <--, <..
    // Right-marker types (pointing to tgt): --|>, ..|>, --*, --o, -->, ..>
    const isMarkerAtSrc = ['<|--', '<|..', '*--', 'o--', '<--', '<..'].includes(r.relType);
    const isTriangle = ['<|--', '--|>', '<|..', '..|>'].includes(r.relType);
    const isDiamond = ['*--', '--*', 'o--', '--o'].includes(r.relType);
    const isSolidDiamond = ['*--', '--*'].includes(r.relType);

    // Arrow line start (fromNode) and end (toNode with marker)
    let fromCenterX, fromY, toCenterX, toY, pathD, markerPoints;
    // Whether the chosen routing case runs between stacked classes (vertical) or
    // side-by-side ones (horizontal) — used when re-routing to another connector style.
    let connOrient = 'v';

    if (isMarkerAtSrc) {
      // Line travels from TGT (subclass) to SRC (superclass), arrow points into SRC
      if (tCenterY > sCenterY + 40) {
        // TGT is below SRC -> line goes from TGT top to SRC bottom
        const startX = tCenterX;
        const startY = tPos.y;
        const endX = sCenterX;
        const endY = sPos.y + sH;
        const midY = (startY + endY) / 2;

        pathD = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY + 14}`;
        markerPoints = `${endX},${endY} ${endX - 7},${endY + 14} ${endX + 7},${endY + 14}`;
      } else if (sCenterY > tCenterY + 40) {
        // TGT is above SRC -> line goes from TGT bottom to SRC top
        const startX = tCenterX;
        const startY = tPos.y + tH;
        const endX = sCenterX;
        const endY = sPos.y;
        const midY = (startY + endY) / 2;

        pathD = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY - 14}`;
        markerPoints = `${endX},${endY} ${endX - 7},${endY - 14} ${endX + 7},${endY - 14}`;
      } else {
        // Side by side
        connOrient = 'h';
        const isTgtRight = tCenterX > sCenterX;
        const startX = isTgtRight ? tPos.x : tPos.x + tW;
        const startY = tCenterY;
        const endX = isTgtRight ? sPos.x + sW : sPos.x;
        const endY = sCenterY;
        const midX = (startX + endX) / 2;

        pathD = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${isTgtRight ? endX + 14 : endX - 14} ${endY}`;
        markerPoints = isTgtRight
          ? `${endX},${endY} ${endX + 14},${endY - 7} ${endX + 14},${endY + 7}`
          : `${endX},${endY} ${endX - 14},${endY - 7} ${endX - 14},${endY + 7}`;
      }
    } else {
      // Line travels from SRC to TGT, arrow points into TGT
      if (tCenterY > sCenterY + 40) {
        // TGT is below SRC -> line goes from SRC bottom to TGT top
        const startX = sCenterX;
        const startY = sPos.y + sH;
        const endX = tCenterX;
        const endY = tPos.y;
        const midY = (startY + endY) / 2;

        pathD = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY - 14}`;
        markerPoints = `${endX},${endY} ${endX - 7},${endY - 14} ${endX + 7},${endY - 14}`;
      } else if (sCenterY > tCenterY + 40) {
        // TGT is above SRC -> line goes from SRC top to TGT bottom
        const startX = sCenterX;
        const startY = sPos.y;
        const endX = tCenterX;
        const endY = tPos.y + tH;
        const midY = (startY + endY) / 2;

        pathD = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY + 14}`;
        markerPoints = `${endX},${endY} ${endX - 7},${endY + 14} ${endX + 7},${endY + 14}`;
      } else {
        // Side by side
        connOrient = 'h';
        const isSrcRight = sCenterX > tCenterX;
        const startX = isSrcRight ? sPos.x : sPos.x + sW;
        const startY = sCenterY;
        const endX = isSrcRight ? tPos.x + tW : tPos.x;
        const endY = tCenterY;
        const midX = (startX + endX) / 2;

        pathD = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${isSrcRight ? endX + 14 : endX - 14} ${endY}`;
        markerPoints = isSrcRight
          ? `${endX},${endY} ${endX + 14},${endY - 7} ${endX + 14},${endY + 7}`
          : `${endX},${endY} ${endX - 14},${endY - 7} ${endX - 14},${endY + 7}`;
      }
    }

    // Connector routing. Every case above draws a bezier that stops short of the UML
    // marker, so re-routing reuses those same two anchor points (read back off the
    // path) and the marker keeps sitting exactly where it already does.
    const connStyle = Utils.normalizeConnector(MultiDiagramVisualizer.getColor(`${linkKey}_conn`, 'curve'), 'curve');
    if (connStyle !== 'curve') {
      const anchors = pathD.match(/^M\s+([-\d.]+)\s+([-\d.]+)\s+C\s+.*,\s*([-\d.]+)\s+([-\d.]+)$/);
      if (anchors) {
        pathD = Utils.buildConnectorPath(
          parseFloat(anchors[1]), parseFloat(anchors[2]),
          parseFloat(anchors[3]), parseFloat(anchors[4]),
          connStyle,
          { orientation: connOrient }
        );
      }
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

    // Visible Line
    const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathEl.setAttribute('d', pathD);
    pathEl.setAttribute('fill', 'none');
    pathEl.setAttribute('stroke', isRelSel ? 'var(--selection-color)' : rColor);
    pathEl.setAttribute('stroke-width', isRelSel ? `${parseFloat(rWidth) + 1.2}` : rWidth);
    if (isDashed) pathEl.setAttribute('stroke-dasharray', '5 4');
    if (isRelSel) pathEl.style.filter = selGlow;
    relG.appendChild(pathEl);

    // Marker
    if (isTriangle || isDiamond) {
      const marker = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      marker.setAttribute('points', markerPoints);
      marker.setAttribute('fill', isSolidDiamond ? rColor : (isDark ? '#222538' : '#FFFFFF'));
      marker.setAttribute('stroke', isRelSel ? 'var(--selection-color)' : rColor);
      marker.setAttribute('stroke-width', rWidth);
      relG.appendChild(marker);
    } else {
      // Standard open arrowhead
      const marker = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      marker.setAttribute('points', markerPoints);
      marker.setAttribute('fill', isRelSel ? 'var(--selection-color)' : rColor);
      marker.setAttribute('stroke', isRelSel ? 'var(--selection-color)' : rColor);
      relG.appendChild(marker);
    }

    // Optional Label
    if (r.label) {
      const labelW = r.label.length * 6.5 + 16;
      const labelH = 16;
      const { x: midLabelX, y: midLabelY } = Utils.findClearLabelPosition((sCenterX + tCenterX) / 2, (sCenterY + tCenterY) / 2, labelW, labelH, [...nodeObstacles, ...placedLabelRects]);
      placedLabelRects.push({ x: midLabelX - labelW / 2, y: midLabelY - labelH / 2, width: labelW, height: labelH });

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

    const allClassOptions = allClasses.map(c => ({ value: c.name, label: c.name }));

    relG.addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof AppController !== 'undefined' && AppController.instance) {
        AppController.instance.selectVisualObject({
          type: 'UML Relationship',
          title: linkTitle,
          fields: [
            { key: 'src', label: 'From (Source Class)', type: 'select', value: r.src, options: allClassOptions },
            { key: 'tgt', label: 'To (Target Class)', type: 'select', value: r.tgt, options: allClassOptions },
            { key: 'label', label: Utils.FIELD_LABELS.linkLabel, type: 'text', value: r.label || '' },
            { key: 'type', label: `${Utils.FIELD_LABELS.linkType} (Includes Bi-directional)`, type: 'select', value: r.relType, options: [
                { value: '<|--', label: 'Inheritance Super <|-- Sub' },
                { value: '--|>', label: 'Inheritance Sub --|> Super' },
                { value: '*--', label: 'Composition Whole *-- Part' },
                { value: '--*', label: 'Composition Part --* Whole' },
                { value: 'o--', label: 'Aggregation Whole o-- Part' },
                { value: '--o', label: 'Aggregation Part --o Whole' },
                { value: '-->', label: 'Forward Association (-->)' },
                { value: '<--', label: 'Reverse Association (<--)' },
                { value: '<-->', label: 'Bidirectional Association (<-->)' },
                { value: '..|>', label: 'Realization (..|>)' },
                { value: '..>', label: 'Dependency (..>)' },
                { value: '--', label: 'Solid Link (--) ' },
                { value: '..', label: 'Dashed Link (..)' }
            ]},
            { key: 'color', label: Utils.FIELD_LABELS.lineColor, type: 'color', value: rColor },
            { key: 'width', label: Utils.FIELD_LABELS.lineWidth, type: 'select', value: rWidth, options: Utils.widthOptions(['1', '1.5', '2.2', '3'], '1.5') },
            { key: 'connector', label: Utils.FIELD_LABELS.connector, type: 'select', value: connStyle, options: Utils.CONNECTOR_OPTIONS }
          ],
          onSave: (vals) => {
            MultiDiagramVisualizer.setColor(linkKey, vals.color);
            MultiDiagramVisualizer.setColor(`${linkKey}_width`, vals.width);
            MultiDiagramVisualizer.setColor(`${linkKey}_conn`, vals.connector);
            MultiDiagramVisualizer.syncColorToCode(linkKey, vals.color);
            MultiDiagramVisualizer.updateCodeLine((curCode) => {
              const lines = curCode.split('\n');
              for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes(r.src) && lines[i].includes(r.tgt)) {
                  const lead = lines[i].match(/^\s*/)[0] || '    ';
                  const s = vals.src || r.src;
                  const t = vals.tgt || r.tgt;
                  const lbl = vals.label !== undefined ? vals.label : r.label;
                  lines[i] = `${lead}${s} ${vals.type || r.relType} ${t}${lbl ? ` : ${lbl}` : ''}`;
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
            { key: 'font', label: Utils.FIELD_LABELS.font, type: 'color', value: fontColor },
            { key: 'fill', label: Utils.FIELD_LABELS.fill, type: 'color', value: fillColor },
            { key: 'border', label: Utils.FIELD_LABELS.border, type: 'color', value: borderColor }
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
