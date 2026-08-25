// --- SEQUENCE DIAGRAM VISUALIZER ---
MultiDiagramVisualizer.register('sequence', function(code, nodesLayer, edgesLayer, isDark) {
  const primaryText = isDark ? '#FFFFFF' : '#212121';
  const textColor = isDark ? '#E0E0E0' : '#424242';
  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const cardBorder = isDark ? '#424242' : '#E0E0E0';
  const primaryBorder = isDark ? '#1976D2' : '#0288D1';
  const primaryFill = isDark ? '#1E3A5F' : '#E3F2FD';
  const linkColor = isDark ? '#90CAF9' : '#1976D2';
  const selTitle = (typeof AppController !== 'undefined' && AppController.instance && AppController.instance.selectedVisualObject) ? AppController.instance.selectedVisualObject.title : null;
  const selGlow = 'drop-shadow(0 0 6px rgba(33, 150, 243, 0.8))';


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

});
