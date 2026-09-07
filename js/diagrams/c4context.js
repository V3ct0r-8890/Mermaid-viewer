// --- C4 CONTEXT ARCHITECTURE VISUALIZER ---
MultiDiagramVisualizer.register('c4context', function(code, nodesLayer, edgesLayer, isDark) {
  const primaryText = isDark ? '#FFFFFF' : '#212121';
  const textColor = isDark ? '#E0E0E0' : '#424242';
  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const cardBorder = isDark ? '#424242' : '#E0E0E0';
  const primaryBorder = isDark ? '#1976D2' : '#0288D1';
  const linkColor = isDark ? '#90CAF9' : '#1976D2';
  const selTitle = (typeof AppController !== 'undefined' && AppController.instance && AppController.instance.selectedVisualObject) ? AppController.instance.selectedVisualObject.title : null;
  const selGlow = 'drop-shadow(0 0 6px rgba(33, 150, 243, 0.8))';


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

            let defaultFill = isPerson ? (kind.includes('_Ext') ? '#B3E5FC' : '#E1F5FE') : (isExt ? '#ECEFF1' : (isDb ? '#E0F2F1' : '#E8EAF6'));
            let defaultBorder = isPerson ? '#01579B' : (isExt ? '#37474F' : (isDb ? '#006064' : '#0D47A1'));
            let defaultFont = isPerson ? '#01579B' : (isExt ? '#263238' : (isDb ? '#004D40' : '#1A237E'));

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

          // Relationship match: Rel(from, to, "label", "tech") / BiRel(...) / Rel_Back(...) / Rel_Neighbor(...)
          const relMatch = line.match(/^(Rel|BiRel|Rel_Back|Rel_Neighbor)\s*\(\s*([A-Za-z0-9_]+)\s*,\s*([A-Za-z0-9_]+)\s*,\s*"([^"]+)"(?:\s*,\s*"([^"]*)")?\s*\)/i);
          if (relMatch) {
            const rType = relMatch[1];
            const from = relMatch[2];
            const to = relMatch[3];
            const rLabel = relMatch[4];
            const rTech = relMatch[5] || '';
            relationships.push({ from, to, label: rLabel, tech: rTech, type: rType });
          }
        });

        if (nodes.size === 0) {
          nodes.set('customer', { alias: 'customer', kind: 'Person', label: 'Banking Customer', desc: 'Retail client managing accounts & cards', isPerson: true, isExt: false, isDb: false, fillColor: '#E1F5FE', fontColor: '#01579B', borderColor: '#01579B' });
          nodes.set('banking_core', { alias: 'banking_core', kind: 'System', label: 'Core Banking Services', desc: 'Microservices processing accounts & ledgers', isPerson: false, isExt: false, isDb: false, fillColor: '#E8EAF6', fontColor: '#1A237E', borderColor: '#0D47A1' });
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

        // 3-Column 4-Tier Topology with Draggable Node Positions
        const colX = [50, 410, 780];
        const cardW = 230;
        const cardH = 96;

        const defaultNodePositions = {
          'customer': { x: colX[0], y: 70 },
          'support_agent': { x: colX[1], y: 70 },
          'auditor': { x: colX[2], y: 70 },

          'api_gateway': { x: colX[1], y: 280 },

          'primary_db': { x: colX[0], y: 500 },
          'banking_core': { x: colX[1], y: 500 },
          'event_bus': { x: colX[2], y: 500 },

          'payment_rail': { x: colX[0], y: 720 },
          'fraud_ai': { x: colX[1], y: 720 },
          'notification_hub': { x: colX[2], y: 720 }
        };

        let customIdx = 0;
        nodes.forEach(n => {
          const defPos = defaultNodePositions[n.alias] || {
            x: colX[customIdx % 3],
            y: 70 + Math.floor(customIdx / 3) * 210
          };
          if (!defaultNodePositions[n.alias]) customIdx++;

          const savedPos = MultiDiagramVisualizer.getPosition(n.alias, defPos.x, defPos.y);
          n.x = savedPos.x;
          n.y = savedPos.y;
          n.width = cardW;
          n.height = cardH;
        });

        // Draw Relationships with 28px Invisible Hitbox & Staggered 2-Line Badges
        const nodeObstacles = Array.from(nodes.values()).map(n => ({ x: n.x, y: n.y, width: n.width, height: n.height }));
        const placedLabelRects = [];
        relationships.forEach((rel, rIdx) => {
          const sNode = nodes.get(rel.from);
          const tNode = nodes.get(rel.to);
          if (!sNode || !tNode) return;

          const relKey = `${rel.from}->${rel.to}:${rel.label}`;
          const isSelRel = (rel.label === selTitle || `${rel.from} → ${rel.to}` === selTitle);
          const lineColor = MultiDiagramVisualizer.getColor(relKey, MultiDiagramVisualizer.getColor(`${rel.from}->${rel.to}`, linkColor));
          const labelFont = MultiDiagramVisualizer.getColor(`${relKey}_font`, textColor);
          const lineWidth = parseFloat(MultiDiagramVisualizer.getColor(`${relKey}_width`, '2')) || 2;

          let sx, sy, tx, ty;
          let cx1, cy1, cx2, cy2;
          let isHorizontal = false;

          // Special case: Auditor (top right) to Core Banking (center) routes cleanly around right side
          if (rel.from === 'auditor' && rel.to === 'banking_core') {
            sx = sNode.x + sNode.width / 2;
            sy = sNode.y + sNode.height;
            tx = tNode.x + tNode.width;
            ty = tNode.y + tNode.height / 2;
            cx1 = sx + 50;
            cy1 = sy + 140;
            cx2 = tx + 120;
            cy2 = ty;
          } else if (Math.abs(sNode.y - tNode.y) < 40) {
            // Direct horizontal neighbors
            isHorizontal = true;
            if (sNode.x > tNode.x) {
              // Target is on left (e.g. Core -> DB)
              sx = sNode.x;
              sy = sNode.y + sNode.height / 2;
              tx = tNode.x + tNode.width;
              ty = tNode.y + tNode.height / 2;
            } else {
              // Target is on right (e.g. Core -> EventMesh)
              sx = sNode.x + sNode.width;
              sy = sNode.y + sNode.height / 2;
              tx = tNode.x;
              ty = tNode.y + tNode.height / 2;
            }
            cx1 = (sx + tx) / 2;
            cy1 = sy;
            cx2 = (sx + tx) / 2;
            cy2 = ty;
          } else if (sNode.y < tNode.y) {
            // Downward flow
            sx = sNode.x + sNode.width / 2;
            sy = sNode.y + sNode.height;
            tx = tNode.x + tNode.width / 2;
            ty = tNode.y;
            const dy = Math.abs(ty - sy) * 0.45;
            cx1 = sx;
            cy1 = sy + dy;
            cx2 = tx;
            cy2 = ty - dy;
          } else {
            // Upward flow
            sx = sNode.x + sNode.width / 2;
            sy = sNode.y;
            tx = tNode.x + tNode.width / 2;
            ty = tNode.y + tNode.height;
            const dy = Math.abs(ty - sy) * 0.45;
            cx1 = sx;
            cy1 = sy - dy;
            cx2 = tx;
            cy2 = ty + dy;
          }

          // Stagger badge along curve to prevent badge collision
          let t = 0.5;
          if (!isHorizontal) {
            if (sx < tx - 60) t = 0.35; // Left diagonal
            else if (sx > tx + 60) t = 0.65; // Right diagonal
            else t = 0.50; // Center vertical
          }

          const omt = 1 - t;
          const rawBx = omt*omt*omt*sx + 3*omt*omt*t*cx1 + 3*omt*t*t*cx2 + t*t*t*tx;
          const rawBy = omt*omt*omt*sy + 3*omt*omt*t*cy1 + 3*omt*t*t*cy2 + t*t*t*ty;

          const cleanLabel = rel.label.length > 28 ? rel.label.substring(0, 25) + '...' : rel.label;
          const badgeW = Math.max(125, Math.min(185, Math.max(cleanLabel.length * 6.2 + 20, (rel.tech ? rel.tech.length * 6.5 + 24 : 0))));
          const badgeH = rel.tech ? 34 : 22;
          const { x: bx, y: by } = Utils.findClearLabelPosition(rawBx, rawBy, badgeW, badgeH, [...nodeObstacles, ...placedLabelRects]);
          placedLabelRects.push({ x: bx - badgeW / 2, y: by - badgeH / 2, width: badgeW, height: badgeH });

          const relG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          relG.style.cursor = 'pointer';

          const pathD = `M ${sx} ${sy} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${tx} ${ty}`;

          // Safari & Chrome 28px wide invisible click hitbox
          const hitPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          hitPath.setAttribute('d', pathD);
          hitPath.setAttribute('fill', 'none');
          hitPath.setAttribute('stroke', '#000000');
          hitPath.setAttribute('stroke-width', '28');
          hitPath.setAttribute('opacity', '0.001');
          hitPath.style.cursor = 'pointer';
          hitPath.style.pointerEvents = 'stroke';
          relG.appendChild(hitPath);

          // Visual line path
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', pathD);
          path.setAttribute('fill', 'none');
          path.setAttribute('stroke', isSelRel ? 'var(--selection-color)' : lineColor);
          path.setAttribute('stroke-width', isSelRel ? `${lineWidth + 1.5}` : `${lineWidth}`);
          path.setAttribute('stroke-dasharray', '5,4');
          if (isSelRel) path.style.filter = selGlow;
          relG.appendChild(path);

          // Arrowhead(s) — direction depends on relationship type:
          // Rel/Rel_Neighbor: target only. BiRel: both ends. Rel_Back: source only (reversed).
          const makeArrowPoints = (tipX, tipY, dirX, dirY) => {
            const len = Math.hypot(dirX, dirY) || 1;
            const ux = dirX / len, uy = dirY / len;
            const perpX = -uy, perpY = ux;
            const backX = tipX - ux * 7, backY = tipY - uy * 7;
            return `${backX + perpX * 5},${backY + perpY * 5} ${tipX},${tipY} ${backX - perpX * 5},${backY - perpY * 5}`;
          };
          const arrowFill = isSelRel ? 'var(--selection-color)' : lineColor;
          const showTargetArrow = rel.type !== 'Rel_Back';
          const showSourceArrow = rel.type === 'BiRel' || rel.type === 'Rel_Back';
          if (showTargetArrow) {
            const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            arrow.setAttribute('points', makeArrowPoints(tx, ty, tx - sx, ty - sy));
            arrow.setAttribute('fill', arrowFill);
            relG.appendChild(arrow);
          }
          if (showSourceArrow) {
            const arrowBack = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            arrowBack.setAttribute('points', makeArrowPoints(sx, sy, sx - tx, sy - ty));
            arrowBack.setAttribute('fill', arrowFill);
            relG.appendChild(arrowBack);
          }

          // Compact 2-Line Badge
          const badgeRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          badgeRect.setAttribute('x', `${bx - badgeW / 2}`);
          badgeRect.setAttribute('y', `${by - badgeH / 2}`);
          badgeRect.setAttribute('width', `${badgeW}`);
          badgeRect.setAttribute('height', `${badgeH}`);
          badgeRect.setAttribute('rx', '5');
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

          const selectThisRel = () => {
            if (typeof AppController !== 'undefined' && AppController.instance) {
              const allElemOptions = Array.from(nodes.values()).map(e => ({ value: e.alias, label: `${e.alias} (${e.label || e.alias})` }));
              AppController.instance.selectVisualObject({
                type: 'C4 Relationship',
                title: `${rel.from} → ${rel.to}`,
                fields: [
                  { key: 'from', label: 'From Element', type: 'select', value: rel.from, options: allElemOptions },
                  { key: 'to', label: 'To Element', type: 'select', value: rel.to, options: allElemOptions },
                  { key: 'label', label: 'Action / Call Label', type: 'text', value: rel.label },
                  { key: 'type', label: 'Relationship Type (Includes Bi-directional)', type: 'select', value: rel.type || 'Rel', options: [
                      { value: 'Rel', label: 'Forward (Rel)' },
                      { value: 'BiRel', label: 'Bidirectional (BiRel)' },
                      { value: 'Rel_Back', label: 'Reverse (Rel_Back)' },
                      { value: 'Rel_Neighbor', label: 'Neighbor (Rel_Neighbor)' }
                  ]},
                  { key: 'tech', label: 'Technology / Protocol', type: 'text', value: rel.tech || '' },
                  { key: 'color', label: 'Line Color', type: 'color', value: lineColor },
                  { key: 'width', label: 'Line Thickness', type: 'select', value: String(lineWidth), options: [
                      { value: '1.5', label: 'Thin (1.5px)' },
                      { value: '2', label: 'Medium (2px - Default)' },
                      { value: '3', label: 'Thick (3px)' },
                      { value: '4', label: 'Heavy (4px)' }
                  ]}
                ],
                onSave: (vals) => {
                  const fromEl = vals.from || rel.from;
                  const toEl = vals.to || rel.to;
                  const rType = vals.type || 'Rel';
                  const lbl = vals.label !== undefined ? vals.label : rel.label;
                  const newKey = `${fromEl}->${toEl}:${lbl}`;
                  if (vals.color) {
                    MultiDiagramVisualizer.setColor(newKey, vals.color);
                    MultiDiagramVisualizer.syncColorToCode(newKey, vals.color);
                  }
                  if (vals.width) {
                    MultiDiagramVisualizer.setColor(`${newKey}_width`, vals.width);
                  }
                  MultiDiagramVisualizer.updateCodeLine((curCode) => {
                    const lines = curCode.split('\n');
                    const idx = lines.findIndex(l => !l.trim().startsWith('%%') && new RegExp(`^\\s*(?:Rel|BiRel|Rel_Back|Rel_Neighbor)\\s*\\(\\s*${rel.from}\\s*,\\s*${rel.to}`, 'i').test(l.trim()));
                    if (idx !== -1) {
                      const lead = lines[idx].match(/^(\s*)/)[1] || '  ';
                      const techStr = vals.tech ? `, "${vals.tech}"` : '';
                      lines[idx] = `${lead}${rType}(${fromEl}, ${toEl}, "${lbl}"${techStr})`;
                    }
                    return lines.join('\n');
                  });
                }
              });
            }
          };

          [relG, hitPath, path, badgeRect].forEach(el => {
            el.addEventListener('mousedown', (e) => {
              e.stopPropagation();
              selectThisRel();
            });
            el.addEventListener('click', (e) => {
              e.stopPropagation();
              selectThisRel();
            });
          });

          edgesLayer.appendChild(relG);
        });

        // Draw Draggable C4 Nodes
        nodes.forEach(n => {
          const cardG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          cardG.style.cursor = 'move';

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

          // Attach Draggable mover
          MultiDiagramVisualizer.makeDraggable(
            cardG,
            n.alias,
            () => ({ x: n.x, y: n.y }),
            (newX, newY) => {
              MultiDiagramVisualizer.setPosition(n.alias, newX, newY);
            },
            () => {
              if (typeof AppController !== 'undefined' && AppController.instance) {
                AppController.instance.recordHistory();
              }
            }
          );

          cardG.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof AppController !== 'undefined' && AppController.instance) {
              AppController.instance.selectVisualObject({
                type: `C4 ${n.kind}`,
                title: n.label,
                fields: [
                  { key: 'label', label: 'Display Label', type: 'text', value: n.label },
                  { key: 'kind', label: 'Component Type', type: 'select', value: n.kind, options: [
                      { value: 'Person', label: 'Person' },
                      { value: 'Person_Ext', label: 'Person (External)' },
                      { value: 'System', label: 'System' },
                      { value: 'System_Ext', label: 'System (External)' },
                      { value: 'SystemDb', label: 'System Database' },
                      { value: 'SystemDb_Ext', label: 'System Database (External)' },
                      { value: 'Container', label: 'Container' },
                      { value: 'ContainerDb', label: 'Container Database' },
                      { value: 'Component', label: 'Component' }
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
});
MultiDiagramVisualizer.register('C4Context', MultiDiagramVisualizer.renderers.get('c4context'));
MultiDiagramVisualizer.register('c4container', MultiDiagramVisualizer.renderers.get('c4context'));
MultiDiagramVisualizer.register('c4component', MultiDiagramVisualizer.renderers.get('c4context'));
