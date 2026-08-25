// --- PIE CHART VISUALIZER ---
MultiDiagramVisualizer.register('pie', function(code, nodesLayer, edgesLayer, isDark) {
  const primaryText = isDark ? '#FFFFFF' : '#212121';
  const textColor = isDark ? '#E0E0E0' : '#424242';
  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const cardBorder = isDark ? '#424242' : '#E0E0E0';
  const primaryBorder = isDark ? '#1976D2' : '#0288D1';
  const linkColor = isDark ? '#90CAF9' : '#1976D2';
  const selTitle = (typeof AppController !== 'undefined' && AppController.instance && AppController.instance.selectedVisualObject) ? AppController.instance.selectedVisualObject.title : null;
  const selGlow = 'drop-shadow(0 0 6px rgba(33, 150, 243, 0.8))';


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

});
