// --- TIMELINE VISUALIZER ---
MultiDiagramVisualizer.register('timeline', function(code, nodesLayer, edgesLayer, isDark) {
  const primaryText = isDark ? '#FFFFFF' : '#212121';
  const textColor = isDark ? '#E0E0E0' : '#424242';
  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const cardBorder = isDark ? '#424242' : '#E0E0E0';
  const primaryBorder = isDark ? '#1976D2' : '#0288D1';
  const linkColor = isDark ? '#90CAF9' : '#1976D2';
  const selTitle = (typeof AppController !== 'undefined' && AppController.instance && AppController.instance.selectedVisualObject) ? AppController.instance.selectedVisualObject.title : null;
  const selGlow = 'drop-shadow(0 0 6px rgba(33, 150, 243, 0.8))';


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
});
