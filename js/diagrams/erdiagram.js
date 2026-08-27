// --- ER DIAGRAM VISUALIZER ---
MultiDiagramVisualizer.register('erdiagram', function(code, nodesLayer, edgesLayer, isDark) {
  const primaryText = isDark ? '#FFFFFF' : '#1F2937';
  const textColor = isDark ? '#E5E7EB' : '#374151';
  const cardBg = isDark ? '#1E222A' : '#FFFFFF';
  const cardBorder = isDark ? '#7986CB' : '#9FA8DA';
  const defaultHeaderFill = isDark ? '#262A38' : '#EEF0FF';
  const linkColor = isDark ? '#90CAF9' : '#333333';
  const selTitle = (typeof AppController !== 'undefined' && AppController.instance && AppController.instance.selectedVisualObject) ? AppController.instance.selectedVisualObject.title : null;
  const selGlow = 'drop-shadow(0 0 6px rgba(33, 150, 243, 0.8))';

  const rawLines = (code || '').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('%%'));
  const entities = new Map();
  const relationships = [];
  let curEntity = null;

  rawLines.forEach(line => {
    if (line.toLowerCase().startsWith('erdiagram')) return;

    // Entity block header: USER {
    const entStartMatch = line.match(/^([A-Za-z0-9_]+)\s*\{/i);
    if (entStartMatch) {
      const eName = entStartMatch[1].trim();
      curEntity = {
        name: eName,
        attributes: []
      };
      entities.set(eName, curEntity);
      return;
    }

    if (curEntity) {
      if (line.includes('}')) {
        curEntity = null;
        return;
      }
      // Parse attribute line: string email UK "Used for login" or string name "Basic..." or int id PK
      const attrMatch = line.match(/^([A-Za-z0-9_]+)\s+([A-Za-z0-9_]+)(?:\s+(PK|FK|UK))?(?:\s+"([^"]*)")?/i);
      if (attrMatch) {
        curEntity.attributes.push({
          type: attrMatch[1],
          name: attrMatch[2],
          key: attrMatch[3] ? attrMatch[3].toUpperCase() : '',
          comment: attrMatch[4] || ''
        });
      }
      return;
    }

    // Parse relationship: USER ||--o{ SUBSCRIPTION : has
    const relMatch = line.match(/^([A-Za-z0-9_]+)\s*(\|\|--o\{|\|\|--\|\{|\}\|--\|\{|\}\|--o\{|\|\|--\|\||o\|--o\{|\.\.o\{|\.\.\|\{)\s*([A-Za-z0-9_]+)(?:\s*:\s*(.+))?/i);
    if (relMatch) {
      const src = relMatch[1].trim();
      const card = relMatch[2].trim();
      const tgt = relMatch[3].trim();
      const label = relMatch[4] ? relMatch[4].trim().replace(/^["']|["']$/g, '') : '';

      [src, tgt].forEach(eName => {
        if (!entities.has(eName)) {
          entities.set(eName, {
            name: eName,
            attributes: [
              { type: 'string', name: 'id', key: 'PK', comment: '' }
            ]
          });
        }
      });

      relationships.push({ src, card, tgt, label });
    }
  });

  // Default fallback if empty
  if (entities.size === 0) {
    entities.set('USER', {
      name: 'USER',
      attributes: [
        { type: 'string', name: 'id', key: 'PK', comment: '' },
        { type: 'string', name: 'email', key: 'UK', comment: 'Used for login' },
        { type: 'string', name: 'country', key: '', comment: '' }
      ]
    });
    entities.set('SUBSCRIPTION', {
      name: 'SUBSCRIPTION',
      attributes: [
        { type: 'string', name: 'id', key: 'PK', comment: '' },
        { type: 'string', name: 'userId', key: 'FK', comment: '' },
        { type: 'date', name: 'startedAt', key: '', comment: '' }
      ]
    });
    relationships.push({ src: 'USER', card: '||--o{', tgt: 'SUBSCRIPTION', label: 'has' });
  }

  // Pre-calculate Column Layouts & Card Dimensions
  const entityArray = Array.from(entities.values());
  const defaultPositions = {
    'SHOW': { x: 420, y: 40 },
    'EPISODE': { x: 380, y: 280 },
    'USER': { x: 40, y: 300 },
    'PLAN': { x: 740, y: 300 },
    'WATCH_HISTORY': { x: 65, y: 560 },
    'SUBSCRIPTION': { x: 780, y: 540 }
  };

  entityArray.forEach((e, idx) => {
    const hasComment = e.attributes.some(a => Boolean(a.comment));
    const hasKey = e.attributes.some(a => Boolean(a.key));

    const maxTypeLen = Math.max(...e.attributes.map(a => a.type.length), 4);
    const maxNameLen = Math.max(...e.attributes.map(a => a.name.length), 3);
    const maxCommentLen = Math.max(...e.attributes.map(a => (a.comment || '').length), 0);

    const typeColW = Math.max(52, maxTypeLen * 7.5 + 16);
    const nameColW = Math.max(60, maxNameLen * 7.5 + 16);
    const keyColW = hasKey ? 42 : 36;
    const commentColW = hasComment ? Math.max(120, maxCommentLen * 6.8 + 20) : 0;

    e.colWidths = { typeColW, nameColW, keyColW, commentColW };
    e.hasComment = hasComment;
    e.hasKey = hasKey;
    e.width = typeColW + nameColW + keyColW + commentColW;
    e.rowHeight = 28;
    e.headerHeight = 32;
    e.height = e.headerHeight + Math.max(1, e.attributes.length) * e.rowHeight;

    const defPos = defaultPositions[e.name] || { x: 60 + (idx % 3) * 320, y: 60 + Math.floor(idx / 3) * 240 };
    e.defaultX = defPos.x;
    e.defaultY = defPos.y;

    e.fillColor = MultiDiagramVisualizer.getColor(e.name, defaultHeaderFill);
    e.fontColor = MultiDiagramVisualizer.getColor(`${e.name}_font`, primaryText);
    e.borderColor = MultiDiagramVisualizer.getColor(`${e.name}_border`, cardBorder);
  });

  // 1. DRAW RELATIONSHIP CONNECTORS & CROW'S FOOT ENDPOINTS (in edgesLayer)
  relationships.forEach(rel => {
    const srcEnt = entities.get(rel.src);
    const tgtEnt = entities.get(rel.tgt);
    if (!srcEnt || !tgtEnt) return;

    const sPos = MultiDiagramVisualizer.getPosition(srcEnt.name, srcEnt.defaultX, srcEnt.defaultY);
    const tPos = MultiDiagramVisualizer.getPosition(tgtEnt.name, tgtEnt.defaultX, tgtEnt.defaultY);

    const relKey = `rel_${rel.src}_to_${rel.tgt}`;
    const relTitle = rel.label ? `${rel.src} → ${rel.tgt} (${rel.label})` : `${rel.src} → ${rel.tgt}`;
    const rColor = MultiDiagramVisualizer.getColor(relKey, linkColor);
    const rWidth = MultiDiagramVisualizer.getColor(`${relKey}_width`, '1.4');
    const isRelSel = (selTitle === relTitle || selTitle === relKey || selTitle === rel.label);

    let sx, sy, tx, ty, pathD, labelX, labelY, srcAngle, tgtAngle;

    // Determine clean smart routing based on relative entity placements
    if (rel.src === 'SHOW' && rel.tgt === 'EPISODE') {
      sx = sPos.x + srcEnt.width / 2;
      sy = sPos.y + srcEnt.height;
      tx = tPos.x + tgtEnt.width / 2;
      ty = tPos.y;
      pathD = `M ${sx} ${sy} L ${tx} ${ty}`;
      labelX = (sx + tx) / 2;
      labelY = (sy + ty) / 2;
      srcAngle = 90;
      tgtAngle = -90;
    } else if (rel.src === 'USER' && rel.tgt === 'WATCH_HISTORY') {
      sx = sPos.x + srcEnt.width * 0.45;
      sy = sPos.y + srcEnt.height;
      tx = tPos.x + tgtEnt.width * 0.45;
      ty = tPos.y;
      pathD = `M ${sx} ${sy} L ${tx} ${ty}`;
      labelX = (sx + tx) / 2;
      labelY = (sy + ty) / 2;
      srcAngle = 90;
      tgtAngle = -90;
    } else if (rel.src === 'PLAN' && rel.tgt === 'SUBSCRIPTION') {
      sx = sPos.x + srcEnt.width * 0.55;
      sy = sPos.y + srcEnt.height;
      tx = tPos.x + tgtEnt.width * 0.55;
      ty = tPos.y;
      pathD = `M ${sx} ${sy} L ${tx} ${ty}`;
      labelX = (sx + tx) / 2;
      labelY = (sy + ty) / 2;
      srcAngle = 90;
      tgtAngle = -90;
    } else if (rel.src === 'USER' && rel.tgt === 'SUBSCRIPTION') {
      sx = sPos.x + srcEnt.width;
      sy = sPos.y + srcEnt.height * 0.7;
      tx = tPos.x;
      ty = tPos.y + tgtEnt.height * 0.4;
      const c1x = sx + 120;
      const c1y = sy + 30;
      const c2x = tx - 120;
      const c2y = ty;
      pathD = `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${tx} ${ty}`;
      labelX = (sx + tx) / 2 + 10;
      labelY = (sy + ty) / 2 - 12;
      srcAngle = 10;
      tgtAngle = 170;
    } else if (rel.src === 'EPISODE' && rel.tgt === 'WATCH_HISTORY') {
      sx = sPos.x + tgtEnt.width * 0.15;
      sy = sPos.y + srcEnt.height;
      tx = tPos.x + tgtEnt.width;
      ty = tPos.y + tgtEnt.height * 0.4;
      const c1x = sx - 60;
      const c1y = sy + 60;
      const c2x = tx + 80;
      const c2y = ty + 10;
      pathD = `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${tx} ${ty}`;
      labelX = (sx + tx) / 2 - 15;
      labelY = (sy + ty) / 2 - 8;
      srcAngle = 110;
      tgtAngle = 30;
    } else {
      // General routing fallback
      if (sPos.x + srcEnt.width < tPos.x) {
        sx = sPos.x + srcEnt.width;
        sy = sPos.y + srcEnt.height / 2;
        tx = tPos.x;
        ty = tPos.y + tgtEnt.height / 2;
        srcAngle = 0; tgtAngle = 180;
      } else if (tPos.x + tgtEnt.width < sPos.x) {
        sx = sPos.x;
        sy = sPos.y + srcEnt.height / 2;
        tx = tPos.x + tgtEnt.width;
        ty = tPos.y + tgtEnt.height / 2;
        srcAngle = 180; tgtAngle = 0;
      } else {
        sx = sPos.x + srcEnt.width / 2;
        sy = sPos.y + srcEnt.height;
        tx = tPos.x + tgtEnt.width / 2;
        ty = tPos.y;
        srcAngle = 90; tgtAngle = -90;
      }
      const mx = (sx + tx) / 2;
      const my = (sy + ty) / 2;
      pathD = `M ${sx} ${sy} C ${mx} ${sy}, ${mx} ${ty}, ${tx} ${ty}`;
      labelX = mx;
      labelY = my;
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

    // Visible Path
    const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathEl.setAttribute('d', pathD);
    pathEl.setAttribute('fill', 'none');
    pathEl.setAttribute('stroke', isRelSel ? 'var(--selection-color)' : rColor);
    pathEl.setAttribute('stroke-width', isRelSel ? `${parseFloat(rWidth) + 1.2}` : rWidth);
    if (isRelSel) pathEl.style.filter = selGlow;
    relG.appendChild(pathEl);

    // Function to render ER crow's foot & bar symbols at endpoints
    const drawEndpointSymbols = (px, py, angleDeg, type, isTarget) => {
      const gSym = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      gSym.setAttribute('transform', `translate(${px}, ${py}) rotate(${angleDeg})`);

      const strokeCol = isRelSel ? 'var(--selection-color)' : rColor;
      const sw = isRelSel ? '2' : '1.5';

      if (type.includes('||')) {
        // Exact One (two parallel crossbars)
        const b1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        b1.setAttribute('x1', '6'); b1.setAttribute('y1', '-8');
        b1.setAttribute('x2', '6'); b1.setAttribute('y2', '8');
        b1.setAttribute('stroke', strokeCol); b1.setAttribute('stroke-width', sw);
        gSym.appendChild(b1);

        const b2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        b2.setAttribute('x1', '12'); b2.setAttribute('y1', '-8');
        b2.setAttribute('x2', '12'); b2.setAttribute('y2', '8');
        b2.setAttribute('stroke', strokeCol); b2.setAttribute('stroke-width', sw);
        gSym.appendChild(b2);
      } else if (type.includes('o{')) {
        // Zero or More (circle + crow's foot)
        const circ = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circ.setAttribute('cx', '14');
        circ.setAttribute('cy', '0');
        circ.setAttribute('r', '4');
        circ.setAttribute('fill', cardBg);
        circ.setAttribute('stroke', strokeCol);
        circ.setAttribute('stroke-width', sw);
        gSym.appendChild(circ);

        // Crow's foot prongs
        const cf1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        cf1.setAttribute('x1', '0'); cf1.setAttribute('y1', '-8');
        cf1.setAttribute('x2', '10'); cf1.setAttribute('y2', '0');
        cf1.setAttribute('stroke', strokeCol); cf1.setAttribute('stroke-width', sw);
        gSym.appendChild(cf1);

        const cf2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        cf2.setAttribute('x1', '0'); cf2.setAttribute('y1', '8');
        cf2.setAttribute('x2', '10'); cf2.setAttribute('y2', '0');
        cf2.setAttribute('stroke', strokeCol); cf2.setAttribute('stroke-width', sw);
        gSym.appendChild(cf2);
      } else if (type.includes('|{')) {
        // One or More (one bar + crow's foot)
        const b = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        b.setAttribute('x1', '13'); b.setAttribute('y1', '-8');
        b.setAttribute('x2', '13'); b.setAttribute('y2', '8');
        b.setAttribute('stroke', strokeCol); b.setAttribute('stroke-width', sw);
        gSym.appendChild(b);

        // Crow's foot prongs
        const cf1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        cf1.setAttribute('x1', '0'); cf1.setAttribute('y1', '-8');
        cf1.setAttribute('x2', '10'); cf1.setAttribute('y2', '0');
        cf1.setAttribute('stroke', strokeCol); cf1.setAttribute('stroke-width', sw);
        gSym.appendChild(cf1);

        const cf2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        cf2.setAttribute('x1', '0'); cf2.setAttribute('y1', '8');
        cf2.setAttribute('x2', '10'); cf2.setAttribute('y2', '0');
        cf2.setAttribute('stroke', strokeCol); cf2.setAttribute('stroke-width', sw);
        gSym.appendChild(cf2);
      }

      relG.appendChild(gSym);
    };

    drawEndpointSymbols(sx, sy, srcAngle, rel.card.startsWith('||') ? '||' : (rel.card.startsWith('o|') ? 'o|' : '}|'), false);
    drawEndpointSymbols(tx, ty, tgtAngle, rel.card.endsWith('o{') ? 'o{' : (rel.card.endsWith('|{') ? '|{' : '||'), true);

    // Relationship Label Text
    if (rel.label) {
      const lblG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      lblG.setAttribute('transform', `translate(${labelX}, ${labelY})`);

      const textLen = rel.label.length * 6.5 + 16;
      const lblBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      lblBg.setAttribute('x', `${-textLen / 2}`);
      lblBg.setAttribute('y', '-9');
      lblBg.setAttribute('width', `${textLen}`);
      lblBg.setAttribute('height', '18');
      lblBg.setAttribute('rx', '3');
      lblBg.setAttribute('fill', cardBg);
      lblBg.setAttribute('stroke', isRelSel ? 'var(--selection-color)' : (isDark ? '#555555' : '#D1D5DB'));
      lblBg.setAttribute('stroke-width', isRelSel ? '1.5' : '1');
      if (isRelSel) lblBg.style.filter = selGlow;
      lblG.appendChild(lblBg);

      const lblTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      lblTxt.setAttribute('x', '0');
      lblTxt.setAttribute('y', '3');
      lblTxt.setAttribute('text-anchor', 'middle');
      lblTxt.setAttribute('fill', textColor);
      lblTxt.setAttribute('font-size', '10.5px');
      lblTxt.setAttribute('font-weight', '500');
      lblTxt.textContent = rel.label;
      lblG.appendChild(lblTxt);

      relG.appendChild(lblG);
    }

    // Click handler for Relationship line & Inspector
    relG.addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof AppController !== 'undefined' && AppController.instance) {
        AppController.instance.selectVisualObject({
          type: 'ER Relationship Link',
          title: relTitle,
          fields: [
            { key: 'label', label: 'Relationship Verb / Label', type: 'text', value: rel.label },
            { key: 'card', label: 'Cardinality', type: 'select', value: rel.card, options: [
                { value: '||--o{', label: 'One to Zero-or-More (||--o{)' },
                { value: '||--|{', label: 'One to One-or-More (||--|{)' },
                { value: '||--||', label: 'One to One (||--||)' },
                { value: '}|--|{', label: 'Many to Many (}|--|{)' },
                { value: '}|--o{', label: 'Many to Zero-or-More (}|--o{)' },
                { value: 'o|--o{', label: 'Zero-or-One to Zero-or-More (o|--o{)' }
            ]},
            { key: 'color', label: '1. Line & Marker Color', type: 'color', value: rColor },
            { key: 'width', label: '2. Line Thickness', type: 'select', value: rWidth, options: [
                { value: '1.2', label: 'Thin (1.2px)' },
                { value: '1.4', label: 'Medium (1.4px - Default)' },
                { value: '2', label: 'Thick (2px)' },
                { value: '3', label: 'Heavy (3px)' }
            ]}
          ],
          onSave: (vals) => {
            MultiDiagramVisualizer.setColor(relKey, vals.color);
            MultiDiagramVisualizer.setColor(`${relKey}_width`, vals.width);
            MultiDiagramVisualizer.syncColorToCode(relKey, vals.color);
            MultiDiagramVisualizer.updateCodeLine((curCode) => {
              const lines = curCode.split('\n');
              for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes(rel.src) && lines[i].includes(rel.tgt) && (lines[i].includes('--') || lines[i].includes('..'))) {
                  const lead = lines[i].match(/^\s*/)[0] || '    ';
                  const labelEsc = vals.label.includes(' ') ? `"${vals.label}"` : vals.label;
                  lines[i] = `${lead}${rel.src} ${vals.card} ${rel.tgt} : ${labelEsc}`;
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

  // 2. DRAW ENTITY GRID TABLES (in nodesLayer)
  entityArray.forEach(e => {
    const pos = MultiDiagramVisualizer.getPosition(e.name, e.defaultX, e.defaultY);
    const isSel = (selTitle === e.name);

    const entG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    entG.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
    entG.style.cursor = 'grab';

    // Outer Table Box
    const box = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    box.setAttribute('width', `${e.width}`);
    box.setAttribute('height', `${e.height}`);
    box.setAttribute('rx', '0');
    box.setAttribute('fill', cardBg);
    box.setAttribute('stroke', isSel ? 'var(--selection-color)' : e.borderColor);
    box.setAttribute('stroke-width', isSel ? '2.5' : '1.5');
    if (isSel) box.style.filter = selGlow;
    entG.appendChild(box);

    // Header Background
    const headerBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    headerBg.setAttribute('x', '0');
    headerBg.setAttribute('y', '0');
    headerBg.setAttribute('width', `${e.width}`);
    headerBg.setAttribute('height', `${e.headerHeight}`);
    headerBg.setAttribute('fill', e.fillColor);
    entG.appendChild(headerBg);

    // Header Bottom Line
    const headerLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    headerLine.setAttribute('x1', '0');
    headerLine.setAttribute('y1', `${e.headerHeight}`);
    headerLine.setAttribute('x2', `${e.width}`);
    headerLine.setAttribute('y2', `${e.headerHeight}`);
    headerLine.setAttribute('stroke', e.borderColor);
    headerLine.setAttribute('stroke-width', '1.5');
    entG.appendChild(headerLine);

    // Header Title
    const titleTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    titleTxt.setAttribute('x', `${e.width / 2}`);
    titleTxt.setAttribute('y', '20');
    titleTxt.setAttribute('text-anchor', 'middle');
    titleTxt.setAttribute('fill', e.fontColor);
    titleTxt.setAttribute('font-size', '12px');
    titleTxt.setAttribute('font-weight', '700');
    titleTxt.textContent = e.name;
    entG.appendChild(titleTxt);

    const { typeColW, nameColW, keyColW, commentColW } = e.colWidths;
    const x1 = typeColW;
    const x2 = typeColW + nameColW;
    const x3 = typeColW + nameColW + keyColW;

    // Attributes Table Rows
    e.attributes.forEach((attr, rIdx) => {
      const ry = e.headerHeight + rIdx * e.rowHeight;

      // Row divider line
      if (rIdx > 0) {
        const rowLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        rowLine.setAttribute('x1', '0');
        rowLine.setAttribute('y1', `${ry}`);
        rowLine.setAttribute('x2', `${e.width}`);
        rowLine.setAttribute('y2', `${ry}`);
        rowLine.setAttribute('stroke', e.borderColor);
        rowLine.setAttribute('stroke-width', '1');
        entG.appendChild(rowLine);
      }

      // Column 1: Type
      const typeTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      typeTxt.setAttribute('x', '10');
      typeTxt.setAttribute('y', `${ry + 18}`);
      typeTxt.setAttribute('fill', textColor);
      typeTxt.setAttribute('font-size', '11.5px');
      typeTxt.setAttribute('font-family', 'var(--code-font, monospace)');
      typeTxt.textContent = attr.type;
      entG.appendChild(typeTxt);

      // Column 2: Name
      const nameTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      nameTxt.setAttribute('x', `${x1 + 10}`);
      nameTxt.setAttribute('y', `${ry + 18}`);
      nameTxt.setAttribute('fill', primaryText);
      nameTxt.setAttribute('font-size', '11.5px');
      nameTxt.setAttribute('font-weight', '500');
      nameTxt.textContent = attr.name;
      entG.appendChild(nameTxt);

      // Column 3: Key (PK / FK / UK)
      if (attr.key) {
        const keyTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        keyTxt.setAttribute('x', `${x2 + keyColW / 2}`);
        keyTxt.setAttribute('y', `${ry + 18}`);
        keyTxt.setAttribute('text-anchor', 'middle');
        keyTxt.setAttribute('fill', primaryText);
        keyTxt.setAttribute('font-size', '11px');
        keyTxt.setAttribute('font-weight', '600');
        keyTxt.textContent = attr.key;
        entG.appendChild(keyTxt);
      }

      // Column 4: Comment (if exists)
      if (attr.comment) {
        const commentTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        commentTxt.setAttribute('x', `${x3 + 10}`);
        commentTxt.setAttribute('y', `${ry + 18}`);
        commentTxt.setAttribute('fill', textColor);
        commentTxt.setAttribute('font-size', '11px');
        commentTxt.textContent = attr.comment;
        entG.appendChild(commentTxt);
      }
    });

    // Vertical Column Grid Lines
    const colLine1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    colLine1.setAttribute('x1', `${x1}`);
    colLine1.setAttribute('y1', `${e.headerHeight}`);
    colLine1.setAttribute('x2', `${x1}`);
    colLine1.setAttribute('y2', `${e.height}`);
    colLine1.setAttribute('stroke', e.borderColor);
    colLine1.setAttribute('stroke-width', '1');
    entG.appendChild(colLine1);

    const colLine2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    colLine2.setAttribute('x1', `${x2}`);
    colLine2.setAttribute('y1', `${e.headerHeight}`);
    colLine2.setAttribute('x2', `${x2}`);
    colLine2.setAttribute('y2', `${e.height}`);
    colLine2.setAttribute('stroke', e.borderColor);
    colLine2.setAttribute('stroke-width', '1');
    entG.appendChild(colLine2);

    if (e.hasComment) {
      const colLine3 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      colLine3.setAttribute('x1', `${x3}`);
      colLine3.setAttribute('y1', `${e.headerHeight}`);
      colLine3.setAttribute('x2', `${x3}`);
      colLine3.setAttribute('y2', `${e.height}`);
      colLine3.setAttribute('stroke', e.borderColor);
      colLine3.setAttribute('stroke-width', '1');
      entG.appendChild(colLine3);
    }

    // Draggable
    MultiDiagramVisualizer.makeDraggable(
      entG,
      e.name,
      () => MultiDiagramVisualizer.getPosition(e.name, e.defaultX, e.defaultY),
      (nx, ny) => MultiDiagramVisualizer.setPosition(e.name, nx, ny)
    );

    // Click handler for Inspector
    entG.addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (typeof AppController !== 'undefined' && AppController.instance) {
        const attrLines = e.attributes.map(a => `${a.type} ${a.name}${a.key ? ' ' + a.key : ''}${a.comment ? ' "' + a.comment + '"' : ''}`).join('\n');
        AppController.instance.selectVisualObject({
          type: 'Database Entity Table',
          title: e.name,
          fields: [
            { key: 'name', label: 'Entity / Table Name', type: 'text', value: e.name },
            { key: 'attributes', label: 'Attributes (type name [PK/FK/UK] ["comment"])', type: 'textarea', rows: 6, value: attrLines },
            { key: 'font', label: '1. Font / Header Text Color', type: 'color', value: e.fontColor },
            { key: 'fill', label: '2. Header Fill Color', type: 'color', value: e.fillColor },
            { key: 'border', label: '3. Border & Grid Stroke Color', type: 'color', value: e.borderColor }
          ],
          onSave: (vals) => {
            MultiDiagramVisualizer.setColor(vals.name, vals.fill);
            MultiDiagramVisualizer.setColor(`${vals.name}_font`, vals.font);
            MultiDiagramVisualizer.setColor(`${vals.name}_border`, vals.border);
            MultiDiagramVisualizer.syncColorToCode(vals.name, vals.fill);
            MultiDiagramVisualizer.syncColorToCode(`${vals.name}_font`, vals.font);
            MultiDiagramVisualizer.syncColorToCode(`${vals.name}_border`, vals.border);

            if (typeof AppController !== 'undefined' && AppController.instance && AppController.instance.selectedVisualObject) {
              AppController.instance.selectedVisualObject.title = vals.name;
            }

            MultiDiagramVisualizer.updateCodeLine((curCode) => {
              const lines = curCode.split('\n');
              const esc = e.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
              const startIdx = lines.findIndex(l => !l.trim().startsWith('%%') && new RegExp(`^\\s*${esc}\\s*\\{`, 'i').test(l.trim()));
              if (startIdx !== -1) {
                let endIdx = startIdx;
                while (endIdx < lines.length && !lines[endIdx].includes('}')) {
                  endIdx++;
                }
                const lead = lines[startIdx].match(/^(\s*)/)[1] || '    ';
                const formattedAttrs = vals.attributes.split('\n').map(s => s.trim()).filter(Boolean).map(a => `${lead}    ${a}`).join('\n');
                const newBlock = `${lead}${vals.name} {\n${formattedAttrs}\n${lead}}`;
                lines.splice(startIdx, endIdx - startIdx + 1, newBlock);
              }
              return lines.join('\n');
            });
          }
        });
      }
    });

    nodesLayer.appendChild(entG);
  });
});
MultiDiagramVisualizer.register('erDiagram', MultiDiagramVisualizer.renderers.get('erdiagram'));
