// --- USER JOURNEY VISUALIZER ---
MultiDiagramVisualizer.register('journey', function(code, nodesLayer, edgesLayer, isDark) {
  const primaryText = isDark ? '#FFFFFF' : '#212121';
  const textColor = isDark ? '#E0E0E0' : '#424242';
  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const cardBorder = isDark ? '#424242' : '#E0E0E0';
  const primaryBorder = isDark ? '#1976D2' : '#0288D1';
  const linkColor = isDark ? '#90CAF9' : '#1976D2';
  const selTitle = (typeof AppController !== 'undefined' && AppController.instance && AppController.instance.selectedVisualObject) ? AppController.instance.selectedVisualObject.title : null;
  const selGlow = 'drop-shadow(0 0 6px rgba(33, 150, 243, 0.8))';


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
            const score = parseInt(taskMatch[2]);
            // Satisfaction reads straight off the card: a pastel fill in the score's
            // hue, with that hue at full strength on the border.
            const scoreInk = ['#D32F2F', '#F57C00', '#F9A825', '#7CB342', '#388E3C'];
            const ink = scoreInk[Utils.clamp(score || 3, 1, 5) - 1];
            curSection.tasks.push({
              name,
              score,
              actor: taskMatch[3].trim(),
              fillColor: MultiDiagramVisualizer.getColor(name, Utils.toPastel(ink, isDark)),
              fontColor: MultiDiagramVisualizer.getColor(`${name}_font`, primaryText),
              borderColor: MultiDiagramVisualizer.getColor(`${name}_border`, ink)
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
});
