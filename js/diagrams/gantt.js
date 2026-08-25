// --- GANTT CHART VISUALIZER ---
MultiDiagramVisualizer.register('gantt', function(code, nodesLayer, edgesLayer, isDark) {
  const primaryText = isDark ? '#FFFFFF' : '#212121';
  const textColor = isDark ? '#E0E0E0' : '#424242';
  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const cardBorder = isDark ? '#424242' : '#E0E0E0';
  const primaryBorder = isDark ? '#1976D2' : '#0288D1';
  const linkColor = isDark ? '#90CAF9' : '#1976D2';
  const selTitle = (typeof AppController !== 'undefined' && AppController.instance && AppController.instance.selectedVisualObject) ? AppController.instance.selectedVisualObject.title : null;
  const selGlow = 'drop-shadow(0 0 6px rgba(33, 150, 243, 0.8))';


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
});
