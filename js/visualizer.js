// --- DEDICATED MULTI-DIAGRAM VISUAL SUITE ---
class MultiDiagramVisualizer {
  static customColors = new Map();

  static getColor(key, fallback) {
    if (!key) return fallback;
    const cleanKey = String(key).replace(/^["']|["']$/g, '').trim();
    return MultiDiagramVisualizer.customColors.get(cleanKey) || fallback;
  }

  static setColor(key, color) {
    if (key && color) {
      const cleanKey = String(key).replace(/^["']|["']$/g, '').trim();
      MultiDiagramVisualizer.customColors.set(cleanKey, color);
    }
  }

  static parseColorDirectives(code) {
    if (!code) return;
    const matches = code.matchAll(/%%\s*@color:\s*([^=\n]+)\s*=\s*(#[A-Fa-f0-9]{3,8})/g);
    for (const m of matches) {
      const key = m[1].trim();
      const color = m[2].trim();
      MultiDiagramVisualizer.customColors.set(key, color);
    }
  }

  static syncColorToCode(key, color) {
    const app = (typeof AppController !== 'undefined' && AppController.instance) ? AppController.instance : null;
    if (!app || !app.codeEditor) return;
    const cleanKey = String(key).replace(/^["']|["']$/g, '').trim();
    let curCode = app.codeEditor.value;
    const colorDir = `%% @color: ${cleanKey} = ${color}`;
    const escapedKey = cleanKey.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const reg = new RegExp(`^%%\\s*@color:\\s*${escapedKey}\\s*=[^\n]*$`, 'm');

    if (reg.test(curCode)) {
      curCode = curCode.replace(reg, colorDir);
    } else {
      curCode = curCode.trimEnd() + '\n' + colorDir;
    }

    app.codeEditor.value = curCode;
    if (app.codeHighlight) {
      app.codeHighlight.innerHTML = SyntaxHighlighter.highlight(curCode);
    }
  }

  static updateCodeLine(pattern, replacement) {
    const app = (typeof AppController !== 'undefined' && AppController.instance) ? AppController.instance : null;
    if (!app || !app.codeEditor) return;
    let curCode = app.codeEditor.value;
    let newCode;
    if (typeof pattern === 'function') {
      newCode = pattern(curCode);
    } else {
      newCode = curCode.replace(pattern, replacement);
    }

    app.codeEditor.value = newCode;
    if (app.codeHighlight) {
      app.codeHighlight.innerHTML = SyntaxHighlighter.highlight(newCode);
    }
    app.applyCodeToGraph(false);
  }

  static render(type, code, nodesLayer, edgesLayer, isDark) {
    nodesLayer.innerHTML = '';
    edgesLayer.innerHTML = '';

    MultiDiagramVisualizer.parseColorDirectives(code);

    const primaryText = isDark ? '#E1F5FE' : '#0D47A1';
    const primaryFill = isDark ? '#2D4A66' : '#E3F2FD';
    const primaryBorder = isDark ? '#4FC3F7' : '#90CAF9';
    const textColor = isDark ? '#D4D4D4' : '#212121';
    const linkColor = isDark ? '#BBBBBB' : '#616161';
    const cardBg = isDark ? '#2B2D30' : '#FFFFFF';
    const cardBorder = isDark ? '#4E5157' : '#CFD8DC';
    const app = (typeof AppController !== 'undefined' && AppController.instance) ? AppController.instance : null;
    const selTitle = app && app.selectedVisualObject ? app.selectedVisualObject.title : null;
    const selGlow = 'drop-shadow(0 0 6px rgba(33, 150, 243, 0.8))';

    switch (String(type || "").toLowerCase()) {
            case 'erdiagram': {
        const rawLines = (code || '').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('%%'));
        const entities = new Map();
        const relationships = [];
        let curEntity = null;

        rawLines.forEach(line => {
          if (line.toLowerCase().startsWith('erdiagram')) return;

          // Entity block header: CUSTOMER {
          const entStartMatch = line.match(/^([A-Za-z0-9_]+)\s*\{/i);
          if (entStartMatch) {
            const eName = entStartMatch[1].trim();
            curEntity = {
              name: eName,
              attributes: [],
              fillColor: MultiDiagramVisualizer.getColor(eName, isDark ? '#2D4A66' : '#E3F2FD'),
              fontColor: MultiDiagramVisualizer.getColor(`${eName}_font`, primaryText),
              borderColor: MultiDiagramVisualizer.getColor(`${eName}_border`, primaryBorder)
            };
            entities.set(eName, curEntity);
            return;
          }

          if (curEntity) {
            if (line.includes('}')) {
              curEntity = null;
              return;
            }
            // Parse attribute line: int id PK or string name or decimal price "comment"
            const attrMatch = line.match(/^([A-Za-z0-9_]+)\s+([A-Za-z0-9_]+)(?:\s+(PK|FK|UK))?/i);
            if (attrMatch) {
              curEntity.attributes.push({
                type: attrMatch[1],
                name: attrMatch[2],
                key: attrMatch[3] ? attrMatch[3].toUpperCase() : ''
              });
            }
            return;
          }

          // Parse relationship: CUSTOMER ||--o{ ORDER : places
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
                    { type: 'int', name: 'id', key: 'PK' }
                  ],
                  fillColor: MultiDiagramVisualizer.getColor(eName, isDark ? '#2D4A66' : '#E3F2FD'),
                  fontColor: MultiDiagramVisualizer.getColor(`${eName}_font`, primaryText),
                  borderColor: MultiDiagramVisualizer.getColor(`${eName}_border`, primaryBorder)
                });
              }
            });

            relationships.push({ src, card, tgt, label });
          }
        });

        if (entities.size === 0) {
          entities.set('CUSTOMER', {
            name: 'CUSTOMER',
            attributes: [
              { type: 'int', name: 'id', key: 'PK' },
              { type: 'string', name: 'name', key: '' },
              { type: 'string', name: 'email', key: '' }
            ],
            fillColor: MultiDiagramVisualizer.getColor('CUSTOMER', isDark ? '#2D4A66' : '#E3F2FD'),
            fontColor: MultiDiagramVisualizer.getColor('CUSTOMER_font', primaryText),
            borderColor: MultiDiagramVisualizer.getColor('CUSTOMER_border', primaryBorder)
          });
          entities.set('ORDER', {
            name: 'ORDER',
            attributes: [
              { type: 'int', name: 'id', key: 'PK' },
              { type: 'int', name: 'customer_id', key: 'FK' },
              { type: 'date', name: 'order_date', key: '' }
            ],
            fillColor: MultiDiagramVisualizer.getColor('ORDER', isDark ? '#2D4A66' : '#E3F2FD'),
            fontColor: MultiDiagramVisualizer.getColor('ORDER_font', primaryText),
            borderColor: MultiDiagramVisualizer.getColor('ORDER_border', primaryBorder)
          });
          relationships.push({ src: 'CUSTOMER', card: '||--o{', tgt: 'ORDER', label: 'places' });
        }

        // Layout Entities in a clean 2-column or 3-column grid
        const entityArray = Array.from(entities.values());
        const cols = entityArray.length <= 2 ? 2 : (entityArray.length <= 4 ? 2 : 3);
        const cardW = 220;
        const gapX = 140;
        const gapY = 70;
        const startX = 60;
        const startY = 60;

        entityArray.forEach((e, idx) => {
          const col = idx % cols;
          const row = Math.floor(idx / cols);
          e.x = startX + col * (cardW + gapX);
          e.y = startY + row * (140 + gapY);
          e.width = cardW;
          const attrCount = Math.max(1, e.attributes.length);
          e.height = 36 + attrCount * 24 + 10;
        });

        // Draw Relationships / Crow's Foot Connectors
        relationships.forEach(rel => {
          const srcEnt = entities.get(rel.src);
          const tgtEnt = entities.get(rel.tgt);
          if (!srcEnt || !tgtEnt) return;

          const relKey = `${rel.src}-${rel.tgt}:${rel.label}`;
          const lineColor = MultiDiagramVisualizer.getColor(relKey, MultiDiagramVisualizer.getColor(`${rel.src}-${rel.tgt}`, linkColor));
          const labelFont = MultiDiagramVisualizer.getColor(`${relKey}_font`, textColor);

          // Calculate connection points
          let sx, sy, tx, ty;
          if (srcEnt.x + srcEnt.width < tgtEnt.x) {
            sx = srcEnt.x + srcEnt.width;
            sy = srcEnt.y + srcEnt.height / 2;
            tx = tgtEnt.x;
            ty = tgtEnt.y + tgtEnt.height / 2;
          } else if (tgtEnt.x + tgtEnt.width < srcEnt.x) {
            sx = srcEnt.x;
            sy = srcEnt.y + srcEnt.height / 2;
            tx = tgtEnt.x + tgtEnt.width;
            ty = tgtEnt.y + tgtEnt.height / 2;
          } else {
            sx = srcEnt.x + srcEnt.width / 2;
            sy = srcEnt.y + srcEnt.height;
            tx = tgtEnt.x + tgtEnt.width / 2;
            ty = tgtEnt.y;
          }

          const midX = (sx + tx) / 2;
          const midY = (sy + ty) / 2;

          const relG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          relG.style.cursor = 'pointer';

          // Connector path
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', `M ${sx} ${sy} C ${midX} ${sy}, ${midX} ${ty}, ${tx} ${ty}`);
          path.setAttribute('fill', 'none');
          path.setAttribute('stroke', lineColor);
          path.setAttribute('stroke-width', '2');
          relG.appendChild(path);

          // Cardinality Endpoint Markers
          const drawCardSymbol = (cx, cy, cardStr, isTarget) => {
            const symTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            symTxt.setAttribute('x', `${cx}`);
            symTxt.setAttribute('y', `${cy - 6}`);
            symTxt.setAttribute('text-anchor', 'middle');
            symTxt.setAttribute('fill', lineColor);
            symTxt.setAttribute('font-size', '10px');
            symTxt.setAttribute('font-weight', 'bold');
            symTxt.textContent = isTarget ? (cardStr.endsWith('{') ? '0..N' : '1..1') : (cardStr.startsWith('||') ? '1..1' : '0..N');
            relG.appendChild(symTxt);
          };

          drawCardSymbol(sx + (tx > sx ? 18 : -18), sy, rel.card, false);
          drawCardSymbol(tx + (tx > sx ? -18 : 18), ty, rel.card, true);

          // Relationship Label Badge
          if (rel.label) {
            const badgeW = rel.label.length * 6.5 + 20;
            const badgeRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            badgeRect.setAttribute('x', `${midX - badgeW / 2}`);
            badgeRect.setAttribute('y', `${midY - 10}`);
            badgeRect.setAttribute('width', `${badgeW}`);
            badgeRect.setAttribute('height', '19');
            badgeRect.setAttribute('rx', '4');
            const isSelRel = (rel.label === selTitle || `${rel.src} - ${rel.tgt}` === selTitle);
            badgeRect.setAttribute('fill', cardBg);
            badgeRect.setAttribute('stroke', isSelRel ? 'var(--selection-color)' : cardBorder);
            badgeRect.setAttribute('stroke-width', isSelRel ? '2.5' : '1');
            if (isSelRel) badgeRect.style.filter = selGlow;
            relG.appendChild(badgeRect);

            const badgeTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            badgeTxt.setAttribute('x', `${midX}`);
            badgeTxt.setAttribute('y', `${midY + 3}`);
            badgeTxt.setAttribute('text-anchor', 'middle');
            badgeTxt.setAttribute('fill', labelFont);
            badgeTxt.setAttribute('font-size', '10px');
            badgeTxt.setAttribute('font-weight', '500');
            badgeTxt.textContent = rel.label;
            relG.appendChild(badgeTxt);
          }

          relG.addEventListener('mousedown', (e) => e.stopPropagation());
          relG.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof AppController !== 'undefined' && AppController.instance) {
              AppController.instance.selectVisualObject({
                type: 'ER Relationship',
                title: `${rel.src} → ${rel.tgt}`,
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
                  { key: 'font', label: '1. Label Font Color', type: 'color', value: labelFont },
                  { key: 'color', label: '2. Line / Connector Color', type: 'color', value: lineColor }
                ],
                onSave: (vals) => {
                  const newKey = `${rel.src}-${rel.tgt}:${vals.label}`;
                  MultiDiagramVisualizer.setColor(newKey, vals.color);
                  MultiDiagramVisualizer.setColor(`${newKey}_font`, vals.font);
                  MultiDiagramVisualizer.syncColorToCode(newKey, vals.color);
                  MultiDiagramVisualizer.syncColorToCode(`${newKey}_font`, vals.font);
                  MultiDiagramVisualizer.updateCodeLine((curCode) => {
                    const lines = curCode.split('\n');
                    const idx = lines.findIndex(l => !l.trim().startsWith('%%') && new RegExp(`^\\s*${rel.src}\\s*.*?\\s*${rel.tgt}`, 'i').test(l.trim()));
                    if (idx !== -1) {
                      const lead = lines[idx].match(/^(\s*)/)[1] || '  ';
                      lines[idx] = `${lead}${rel.src} ${vals.card} ${rel.tgt} : ${vals.label}`;
                    }
                    return lines.join('\n');
                  });
                }
              });
            }
          });

          edgesLayer.appendChild(relG);
        });

        // Draw Entity Table Cards
        entityArray.forEach(e => {
          const entG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          entG.style.cursor = 'pointer';

          // Table Outer Card
          const cardRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          cardRect.setAttribute('x', `${e.x}`);
          cardRect.setAttribute('y', `${e.y}`);
          cardRect.setAttribute('width', `${e.width}`);
          cardRect.setAttribute('height', `${e.height}`);
          cardRect.setAttribute('rx', '6');
          const isSelEnt = (e.name === selTitle);
          cardRect.setAttribute('fill', cardBg);
          cardRect.setAttribute('stroke', isSelEnt ? 'var(--selection-color)' : e.borderColor);
          cardRect.setAttribute('stroke-width', isSelEnt ? '3' : '1.8');
          if (isSelEnt) cardRect.style.filter = selGlow;
          entG.appendChild(cardRect);

          // Table Header Bar
          const headerRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          headerRect.setAttribute('x', `${e.x}`);
          headerRect.setAttribute('y', `${e.y}`);
          headerRect.setAttribute('width', `${e.width}`);
          headerRect.setAttribute('height', '34');
          headerRect.setAttribute('rx', '6');
          headerRect.setAttribute('fill', e.fillColor);
          entG.appendChild(headerRect);

          // Header bottom square corner overlay
          const headerSq = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          headerSq.setAttribute('x', `${e.x}`);
          headerSq.setAttribute('y', `${e.y + 20}`);
          headerSq.setAttribute('width', `${e.width}`);
          headerSq.setAttribute('height', '14');
          headerSq.setAttribute('fill', e.fillColor);
          entG.appendChild(headerSq);

          // Header Title
          const headerText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          headerText.setAttribute('x', `${e.x + e.width / 2}`);
          headerText.setAttribute('y', `${e.y + 21}`);
          headerText.setAttribute('text-anchor', 'middle');
          headerText.setAttribute('fill', e.fontColor);
          headerText.setAttribute('font-size', '12px');
          headerText.setAttribute('font-weight', 'bold');
          headerText.textContent = `🗄️ ${e.name}`;
          entG.appendChild(headerText);

          // Header separator line
          const headerDiv = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          headerDiv.setAttribute('x1', `${e.x}`);
          headerDiv.setAttribute('y1', `${e.y + 34}`);
          headerDiv.setAttribute('x2', `${e.x + e.width}`);
          headerDiv.setAttribute('y2', `${e.y + 34}`);
          headerDiv.setAttribute('stroke', e.borderColor);
          headerDiv.setAttribute('stroke-width', '1.5');
          entG.appendChild(headerDiv);

          // Attributes List
          e.attributes.forEach((attr, aIdx) => {
            const attrY = e.y + 40 + aIdx * 24;

            // Row subtle stripe
            if (aIdx % 2 === 1) {
              const rowBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
              rowBg.setAttribute('x', `${e.x + 1}`);
              rowBg.setAttribute('y', `${attrY - 4}`);
              rowBg.setAttribute('width', `${e.width - 2}`);
              rowBg.setAttribute('height', '23');
              rowBg.setAttribute('fill', isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)');
              entG.appendChild(rowBg);
            }

            // Key Badge (PK / FK / UK)
            if (attr.key) {
              const keyBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
              keyBg.setAttribute('x', `${e.x + 10}`);
              keyBg.setAttribute('y', `${attrY}`);
              keyBg.setAttribute('width', '24');
              keyBg.setAttribute('height', '15');
              keyBg.setAttribute('rx', '3');
              keyBg.setAttribute('fill', attr.key === 'PK' ? '#FFB300' : (attr.key === 'FK' ? '#00BCD4' : '#4CAF50'));
              entG.appendChild(keyBg);

              const keyTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
              keyTxt.setAttribute('x', `${e.x + 22}`);
              keyTxt.setAttribute('y', `${attrY + 11}`);
              keyTxt.setAttribute('text-anchor', 'middle');
              keyTxt.setAttribute('fill', '#FFFFFF');
              keyTxt.setAttribute('font-size', '8.5px');
              keyTxt.setAttribute('font-weight', 'bold');
              keyTxt.textContent = attr.key;
              entG.appendChild(keyTxt);
            }

            // Attribute Name
            const nameTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            nameTxt.setAttribute('x', attr.key ? `${e.x + 40}` : `${e.x + 12}`);
            nameTxt.setAttribute('y', `${attrY + 12}`);
            nameTxt.setAttribute('fill', textColor);
            nameTxt.setAttribute('font-size', '11px');
            nameTxt.setAttribute('font-weight', attr.key === 'PK' ? '600' : 'normal');
            nameTxt.textContent = attr.name;
            entG.appendChild(nameTxt);

            // Attribute Data Type
            const typeTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            typeTxt.setAttribute('x', `${e.x + e.width - 10}`);
            typeTxt.setAttribute('y', `${attrY + 12}`);
            typeTxt.setAttribute('text-anchor', 'end');
            typeTxt.setAttribute('fill', linkColor);
            typeTxt.setAttribute('font-size', '10px');
            typeTxt.setAttribute('font-style', 'italic');
            typeTxt.textContent = attr.type;
            entG.appendChild(typeTxt);
          });

          entG.addEventListener('mousedown', (e) => e.stopPropagation());
          entG.addEventListener('click', (ev) => {
            ev.stopPropagation();
            if (typeof AppController !== 'undefined' && AppController.instance) {
              const attrTextValue = e.attributes.map(a => `${a.type} ${a.name}${a.key ? ' ' + a.key : ''}`).join('\n');
              AppController.instance.selectVisualObject({
                type: 'Database Entity Table',
                title: e.name,
                fields: [
                  { key: 'name', label: 'Entity / Table Name', type: 'text', value: e.name },
                  { key: 'attributes', label: 'Attributes (type name [PK/FK])', type: 'textarea', rows: 5, value: attrTextValue },
                  { key: 'font', label: '1. Font / Header Text Color', type: 'color', value: e.fontColor },
                  { key: 'fill', label: '2. Node / Header Fill Color', type: 'color', value: e.fillColor },
                  { key: 'border', label: '3. Node / Border Stroke Color', type: 'color', value: e.borderColor }
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
                      const lead = lines[startIdx].match(/^(\s*)/)[1] || '  ';
                      const attrLines = vals.attributes.split('\n').map(s => s.trim()).filter(Boolean).map(a => `${lead}  ${a}`).join('\n');
                      const newBlock = `${lead}${vals.name} {\n${attrLines}\n${lead}}`;
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
        break;
      }

            case 'c4context': {
        const rawLines = (code || '').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('%%'));
        let title = 'Enterprise Cloud Banking & Payments Architecture Platform';
        const nodes = new Map();
        const relationships = [];

        rawLines.forEach(line => {
          if (line.toLowerCase().startsWith('c4context') || line.toLowerCase().startsWith('c4container') || line.toLowerCase().startsWith('c4component')) return;

          const titleMatch = line.match(/^title\s+(.+)$/i);
          if (titleMatch) { title = titleMatch[1].trim(); return; }

          // Node match: Type(alias, "label", "desc"...) or Type(alias, "label", "tech", "desc")
          const nodeMatch = line.match(/^(Person|Person_Ext|System|System_Ext|SystemDb|SystemDb_Ext|Container|ContainerDb|Component)\s*\(\s*([A-Za-z0-9_]+)\s*,\s*"([^"]+)"(?:\s*,\s*"([^"]*)")?(?:\s*,\s*"([^"]*)")?\s*\)/i);
          if (nodeMatch) {
            const kind = nodeMatch[1];
            const alias = nodeMatch[2];
            const label = nodeMatch[3];
            let desc = '';
            let tech = '';

            if (nodeMatch[5] !== undefined) {
              tech = nodeMatch[4] || '';
              desc = nodeMatch[5] || '';
            } else {
              desc = nodeMatch[4] || '';
            }

            const isPerson = kind.toLowerCase().startsWith('person');
            const isExt = kind.toLowerCase().includes('_ext') || kind.toLowerCase().endsWith('_ext');
            const isDb = kind.toLowerCase().includes('db');

            let defaultFill = isPerson ? (kind.includes('_Ext') ? '#08427B' : '#0288D1') : (isExt ? '#546E7A' : (isDb ? '#00838F' : '#1565C0'));
            let defaultBorder = isPerson ? '#01579B' : (isExt ? '#37474F' : (isDb ? '#006064' : '#0D47A1'));
            let defaultFont = '#FFFFFF';

            nodes.set(alias, {
              alias,
              kind,
              label,
              desc,
              tech,
              isPerson,
              isExt,
              isDb,
              fillColor: MultiDiagramVisualizer.getColor(alias, defaultFill),
              fontColor: MultiDiagramVisualizer.getColor(`${alias}_font`, defaultFont),
              borderColor: MultiDiagramVisualizer.getColor(`${alias}_border`, defaultBorder)
            });
            return;
          }

          // Relationship match: Rel(from, to, "label", "tech") or BiRel(...)
          const relMatch = line.match(/^(?:Rel|BiRel)\s*\(\s*([A-Za-z0-9_]+)\s*,\s*([A-Za-z0-9_]+)\s*,\s*"([^"]+)"(?:\s*,\s*"([^"]*)")?\s*\)/i);
          if (relMatch) {
            const from = relMatch[1];
            const to = relMatch[2];
            const rLabel = relMatch[3];
            const rTech = relMatch[4] || '';
            relationships.push({ from, to, label: rLabel, tech: rTech });
          }
        });

        if (nodes.size === 0) {
          nodes.set('customer', { alias: 'customer', kind: 'Person', label: 'Banking Customer', desc: 'Retail client managing accounts & cards', isPerson: true, isExt: false, isDb: false, fillColor: '#0288D1', fontColor: '#FFFFFF', borderColor: '#01579B' });
          nodes.set('banking_core', { alias: 'banking_core', kind: 'System', label: 'Core Banking Services', desc: 'Microservices processing accounts & ledgers', isPerson: false, isExt: false, isDb: false, fillColor: '#1565C0', fontColor: '#FFFFFF', borderColor: '#0D47A1' });
        }

        // Title
        const titleEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        titleEl.setAttribute('x', '35');
        titleEl.setAttribute('y', '36');
        titleEl.setAttribute('fill', primaryText);
        titleEl.setAttribute('font-size', '16px');
        titleEl.setAttribute('font-weight', 'bold');
        titleEl.textContent = title;
        nodesLayer.appendChild(titleEl);

        // Explicit 3-Column 4-Tier Topology with 0 Overlap
        const colX = [50, 400, 750]; // 3 Columns
        const cardW = 240;
        const cardH = 96;

        // Positioning map for known standard roles or structured fallback
        const nodePositions = {
          'customer': { x: colX[0], y: 70 },
          'support_agent': { x: colX[1], y: 70 },
          'auditor': { x: colX[2], y: 70 },

          'api_gateway': { x: colX[1], y: 270 },

          'primary_db': { x: colX[0], y: 470 },
          'banking_core': { x: colX[1], y: 470 },
          'event_bus': { x: colX[2], y: 470 },

          'payment_rail': { x: colX[0], y: 680 },
          'fraud_ai': { x: colX[1], y: 680 },
          'notification_hub': { x: colX[2], y: 680 }
        };

        let customIdx = 0;
        nodes.forEach(n => {
          if (nodePositions[n.alias]) {
            n.x = nodePositions[n.alias].x;
            n.y = nodePositions[n.alias].y;
          } else {
            const col = customIdx % 3;
            const row = Math.floor(customIdx / 3);
            n.x = colX[col];
            n.y = 70 + row * 200;
            customIdx++;
          }
          n.width = cardW;
          n.height = cardH;
        });

        // Draw Relationships with Staggered Bezier Curves and 2-Line Badges
        relationships.forEach((rel, rIdx) => {
          const sNode = nodes.get(rel.from);
          const tNode = nodes.get(rel.to);
          if (!sNode || !tNode) return;

          const relKey = `${rel.from}->${rel.to}:${rel.label}`;
          const lineColor = MultiDiagramVisualizer.getColor(relKey, MultiDiagramVisualizer.getColor(`${rel.from}->${rel.to}`, linkColor));
          const labelFont = MultiDiagramVisualizer.getColor(`${relKey}_font`, textColor);

          let sx, sy, tx, ty;
          let isHorizontal = false;

          // Detect direct horizontal neighbors (e.g. Core -> DB on left, Core -> EventMesh on right)
          if (Math.abs(sNode.y - tNode.y) < 30) {
            isHorizontal = true;
            if (sNode.x > tNode.x) {
              // Target is on left (Core -> DB)
              sx = sNode.x;
              sy = sNode.y + sNode.height / 2;
              tx = tNode.x + tNode.width;
              ty = tNode.y + tNode.height / 2;
            } else {
              // Target is on right (Core -> EventMesh)
              sx = sNode.x + sNode.width;
              sy = sNode.y + sNode.height / 2;
              tx = tNode.x;
              ty = tNode.y + tNode.height / 2;
            }
          } else if (sNode.y < tNode.y) {
            // Downward flow
            sx = sNode.x + sNode.width / 2;
            sy = sNode.y + sNode.height;
            tx = tNode.x + tNode.width / 2;
            ty = tNode.y;
          } else {
            // Upward flow
            sx = sNode.x + sNode.width / 2;
            sy = sNode.y;
            tx = tNode.x + tNode.width / 2;
            ty = tNode.y + tNode.height;
          }

          // Calculate Curve Control Points
          let cx1, cy1, cx2, cy2;
          if (isHorizontal) {
            cx1 = (sx + tx) / 2;
            cy1 = sy;
            cx2 = (sx + tx) / 2;
            cy2 = ty;
          } else {
            const dy = Math.abs(ty - sy) * 0.45;
            cx1 = sx;
            cy1 = sy + (ty > sy ? dy : -dy);
            cx2 = tx;
            cy2 = ty + (ty > sy ? -dy : dy);
          }

          // Stagger badge position along the curve (t: 0.32 to 0.68) so crossing badges never collide
          let t = 0.5;
          if (!isHorizontal) {
            if (sx < tx - 50) t = 0.35; // Coming from left: badge sits higher on left
            else if (sx > tx + 50) t = 0.65; // Coming from right: badge sits lower on right
            else t = 0.50; // Direct vertical: center
          }

          // Compute exact (bx, by) along cubic Bezier curve at t
          const omt = 1 - t;
          const bx = omt*omt*omt*sx + 3*omt*omt*t*cx1 + 3*omt*t*t*cx2 + t*t*t*tx;
          const by = omt*omt*omt*sy + 3*omt*omt*t*cy1 + 3*omt*t*t*cy2 + t*t*t*ty;

          const relG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          relG.style.cursor = 'pointer';

          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', `M ${sx} ${sy} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${tx} ${ty}`);
          path.setAttribute('fill', 'none');
          path.setAttribute('stroke', lineColor);
          path.setAttribute('stroke-width', '2');
          path.setAttribute('stroke-dasharray', '5,4');
          relG.appendChild(path);

          // Directional Arrowhead
          const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
          if (isHorizontal) {
            if (tx < sx) {
              arrow.setAttribute('points', `${tx + 7},${ty - 5} ${tx},${ty} ${tx + 7},${ty + 5}`);
            } else {
              arrow.setAttribute('points', `${tx - 7},${ty - 5} ${tx},${ty} ${tx - 7},${ty + 5}`);
            }
          } else {
            if (ty > sy) {
              arrow.setAttribute('points', `${tx - 5},${ty - 7} ${tx},${ty} ${tx + 5},${ty - 7}`);
            } else {
              arrow.setAttribute('points', `${tx - 5},${ty + 7} ${tx},${ty} ${tx + 5},${ty + 7}`);
            }
          }
          arrow.setAttribute('fill', lineColor);
          relG.appendChild(arrow);

          // Compact 2-Line Badge (Line 1: Action, Line 2: Tech Tag)
          const cleanLabel = rel.label.length > 32 ? rel.label.substring(0, 29) + '...' : rel.label;
          const badgeW = Math.max(130, Math.min(190, Math.max(cleanLabel.length * 6.2 + 20, (rel.tech ? rel.tech.length * 6.5 + 24 : 0))));
          const badgeH = rel.tech ? 34 : 22;

          const badgeRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          badgeRect.setAttribute('x', `${bx - badgeW / 2}`);
          badgeRect.setAttribute('y', `${by - badgeH / 2}`);
          badgeRect.setAttribute('width', `${badgeW}`);
          badgeRect.setAttribute('height', `${badgeH}`);
          badgeRect.setAttribute('rx', '5');
          const isSelRel = (rel.label === selTitle || `${rel.from} → ${rel.to}` === selTitle);
          badgeRect.setAttribute('fill', cardBg);
          badgeRect.setAttribute('stroke', isSelRel ? 'var(--selection-color)' : cardBorder);
          badgeRect.setAttribute('stroke-width', isSelRel ? '2.5' : '1');
          if (isSelRel) badgeRect.style.filter = selGlow;
          relG.appendChild(badgeRect);

          if (rel.tech) {
            const l1Txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            l1Txt.setAttribute('x', `${bx}`);
            l1Txt.setAttribute('y', `${by - 4}`);
            l1Txt.setAttribute('text-anchor', 'middle');
            l1Txt.setAttribute('fill', labelFont);
            l1Txt.setAttribute('font-size', '9px');
            l1Txt.setAttribute('font-weight', '500');
            l1Txt.textContent = cleanLabel;
            relG.appendChild(l1Txt);

            const l2Txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            l2Txt.setAttribute('x', `${bx}`);
            l2Txt.setAttribute('y', `${by + 9}`);
            l2Txt.setAttribute('text-anchor', 'middle');
            l2Txt.setAttribute('fill', isDark ? '#4FC3F7' : '#0288D1');
            l2Txt.setAttribute('font-size', '8.5px');
            l2Txt.setAttribute('font-weight', 'bold');
            l2Txt.textContent = `[${rel.tech}]`;
            relG.appendChild(l2Txt);
          } else {
            const l1Txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            l1Txt.setAttribute('x', `${bx}`);
            l1Txt.setAttribute('y', `${by + 3}`);
            l1Txt.setAttribute('text-anchor', 'middle');
            l1Txt.setAttribute('fill', labelFont);
            l1Txt.setAttribute('font-size', '9.5px');
            l1Txt.setAttribute('font-weight', '500');
            l1Txt.textContent = cleanLabel;
            relG.appendChild(l1Txt);
          }

          relG.addEventListener('mousedown', (e) => e.stopPropagation());
          relG.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof AppController !== 'undefined' && AppController.instance) {
              AppController.instance.selectVisualObject({
                type: 'C4 Relationship',
                title: `${rel.from} → ${rel.to}`,
                fields: [
                  { key: 'label', label: 'Action / Description', type: 'text', value: rel.label },
                  { key: 'tech', label: 'Protocol / Technology (e.g. HTTPS, gRPC)', type: 'text', value: rel.tech || '' },
                  { key: 'font', label: '1. Label Font Color', type: 'color', value: labelFont },
                  { key: 'color', label: '2. Line / Arrow Color', type: 'color', value: lineColor }
                ],
                onSave: (vals) => {
                  const newKey = `${rel.from}->${rel.to}:${vals.label}`;
                  MultiDiagramVisualizer.setColor(newKey, vals.color);
                  MultiDiagramVisualizer.setColor(`${newKey}_font`, vals.font);
                  MultiDiagramVisualizer.syncColorToCode(newKey, vals.color);
                  MultiDiagramVisualizer.syncColorToCode(`${newKey}_font`, vals.font);
                  MultiDiagramVisualizer.updateCodeLine((curCode) => {
                    const lines = curCode.split('\n');
                    const idx = lines.findIndex(l => !l.trim().startsWith('%%') && new RegExp(`^\\s*(?:Rel|BiRel)\\s*\\(\\s*${rel.from}\\s*,\\s*${rel.to}`, 'i').test(l.trim()));
                    if (idx !== -1) {
                      const lead = lines[idx].match(/^(\s*)/)[1] || '  ';
                      const techStr = vals.tech ? `, "${vals.tech}"` : '';
                      lines[idx] = `${lead}Rel(${rel.from}, ${rel.to}, "${vals.label}"${techStr})`;
                    }
                    return lines.join('\n');
                  });
                }
              });
            }
          });

          edgesLayer.appendChild(relG);
        });

        // Draw C4 Elements
        nodes.forEach(n => {
          const cardG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          cardG.style.cursor = 'pointer';

          const card = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          card.setAttribute('x', `${n.x}`);
          card.setAttribute('y', `${n.y}`);
          card.setAttribute('width', `${n.width}`);
          card.setAttribute('height', `${n.height}`);
          card.setAttribute('rx', n.isPerson ? '16' : '8');
          const isSelC4 = (n.label === selTitle || n.alias === selTitle);
          card.setAttribute('fill', n.fillColor);
          card.setAttribute('stroke', isSelC4 ? 'var(--selection-color)' : n.borderColor);
          card.setAttribute('stroke-width', isSelC4 ? '3.5' : '1.8');
          if (isSelC4) card.style.filter = selGlow;
          cardG.appendChild(card);

          // Header Icon & Title
          const icon = n.isPerson ? '👤' : (n.isDb ? '🛢️' : (n.isExt ? '☁️' : '🏛️'));
          const titleTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          titleTxt.setAttribute('x', `${n.x + n.width / 2}`);
          titleTxt.setAttribute('y', `${n.y + 24}`);
          titleTxt.setAttribute('text-anchor', 'middle');
          titleTxt.setAttribute('fill', n.fontColor);
          titleTxt.setAttribute('font-size', '12.5px');
          titleTxt.setAttribute('font-weight', 'bold');
          titleTxt.textContent = `${icon} ${n.label}`;
          cardG.appendChild(titleTxt);

          // Type Subtitle Pill
          const subTypeStr = `[${n.kind.replace('_', ' ')}]`;
          const subTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          subTxt.setAttribute('x', `${n.x + n.width / 2}`);
          subTxt.setAttribute('y', `${n.y + 42}`);
          subTxt.setAttribute('text-anchor', 'middle');
          subTxt.setAttribute('fill', n.fontColor);
          subTxt.setAttribute('opacity', '0.85');
          subTxt.setAttribute('font-size', '10px');
          subTxt.setAttribute('font-weight', '500');
          subTxt.textContent = subTypeStr;
          cardG.appendChild(subTxt);

          // Description (multiline truncated)
          if (n.desc) {
            const descTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            descTxt.setAttribute('x', `${n.x + n.width / 2}`);
            descTxt.setAttribute('y', `${n.y + 64}`);
            descTxt.setAttribute('text-anchor', 'middle');
            descTxt.setAttribute('fill', n.fontColor);
            descTxt.setAttribute('opacity', '0.75');
            descTxt.setAttribute('font-size', '9.5px');
            const cleanDesc = n.desc.length > 38 ? n.desc.substring(0, 35) + '...' : n.desc;
            descTxt.textContent = cleanDesc;
            cardG.appendChild(descTxt);
          }

          cardG.addEventListener('mousedown', (e) => e.stopPropagation());
          cardG.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof AppController !== 'undefined' && AppController.instance) {
              AppController.instance.selectVisualObject({
                type: `C4 ${n.kind}`,
                title: n.label,
                fields: [
                  { key: 'label', label: 'Display Name / Label', type: 'text', value: n.label },
                  { key: 'kind', label: 'C4 Element Type', type: 'select', value: n.kind, options: [
                    { value: 'Person', label: 'Person (Internal User / Actor)' },
                    { value: 'Person_Ext', label: 'Person_Ext (External User / Actor)' },
                    { value: 'System', label: 'System (Software System)' },
                    { value: 'System_Ext', label: 'System_Ext (External System / SaaS)' },
                    { value: 'SystemDb', label: 'SystemDb (Database / Storage)' },
                    { value: 'Container', label: 'Container (App / API / Microservice)' },
                    { value: 'Component', label: 'Component (Internal Module)' }
                  ]},
                  { key: 'desc', label: 'Description', type: 'textarea', rows: 3, value: n.desc || '' },
                  { key: 'font', label: '1. Font / Text Color', type: 'color', value: n.fontColor },
                  { key: 'fill', label: '2. Node Fill Color', type: 'color', value: n.fillColor },
                  { key: 'border', label: '3. Node Border / Stroke Color', type: 'color', value: n.borderColor }
                ],
                onSave: (vals) => {
                  MultiDiagramVisualizer.setColor(n.alias, vals.fill);
                  MultiDiagramVisualizer.setColor(`${n.alias}_font`, vals.font);
                  MultiDiagramVisualizer.setColor(`${n.alias}_border`, vals.border);
                  MultiDiagramVisualizer.syncColorToCode(n.alias, vals.fill);
                  MultiDiagramVisualizer.syncColorToCode(`${n.alias}_font`, vals.font);
                  MultiDiagramVisualizer.syncColorToCode(`${n.alias}_border`, vals.border);

                  if (typeof AppController !== 'undefined' && AppController.instance && AppController.instance.selectedVisualObject) {
                    AppController.instance.selectedVisualObject.title = vals.label;
                  }

                  MultiDiagramVisualizer.updateCodeLine((curCode) => {
                    const lines = curCode.split('\n');
                    const idx = lines.findIndex(l => !l.trim().startsWith('%%') && new RegExp(`^(?:Person|Person_Ext|System|System_Ext|SystemDb|SystemDb_Ext|Container|ContainerDb|Component)\\s*\\(\\s*${n.alias}\\b`, 'i').test(l.trim()));
                    if (idx !== -1) {
                      const lead = lines[idx].match(/^(\s*)/)[1] || '  ';
                      const descStr = vals.desc ? `, "${vals.desc}"` : '';
                      lines[idx] = `${lead}${vals.kind}(${n.alias}, "${vals.label}"${descStr})`;
                    }
                    return lines.join('\n');
                  });
                }
              });
            }
          });

          nodesLayer.appendChild(cardG);
        });
        break;
      }

      case 'sequence': {
        const rawLines = (code || '').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('%%') && !l.startsWith('sequenceDiagram'));
        const autoNumber = (code || '').toLowerCase().includes('autonumber');
        const participants = [];
        const participantMap = new Map();
        const messages = [];

        const addParticipant = (id, name, isActor = false) => {
          if (!participantMap.has(id)) {
            const p = { id, name: name || id, isActor, x: 0 };
            participants.push(p);
            participantMap.set(id, p);
          }
        };

        rawLines.forEach(line => {
          const actorMatch = line.match(/^actor\s+([A-Za-z0-9_]+)(?:\s+as\s+(.+))?/i);
          if (actorMatch) {
            addParticipant(actorMatch[1], actorMatch[2], true);
            return;
          }

          const partMatch = line.match(/^participant\s+([A-Za-z0-9_]+)(?:\s+as\s+(.+))?/i);
          if (partMatch) {
            addParticipant(partMatch[1], partMatch[2], false);
            return;
          }

          const msgMatch = line.match(/^([A-Za-z0-9_]+)\s*(->>|-->>|->|-->|-x|--x)\s*([A-Za-z0-9_]+)\s*:\s*(.+)/);
          if (msgMatch) {
            addParticipant(msgMatch[1]);
            addParticipant(msgMatch[3]);
            messages.push({
              from: msgMatch[1],
              to: msgMatch[3],
              text: msgMatch[4],
              type: msgMatch[2].includes('--') ? 'dashed' : 'solid',
              arrow: msgMatch[2]
            });
          }
        });

        if (participants.length === 0) {
          addParticipant('Alice', 'Alice');
          addParticipant('Bob', 'Bob');
          messages.push({ from: 'Alice', to: 'Bob', text: 'Hello Bob!', type: 'solid', arrow: '->>' });
        }

        const startX = 80;
        const gapX = 180;
        const topY = 50;
        const totalHeight = Math.max(380, topY + 90 + messages.length * 60);

        // Draw participants
        participants.forEach((p, idx) => {
          p.x = startX + idx * gapX;

          const pFill = MultiDiagramVisualizer.getColor(p.id, primaryFill);
          const pFont = MultiDiagramVisualizer.getColor(`${p.id}_font`, primaryText);
          const pBorder = MultiDiagramVisualizer.getColor(`${p.id}_border`, primaryBorder);

          // Lifeline
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', `${p.x}`);
          line.setAttribute('y1', `${topY + 36}`);
          line.setAttribute('x2', `${p.x}`);
          line.setAttribute('y2', `${totalHeight}`);
          line.setAttribute('stroke', linkColor);
          line.setAttribute('stroke-width', '1.5');
          line.setAttribute('stroke-dasharray', '4,4');
          edgesLayer.appendChild(line);

          // Box / Actor Capsule
          const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          g.style.cursor = 'pointer';

          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          rect.setAttribute('x', `${p.x - 60}`);
          rect.setAttribute('y', `${topY}`);
          rect.setAttribute('width', '120');
          rect.setAttribute('height', '38');
          rect.setAttribute('rx', p.isActor ? '19' : '6');
          const isSelP = (p.name === selTitle || p.id === selTitle);
          rect.setAttribute('fill', pFill);
          rect.setAttribute('stroke', isSelP ? 'var(--selection-color)' : pBorder);
          rect.setAttribute('stroke-width', isSelP ? '3' : '1.8');
          if (isSelP) rect.style.filter = selGlow;
          g.appendChild(rect);

          const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          text.setAttribute('x', `${p.x}`);
          text.setAttribute('y', `${topY + 19}`);
          text.setAttribute('text-anchor', 'middle');
          text.setAttribute('dominant-baseline', 'central');
          text.setAttribute('fill', pFont);
          text.setAttribute('font-size', '12px');
          text.setAttribute('font-weight', '600');
          text.textContent = p.name;
          g.appendChild(text);

          g.addEventListener('mousedown', (e) => e.stopPropagation());
          g.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof AppController !== 'undefined' && AppController.instance) {
              AppController.instance.selectVisualObject({
                type: p.isActor ? 'Sequence Actor' : 'Sequence Participant',
                title: p.name,
                fields: [
                  { key: 'name', label: 'Display Name', type: 'text', value: p.name },
                  { key: 'type', label: 'Actor Shape', type: 'select', value: p.isActor ? 'actor' : 'participant', options: [
                    { value: 'participant', label: 'Participant (Box)' },
                    { value: 'actor', label: 'Actor (Pill / Capsule)' }
                  ]},
                  { key: 'font', label: '1. Font / Text Color', type: 'color', value: pFont },
                  { key: 'fill', label: '2. Node Fill Color', type: 'color', value: pFill },
                  { key: 'border', label: '3. Node Border / Stroke Color', type: 'color', value: pBorder }
                ],
                onSave: (vals) => {
                  MultiDiagramVisualizer.setColor(p.id, vals.fill);
                  MultiDiagramVisualizer.setColor(`${p.id}_font`, vals.font);
                  MultiDiagramVisualizer.setColor(`${p.id}_border`, vals.border);
                  MultiDiagramVisualizer.syncColorToCode(p.id, vals.fill);
                  MultiDiagramVisualizer.syncColorToCode(`${p.id}_font`, vals.font);
                  MultiDiagramVisualizer.syncColorToCode(`${p.id}_border`, vals.border);
                  MultiDiagramVisualizer.updateCodeLine((curCode) => {
                    const lines = curCode.split('\n');
                    const idx = lines.findIndex(l => new RegExp(`^(actor|participant)\\s+${p.id}\\b`, 'i').test(l.trim()));
                    if (idx !== -1) {
                      const lead = lines[idx].match(/^(\s*)/)[1] || '  ';
                      lines[idx] = `${lead}${vals.type} ${p.id} as ${vals.name}`;
                    }
                    return lines.join('\n');
                  });
                }
              });
            }
          });

          nodesLayer.appendChild(g);
        });

        // Draw sequence message arrows
        messages.forEach((m, idx) => {
          const y = topY + 75 + idx * 55;
          const pFrom = participantMap.get(m.from);
          const pTo = participantMap.get(m.to);
          if (!pFrom || !pTo) return;

          const x1 = pFrom.x;
          const x2 = pTo.x;
          const msgKey = `${m.from}->${m.to}:${m.text}`;
          const msgColor = MultiDiagramVisualizer.getColor(msgKey, MultiDiagramVisualizer.getColor(`${m.from}->${m.to}`, linkColor));
          const msgFont = MultiDiagramVisualizer.getColor(`${msgKey}_font`, textColor);
          const msgBadgeFill = MultiDiagramVisualizer.getColor(`${msgKey}_bg`, cardBg);
          const msgBadgeBorder = MultiDiagramVisualizer.getColor(`${msgKey}_border`, (msgColor !== linkColor ? msgColor : cardBorder));

          const lineG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', `${x1}`);
          line.setAttribute('y1', `${y}`);
          line.setAttribute('x2', `${x2}`);
          line.setAttribute('y2', `${y}`);
          line.setAttribute('stroke', msgColor);
          line.setAttribute('stroke-width', '2');
          if (m.type === 'dashed') line.setAttribute('stroke-dasharray', '5,4');
          lineG.appendChild(line);

          // Arrowhead
          const arrowHead = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
          if (x2 > x1) {
            arrowHead.setAttribute('points', `${x2 - 8},${y - 4.5} ${x2},${y} ${x2 - 8},${y + 4.5}`);
          } else {
            arrowHead.setAttribute('points', `${x2 + 8},${y - 4.5} ${x2},${y} ${x2 + 8},${y + 4.5}`);
          }
          arrowHead.setAttribute('fill', msgColor);
          lineG.appendChild(arrowHead);
          edgesLayer.appendChild(lineG);

          // Step Badge
          const badgeG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          badgeG.style.cursor = 'pointer';
          const midX = (x1 + x2) / 2;
          const badgeTextStr = autoNumber ? `${idx + 1}. ${m.text}` : m.text;
          const badgeW = badgeTextStr.length * 6.8 + 24;
          const badgeBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          badgeBg.setAttribute('x', `${midX - badgeW / 2}`);
          badgeBg.setAttribute('y', `${y - 18}`);
          badgeBg.setAttribute('width', `${badgeW}`);
          badgeBg.setAttribute('height', '18');
          badgeBg.setAttribute('rx', '4');
          const isSelM = (m.text === selTitle || `${m.from} → ${m.to}` === selTitle);
          badgeBg.setAttribute('fill', msgBadgeFill);
          badgeBg.setAttribute('stroke', isSelM ? 'var(--selection-color)' : msgBadgeBorder);
          badgeBg.setAttribute('stroke-width', isSelM ? '2' : '1');
          if (isSelM) badgeBg.style.filter = selGlow;
          badgeG.appendChild(badgeBg);

          const badgeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          badgeText.setAttribute('x', `${midX}`);
          badgeText.setAttribute('y', `${y - 9}`);
          badgeText.setAttribute('text-anchor', 'middle');
          badgeText.setAttribute('dominant-baseline', 'central');
          badgeText.setAttribute('fill', msgFont);
          badgeText.setAttribute('font-size', '10.5px');
          badgeText.setAttribute('font-weight', '500');
          badgeText.textContent = badgeTextStr;
          badgeG.appendChild(badgeText);

          badgeG.addEventListener('mousedown', (e) => e.stopPropagation());
          badgeG.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof AppController !== 'undefined' && AppController.instance) {
              AppController.instance.selectVisualObject({
                type: 'Sequence Message',
                title: `${m.from} → ${m.to}`,
                fields: [
                  { key: 'text', label: 'Message Text', type: 'text', value: m.text },
                  { key: 'arrow', label: 'Arrow Type', type: 'select', value: m.arrow || (m.type === 'dashed' ? '-->>' : '->>'), options: [
                    { value: '->>', label: 'Solid Arrow (->>)' },
                    { value: '-->>', label: 'Dotted Arrow (-->>)' },
                    { value: '->', label: 'Solid Line (->)' },
                    { value: '-->', label: 'Dotted Line (-->)' },
                    { value: '-x', label: 'Cross End (-x)' },
                    { value: '--x', label: 'Dotted Cross (--x)' }
                  ]},
                  { key: 'font', label: '1. Label Font Color', type: 'color', value: msgFont },
                  { key: 'color', label: '2. Line / Arrow Color', type: 'color', value: msgColor },
                  { key: 'badgeFill', label: '3. Label Badge Fill Color', type: 'color', value: msgBadgeFill },
                  { key: 'badgeBorder', label: '4. Label Badge Border Color', type: 'color', value: msgBadgeBorder }
                ],
                onSave: (vals) => {
                  const newKey = `${m.from}->${m.to}:${vals.text}`;
                  MultiDiagramVisualizer.setColor(newKey, vals.color);
                  MultiDiagramVisualizer.setColor(`${newKey}_font`, vals.font);
                  MultiDiagramVisualizer.setColor(`${newKey}_bg`, vals.badgeFill);
                  MultiDiagramVisualizer.setColor(`${newKey}_border`, vals.badgeBorder);
                  MultiDiagramVisualizer.syncColorToCode(newKey, vals.color);
                  MultiDiagramVisualizer.syncColorToCode(`${newKey}_font`, vals.font);
                  MultiDiagramVisualizer.syncColorToCode(`${newKey}_bg`, vals.badgeFill);
                  MultiDiagramVisualizer.syncColorToCode(`${newKey}_border`, vals.badgeBorder);
                  MultiDiagramVisualizer.updateCodeLine((curCode) => {
                    const lines = curCode.split('\n');
                    const idx = lines.findIndex(l => new RegExp(`^\\s*${m.from}\\s*(?:-->>|->>|-->|->|-x|--x)\\s*${m.to}\\s*:`, 'i').test(l.trim()));
                    if (idx !== -1) {
                      const lead = lines[idx].match(/^(\s*)/)[1] || '  ';
                      lines[idx] = `${lead}${m.from} ${vals.arrow} ${m.to}: ${vals.text}`;
                    }
                    return lines.join('\n');
                  });
                }
              });
            }
          });

          nodesLayer.appendChild(badgeG);
        });
        break;
      }

      case 'pie': {
        const rawLines = (code || '').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('%%'));
        let title = 'Cloud Infrastructure Resource Distribution';
        const data = [];
        const colors = ['#2196F3', '#4CAF50', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4', '#009688', '#673AB7', '#FF5722'];

        rawLines.forEach(line => {
          if (line.toLowerCase().startsWith('pie')) {
            const tm = line.match(/title\s+(.+)$/i);
            if (tm) title = tm[1].trim();
            return;
          }
          const m = line.match(/^["']?([^"':]+)["']?\s*:\s*([0-9.]+)/);
          if (m) {
            const rawLbl = m[1].trim();
            const defaultCol = colors[data.length % colors.length];
            data.push({
              label: rawLbl,
              val: parseFloat(m[2]),
              fillColor: MultiDiagramVisualizer.getColor(rawLbl, defaultCol),
              fontColor: MultiDiagramVisualizer.getColor(`${rawLbl}_font`, textColor),
              borderColor: MultiDiagramVisualizer.getColor(`${rawLbl}_border`, cardBg)
            });
          }
        });

        if (data.length === 0) {
          data.push({ label: 'Category A', val: 40, fillColor: '#2196F3', fontColor: textColor, borderColor: cardBg });
          data.push({ label: 'Category B', val: 35, fillColor: '#4CAF50', fontColor: textColor, borderColor: cardBg });
          data.push({ label: 'Category C', val: 25, fillColor: '#FF9800', fontColor: textColor, borderColor: cardBg });
        }

        const total = data.reduce((acc, d) => acc + d.val, 0) || 1;
        const cx = 220;
        const cy = 210;
        const r = 130;

        // Title
        const titleEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        titleEl.setAttribute('x', '220');
        titleEl.setAttribute('y', '38');
        titleEl.setAttribute('text-anchor', 'middle');
        titleEl.setAttribute('fill', primaryText);
        titleEl.setAttribute('font-size', '15px');
        titleEl.setAttribute('font-weight', 'bold');
        titleEl.textContent = title;
        nodesLayer.appendChild(titleEl);

        let curAngle = -Math.PI / 2;

        data.forEach((d, idx) => {
          const sliceAngle = (d.val / total) * 2 * Math.PI;
          const nextAngle = curAngle + sliceAngle;

          const x1 = cx + r * Math.cos(curAngle);
          const y1 = cy + r * Math.sin(curAngle);
          const x2 = cx + r * Math.cos(nextAngle);
          const y2 = cy + r * Math.sin(nextAngle);

          const largeArc = sliceAngle > Math.PI ? 1 : 0;
          const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;

          const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', pathData);
          const isSelPie = (d.label === selTitle);
          path.setAttribute('fill', d.fillColor);
          path.setAttribute('stroke', isSelPie ? 'var(--selection-color)' : d.borderColor);
          path.setAttribute('stroke-width', isSelPie ? '3.5' : '2');
          if (isSelPie) path.style.filter = selGlow;
          path.style.cursor = 'pointer';

          const pct = ((d.val / total) * 100).toFixed(1);

          // Slice mid-angle percentage label inside/along slice
          const midSliceAngle = curAngle + sliceAngle / 2;
          const labelDist = r * 0.65;
          const sliceLabelX = cx + labelDist * Math.cos(midSliceAngle);
          const sliceLabelY = cy + labelDist * Math.sin(midSliceAngle);

          if (sliceAngle > 0.25) {
            const sliceText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            sliceText.setAttribute('x', `${sliceLabelX}`);
            sliceText.setAttribute('y', `${sliceLabelY}`);
            sliceText.setAttribute('text-anchor', 'middle');
            sliceText.setAttribute('dominant-baseline', 'central');
            sliceText.setAttribute('fill', '#FFFFFF');
            sliceText.setAttribute('font-size', '11px');
            sliceText.setAttribute('font-weight', 'bold');
            sliceText.setAttribute('pointer-events', 'none');
            sliceText.setAttribute('style', 'text-shadow: 0 1px 2px rgba(0,0,0,0.6);');
            sliceText.textContent = `${pct}%`;
            g.appendChild(sliceText);
          }

          const attachPieClick = (targetEl) => {
            targetEl.addEventListener('mousedown', (e) => e.stopPropagation());
            targetEl.addEventListener('click', (e) => {
              e.stopPropagation();
              if (typeof AppController !== 'undefined' && AppController.instance) {
                AppController.instance.selectVisualObject({
                  type: 'Pie Slice',
                  title: d.label,
                  fields: [
                    { key: 'label', label: 'Slice Label', type: 'text', value: d.label },
                    { key: 'val', label: 'Value / Proportion', type: 'number', step: 1, min: 0, value: d.val },
                    { key: 'font', label: '1. Font / Legend Color', type: 'color', value: d.fontColor },
                    { key: 'fill', label: '2. Node / Slice Fill Color', type: 'color', value: d.fillColor },
                    { key: 'border', label: '3. Node / Slice Border Color', type: 'color', value: d.borderColor }
                  ],
                  onSave: (vals) => {
                    MultiDiagramVisualizer.setColor(vals.label, vals.fill);
                    MultiDiagramVisualizer.setColor(`${vals.label}_font`, vals.font);
                    MultiDiagramVisualizer.setColor(`${vals.label}_border`, vals.border);
                    MultiDiagramVisualizer.syncColorToCode(vals.label, vals.fill);
                    MultiDiagramVisualizer.syncColorToCode(`${vals.label}_font`, vals.font);
                    MultiDiagramVisualizer.syncColorToCode(`${vals.label}_border`, vals.border);
                    MultiDiagramVisualizer.updateCodeLine((curCode) => {
                      const lines = curCode.split('\n');
                      const esc = d.label.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                      const idx = lines.findIndex(l => new RegExp(`^\\s*["']?${esc}["']?\\s*:`, 'i').test(l.trim()));
                      if (idx !== -1) {
                        const lead = lines[idx].match(/^(\s*)/)[1] || '  ';
                        lines[idx] = `${lead}"${vals.label}" : ${vals.val}`;
                      }
                      return lines.join('\n');
                    });
                  }
                });
              }
            });
          };

          attachPieClick(path);
          g.appendChild(path);
          nodesLayer.appendChild(g);

          // Legend item
          const legG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          legG.style.cursor = 'pointer';
          const legY = 85 + idx * 30;

          const legRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          legRect.setAttribute('x', '390');
          legRect.setAttribute('y', `${legY}`);
          legRect.setAttribute('width', '16');
          legRect.setAttribute('height', '16');
          legRect.setAttribute('rx', '4');
          legRect.setAttribute('fill', d.fillColor);
          legRect.setAttribute('stroke', d.borderColor);
          legRect.setAttribute('stroke-width', '1.5');
          legG.appendChild(legRect);

          const legText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          legText.setAttribute('x', '415');
          legText.setAttribute('y', `${legY + 12}`);
          legText.setAttribute('fill', d.fontColor);
          legText.setAttribute('font-size', '12px');
          legText.setAttribute('font-weight', '500');
          legText.textContent = `${d.label} (${pct}%)`;
          legG.appendChild(legText);

          attachPieClick(legG);
          nodesLayer.appendChild(legG);

          curAngle = nextAngle;
        });
        break;
      }

            case 'gantt': {
        const rawLines = (code || '').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('%%'));
        let title = 'Project Sprint Roadmap';
        const sections = [];
        let currentSection = { name: 'Sprint Tasks', tasks: [] };
        sections.push(currentSection);

        const parseDateOffset = (dateStr) => {
          if (!dateStr) return null;
          const clean = dateStr.trim();
          const t = Date.parse(clean);
          return isNaN(t) ? null : t;
        };

        const getWeekNumber = (d) => {
          const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
          date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
          const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
          return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
        };

        const allTasks = [];

        rawLines.forEach(line => {
          if (line.toLowerCase().startsWith('gantt') || line.toLowerCase().startsWith('dateformat')) return;
          const titleMatch = line.match(/^title\s+(.+)$/i);
          if (titleMatch) { title = titleMatch[1].trim(); return; }

          const secMatch = line.match(/^section\s+(.+)$/i);
          if (secMatch) {
            currentSection = { name: secMatch[1].trim(), tasks: [] };
            sections.push(currentSection);
            return;
          }

          const taskMatch = line.match(/^([^:]+):(.*)$/);
          if (taskMatch) {
            const name = taskMatch[1].trim();
            const details = taskMatch[2].trim();
            const parts = details.split(',').map(s => s.trim());

            let isDone = false, isActive = false, isCrit = false, isMile = false;
            let id = null, startDate = null, endDate = null, durDays = 5;

            parts.forEach(p => {
              const pl = p.toLowerCase();
              if (pl === 'done') isDone = true;
              else if (pl === 'active') isActive = true;
              else if (pl === 'crit') isCrit = true;
              else if (pl === 'milestone') isMile = true;
              else if (p.match(/^[0-9]+d$/i)) {
                durDays = parseInt(p);
              } else if (p.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)) {
                if (!startDate) startDate = p;
                else endDate = p;
              } else if (!id && p.match(/^[A-Za-z0-9_]+$/)) {
                id = p;
              }
            });

            if (startDate && endDate) {
              const t1 = parseDateOffset(startDate);
              const t2 = parseDateOffset(endDate);
              if (t1 && t2 && t2 >= t1) {
                durDays = Math.max(1, Math.round((t2 - t1) / (1000 * 60 * 60 * 24)));
              }
            }

            let status = 'normal';
            if (isDone) status = 'done';
            else if (isActive) status = 'active';
            else if (isCrit) status = 'crit';
            else if (isMile) status = 'milestone';

            const defaultBarColor = isCrit ? '#F44336' : (isDone ? '#4CAF50' : (isActive ? '#FF9800' : '#2196F3'));
            const defaultBorderColor = isCrit ? '#B71C1C' : (isDone ? '#1B5E20' : (isActive ? '#E65100' : '#0D47A1'));

            const taskObj = {
              name,
              id: id || `t_${allTasks.length + 1}`,
              startDate,
              endDate,
              status,
              done: isDone,
              active: isActive,
              crit: isCrit,
              milestone: isMile,
              dur: durDays,
              fillColor: MultiDiagramVisualizer.getColor(name, defaultBarColor),
              fontColor: MultiDiagramVisualizer.getColor(`${name}_font`, textColor),
              borderColor: MultiDiagramVisualizer.getColor(`${name}_border`, defaultBorderColor)
            };

            currentSection.tasks.push(taskObj);
            allTasks.push(taskObj);
          }
        });

        // Compute global date baseline
        let minTime = null;
        let maxTime = null;
        allTasks.forEach(t => {
          if (t.startDate) {
            const time1 = parseDateOffset(t.startDate);
            if (time1 && (minTime === null || time1 < minTime)) minTime = time1;
            const time2 = t.endDate ? parseDateOffset(t.endDate) : (time1 ? time1 + t.dur * 86400000 : null);
            if (time2 && (maxTime === null || time2 > maxTime)) maxTime = time2;
          }
        });

        // Title
        const titleEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        titleEl.setAttribute('x', '30');
        titleEl.setAttribute('y', '30');
        titleEl.setAttribute('fill', primaryText);
        titleEl.setAttribute('font-size', '15px');
        titleEl.setAttribute('font-weight', 'bold');
        titleEl.textContent = title;
        nodesLayer.appendChild(titleEl);

        const startX = 220;
        const pxPerDay = 18;
        const totalDays = (minTime && maxTime) ? Math.max(35, Math.ceil((maxTime - minTime) / 86400000) + 7) : 42;
        const numWeeks = Math.ceil(totalDays / 7);
        const totalGanttWidth = startX + numWeeks * 7 * pxPerDay + 20;

        // Calculate actual total height based on sections and tasks
        let totalRows = 0;
        sections.forEach(s => { if (s.tasks.length > 0) totalRows += s.tasks.length + 1; });
        const totalGanttHeight = Math.max(340, 100 + totalRows * 30 + 30);

        // Draw Left Pane Header
        const leftHeader = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        leftHeader.setAttribute('x', '20');
        leftHeader.setAttribute('y', '46');
        leftHeader.setAttribute('width', `${startX - 25}`);
        leftHeader.setAttribute('height', '44');
        leftHeader.setAttribute('rx', '4');
        leftHeader.setAttribute('fill', isDark ? '#2B2D30' : '#ECEFF1');
        leftHeader.setAttribute('stroke', cardBorder);
        leftHeader.setAttribute('stroke-width', '1');
        nodesLayer.appendChild(leftHeader);

        const leftHeaderTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        leftHeaderTxt.setAttribute('x', '35');
        leftHeaderTxt.setAttribute('y', '72');
        leftHeaderTxt.setAttribute('fill', primaryText);
        leftHeaderTxt.setAttribute('font-size', '11.5px');
        leftHeaderTxt.setAttribute('font-weight', 'bold');
        leftHeaderTxt.textContent = 'TASK / ROADMAP ITEM';
        nodesLayer.appendChild(leftHeaderTxt);

        // Draw Months & Weeks 2-Tier Header
        const monthSpans = [];
        let curMonth = null;

        for (let w = 0; w < numWeeks; w++) {
          const wx = startX + w * 7 * pxPerDay;
          const ww = 7 * pxPerDay;

          // Continuous vertical gridline down the full chart
          const gridLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          gridLine.setAttribute('x1', `${wx}`);
          gridLine.setAttribute('y1', '46');
          gridLine.setAttribute('x2', `${wx}`);
          gridLine.setAttribute('y2', `${totalGanttHeight}`);
          gridLine.setAttribute('stroke', cardBorder);
          gridLine.setAttribute('stroke-width', '1');
          gridLine.setAttribute('stroke-dasharray', '4,3');
          gridLine.setAttribute('opacity', '0.6');
          edgesLayer.appendChild(gridLine);

          // Sub-tier Week Header Box
          const weekBox = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          weekBox.setAttribute('x', `${wx}`);
          weekBox.setAttribute('y', '68');
          weekBox.setAttribute('width', `${ww - 1}`);
          weekBox.setAttribute('height', '22');
          weekBox.setAttribute('fill', isDark ? '#242628' : '#F5F7F8');
          weekBox.setAttribute('stroke', cardBorder);
          weekBox.setAttribute('stroke-width', '1');
          nodesLayer.appendChild(weekBox);

          let weekLabel = `Week ${w + 1}`;
          let mName = 'Month';

          if (minTime) {
            const wStartDate = new Date(minTime + w * 7 * 86400000);
            const wEndDate = new Date(minTime + (w * 7 + 6) * 86400000);
            const wNum = getWeekNumber(wStartDate);
            weekLabel = `W${wNum} (${wStartDate.getDate()}-${wEndDate.getDate()})`;
            mName = wStartDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
          }

          if (!curMonth || curMonth.name !== mName) {
            curMonth = { name: mName, startX: wx, width: ww };
            monthSpans.push(curMonth);
          } else {
            curMonth.width += ww;
          }

          const wText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          wText.setAttribute('x', `${wx + ww / 2}`);
          wText.setAttribute('y', '83');
          wText.setAttribute('text-anchor', 'middle');
          wText.setAttribute('fill', textColor);
          wText.setAttribute('font-size', '10px');
          wText.setAttribute('font-weight', '600');
          wText.textContent = weekLabel;
          nodesLayer.appendChild(wText);
        }

        // Draw Month Spans (Top Tier)
        monthSpans.forEach(m => {
          const mBox = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          mBox.setAttribute('x', `${m.startX}`);
          mBox.setAttribute('y', '46');
          mBox.setAttribute('width', `${m.width - 1}`);
          mBox.setAttribute('height', '22');
          mBox.setAttribute('fill', isDark ? '#2B2D30' : '#ECEFF1');
          mBox.setAttribute('stroke', cardBorder);
          mBox.setAttribute('stroke-width', '1');
          nodesLayer.appendChild(mBox);

          const mText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          mText.setAttribute('x', `${m.startX + m.width / 2}`);
          mText.setAttribute('y', '61');
          mText.setAttribute('text-anchor', 'middle');
          mText.setAttribute('fill', primaryText);
          mText.setAttribute('font-size', '11px');
          mText.setAttribute('font-weight', 'bold');
          mText.textContent = m.name;
          nodesLayer.appendChild(mText);
        });

        // Vertical divider separating Task Name pane from Timeline
        const mainDivider = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        mainDivider.setAttribute('x1', `${startX}`);
        mainDivider.setAttribute('y1', '46');
        mainDivider.setAttribute('x2', `${startX}`);
        mainDivider.setAttribute('y2', `${totalGanttHeight}`);
        mainDivider.setAttribute('stroke', primaryBorder);
        mainDivider.setAttribute('stroke-width', '2');
        edgesLayer.appendChild(mainDivider);

        let curY = 100;
        let globalDayCounter = 0;

        sections.forEach(sec => {
          if (sec.tasks.length === 0) return;

          // Section Header Row
          const secRow = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          secRow.setAttribute('x', '20');
          secRow.setAttribute('y', `${curY}`);
          secRow.setAttribute('width', `${totalGanttWidth - 20}`);
          secRow.setAttribute('height', '26');
          secRow.setAttribute('fill', isDark ? 'rgba(33, 150, 243, 0.12)' : 'rgba(33, 150, 243, 0.08)');
          nodesLayer.appendChild(secRow);

          const secText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          secText.setAttribute('x', '30');
          secText.setAttribute('y', `${curY + 17}`);
          secText.setAttribute('fill', primaryBorder);
          secText.setAttribute('font-size', '12px');
          secText.setAttribute('font-weight', 'bold');
          secText.textContent = `§ ${sec.name}`;
          nodesLayer.appendChild(secText);

          curY += 28;

          sec.tasks.forEach((t, rIdx) => {
            let dayOffset = globalDayCounter;
            if (minTime && t.startDate) {
              const tTime = parseDateOffset(t.startDate);
              if (tTime) {
                dayOffset = Math.max(0, Math.round((tTime - minTime) / (1000 * 60 * 60 * 24)));
              }
            }

            // Task Row Background Stripe
            const rowStripe = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rowStripe.setAttribute('x', '20');
            rowStripe.setAttribute('y', `${curY}`);
            rowStripe.setAttribute('width', `${totalGanttWidth - 20}`);
            rowStripe.setAttribute('height', '26');
            rowStripe.setAttribute('fill', rIdx % 2 === 0 ? 'transparent' : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'));
            nodesLayer.appendChild(rowStripe);

            const taskRowG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            taskRowG.style.cursor = 'pointer';

            const lbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            lbl.setAttribute('x', '45');
            lbl.setAttribute('y', `${curY + 17}`);
            lbl.setAttribute('fill', t.fontColor);
            lbl.setAttribute('font-size', '11px');
            lbl.setAttribute('font-weight', '500');
            lbl.textContent = t.name;
            taskRowG.appendChild(lbl);

            const bx = startX + dayOffset * pxPerDay;
            const bw = Math.max(20, t.dur * pxPerDay);

            if (t.milestone) {
              const diamond = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
              diamond.setAttribute('points', `${bx}, ${curY + 3} ${bx + 11}, ${curY + 14} ${bx}, ${curY + 25} ${bx - 11}, ${curY + 14}`);
              diamond.setAttribute('fill', t.fillColor || '#9C27B0');
              diamond.setAttribute('stroke', t.borderColor || '#4A148C');
              diamond.setAttribute('stroke-width', '1.5');
              taskRowG.appendChild(diamond);
            } else {
              const bar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
              bar.setAttribute('x', `${bx}`);
              bar.setAttribute('y', `${curY + 3}`);
              bar.setAttribute('width', `${bw}`);
              bar.setAttribute('height', '21');
              bar.setAttribute('rx', '4');
              const isSelGantt = (t.name === selTitle);
              bar.setAttribute('fill', t.fillColor);
              bar.setAttribute('stroke', isSelGantt ? 'var(--selection-color)' : t.borderColor);
              bar.setAttribute('stroke-width', isSelGantt ? '3' : '1.5');
              if (isSelGantt) bar.style.filter = selGlow;
              taskRowG.appendChild(bar);

              const durText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
              durText.setAttribute('x', bw > 28 ? `${bx + bw / 2}` : `${bx + bw + 6}`);
              durText.setAttribute('y', `${curY + 17}`);
              durText.setAttribute('text-anchor', bw > 28 ? 'middle' : 'start');
              durText.setAttribute('fill', bw > 28 ? '#FFFFFF' : t.fontColor);
              durText.setAttribute('font-size', '9.5px');
              durText.setAttribute('font-weight', 'bold');
              durText.textContent = `${t.dur}d`;
              taskRowG.appendChild(durText);
            }

            taskRowG.addEventListener('mousedown', (e) => e.stopPropagation());
            taskRowG.addEventListener('click', (e) => {
              e.stopPropagation();
              if (typeof AppController !== 'undefined' && AppController.instance) {
                AppController.instance.selectVisualObject({
                  type: 'Gantt Task',
                  title: t.name,
                  fields: [
                    { key: 'name', label: 'Task Name', type: 'text', value: t.name },
                    { key: 'status', label: 'Task Status', type: 'select', value: t.status || 'normal', options: [
                      { value: 'normal', label: 'Normal Task' },
                      { value: 'active', label: 'Active (In Progress)' },
                      { value: 'done', label: 'Done (Completed)' },
                      { value: 'crit', label: 'Critical Path (Red)' },
                      { value: 'milestone', label: 'Milestone (Diamond)' }
                    ]},
                    { key: 'startDate', label: 'Start Date (YYYY-MM-DD)', type: 'text', value: t.startDate || '' },
                    { key: 'endDate', label: 'End Date (YYYY-MM-DD)', type: 'text', value: t.endDate || '' },
                    { key: 'dur', label: 'Duration (Days)', type: 'number', min: 1, step: 1, value: t.dur },
                    { key: 'font', label: '1. Font / Text Color', type: 'color', value: t.fontColor },
                    { key: 'fill', label: '2. Node / Bar Fill Color', type: 'color', value: t.fillColor },
                    { key: 'border', label: '3. Node / Bar Border Color', type: 'color', value: t.borderColor }
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
                      const esc = t.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                      const idx = lines.findIndex(l => !l.trim().startsWith('%%') && new RegExp(`^\\s*${esc}\\s*:`, 'i').test(l.trim()));
                      if (idx !== -1) {
                        const lead = lines[idx].match(/^(\s*)/)[1] || '    ';
                        const stPart = vals.status && vals.status !== 'normal' ? `${vals.status}, ` : '';
                        const idPart = t.id ? `${t.id}, ` : '';
                        let timePart = '';
                        if (vals.startDate && vals.endDate) {
                          timePart = `${vals.startDate}, ${vals.endDate}`;
                        } else if (vals.startDate && vals.dur) {
                          timePart = `${vals.startDate}, ${vals.dur}d`;
                        } else if (vals.dur) {
                          timePart = `${vals.dur}d`;
                        } else {
                          timePart = '5d';
                        }
                        lines[idx] = `${lead}${vals.name.padEnd(20, ' ')} :${stPart}${idPart}${timePart}`;
                      }
                      return lines.join('\n');
                    });
                  }
                });
              }
            });

            nodesLayer.appendChild(taskRowG);
            globalDayCounter += Math.min(6, t.dur);
            curY += 28;
          });
          curY += 8;
        });
        break;
      }

      case 'gitgraph': {
        const rawLines = (code || '').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('%%'));
        const branches = new Map();
        branches.set('main', { name: 'main', color: '#2196F3', y: 120 });
        let activeBranch = 'main';
        const branchColors = ['#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#00BCD4', '#E91E63', '#673AB7'];
        let branchCount = 1;
        const commits = [];

        rawLines.forEach(line => {
          if (line.toLowerCase().startsWith('gitgraph')) return;

          const brMatch = line.match(/^branch\s+([A-Za-z0-9_\/\-]+)/i);
          if (brMatch) {
            const bName = brMatch[1];
            if (!branches.has(bName)) {
              branches.set(bName, {
                name: bName,
                color: branchColors[branchCount % branchColors.length],
                y: 120 + branchCount * 65
              });
              branchCount++;
            }
            activeBranch = bName;
            return;
          }

          const coMatch = line.match(/^checkout\s+([A-Za-z0-9_\/\-]+)/i);
          if (coMatch) {
            activeBranch = coMatch[1];
            return;
          }

          const mergeMatch = line.match(/^merge\s+([A-Za-z0-9_\/\-]+)(?:\s+id:\s*["']?([^"']+)["']?)?(?:\s+tag:\s*["']?([^"']+)["']?)?/i);
          if (mergeMatch) {
            const fromBranch = mergeMatch[1];
            const id = mergeMatch[2] || `Merge ${fromBranch}`;
            const tag = mergeMatch[3];
            const bInfo = branches.get(activeBranch) || { color: '#2196F3', y: 120 };
            commits.push({
              id,
              tag,
              branch: activeBranch,
              isMerge: true,
              mergeFrom: fromBranch,
              color: MultiDiagramVisualizer.getColor(id, '#9C27B0'),
              fontColor: MultiDiagramVisualizer.getColor(`${id}_font`, textColor)
            });
            return;
          }

          const commitMatch = line.match(/^commit(?:\s+id:\s*["']?([^"']+)["']?)?(?:\s+tag:\s*["']?([^"']+)["']?)?/i);
          if (commitMatch) {
            const id = commitMatch[1] || `c${commits.length + 1}`;
            const tag = commitMatch[2];
            const bInfo = branches.get(activeBranch) || { color: '#2196F3', y: 120 };
            commits.push({
              id,
              tag,
              branch: activeBranch,
              isMerge: false,
              color: MultiDiagramVisualizer.getColor(id, bInfo.color),
              fontColor: MultiDiagramVisualizer.getColor(`${id}_font`, textColor)
            });
          }
        });

        if (commits.length === 0) {
          commits.push({ id: 'Initial Commit', branch: 'main', color: '#2196F3', fontColor: textColor });
          commits.push({ id: 'Feature Setup', branch: 'main', color: '#2196F3', fontColor: textColor });
        }

        const totalWidth = Math.max(700, commits.length * 105 + 140);

        // Title
        const titleEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        titleEl.setAttribute('x', '40');
        titleEl.setAttribute('y', '45');
        titleEl.setAttribute('fill', primaryText);
        titleEl.setAttribute('font-size', '15px');
        titleEl.setAttribute('font-weight', 'bold');
        titleEl.textContent = 'Git Version Graph';
        nodesLayer.appendChild(titleEl);

        // Draw Branch Tracks & Badges
        branches.forEach(b => {
          const track = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          track.setAttribute('x1', '120');
          track.setAttribute('y1', `${b.y}`);
          track.setAttribute('x2', `${totalWidth - 30}`);
          track.setAttribute('y2', `${b.y}`);
          track.setAttribute('stroke', b.color);
          track.setAttribute('stroke-width', '3');
          track.setAttribute('opacity', '0.4');
          edgesLayer.appendChild(track);

          const bBadge = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          bBadge.style.cursor = 'pointer';
          const bNameLen = b.name.length * 7 + 18;

          const bRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          bRect.setAttribute('x', `${110 - bNameLen}`);
          bRect.setAttribute('y', `${b.y - 12}`);
          bRect.setAttribute('width', `${bNameLen}`);
          bRect.setAttribute('height', '24');
          bRect.setAttribute('rx', '12');
          bRect.setAttribute('fill', b.color);
          bRect.setAttribute('opacity', '0.9');
          bBadge.appendChild(bRect);

          const bText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          bText.setAttribute('x', `${110 - bNameLen / 2}`);
          bText.setAttribute('y', `${b.y + 4}`);
          bText.setAttribute('text-anchor', 'middle');
          bText.setAttribute('fill', '#FFFFFF');
          bText.setAttribute('font-size', '11px');
          bText.setAttribute('font-weight', 'bold');
          bText.textContent = b.name;
          bBadge.appendChild(bText);

          nodesLayer.appendChild(bBadge);
        });

        // Draw Commit Connectors (sequential commit links)
        const commitPositions = [];
        commits.forEach((c, idx) => {
          const x = 140 + idx * 95;
          const bInfo = branches.get(c.branch) || { y: 120, color: '#2196F3' };
          const y = bInfo.y;
          commitPositions.push({ x, y, branch: c.branch, isMerge: c.isMerge, mergeFrom: c.mergeFrom });

          if (idx > 0) {
            const prev = commitPositions[idx - 1];
            const conn = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            if (prev.branch === c.branch) {
              conn.setAttribute('d', `M ${prev.x} ${prev.y} L ${x} ${y}`);
            } else {
              conn.setAttribute('d', `M ${prev.x} ${prev.y} C ${prev.x + 35} ${prev.y}, ${x - 35} ${y}, ${x} ${y}`);
            }
            conn.setAttribute('stroke', bInfo.color);
            conn.setAttribute('stroke-width', '3');
            conn.setAttribute('fill', 'none');
            edgesLayer.appendChild(conn);
          }

          // If merge, draw merge curve from merged branch
          if (c.isMerge && c.mergeFrom) {
            const fromBranchInfo = branches.get(c.mergeFrom);
            if (fromBranchInfo) {
              const mergeLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
              mergeLine.setAttribute('d', `M ${x - 70} ${fromBranchInfo.y} C ${x - 35} ${fromBranchInfo.y}, ${x - 20} ${y}, ${x} ${y}`);
              mergeLine.setAttribute('stroke', fromBranchInfo.color);
              mergeLine.setAttribute('stroke-width', '2.5');
              mergeLine.setAttribute('stroke-dasharray', '4,3');
              mergeLine.setAttribute('fill', 'none');
              edgesLayer.appendChild(mergeLine);
            }
          }
        });

        // Draw Commits Nodes & Badges
        commits.forEach((c, idx) => {
          const { x, y } = commitPositions[idx];

          const commitG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          commitG.style.cursor = 'pointer';

          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttribute('cx', `${x}`);
          circle.setAttribute('cy', `${y}`);
          circle.setAttribute('r', c.isMerge ? '12' : '10');
          const isSelGit = (c.id === selTitle);
          circle.setAttribute('fill', c.color);
          circle.setAttribute('stroke', isSelGit ? 'var(--selection-color)' : (isDark ? '#1E1E1E' : '#FFFFFF'));
          circle.setAttribute('stroke-width', isSelGit ? '3.5' : '2.5');
          if (isSelGit) circle.style.filter = selGlow;
          commitG.appendChild(circle);

          if (c.isMerge) {
            const innerC = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            innerC.setAttribute('cx', `${x}`);
            innerC.setAttribute('cy', `${y}`);
            innerC.setAttribute('r', '5');
            innerC.setAttribute('fill', '#FFFFFF');
            commitG.appendChild(innerC);
          }

          // Commit message text
          const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          txt.setAttribute('x', `${x}`);
          txt.setAttribute('y', `${y + 25}`);
          txt.setAttribute('text-anchor', 'middle');
          txt.setAttribute('fill', c.fontColor || textColor);
          txt.setAttribute('font-size', '10px');
          txt.setAttribute('font-weight', '500');
          txt.textContent = c.id;
          commitG.appendChild(txt);

          // Release Tag
          if (c.tag) {
            const tagG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            const tagW = c.tag.length * 6.5 + 24;
            const tagRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            tagRect.setAttribute('x', `${x - tagW / 2}`);
            tagRect.setAttribute('y', `${y - 30}`);
            tagRect.setAttribute('width', `${tagW}`);
            tagRect.setAttribute('height', '18');
            tagRect.setAttribute('rx', '9');
            tagRect.setAttribute('fill', '#9C27B0');
            tagG.appendChild(tagRect);

            const tagText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            tagText.setAttribute('x', `${x}`);
            tagText.setAttribute('y', `${y - 18}`);
            tagText.setAttribute('text-anchor', 'middle');
            tagText.setAttribute('fill', '#FFFFFF');
            tagText.setAttribute('font-size', '9.5px');
            tagText.setAttribute('font-weight', 'bold');
            tagText.textContent = '🏷 ' + c.tag;
            tagG.appendChild(tagText);
            commitG.appendChild(tagG);
          }

          commitG.addEventListener('mousedown', (e) => e.stopPropagation());
          commitG.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof AppController !== 'undefined' && AppController.instance) {
              AppController.instance.selectVisualObject({
                type: 'Git Commit',
                title: c.id,
                fields: [
                  { key: 'id', label: 'Commit Message / ID', type: 'text', value: c.id },
                  { key: 'tag', label: 'Release Tag (Optional)', type: 'text', value: c.tag || '' },
                  { key: 'color', label: 'Commit Color', type: 'color', value: c.color },
                  { key: 'font', label: 'Label Font Color', type: 'color', value: c.fontColor || textColor }
                ],
                onSave: (vals) => {
                  MultiDiagramVisualizer.setColor(vals.id, vals.color);
                  MultiDiagramVisualizer.setColor(`${vals.id}_font`, vals.font);
                  MultiDiagramVisualizer.syncColorToCode(vals.id, vals.color);
                  MultiDiagramVisualizer.updateCodeLine((curCode) => {
                    const lines = curCode.split('\n');
                    const esc = c.id.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                    const idx = lines.findIndex(l => new RegExp(`(?:commit|merge)\\s+.*?id:\\s*["']?${esc}["']?`, 'i').test(l.trim()));
                    if (idx !== -1) {
                      const lead = lines[idx].match(/^(\s*)/)[1] || '  ';
                      const tagPart = vals.tag ? ` tag: "${vals.tag}"` : '';
                      if (lines[idx].trim().startsWith('merge')) {
                        const mBranch = lines[idx].trim().match(/^merge\s+([A-Za-z0-9_\/\-]+)/i)[1];
                        lines[idx] = `${lead}merge ${mBranch} id: "${vals.id}"${tagPart}`;
                      } else {
                        lines[idx] = `${lead}commit id: "${vals.id}"${tagPart}`;
                      }
                    }
                    return lines.join('\n');
                  });
                }
              });
            }
          });

          nodesLayer.appendChild(commitG);
        });
        break;
      }

      case 'journey': {
        const rawLines = (code || '').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('%%'));
        let title = 'User Journey Map';
        const sections = [];
        let curSection = { name: 'Workflow', tasks: [] };
        sections.push(curSection);

        rawLines.forEach(line => {
          if (line.toLowerCase().startsWith('journey')) return;
          const titleMatch = line.match(/^title\s+(.+)$/i);
          if (titleMatch) { title = titleMatch[1].trim(); return; }

          const secMatch = line.match(/^section\s+(.+)$/i);
          if (secMatch) {
            curSection = { name: secMatch[1].trim(), tasks: [] };
            sections.push(curSection);
            return;
          }

          const taskMatch = line.match(/^([^:]+):\s*([0-9]+)\s*:\s*(.+)$/);
          if (taskMatch) {
            const name = taskMatch[1].trim();
            curSection.tasks.push({
              name,
              score: parseInt(taskMatch[2]),
              actor: taskMatch[3].trim(),
              fillColor: MultiDiagramVisualizer.getColor(name, cardBg),
              fontColor: MultiDiagramVisualizer.getColor(`${name}_font`, primaryText),
              borderColor: MultiDiagramVisualizer.getColor(`${name}_border`, cardBorder)
            });
          }
        });

        // Title
        const titleEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        titleEl.setAttribute('x', '30');
        titleEl.setAttribute('y', '36');
        titleEl.setAttribute('fill', primaryText);
        titleEl.setAttribute('font-size', '15px');
        titleEl.setAttribute('font-weight', 'bold');
        titleEl.textContent = title;
        nodesLayer.appendChild(titleEl);

        const emojis = { 1: '😡', 2: '🙁', 3: '😐', 4: '🙂', 5: '😄' };
        let curX = 40;

        sections.forEach(sec => {
          if (sec.tasks.length === 0) return;

          const secG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          const secTitle = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          secTitle.setAttribute('x', `${curX}`);
          secTitle.setAttribute('y', '70');
          secTitle.setAttribute('fill', primaryBorder);
          secTitle.setAttribute('font-size', '13px');
          secTitle.setAttribute('font-weight', 'bold');
          secTitle.textContent = `§ ${sec.name}`;
          secG.appendChild(secTitle);
          nodesLayer.appendChild(secG);

          sec.tasks.forEach((t, tIdx) => {
            const x = curX + tIdx * 170;
            const ty = 90;

            const cardG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            cardG.style.cursor = 'pointer';

            const card = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            card.setAttribute('x', `${x}`);
            card.setAttribute('y', `${ty}`);
            card.setAttribute('width', '155');
            card.setAttribute('height', '80');
            card.setAttribute('rx', '8');
            const isSelJ = (t.name === selTitle);
            card.setAttribute('fill', t.fillColor);
            card.setAttribute('stroke', isSelJ ? 'var(--selection-color)' : t.borderColor);
            card.setAttribute('stroke-width', isSelJ ? '3' : '1.5');
            if (isSelJ) card.style.filter = selGlow;
            cardG.appendChild(card);

            const tName = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            tName.setAttribute('x', `${x + 10}`);
            tName.setAttribute('y', `${ty + 22}`);
            tName.setAttribute('fill', t.fontColor);
            tName.setAttribute('font-size', '11.5px');
            tName.setAttribute('font-weight', '600');
            tName.textContent = t.name;
            cardG.appendChild(tName);

            const emoji = emojis[t.score] || '🙂';
            const tScore = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            tScore.setAttribute('x', `${x + 10}`);
            tScore.setAttribute('y', `${ty + 44}`);
            tScore.setAttribute('fill', t.fontColor);
            tScore.setAttribute('opacity', '0.85');
            tScore.setAttribute('font-size', '11px');
            tScore.textContent = `${emoji} Satisfaction: ${t.score}/5`;
            cardG.appendChild(tScore);

            const tActor = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            tActor.setAttribute('x', `${x + 10}`);
            tActor.setAttribute('y', `${ty + 64}`);
            tActor.setAttribute('fill', linkColor);
            tActor.setAttribute('font-size', '10px');
            tActor.textContent = `👤 ${t.actor}`;
            cardG.appendChild(tActor);

            cardG.addEventListener('mousedown', (e) => e.stopPropagation());
            cardG.addEventListener('click', (e) => {
              e.stopPropagation();
              if (typeof AppController !== 'undefined' && AppController.instance) {
                AppController.instance.selectVisualObject({
                  type: 'Journey Touchpoint',
                  title: t.name,
                  fields: [
                    { key: 'name', label: 'Task / Step Name', type: 'text', value: t.name },
                    { key: 'score', label: 'Satisfaction Score (1-5)', type: 'select', options: [
                      { value: 5, label: '5 - 😄 Great' },
                      { value: 4, label: '4 - 🙂 Good' },
                      { value: 3, label: '3 - 😐 Neutral' },
                      { value: 2, label: '2 - 🙁 Poor' },
                      { value: 1, label: '1 - 😡 Bad' }
                    ], value: t.score },
                    { key: 'actor', label: 'Involved Actor(s)', type: 'text', value: t.actor },
                    { key: 'font', label: '1. Font / Text Color', type: 'color', value: t.fontColor },
                    { key: 'fill', label: '2. Node / Card Fill Color', type: 'color', value: t.fillColor },
                    { key: 'border', label: '3. Node / Card Border Color', type: 'color', value: t.borderColor }
                  ],
                  onSave: (vals) => {
                    MultiDiagramVisualizer.setColor(vals.name, vals.fill);
                    MultiDiagramVisualizer.setColor(`${vals.name}_font`, vals.font);
                    MultiDiagramVisualizer.setColor(`${vals.name}_border`, vals.border);
                    MultiDiagramVisualizer.syncColorToCode(vals.name, vals.fill);
                    MultiDiagramVisualizer.syncColorToCode(`${vals.name}_font`, vals.font);
                    MultiDiagramVisualizer.syncColorToCode(`${vals.name}_border`, vals.border);
                    MultiDiagramVisualizer.updateCodeLine((curCode) => {
                      const lines = curCode.split('\n');
                      const esc = t.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                      const idx = lines.findIndex(l => new RegExp(`^\\s*${esc}\\s*:`, 'i').test(l.trim()));
                      if (idx !== -1) {
                        const lead = lines[idx].match(/^(\s*)/)[1] || '    ';
                        lines[idx] = `${lead}${vals.name}: ${vals.score}: ${vals.actor}`;
                      }
                      return lines.join('\n');
                    });
                  }
                });
              }
            });

            nodesLayer.appendChild(cardG);
          });
          curX += sec.tasks.length * 170 + 40;
        });
        break;
      }

      case 'mindmap': {
        const rawLines = (code || '').split('\n').filter(l => l && !l.trim().startsWith('%%') && !l.trim().startsWith('mindmap'));
        let rootNode = null;
        const stack = [];

        rawLines.forEach(rawLine => {
          const indent = rawLine.search(/\S/);
          if (indent === -1) return;
          const trimmed = rawLine.trim();

          const rootMatch = trimmed.match(/^root(?:\(\(|\(|\[|\{\{|\)\(|\)\])?([^\)\]\}\(]+)(?:\)\)|\)|\]|\}\}|\)\(|\(\[)?/i);
          let text = trimmed;
          let shape = 'rounded';
          let icon = null;

          if (rootMatch && !rootNode) {
            text = rootMatch[1].trim();
            shape = 'circle';
          } else {
            const iconMatch = text.match(/::icon\(([^\)]+)\)/);
            if (iconMatch) {
              icon = iconMatch[1];
              text = text.replace(/::icon\([^\)]+\)/, '').trim();
            }
            const shapeMatch = text.match(/^(\(\([\s\S]+\)\)|\([\s\S]+\)|\[\[[\s\S]+\]\]|\[[\s\S]+\]|\{\{[\s\S]+\}\}|\)[\s\S]+\()/);
            if (shapeMatch) {
              if (text.startsWith('((')) shape = 'circle';
              else if (text.startsWith('(')) shape = 'rounded';
              else if (text.startsWith('[')) shape = 'rectangle';
              else if (text.startsWith('{{')) shape = 'hexagon';
              else if (text.startsWith(')')) shape = 'cloud';
              text = text.replace(/^[\(\[\{\)\s]+|[\)\]\}\(\s]+$/g, '').trim();
            }
          }

          const nodeObj = {
            text,
            shape,
            icon,
            indent,
            children: [],
            level: 0,
            x: 0,
            y: 0,
            width: Math.max(90, text.length * 7.5 + 28),
            height: 34
          };

          if (!rootNode) {
            nodeObj.level = 0;
            nodeObj.width = Math.max(130, text.length * 8 + 36);
            nodeObj.height = 42;
            rootNode = nodeObj;
            stack.push(nodeObj);
          } else {
            while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
              stack.pop();
            }
            const parent = stack[stack.length - 1];
            nodeObj.level = parent.level + 1;
            parent.children.push(nodeObj);
            stack.push(nodeObj);
          }
        });

        if (!rootNode) {
          rootNode = { text: 'Central Topic', shape: 'circle', children: [], level: 0, width: 140, height: 42, x: 0, y: 0 };
        }

        rootNode.x = 420;
        rootNode.y = 260;

        const leftBranches = [];
        const rightBranches = [];

        rootNode.children.forEach((child, idx) => {
          if (idx % 2 === 0) rightBranches.push(child);
          else leftBranches.push(child);
        });

        const calcSubtreeHeight = (node) => {
          if (node.children.length === 0) {
            node.treeHeight = node.height + 18;
            return node.treeHeight;
          }
          let h = 0;
          node.children.forEach(c => { h += calcSubtreeHeight(c); });
          node.treeHeight = Math.max(node.height + 18, h);
          return node.treeHeight;
        };

        leftBranches.forEach(b => calcSubtreeHeight(b));
        rightBranches.forEach(b => calcSubtreeHeight(b));

        const layoutSubtree = (node, parentX, startY, isLeft) => {
          const horizDist = node.level === 1 ? 160 : 130;
          node.x = isLeft ? parentX - horizDist : parentX + horizDist;
          node.y = startY + node.treeHeight / 2;

          let curY = startY;
          node.children.forEach(child => {
            layoutSubtree(child, node.x, curY, isLeft);
            curY += child.treeHeight;
          });
        };

        const leftHeight = leftBranches.reduce((acc, b) => acc + b.treeHeight, 0);
        const rightHeight = rightBranches.reduce((acc, b) => acc + b.treeHeight, 0);

        let curLeftY = rootNode.y - leftHeight / 2;
        leftBranches.forEach(b => {
          layoutSubtree(b, rootNode.x, curLeftY, true);
          curLeftY += b.treeHeight;
        });

        let curRightY = rootNode.y - rightHeight / 2;
        rightBranches.forEach(b => {
          layoutSubtree(b, rootNode.x, curRightY, false);
          curRightY += b.treeHeight;
        });

        // Draw Root
        const rootG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        rootG.style.cursor = 'pointer';
        const rootEl = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rootEl.setAttribute('x', `${rootNode.x - rootNode.width / 2}`);
        rootEl.setAttribute('y', `${rootNode.y - rootNode.height / 2}`);
        rootEl.setAttribute('width', `${rootNode.width}`);
        rootEl.setAttribute('height', `${rootNode.height}`);
        rootEl.setAttribute('rx', rootNode.shape === 'circle' ? `${rootNode.height / 2}` : '8');
        const isSelRoot = (rootNode.text === selTitle);
        const rFill = MultiDiagramVisualizer.getColor('root', primaryFill);
        const rFont = MultiDiagramVisualizer.getColor('root_font', primaryText);
        const rBorder = MultiDiagramVisualizer.getColor('root_border', primaryBorder);
        rootEl.setAttribute('fill', rFill);
        rootEl.setAttribute('stroke', isSelRoot ? 'var(--selection-color)' : rBorder);
        rootEl.setAttribute('stroke-width', isSelRoot ? '3.5' : '2.5');
        if (isSelRoot) rootEl.style.filter = selGlow;
        rootG.appendChild(rootEl);

        const rootTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        rootTxt.setAttribute('x', `${rootNode.x}`);
        rootTxt.setAttribute('y', `${rootNode.y}`);
        rootTxt.setAttribute('text-anchor', 'middle');
        rootTxt.setAttribute('dominant-baseline', 'central');
        rootTxt.setAttribute('fill', rFont);
        rootTxt.setAttribute('font-size', '13px');
        rootTxt.setAttribute('font-weight', 'bold');
        rootTxt.textContent = rootNode.text;
        rootG.appendChild(rootTxt);

        rootG.addEventListener('mousedown', (e) => e.stopPropagation());
        rootG.addEventListener('click', (e) => {
          e.stopPropagation();
          if (typeof AppController !== 'undefined' && AppController.instance) {
            AppController.instance.selectVisualObject({
              type: 'Mindmap Root',
              title: rootNode.text,
              fields: [
                { key: 'text', label: 'Central Topic', type: 'text', value: rootNode.text },
                { key: 'shape', label: 'Root Shape', type: 'select', value: rootNode.shape || 'circle', options: [
                  { value: 'circle', label: 'Circle ((Root))' },
                  { value: 'rounded', label: 'Rounded (Root)' },
                  { value: 'rectangle', label: 'Rectangle [Root]' },
                  { value: 'hexagon', label: 'Hexagon {{Root}}' },
                  { value: 'cloud', label: 'Cloud )Root(' }
                ]},
                { key: 'font', label: '1. Font / Text Color', type: 'color', value: rFont },
                { key: 'fill', label: '2. Node Fill Color', type: 'color', value: rFill },
                { key: 'border', label: '3. Node Border / Stroke Color', type: 'color', value: rBorder }
              ],
              onSave: (vals) => {
                MultiDiagramVisualizer.setColor('root', vals.fill);
                MultiDiagramVisualizer.setColor('root_font', vals.font);
                MultiDiagramVisualizer.setColor('root_border', vals.border);
                MultiDiagramVisualizer.syncColorToCode('root', vals.fill);
                MultiDiagramVisualizer.syncColorToCode('root_font', vals.font);
                MultiDiagramVisualizer.syncColorToCode('root_border', vals.border);
                MultiDiagramVisualizer.updateCodeLine((curCode) => {
                  const shapeBrackets = {
                    'circle': ['((', '))'],
                    'rounded': ['(', ')'],
                    'rectangle': ['[', ']'],
                    'hexagon': ['{{', '}}'],
                    'cloud': [')', '(']
                  };
                  const br = shapeBrackets[vals.shape] || ['((', '))'];
                  return curCode.replace(/^(\s*root)(?:[\(\[\{\)\s]+[^\n\(\[\{\)\s]+[\)\]\}\(\s]+|\s+[^\n]+)?/m, `$1${br[0]}${vals.text}${br[1]}`);
                });
              }
            });
          }
        });
        nodesLayer.appendChild(rootG);

        // Draw Nodes & Curves across all tiers
        const renderNodeRecursive = (node, parentNode, isLeft) => {
          if (parentNode) {
            const px = parentNode === rootNode ? (isLeft ? parentNode.x - parentNode.width / 2 : parentNode.x + parentNode.width / 2) : (isLeft ? parentNode.x - parentNode.width / 2 : parentNode.x + parentNode.width / 2);
            const py = parentNode.y;
            const cx = isLeft ? node.x + node.width / 2 : node.x - node.width / 2;
            const cy = node.y;

            const curve = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const midX = (px + cx) / 2;
            curve.setAttribute('d', `M ${px} ${py} C ${midX} ${py}, ${midX} ${cy}, ${cx} ${cy}`);
            curve.setAttribute('fill', 'none');
            curve.setAttribute('stroke', node.level === 1 ? primaryBorder : linkColor);
            curve.setAttribute('stroke-width', node.level === 1 ? '2.2' : (node.level === 2 ? '1.6' : '1.2'));
            edgesLayer.appendChild(curve);
          }

          const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          g.style.cursor = 'pointer';
          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          rect.setAttribute('x', `${node.x - node.width / 2}`);
          rect.setAttribute('y', `${node.y - node.height / 2}`);
          rect.setAttribute('width', `${node.width}`);
          rect.setAttribute('height', `${node.height}`);
          rect.setAttribute('rx', node.level === 1 ? '6' : '4');
          const isSelMM = (node.text === selTitle);
          const defaultNodeFill = node.level === 1 ? cardBg : (isDark ? '#232527' : '#F8F9FA');
          const defaultNodeFont = node.level === 1 ? primaryText : textColor;
          const defaultNodeBorder = node.level === 1 ? primaryBorder : cardBorder;
          const nodeFill = MultiDiagramVisualizer.getColor(node.text, defaultNodeFill);
          const nodeFont = MultiDiagramVisualizer.getColor(`${node.text}_font`, defaultNodeFont);
          const nodeBorder = MultiDiagramVisualizer.getColor(`${node.text}_border`, defaultNodeBorder);

          rect.setAttribute('fill', nodeFill);
          rect.setAttribute('stroke', isSelMM ? 'var(--selection-color)' : nodeBorder);
          rect.setAttribute('stroke-width', isSelMM ? '2.5' : (node.level === 1 ? '1.5' : '1'));
          if (isSelMM) rect.style.filter = selGlow;
          g.appendChild(rect);

          const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          txt.setAttribute('x', `${node.x}`);
          txt.setAttribute('y', `${node.y}`);
          txt.setAttribute('text-anchor', 'middle');
          txt.setAttribute('dominant-baseline', 'central');
          txt.setAttribute('fill', nodeFont);
          txt.setAttribute('font-size', node.level === 1 ? '11.5px' : (node.level === 2 ? '11px' : '10px'));
          txt.setAttribute('font-weight', node.level <= 2 ? '600' : 'normal');
          txt.textContent = (node.icon ? '📌 ' : '') + node.text;
          g.appendChild(txt);

          g.addEventListener('mousedown', (e) => e.stopPropagation());
          g.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof AppController !== 'undefined' && AppController.instance) {
              AppController.instance.selectVisualObject({
                type: `Mindmap Tier ${node.level}`,
                title: node.text,
                fields: [
                  { key: 'text', label: 'Branch Topic', type: 'text', value: node.text },
                  { key: 'font', label: '1. Font / Text Color', type: 'color', value: nodeFont },
                  { key: 'fill', label: '2. Node Fill Color', type: 'color', value: nodeFill },
                  { key: 'border', label: '3. Node Border / Stroke Color', type: 'color', value: nodeBorder }
                ],
                onSave: (vals) => {
                  MultiDiagramVisualizer.setColor(vals.text, vals.fill);
                  MultiDiagramVisualizer.setColor(`${vals.text}_font`, vals.font);
                  MultiDiagramVisualizer.setColor(`${vals.text}_border`, vals.border);
                  MultiDiagramVisualizer.syncColorToCode(vals.text, vals.fill);
                  MultiDiagramVisualizer.syncColorToCode(`${vals.text}_font`, vals.font);
                  MultiDiagramVisualizer.syncColorToCode(`${vals.text}_border`, vals.border);
                  MultiDiagramVisualizer.updateCodeLine((curCode) => {
                    const lines = curCode.split('\n');
                    const esc = node.text.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                    const idx = lines.findIndex(l => new RegExp(`^\\s*[\[\(\{]*${esc}[\]\)\}\s]*(?:\\s*|::.*)$`, 'i').test(l.trim()));
                    if (idx !== -1) {
                      const lead = lines[idx].match(/^(\s*)/)[1] || '      ';
                      lines[idx] = `${lead}${vals.text}`;
                    }
                    return lines.join('\n');
                  });
                }
              });
            }
          });

          nodesLayer.appendChild(g);

          node.children.forEach((child) => {
            renderNodeRecursive(child, node, isLeft);
          });
        };

        leftBranches.forEach((b) => renderNodeRecursive(b, rootNode, true));
        rightBranches.forEach((b) => renderNodeRecursive(b, rootNode, false));
        break;
      }

      case 'timeline': {
        const rawLines = (code || '').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('%%'));
        let title = 'Timeline Roadmap';
        const events = [];
        const colors = ['#2196F3', '#4CAF50', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4'];

        rawLines.forEach(line => {
          const titleMatch = line.match(/^title\s+(.+)$/i);
          if (titleMatch) { title = titleMatch[1].trim(); return; }

          if (line.toLowerCase().startsWith('timeline')) return;

          const m = line.match(/^([^:]+):(.*)$/);
          if (m) {
            const era = m[1].trim();
            const items = m[2].split(':').map(s => s.trim()).filter(Boolean);
            const defaultCol = colors[events.length % colors.length];
            events.push({
              era,
              items: items.length > 0 ? items : ['Milestone Event'],
              fillColor: MultiDiagramVisualizer.getColor(era, cardBg),
              fontColor: MultiDiagramVisualizer.getColor(`${era}_font`, primaryText),
              borderColor: MultiDiagramVisualizer.getColor(`${era}_border`, defaultCol)
            });
          }
        });

        if (events.length === 0) {
          events.push({ era: '2024', items: ['Alpha Prototype'], fillColor: cardBg, fontColor: primaryText, borderColor: '#2196F3' });
          events.push({ era: '2025', items: ['Beta Release'], fillColor: cardBg, fontColor: primaryText, borderColor: '#4CAF50' });
          events.push({ era: '2026', items: ['Production Launch'], fillColor: cardBg, fontColor: primaryText, borderColor: '#FF9800' });
        }

        // Title
        const titleEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        titleEl.setAttribute('x', '30');
        titleEl.setAttribute('y', '36');
        titleEl.setAttribute('fill', primaryText);
        titleEl.setAttribute('font-size', '15px');
        titleEl.setAttribute('font-weight', 'bold');
        titleEl.textContent = title;
        nodesLayer.appendChild(titleEl);

        const axisY = 140;
        const totalW = Math.max(650, events.length * 190 + 100);

        // Timeline Central Bar
        const axisLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        axisLine.setAttribute('x1', '40');
        axisLine.setAttribute('y1', `${axisY}`);
        axisLine.setAttribute('x2', `${totalW}`);
        axisLine.setAttribute('y2', `${axisY}`);
        axisLine.setAttribute('stroke', primaryBorder);
        axisLine.setAttribute('stroke-width', '4');
        axisLine.setAttribute('stroke-linecap', 'round');
        edgesLayer.appendChild(axisLine);

        events.forEach((ev, eIdx) => {
          const ex = 90 + eIdx * 190;

          // Milestone Node on Axis
          const nodeCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          nodeCircle.setAttribute('cx', `${ex}`);
          nodeCircle.setAttribute('cy', `${axisY}`);
          nodeCircle.setAttribute('r', '10');
          nodeCircle.setAttribute('fill', ev.borderColor);
          nodeCircle.setAttribute('stroke', '#FFFFFF');
          nodeCircle.setAttribute('stroke-width', '3');
          nodesLayer.appendChild(nodeCircle);

          // Era Header
          const eraTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          eraTxt.setAttribute('x', `${ex}`);
          eraTxt.setAttribute('y', `${axisY - 24}`);
          eraTxt.setAttribute('text-anchor', 'middle');
          eraTxt.setAttribute('dominant-baseline', 'central');
          eraTxt.setAttribute('fill', ev.fontColor);
          eraTxt.setAttribute('font-size', '11.5px');
          eraTxt.setAttribute('font-weight', 'bold');
          eraTxt.textContent = ev.era;
          nodesLayer.appendChild(eraTxt);

          const cardG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          cardG.style.cursor = 'pointer';
          const cardW = 140;
          const cardH = Math.max(40, ev.items.length * 26 + 14);

          const cardRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          cardRect.setAttribute('x', `${ex - cardW / 2}`);
          cardRect.setAttribute('y', `${axisY + 30}`);
          cardRect.setAttribute('width', `${cardW}`);
          cardRect.setAttribute('height', `${cardH}`);
          cardRect.setAttribute('rx', '6');
          const isSelTime = (ev.era === selTitle);
          cardRect.setAttribute('fill', ev.fillColor);
          cardRect.setAttribute('stroke', isSelTime ? 'var(--selection-color)' : ev.borderColor);
          cardRect.setAttribute('stroke-width', isSelTime ? '2.5' : '1.5');
          if (isSelTime) cardRect.style.filter = selGlow;
          cardG.appendChild(cardRect);

          ev.items.forEach((it, iIdx) => {
            const itemTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            itemTxt.setAttribute('x', `${ex - cardW / 2 + 12}`);
            itemTxt.setAttribute('y', `${axisY + 52 + iIdx * 22}`);
            itemTxt.setAttribute('fill', ev.fontColor);
            itemTxt.setAttribute('font-size', '11px');
            itemTxt.textContent = '✔ ' + it;
            cardG.appendChild(itemTxt);
          });

          cardG.addEventListener('mousedown', (e) => e.stopPropagation());
          cardG.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof AppController !== 'undefined' && AppController.instance) {
              AppController.instance.selectVisualObject({
                type: 'Timeline Milestone',
                title: ev.era,
                fields: [
                  { key: 'era', label: 'Era / Year', type: 'text', value: ev.era },
                  { key: 'items', label: 'Milestone Events (Comma Separated)', type: 'textarea', rows: 2, value: ev.items.join(', ') },
                  { key: 'font', label: '1. Font / Text Color', type: 'color', value: ev.fontColor },
                  { key: 'fill', label: '2. Node / Card Fill Color', type: 'color', value: ev.fillColor },
                  { key: 'border', label: '3. Node Border / Accent Color', type: 'color', value: ev.borderColor }
                ],
                onSave: (vals) => {
                  MultiDiagramVisualizer.setColor(vals.era, vals.fill);
                  MultiDiagramVisualizer.setColor(`${vals.era}_font`, vals.font);
                  MultiDiagramVisualizer.setColor(`${vals.era}_border`, vals.border);
                  MultiDiagramVisualizer.syncColorToCode(vals.era, vals.fill);
                  MultiDiagramVisualizer.syncColorToCode(`${vals.era}_font`, vals.font);
                  MultiDiagramVisualizer.syncColorToCode(`${vals.era}_border`, vals.border);
                  MultiDiagramVisualizer.updateCodeLine((curCode) => {
                    const lines = curCode.split('\n');
                    const esc = ev.era.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                    const idx = lines.findIndex(l => new RegExp(`^\\s*${esc}\\s*:`, 'i').test(l.trim()));
                    if (idx !== -1) {
                      const lead = lines[idx].match(/^(\s*)/)[1] || '  ';
                      const newItems = vals.items.split(',').map(s => s.trim()).filter(Boolean).join(' : ');
                      lines[idx] = `${lead}${vals.era} : ${newItems}`;
                    }
                    return lines.join('\n');
                  });
                }
              });
            }
          });

          nodesLayer.appendChild(cardG);
        });
        break;
      }

      case 'quadrant': {
        const rawLines = (code || '').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('%%'));
        let title = 'Priority Matrix';
        const qNames = {
          q1: 'Strategic Bets',
          q2: 'Urgent & Critical',
          q3: 'Low Priority',
          q4: 'Quick Fixes'
        };
        const items = [];
        const colors = ['#2196F3', '#4CAF50', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4'];

        rawLines.forEach(line => {
          if (line.toLowerCase().startsWith('quadrantchart')) return;
          const titleMatch = line.match(/^title\s+(.+)$/i);
          if (titleMatch) { title = titleMatch[1].trim(); return; }

          const q1M = line.match(/^quadrant-1\s+(.+)$/i);
          if (q1M) { qNames.q1 = q1M[1].trim(); return; }
          const q2M = line.match(/^quadrant-2\s+(.+)$/i);
          if (q2M) { qNames.q2 = q2M[1].trim(); return; }
          const q3M = line.match(/^quadrant-3\s+(.+)$/i);
          if (q3M) { qNames.q3 = q3M[1].trim(); return; }
          const q4M = line.match(/^quadrant-4\s+(.+)$/i);
          if (q4M) { qNames.q4 = q4M[1].trim(); return; }

          const itemMatch = line.match(/^["']?([^"':]+)["']?\s*:\s*\[\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\]/);
          if (itemMatch) {
            const rawItemName = itemMatch[1].trim();
            items.push({
              name: rawItemName,
              x: parseFloat(itemMatch[2]),
              y: parseFloat(itemMatch[3]),
              color: MultiDiagramVisualizer.getColor(rawItemName, colors[items.length % colors.length])
            });
          }
        });

        const cx = 350;
        const cy = 250;
        const boxSize = 180;

        // Title
        const titleEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        titleEl.setAttribute('x', `${cx}`);
        titleEl.setAttribute('y', '32');
        titleEl.setAttribute('text-anchor', 'middle');
        titleEl.setAttribute('fill', primaryText);
        titleEl.setAttribute('font-size', '15px');
        titleEl.setAttribute('font-weight', 'bold');
        titleEl.textContent = title;
        nodesLayer.appendChild(titleEl);

        const qColors = isDark ? [
          'rgba(76, 175, 80, 0.12)',
          'rgba(244, 67, 54, 0.14)',
          'rgba(158, 158, 158, 0.08)',
          'rgba(33, 150, 243, 0.12)'
        ] : [
          '#E8F5E9',
          '#FFEBEE',
          '#F5F5F5',
          '#E3F2FD'
        ];

        // Draw 4 Quadrant Panes
        const q2Rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        q2Rect.setAttribute('x', `${cx - boxSize}`);
        q2Rect.setAttribute('y', `${cy - boxSize}`);
        q2Rect.setAttribute('width', `${boxSize}`);
        q2Rect.setAttribute('height', `${boxSize}`);
        q2Rect.setAttribute('fill', qColors[1]);
        q2Rect.setAttribute('stroke', cardBorder);
        q2Rect.setAttribute('stroke-width', '1');
        nodesLayer.appendChild(q2Rect);

        const q1Rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        q1Rect.setAttribute('x', `${cx}`);
        q1Rect.setAttribute('y', `${cy - boxSize}`);
        q1Rect.setAttribute('width', `${boxSize}`);
        q1Rect.setAttribute('height', `${boxSize}`);
        q1Rect.setAttribute('fill', qColors[0]);
        q1Rect.setAttribute('stroke', cardBorder);
        q1Rect.setAttribute('stroke-width', '1');
        nodesLayer.appendChild(q1Rect);

        const q3Rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        q3Rect.setAttribute('x', `${cx - boxSize}`);
        q3Rect.setAttribute('y', `${cy}`);
        q3Rect.setAttribute('width', `${boxSize}`);
        q3Rect.setAttribute('height', `${boxSize}`);
        q3Rect.setAttribute('fill', qColors[2]);
        q3Rect.setAttribute('stroke', cardBorder);
        q3Rect.setAttribute('stroke-width', '1');
        nodesLayer.appendChild(q3Rect);

        const q4Rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        q4Rect.setAttribute('x', `${cx}`);
        q4Rect.setAttribute('y', `${cy}`);
        q4Rect.setAttribute('width', `${boxSize}`);
        q4Rect.setAttribute('height', `${boxSize}`);
        q4Rect.setAttribute('fill', qColors[3]);
        q4Rect.setAttribute('stroke', cardBorder);
        q4Rect.setAttribute('stroke-width', '1');
        nodesLayer.appendChild(q4Rect);

        const grid = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        grid.setAttribute('x', `${cx - boxSize}`);
        grid.setAttribute('y', `${cy - boxSize}`);
        grid.setAttribute('width', `${boxSize * 2}`);
        grid.setAttribute('height', `${boxSize * 2}`);
        grid.setAttribute('fill', 'none');
        grid.setAttribute('stroke', cardBorder);
        grid.setAttribute('stroke-width', '2');
        nodesLayer.appendChild(grid);

        const vertAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        vertAxis.setAttribute('x1', `${cx}`);
        vertAxis.setAttribute('y1', `${cy - boxSize}`);
        vertAxis.setAttribute('x2', `${cx}`);
        vertAxis.setAttribute('y2', `${cy + boxSize}`);
        vertAxis.setAttribute('stroke', primaryBorder);
        vertAxis.setAttribute('stroke-width', '2');
        edgesLayer.appendChild(vertAxis);

        const horizAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        horizAxis.setAttribute('x1', `${cx - boxSize}`);
        horizAxis.setAttribute('y1', `${cy}`);
        horizAxis.setAttribute('x2', `${cx + boxSize}`);
        horizAxis.setAttribute('y2', `${cy}`);
        horizAxis.setAttribute('stroke', primaryBorder);
        horizAxis.setAttribute('stroke-width', '2');
        edgesLayer.appendChild(horizAxis);

        const addQBadge = (title, x, y) => {
          const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          t.setAttribute('x', `${x}`);
          t.setAttribute('y', `${y}`);
          t.setAttribute('text-anchor', 'middle');
          t.setAttribute('fill', primaryText);
          t.setAttribute('font-size', '11px');
          t.setAttribute('font-weight', 'bold');
          t.textContent = title;
          nodesLayer.appendChild(t);
        };

        addQBadge('⭐ ' + qNames.q1, cx + boxSize / 2, cy - boxSize + 18);
        addQBadge('🔥 ' + qNames.q2, cx - boxSize / 2, cy - boxSize + 18);
        addQBadge('💤 ' + qNames.q3, cx - boxSize / 2, cy + 20);
        addQBadge('⚡ ' + qNames.q4, cx + boxSize / 2, cy + 20);

        // Plot Data Points
        items.forEach(it => {
          const px = cx - boxSize + it.x * (boxSize * 2);
          const py = cy + boxSize - it.y * (boxSize * 2);

          const itemG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          itemG.style.cursor = 'pointer';

          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttribute('cx', `${px}`);
          circle.setAttribute('cy', `${py}`);
          circle.setAttribute('r', '8');
          const isSelQuad = (it.name === selTitle);
          circle.setAttribute('fill', it.color);
          circle.setAttribute('stroke', isSelQuad ? 'var(--selection-color)' : '#FFFFFF');
          circle.setAttribute('stroke-width', isSelQuad ? '3.5' : '2');
          if (isSelQuad) circle.style.filter = selGlow;
          itemG.appendChild(circle);

          const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          txt.setAttribute('x', `${px + 12}`);
          txt.setAttribute('y', `${py + 4}`);
          txt.setAttribute('fill', textColor);
          txt.setAttribute('font-size', '11px');
          txt.setAttribute('font-weight', '500');
          txt.textContent = it.name;
          itemG.appendChild(txt);

          itemG.addEventListener('mousedown', (e) => e.stopPropagation());
          itemG.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof AppController !== 'undefined' && AppController.instance) {
              AppController.instance.selectVisualObject({
                type: 'Quadrant Point',
                title: it.name,
                fields: [
                  { key: 'name', label: 'Item Name', type: 'text', value: it.name },
                  { key: 'x', label: 'X Axis (0.0 - 1.0)', type: 'number', step: 0.05, min: 0, max: 1, value: it.x },
                  { key: 'y', label: 'Y Axis (0.0 - 1.0)', type: 'number', step: 0.05, min: 0, max: 1, value: it.y },
                  { key: 'color', label: 'Point Color', type: 'color', value: it.color }
                ],
                onSave: (vals) => {
                  MultiDiagramVisualizer.setColor(vals.name, vals.color);
                  MultiDiagramVisualizer.syncColorToCode(vals.name, vals.color);
                  MultiDiagramVisualizer.updateCodeLine((curCode) => {
                    const lines = curCode.split('\n');
                    const esc = it.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                    const idx = lines.findIndex(l => new RegExp(`^\\s*["']?${esc}["']?\\s*:`, 'i').test(l.trim()));
                    if (idx !== -1) {
                      const lead = lines[idx].match(/^(\s*)/)[1] || '  ';
                      lines[idx] = `${lead}"${vals.name}": [${vals.x}, ${vals.y}]`;
                    }
                    return lines.join('\n');
                  });
                }
              });
            }
          });

          nodesLayer.appendChild(itemG);
        });
        break;
      }

      case 'sankey': {
        const rawLines = (code || '').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('%%') && !l.startsWith('sankey'));
        const flows = [];
        const nodeSet = new Set();
        const colors = ['#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#00BCD4', '#E91E63', '#607D8B'];

        rawLines.forEach(line => {
          const parts = line.split(',').map(p => p.trim());
          if (parts.length >= 3) {
            const src = parts[0];
            const tgt = parts[1];
            const val = parseFloat(parts[2]);
            if (src && tgt && !isNaN(val)) {
              flows.push({ src, tgt, val });
              nodeSet.add(src);
              nodeSet.add(tgt);
            }
          }
        });

        if (flows.length === 0) {
          flows.push({ src: 'Traffic', tgt: 'Home', val: 5000 });
          flows.push({ src: 'Home', tgt: 'Signup', val: 2000 });
        }

        const sources = Array.from(new Set(flows.map(f => f.src)));
        const targets = Array.from(new Set(flows.map(f => f.tgt)));

        const leftNodes = sources.filter(s => !targets.includes(s));
        const rightNodes = targets.filter(t => !sources.includes(t));
        const midNodes = sources.filter(s => targets.includes(s));

        const leftYMap = new Map();
        const midYMap = new Map();
        const rightYMap = new Map();

        const drawBox = (name, x, y, defaultColor) => {
          const fillColor = MultiDiagramVisualizer.getColor(name, defaultColor);
          const fontColor = MultiDiagramVisualizer.getColor(`${name}_font`, '#FFFFFF');
          const borderColor = MultiDiagramVisualizer.getColor(`${name}_border`, cardBorder);

          const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          g.style.cursor = 'pointer';

          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          rect.setAttribute('x', `${x}`);
          rect.setAttribute('y', `${y}`);
          rect.setAttribute('width', '130');
          rect.setAttribute('height', '45');
          rect.setAttribute('rx', '4');
          const isSelSankey = (name === selTitle);
          rect.setAttribute('fill', fillColor);
          rect.setAttribute('stroke', isSelSankey ? 'var(--selection-color)' : borderColor);
          rect.setAttribute('stroke-width', isSelSankey ? '3' : '1.5');
          rect.setAttribute('opacity', isSelSankey ? '1' : '0.9');
          if (isSelSankey) rect.style.filter = selGlow;
          g.appendChild(rect);

          const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          txt.setAttribute('x', `${x + 65}`);
          txt.setAttribute('y', `${y + 22}`);
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
                  { key: 'name', label: 'Node Label', type: 'text', value: name },
                  { key: 'font', label: '1. Font / Text Color', type: 'color', value: fontColor },
                  { key: 'fill', label: '2. Node Fill Color', type: 'color', value: fillColor },
                  { key: 'border', label: '3. Node Border / Stroke Color', type: 'color', value: borderColor }
                ],
                onSave: (vals) => {
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

          const x1 = sInfo.x + 130;
          const y1 = sInfo.y + 22;
          const x2 = tInfo.x;
          const y2 = tInfo.y + 22;

          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', `M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`);
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
                  { key: 'src', label: 'Source Node', type: 'text', value: f.src },
                  { key: 'tgt', label: 'Target Node', type: 'text', value: f.tgt },
                  { key: 'val', label: 'Flow Volume / Value', type: 'number', min: 1, step: 10, value: f.val },
                  { key: 'color', label: 'Flow Band Color', type: 'color', value: flowColor }
                ],
                onSave: (vals) => {
                  const newFlowKey = `${vals.src}->${vals.tgt}`;
                  MultiDiagramVisualizer.setColor(newFlowKey, vals.color);
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
        break;
      }
    }
  }
}
