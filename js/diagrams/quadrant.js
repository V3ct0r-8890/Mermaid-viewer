// --- QUADRANT CHART VISUALIZER ---
MultiDiagramVisualizer.register('quadrant', function(code, nodesLayer, edgesLayer, isDark) {
  const primaryText = isDark ? '#FFFFFF' : '#212121';
  const textColor = isDark ? '#E0E0E0' : '#424242';
  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const cardBorder = isDark ? '#424242' : '#E0E0E0';
  const primaryBorder = isDark ? '#1976D2' : '#0288D1';
  const linkColor = isDark ? '#90CAF9' : '#1976D2';
  const selTitle = (typeof AppController !== 'undefined' && AppController.instance && AppController.instance.selectedVisualObject) ? AppController.instance.selectedVisualObject.title : null;
  const selGlow = 'drop-shadow(0 0 6px rgba(33, 150, 243, 0.8))';


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
          // Pastel fill with the point's own colour as the border.
          const dotFill = MultiDiagramVisualizer.getColor(`${it.name}_fill`, Utils.toPastel(it.color, isDark));
          const dotBorder = MultiDiagramVisualizer.getColor(`${it.name}_border`, it.color);
          circle.setAttribute('fill', dotFill);
          circle.setAttribute('stroke', isSelQuad ? 'var(--selection-color)' : dotBorder);
          circle.setAttribute('stroke-width', isSelQuad ? '3.5' : '2.5');
          if (isSelQuad) circle.style.filter = selGlow;
          itemG.appendChild(circle);

          const dotFont = MultiDiagramVisualizer.getColor(`${it.name}_font`, textColor);
          const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          txt.setAttribute('x', `${px + 12}`);
          txt.setAttribute('y', `${py + 4}`);
          txt.setAttribute('fill', dotFont);
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
                  { key: 'font', label: Utils.FIELD_LABELS.font, type: 'color', value: dotFont },
                  { key: 'fill', label: Utils.FIELD_LABELS.fill, type: 'color', value: dotFill },
                  { key: 'border', label: Utils.FIELD_LABELS.border, type: 'color', value: dotBorder }
                ],
                onSave: (vals) => {
                  MultiDiagramVisualizer.setColor(`${vals.name}_font`, vals.font);
                  MultiDiagramVisualizer.setColor(`${vals.name}_fill`, vals.fill);
                  MultiDiagramVisualizer.setColor(`${vals.name}_border`, vals.border);
                  MultiDiagramVisualizer.syncColorToCode(`${vals.name}_font`, vals.font);
                  MultiDiagramVisualizer.syncColorToCode(`${vals.name}_fill`, vals.fill);
                  MultiDiagramVisualizer.syncColorToCode(`${vals.name}_border`, vals.border);
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
});
MultiDiagramVisualizer.register('quadrantChart', MultiDiagramVisualizer.renderers.get('quadrant'));
