// --- ER DIAGRAM VISUALIZER ---
MultiDiagramVisualizer.register('erdiagram', function(code, nodesLayer, edgesLayer, isDark) {
  const primaryText = isDark ? '#FFFFFF' : '#212121';
  const textColor = isDark ? '#E0E0E0' : '#424242';
  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const cardBorder = isDark ? '#424242' : '#E0E0E0';
  const primaryBorder = isDark ? '#1976D2' : '#0288D1';
  const linkColor = isDark ? '#90CAF9' : '#1976D2';
  const selTitle = (typeof AppController !== 'undefined' && AppController.instance && AppController.instance.selectedVisualObject) ? AppController.instance.selectedVisualObject.title : null;
  const selGlow = 'drop-shadow(0 0 6px rgba(33, 150, 243, 0.8))';


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
});
MultiDiagramVisualizer.register('erDiagram', MultiDiagramVisualizer.renderers.get('erdiagram'));
