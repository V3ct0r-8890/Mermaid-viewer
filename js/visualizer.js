// --- DEDICATED MULTI-DIAGRAM VISUAL SUITE ---
    class MultiDiagramVisualizer {
      static updateCodeLine(pattern, replacement) {
        const app = (typeof AppController !== 'undefined' && AppController.instance) ? AppController.instance : null;
        if (!app || !app.codeEditor) return;
        const curCode = app.codeEditor.value;
        const newCode = curCode.replace(pattern, replacement);
        if (newCode !== curCode) {
          app.codeEditor.value = newCode;
          if (app.codeHighlight) {
            app.codeHighlight.innerHTML = SyntaxHighlighter.highlight(newCode);
          }
          app.applyCodeToGraph(false);
        }
      }

      static render(type, code, nodesLayer, edgesLayer, isDark) {
        nodesLayer.innerHTML = '';
        edgesLayer.innerHTML = '';

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

        switch (type) {
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
                addParticipant(actorMatch[1], actorMatch[2] ? actorMatch[2].trim() : actorMatch[1], true);
                return;
              }
              const partMatch = line.match(/^participant\s+([A-Za-z0-9_]+)(?:\s+as\s+(.+))?/i);
              if (partMatch) {
                addParticipant(partMatch[1], partMatch[2] ? partMatch[2].trim() : partMatch[1], false);
                return;
              }
              const msgMatch = line.match(/^([A-Za-z0-9_]+)\s*(-->>|->>|-->|->)\s*([A-Za-z0-9_]+)\s*:\s*(.+)$/);
              if (msgMatch) {
                const from = msgMatch[1].trim();
                const arrow = msgMatch[2].trim();
                const to = msgMatch[3].trim();
                const text = msgMatch[4].trim();
                addParticipant(from, from);
                addParticipant(to, to);
                messages.push({
                  from,
                  to,
                  text,
                  rawArrow: arrow,
                  type: arrow.startsWith('--') ? 'dashed' : 'solid'
                });
              }
            });

            if (participants.length === 0) {
              addParticipant('Client', 'Client App');
              addParticipant('Server', 'API Server');
            }

            const count = participants.length;
            const pSpacing = Math.max(160, Math.min(260, 800 / (count || 1)));
            participants.forEach((p, idx) => {
              p.x = 100 + idx * pSpacing;
            });

            const topY = 60;
            const bottomY = Math.max(380, topY + 70 + messages.length * 60 + 30);

            // Draw lifelines
            participants.forEach(p => {
              const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
              line.setAttribute('x1', `${p.x}`);
              line.setAttribute('y1', `${topY + 35}`);
              line.setAttribute('x2', `${p.x}`);
              line.setAttribute('y2', `${bottomY}`);
              line.setAttribute('stroke', linkColor);
              line.setAttribute('stroke-width', '1.5');
              line.setAttribute('stroke-dasharray', '5,4');
              edgesLayer.appendChild(line);

              // Participant box
              const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
              g.style.cursor = 'pointer';
              const boxW = Math.max(100, p.name.length * 8 + 24);
              const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
              rect.setAttribute('x', `${p.x - boxW / 2}`);
              rect.setAttribute('y', `${topY}`);
              rect.setAttribute('width', `${boxW}`);
              rect.setAttribute('height', '36');
              rect.setAttribute('rx', p.isActor ? '18' : '4');
              const isSelP = (p.name === selTitle);
              rect.setAttribute('fill', primaryFill);
              rect.setAttribute('stroke', isSelP ? 'var(--selection-color)' : primaryBorder);
              rect.setAttribute('stroke-width', isSelP ? '2.5' : '1.8');
              if (isSelP) rect.style.filter = selGlow;
              g.appendChild(rect);

              const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
              text.setAttribute('x', `${p.x}`);
              text.setAttribute('y', `${topY + 18}`);
              text.setAttribute('text-anchor', 'middle');
              text.setAttribute('dominant-baseline', 'central');
              text.setAttribute('fill', primaryText);
              text.setAttribute('font-size', '12px');
              text.setAttribute('font-weight', '600');
              text.textContent = p.name;
              g.appendChild(text);

              g.addEventListener('mousedown', (e) => e.stopPropagation());
              g.addEventListener('mousedown', (e) => e.stopPropagation());
              g.addEventListener('mousedown', (e) => e.stopPropagation());
              g.addEventListener('click', (e) => {
                e.stopPropagation();
                if (typeof AppController !== 'undefined' && AppController.instance) {
                  AppController.instance.selectVisualObject({
                    type: p.isActor ? 'Actor' : 'Participant',
                    title: p.name,
                    fields: [
                      { key: 'name', label: 'Display Name', type: 'text', value: p.name }
                    ],
                    onSave: (vals) => {
                      const regex = new RegExp(`(actor|participant)\\s+${p.id}(?:\\s+as\\s+[^\n]+)?`, 'i');
                      MultiDiagramVisualizer.updateCodeLine(regex, `$1 ${p.id} as ${vals.name}`);
                    }
                  });
                }
              });

              nodesLayer.appendChild(g);
            });

            // Draw sequence message arrows
            messages.forEach((m, idx) => {
              const y = topY + 70 + idx * 55;
              const pFrom = participantMap.get(m.from);
              const pTo = participantMap.get(m.to);
              if (!pFrom || !pTo) return;

              const x1 = pFrom.x;
              const x2 = pTo.x;

              const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
              line.setAttribute('x1', `${x1}`);
              line.setAttribute('y1', `${y}`);
              line.setAttribute('x2', `${x2}`);
              line.setAttribute('y2', `${y}`);
              line.setAttribute('stroke', linkColor);
              line.setAttribute('stroke-width', '2');
              if (m.type === 'dashed') line.setAttribute('stroke-dasharray', '5,4');
              line.setAttribute('marker-end', 'url(#marker-arrow)');
              edgesLayer.appendChild(line);

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
              badgeBg.setAttribute('fill', cardBg);
              badgeBg.setAttribute('stroke', isSelM ? 'var(--selection-color)' : cardBorder);
              badgeBg.setAttribute('stroke-width', isSelM ? '2' : '1');
              if (isSelM) badgeBg.style.filter = selGlow;
              badgeG.appendChild(badgeBg);

              const badgeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
              badgeText.setAttribute('x', `${midX}`);
              badgeText.setAttribute('y', `${y - 9}`);
              badgeText.setAttribute('text-anchor', 'middle');
              badgeText.setAttribute('dominant-baseline', 'central');
              badgeText.setAttribute('fill', textColor);
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
                      { key: 'text', label: 'Message Text', type: 'text', value: m.text }
                    ],
                    onSave: (vals) => {
                      const escaped = m.text.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                      const regex = new RegExp(`(${m.from}\\s*(?:-->>|->>|-->|->)\\s*${m.to}\\s*:\\s*)${escaped}`, 'i');
                      MultiDiagramVisualizer.updateCodeLine(regex, `$1${vals.text}`);
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
            let title = 'Distribution';
            const data = [];
            const colors = ['#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#00BCD4', '#E91E63', '#FFEB3B', '#795548'];

            rawLines.forEach(line => {
              const titleMatch = line.match(/^pie(?:\s+title\s+(.+))?$/i) || line.match(/^title\s+(.+)$/i);
              if (titleMatch && titleMatch[1]) {
                title = titleMatch[1].trim();
                return;
              }
              const valMatch = line.match(/^"([^"]+)"\s*:\s*([0-9.]+)/) || line.match(/^([^:]+)\s*:\s*([0-9.]+)/);
              if (valMatch && !line.toLowerCase().startsWith('pie')) {
                const label = valMatch[1].replace(/"/g, '').trim();
                const val = parseFloat(valMatch[2]);
                if (!isNaN(val) && val > 0) {
                  data.push({ label, val, color: colors[data.length % colors.length] });
                }
              }
            });

            if (data.length === 0) {
              data.push({ label: 'Item A', val: 50, color: colors[0] });
              data.push({ label: 'Item B', val: 50, color: colors[1] });
            }

            const total = data.reduce((acc, d) => acc + d.val, 0) || 1;
            const cx = 260, cy = 240, r = 140, holeR = 60;

            const titleEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            titleEl.setAttribute('x', '350');
            titleEl.setAttribute('y', '50');
            titleEl.setAttribute('text-anchor', 'middle');
            titleEl.setAttribute('fill', textColor);
            titleEl.setAttribute('font-size', '15px');
            titleEl.setAttribute('font-weight', '700');
            titleEl.textContent = title;
            nodesLayer.appendChild(titleEl);

            let curAngle = -Math.PI / 2;
            data.forEach((d, idx) => {
              const sliceAngle = (d.val / total) * Math.PI * 2;
              const nextAngle = curAngle + sliceAngle;
              const pct = Math.round((d.val / total) * 100);

              const x1 = cx + r * Math.cos(curAngle);
              const y1 = cy + r * Math.sin(curAngle);
              const x2 = cx + r * Math.cos(nextAngle);
              const y2 = cy + r * Math.sin(nextAngle);

              const ix1 = cx + holeR * Math.cos(curAngle);
              const iy1 = cy + holeR * Math.sin(curAngle);
              const ix2 = cx + holeR * Math.cos(nextAngle);
              const iy2 = cy + holeR * Math.sin(nextAngle);

              const largeArc = sliceAngle > Math.PI ? 1 : 0;
              const pathData = `M ${ix1} ${iy1} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${holeR} ${holeR} 0 ${largeArc} 0 ${ix1} ${iy1} Z`;

              const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
              path.setAttribute('d', pathData);
              const isSelPie = (d.label === selTitle);
              path.setAttribute('fill', d.color);
              path.setAttribute('stroke', isSelPie ? 'var(--selection-color)' : cardBg);
              path.setAttribute('stroke-width', isSelPie ? '3.5' : '2');
              if (isSelPie) path.style.filter = selGlow;
              path.style.cursor = 'pointer';

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
                        { key: 'val', label: 'Value / Proportion', type: 'number', value: d.val }
                      ],
                      onSave: (vals) => {
                        const escaped = d.label.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                        const regex = new RegExp(`(["']?)${escaped}(["']?\\s*:\\s*)[0-9.]+`, 'i');
                        MultiDiagramVisualizer.updateCodeLine(regex, `"${vals.label}" : ${vals.val}`);
                      }
                    });
                  }
                });
              };

              attachPieClick(path);
              nodesLayer.appendChild(path);

              if (sliceAngle > 0.15) {
                const midA = curAngle + sliceAngle / 2;
                const lblR = (r + holeR) / 2;
                const lx = cx + lblR * Math.cos(midA);
                const ly = cy + lblR * Math.sin(midA);

                const pText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                pText.setAttribute('x', `${lx}`);
                pText.setAttribute('y', `${ly}`);
                pText.setAttribute('text-anchor', 'middle');
                pText.setAttribute('dominant-baseline', 'central');
                pText.setAttribute('fill', '#FFFFFF');
                pText.setAttribute('font-size', '12px');
                pText.setAttribute('font-weight', 'bold');
                pText.textContent = `${pct}%`;
                nodesLayer.appendChild(pText);
              }

              // Legend
              const legY = 120 + idx * 32;
              const legG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
              legG.style.cursor = 'pointer';

              const legBox = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
              legBox.setAttribute('x', '450');
              legBox.setAttribute('y', `${legY}`);
              legBox.setAttribute('width', '16');
              legBox.setAttribute('height', '16');
              legBox.setAttribute('rx', '3');
              legBox.setAttribute('fill', d.color);
              legG.appendChild(legBox);

              const legTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
              legTxt.setAttribute('x', '476');
              legTxt.setAttribute('y', `${legY + 8}`);
              legTxt.setAttribute('dominant-baseline', 'central');
              legTxt.setAttribute('fill', textColor);
              legTxt.setAttribute('font-size', '12px');
              legTxt.setAttribute('font-weight', '500');
              legTxt.textContent = `${d.label} (${d.val} - ${pct}%)`;
              legG.appendChild(legTxt);

              attachPieClick(legG);
              nodesLayer.appendChild(legG);
              curAngle = nextAngle;
            });
            break;
          }

          case 'gantt': {
            const rawLines = (code || '').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('%%'));
            let title = 'Project Roadmap';
            let dateFormat = 'YYYY-MM-DD';
            const sections = [];
            let currentSec = { title: 'General', tasks: [] };
            sections.push(currentSec);

            let minTimestamp = Infinity;
            let maxTimestamp = -Infinity;
            let hasRealDates = false;
            let fallbackDay = 0;

            rawLines.forEach(line => {
              const titleMatch = line.match(/^title\s+(.+)$/i);
              if (titleMatch) { title = titleMatch[1].trim(); return; }

              const dfMatch = line.match(/^dateFormat\s+(.+)$/i);
              if (dfMatch) { dateFormat = dfMatch[1].trim(); return; }

              const secMatch = line.match(/^section\s+(.+)$/i);
              if (secMatch) {
                currentSec = { title: secMatch[1].trim(), tasks: [] };
                sections.push(currentSec);
                return;
              }

              if (line.toLowerCase().startsWith('gantt') || line.toLowerCase().startsWith('axisformat') || line.toLowerCase().startsWith('excludes') || line.toLowerCase().startsWith('todaymarker')) return;

              const taskParts = line.split(':');
              if (taskParts.length >= 2) {
                const taskName = taskParts[0].trim();
                const meta = taskParts.slice(1).join(':').trim();
                let status = 'done';
                if (meta.includes('crit')) status = 'crit';
                else if (meta.includes('active')) status = 'active';
                else if (meta.includes('milestone')) status = 'milestone';

                const color = status === 'done' ? '#4CAF50' : status === 'active' ? '#2196F3' : status === 'crit' ? '#F44336' : '#FF9800';

                const dateMatches = meta.match(/([0-9]{4}[-/][0-9]{1,2}[-/][0-9]{1,2})/g) || [];
                const durMatch = meta.match(/([0-9]+)\s*([dwmy]?)/i);

                let startTs = null;
                let endTs = null;
                let durationDays = 6;

                if (durMatch && durMatch[1]) {
                  const num = parseInt(durMatch[1], 10);
                  const unit = (durMatch[2] || 'd').toLowerCase();
                  durationDays = unit === 'w' ? num * 7 : (unit === 'm' ? num * 30 : num);
                }

                if (dateMatches.length >= 2) {
                  startTs = new Date(dateMatches[0]).getTime();
                  endTs = new Date(dateMatches[1]).getTime();
                  if (!isNaN(startTs) && !isNaN(endTs) && endTs >= startTs) {
                    durationDays = Math.max(1, Math.round((endTs - startTs) / (1000 * 3600 * 24)));
                    hasRealDates = true;
                  }
                } else if (dateMatches.length === 1) {
                  startTs = new Date(dateMatches[0]).getTime();
                  if (!isNaN(startTs)) {
                    if (status === 'milestone') durationDays = 0;
                    endTs = startTs + durationDays * (1000 * 3600 * 24);
                    hasRealDates = true;
                  }
                }

                if (startTs !== null && !isNaN(startTs)) {
                  if (startTs < minTimestamp) minTimestamp = startTs;
                  if (endTs > maxTimestamp) maxTimestamp = endTs;
                }

                currentSec.tasks.push({
                  name: taskName,
                  status,
                  color,
                  startTs,
                  endTs,
                  dur: durationDays,
                  fallbackStart: fallbackDay
                });

                fallbackDay += Math.max(1, Math.round(durationDays * 0.8));
              }
            });

            const validSections = sections.filter(s => s.tasks.length > 0);
            const totalSpanDays = hasRealDates
              ? Math.max(7, Math.round((maxTimestamp - minTimestamp) / (1000 * 3600 * 24)) + 4)
              : Math.max(fallbackDay + 6, 28);

            const taskColW = 200;
            const timelineX = 240;
            const timelineW = 560;
            const dayW = timelineW / totalSpanDays;
            const rowH = 34;
            const secH = 28;

            // 1. Chart Title
            const titleEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            titleEl.setAttribute('x', `${(taskColW + timelineW) / 2 + 20}`);
            titleEl.setAttribute('y', '36');
            titleEl.setAttribute('text-anchor', 'middle');
            titleEl.setAttribute('fill', textColor);
            titleEl.setAttribute('font-size', '16px');
            titleEl.setAttribute('font-weight', '700');
            titleEl.textContent = title;
            nodesLayer.appendChild(titleEl);

            // 2. Timeline Header & Grid
            const headerY = 65;
            const totalRowsCount = validSections.length + validSections.reduce((sum, s) => sum + s.tasks.length, 0);
            const chartBottomY = headerY + 26 + totalRowsCount * rowH;

            // Header background
            const headerBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            headerBg.setAttribute('x', '30');
            headerBg.setAttribute('y', `${headerY}`);
            headerBg.setAttribute('width', `${timelineX + timelineW - 30}`);
            headerBg.setAttribute('height', '26');
            headerBg.setAttribute('rx', '4');
            headerBg.setAttribute('fill', isDark ? '#2D3033' : '#F1F3F5');
            nodesLayer.appendChild(headerBg);

            const taskColHeader = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            taskColHeader.setAttribute('x', '45');
            taskColHeader.setAttribute('y', `${headerY + 17}`);
            taskColHeader.setAttribute('fill', textColor);
            taskColHeader.setAttribute('font-size', '11px');
            taskColHeader.setAttribute('font-weight', 'bold');
            taskColHeader.textContent = 'TASK / SECTION';
            nodesLayer.appendChild(taskColHeader);

            // Time column ticks
            const stepDays = totalSpanDays > 60 ? 14 : (totalSpanDays > 25 ? 7 : 4);
            for (let d = 0; d <= totalSpanDays; d += stepDays) {
              const gx = timelineX + d * dayW;

              // Grid line
              const gridLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
              gridLine.setAttribute('x1', `${gx}`);
              gridLine.setAttribute('y1', `${headerY + 26}`);
              gridLine.setAttribute('x2', `${gx}`);
              gridLine.setAttribute('y2', `${chartBottomY}`);
              gridLine.setAttribute('stroke', cardBorder);
              gridLine.setAttribute('stroke-dasharray', '3 3');
              gridLine.setAttribute('opacity', '0.6');
              edgesLayer.appendChild(gridLine);

              // Date tick label
              let tickLabel = `Day ${d + 1}`;
              if (hasRealDates && !isNaN(minTimestamp)) {
                const tickDate = new Date(minTimestamp + d * 86400000);
                const month = tickDate.toLocaleString('default', { month: 'short' });
                const day = String(tickDate.getDate()).padStart(2, '0');
                tickLabel = `${month} ${day}`;
              }

              const tickTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
              tickTxt.setAttribute('x', `${gx + 4}`);
              tickTxt.setAttribute('y', `${headerY + 17}`);
              tickTxt.setAttribute('fill', textColor);
              tickTxt.setAttribute('font-size', '10px');
              tickTxt.setAttribute('opacity', '0.85');
              tickTxt.textContent = tickLabel;
              nodesLayer.appendChild(tickTxt);
            }

            // 3. Render Sections and Tasks
            let curY = headerY + 34;

            validSections.forEach(sec => {
              // Section Row Banner
              const secBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
              secBg.setAttribute('x', '30');
              secBg.setAttribute('y', `${curY}`);
              secBg.setAttribute('width', `${timelineX + timelineW - 30}`);
              secBg.setAttribute('height', `${secH}`);
              secBg.setAttribute('rx', '4');
              secBg.setAttribute('fill', isDark ? '#25282B' : '#EBF3FA');
              secBg.setAttribute('opacity', '0.9');
              nodesLayer.appendChild(secBg);

              const secTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
              secTxt.setAttribute('x', '45');
              secTxt.setAttribute('y', `${curY + 18}`);
              secTxt.setAttribute('fill', primaryText);
              secTxt.setAttribute('font-size', '12px');
              secTxt.setAttribute('font-weight', 'bold');
              secTxt.textContent = `📁  ${sec.title}`;
              nodesLayer.appendChild(secTxt);

              curY += secH + 6;

              // Task Rows
              sec.tasks.forEach((t, tIdx) => {
                const taskRowG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                taskRowG.style.cursor = 'pointer';

                if (tIdx % 2 === 1) {
                  const rowBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                  rowBg.setAttribute('x', '30');
                  rowBg.setAttribute('y', `${curY}`);
                  rowBg.setAttribute('width', `${timelineX + timelineW - 30}`);
                  rowBg.setAttribute('height', `${rowH - 4}`);
                  rowBg.setAttribute('rx', '3');
                  rowBg.setAttribute('fill', isDark ? '#1F2224' : '#FAFAFA');
                  taskRowG.appendChild(rowBg);
                }

                // Task Name
                const tTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                tTxt.setAttribute('x', '65');
                tTxt.setAttribute('y', `${curY + 18}`);
                tTxt.setAttribute('fill', textColor);
                tTxt.setAttribute('font-size', '11.5px');
                tTxt.setAttribute('font-weight', '500');
                tTxt.textContent = t.name;
                taskRowG.appendChild(tTxt);

                // Start day calculation
                let taskStartDay = t.fallbackStart;
                if (hasRealDates && t.startTs !== null && !isNaN(t.startTs)) {
                  taskStartDay = Math.max(0, Math.round((t.startTs - minTimestamp) / 86400000));
                }

                const bx = timelineX + taskStartDay * dayW;
                const bw = Math.max(14, t.dur * dayW);

                if (t.status === 'milestone') {
                  const mDia = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                  const mx = bx + 8;
                  const my = curY + 15;
                  mDia.setAttribute('points', `${mx},${my - 9} ${mx + 9},${my} ${mx},${my + 9} ${mx - 9},${my}`);
                  mDia.setAttribute('fill', t.color);
                  taskRowG.appendChild(mDia);

                  const mTag = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                  mTag.setAttribute('x', `${mx + 14}`);
                  mTag.setAttribute('y', `${my + 4}`);
                  mTag.setAttribute('fill', t.color);
                  mTag.setAttribute('font-size', '10px');
                  mTag.setAttribute('font-weight', 'bold');
                  mTag.textContent = 'Milestone';
                  taskRowG.appendChild(mTag);
                } else {
                  const bar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                  bar.setAttribute('x', `${bx}`);
                  bar.setAttribute('y', `${curY + 6}`);
                  bar.setAttribute('width', `${bw}`);
                  bar.setAttribute('height', '18');
                  bar.setAttribute('rx', '4');
                  const isSelGantt = (t.name === selTitle);
                  bar.setAttribute('fill', t.color);
                  if (isSelGantt) {
                    bar.setAttribute('stroke', 'var(--selection-color)');
                    bar.setAttribute('stroke-width', '2.5');
                    bar.style.filter = selGlow;
                  }
                  taskRowG.appendChild(bar);

                  const durText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                  durText.setAttribute('x', bw > 30 ? `${bx + bw / 2}` : `${bx + bw + 6}`);
                  durText.setAttribute('y', `${curY + 19}`);
                  durText.setAttribute('text-anchor', bw > 30 ? 'middle' : 'start');
                  durText.setAttribute('fill', bw > 30 ? '#FFFFFF' : textColor);
                  durText.setAttribute('font-size', '10px');
                  durText.setAttribute('font-weight', '600');
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
                        { key: 'dur', label: 'Duration (Days)', type: 'number', value: t.dur },
                        { key: 'status', label: 'Status', type: 'select', options: ['done', 'active', 'crit', 'milestone'], value: t.status }
                      ],
                      onSave: (vals) => {
                        const escaped = t.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                        const regex = new RegExp(`^(\\s*)${escaped}(\\s*:)`, 'm');
                        MultiDiagramVisualizer.updateCodeLine(regex, `$1${vals.name}$2`);
                      }
                    });
                  }
                });

                nodesLayer.appendChild(taskRowG);
                curY += rowH;
              });

              curY += 8;
            });

            // 4. Legend
            const legY = curY + 12;
            const legendItems = [
              { label: 'Completed', color: '#4CAF50' },
              { label: 'In Progress', color: '#2196F3' },
              { label: 'Critical', color: '#F44336' },
              { label: 'Milestone', color: '#FF9800' }
            ];

            legendItems.forEach((it, idx) => {
              const lx = 60 + idx * 140;
              const dot = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
              dot.setAttribute('x', `${lx}`);
              dot.setAttribute('y', `${legY}`);
              dot.setAttribute('width', '12');
              dot.setAttribute('height', '12');
              dot.setAttribute('rx', '3');
              dot.setAttribute('fill', it.color);
              nodesLayer.appendChild(dot);

              const lt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
              lt.setAttribute('x', `${lx + 18}`);
              lt.setAttribute('y', `${legY + 10}`);
              lt.setAttribute('fill', textColor);
              lt.setAttribute('font-size', '11px');
              lt.textContent = it.label;
              nodesLayer.appendChild(lt);
            });
            break;
          }

          case 'gitGraph': {
            const rawLines = (code || '').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('%%') && !l.startsWith('gitGraph'));
            const branchColors = { main: '#2196F3', dev: '#4CAF50', feature: '#FF9800', release: '#9C27B0' };
            const branches = [{ name: 'main', y: 120, color: '#2196F3' }];
            let curBranch = 'main';
            const commits = [];

            rawLines.forEach((line) => {
              const bMatch = line.match(/^branch\s+([A-Za-z0-9_-]+)/i);
              if (bMatch) {
                const bName = bMatch[1];
                if (!branches.find(b => b.name === bName)) {
                  const colorKeys = Object.keys(branchColors);
                  const color = branchColors[bName] || colorKeys[branches.length % colorKeys.length];
                  branches.push({ name: bName, y: 120 + branches.length * 70, color });
                }
                curBranch = bName;
                return;
              }

              const chkMatch = line.match(/^checkout\s+([A-Za-z0-9_-]+)/i);
              if (chkMatch) {
                curBranch = chkMatch[1];
                return;
              }

              const cMatch = line.match(/^commit(?:\s+id:\s*"([^"]+)")?(?:\s+tag:\s*"([^"]+)")?/i);
              if (cMatch) {
                const id = cMatch[1] || `c${commits.length + 1}`;
                const tag = cMatch[2] || undefined;
                commits.push({ id, tag, branch: curBranch, type: 'commit' });
                return;
              }

              const mMatch = line.match(/^merge\s+([A-Za-z0-9_-]+)(?:\s+id:\s*"([^"]+)")?/i);
              if (mMatch) {
                const srcB = mMatch[1];
                const id = mMatch[2] || `m${commits.length + 1}`;
                commits.push({ id, fromBranch: srcB, branch: curBranch, type: 'merge' });
              }
            });

            if (commits.length === 0) {
              commits.push({ id: 'init', branch: 'main', type: 'commit' });
              commits.push({ id: 'feat', branch: 'main', type: 'commit' });
            }

            // Draw branch tracks
            branches.forEach(b => {
              const bLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
              bLine.setAttribute('x1', '120');
              bLine.setAttribute('y1', `${b.y}`);
              bLine.setAttribute('x2', `${Math.max(680, 140 + commits.length * 90)}`);
              bLine.setAttribute('y2', `${b.y}`);
              bLine.setAttribute('stroke', b.color);
              bLine.setAttribute('stroke-width', '3');
              bLine.setAttribute('opacity', '0.4');
              edgesLayer.appendChild(bLine);

              const bTag = document.createElementNS('http://www.w3.org/2000/svg', 'text');
              bTag.setAttribute('x', '45');
              bTag.setAttribute('y', `${b.y + 4}`);
              bTag.setAttribute('fill', b.color);
              bTag.setAttribute('font-size', '12px');
              bTag.setAttribute('font-weight', 'bold');
              bTag.textContent = b.name;
              nodesLayer.appendChild(bTag);
            });

            // Draw commits
            const bMap = new Map(branches.map(b => [b.name, b]));
            commits.forEach((c, idx) => {
              const x = 160 + idx * 80;
              const bInfo = bMap.get(c.branch) || branches[0];
              const y = bInfo.y;

              const commitG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
              commitG.style.cursor = 'pointer';

              if (c.type === 'merge' && c.fromBranch) {
                const srcB = bMap.get(c.fromBranch);
                if (srcB) {
                  const mCurve = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                  mCurve.setAttribute('d', `M ${x - 80} ${srcB.y} C ${x - 30} ${srcB.y}, ${x - 30} ${y}, ${x} ${y}`);
                  mCurve.setAttribute('fill', 'none');
                  mCurve.setAttribute('stroke', srcB.color);
                  mCurve.setAttribute('stroke-width', '2.5');
                  edgesLayer.appendChild(mCurve);
                }
              }

              const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
              circle.setAttribute('cx', `${x}`);
              circle.setAttribute('cy', `${y}`);
              circle.setAttribute('r', '10');
              const isSelGit = (c.id === selTitle);
              circle.setAttribute('fill', bInfo.color);
              circle.setAttribute('stroke', isSelGit ? 'var(--selection-color)' : cardBg);
              circle.setAttribute('stroke-width', isSelGit ? '3.5' : '2.5');
              if (isSelGit) circle.style.filter = selGlow;
              commitG.appendChild(circle);

              const cLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
              cLabel.setAttribute('x', `${x}`);
              cLabel.setAttribute('y', `${y + 24}`);
              cLabel.setAttribute('text-anchor', 'middle');
              cLabel.setAttribute('fill', textColor);
              cLabel.setAttribute('font-size', '10px');
              cLabel.setAttribute('font-weight', '500');
              cLabel.textContent = c.id;
              commitG.appendChild(cLabel);

              if (c.tag) {
                const tagG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                const tagRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                const tagW = c.tag.length * 6.5 + 16;
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
                      { key: 'tag', label: 'Release Tag', type: 'text', value: c.tag || '' }
                    ],
                    onSave: (vals) => {
                      const escaped = c.id.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                      const regex = new RegExp(`(commit\\s+id:\\s*["'])${escaped}(["'])`, 'i');
                      MultiDiagramVisualizer.updateCodeLine(regex, `$1${vals.id}$2`);
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
            const stages = [];
            let curStage = { name: 'Flow', tasks: [] };
            stages.push(curStage);

            rawLines.forEach(line => {
              const titleMatch = line.match(/^title\s+(.+)$/i);
              if (titleMatch) { title = titleMatch[1].trim(); return; }

              const secMatch = line.match(/^section\s+(.+)$/i);
              if (secMatch) {
                curStage = { name: secMatch[1].trim(), tasks: [] };
                stages.push(curStage);
                return;
              }

              if (line.toLowerCase().startsWith('journey')) return;

              const parts = line.split(':');
              if (parts.length >= 2) {
                const name = parts[0].trim();
                const score = parseInt(parts[1].trim(), 10) || 4;
                const actor = parts[2] ? parts[2].trim() : 'User';
                curStage.tasks.push({ name, score, actor });
              }
            });

            const validStages = stages.filter(s => s.tasks.length > 0);
            const stageW = Math.max(180, Math.min(260, 750 / (validStages.length || 1)));

            const titleEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            titleEl.setAttribute('x', '380');
            titleEl.setAttribute('y', '45');
            titleEl.setAttribute('text-anchor', 'middle');
            titleEl.setAttribute('fill', textColor);
            titleEl.setAttribute('font-size', '15px');
            titleEl.setAttribute('font-weight', '700');
            titleEl.textContent = title;
            nodesLayer.appendChild(titleEl);

            const emojis = { 5: '😄', 4: '🙂', 3: '😐', 2: '🙁', 1: '😫' };

            validStages.forEach((st, sIdx) => {
              const x = 50 + sIdx * stageW;
              const sHeader = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
              sHeader.setAttribute('x', `${x}`);
              sHeader.setAttribute('y', '80');
              sHeader.setAttribute('width', `${stageW - 16}`);
              sHeader.setAttribute('height', '30');
              sHeader.setAttribute('rx', '4');
              sHeader.setAttribute('fill', primaryFill);
              nodesLayer.appendChild(sHeader);

              const sTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
              sTxt.setAttribute('x', `${x + (stageW - 16) / 2}`);
              sTxt.setAttribute('y', '96');
              sTxt.setAttribute('text-anchor', 'middle');
              sTxt.setAttribute('dominant-baseline', 'central');
              sTxt.setAttribute('fill', primaryText);
              sTxt.setAttribute('font-size', '11.5px');
              sTxt.setAttribute('font-weight', 'bold');
              sTxt.textContent = st.name;
              nodesLayer.appendChild(sTxt);

              st.tasks.forEach((t, tIdx) => {
                const ty = 125 + tIdx * 90;
                const cardG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                cardG.style.cursor = 'pointer';

                const card = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                card.setAttribute('x', `${x}`);
                card.setAttribute('y', `${ty}`);
                card.setAttribute('width', `${stageW - 16}`);
                card.setAttribute('height', '80');
                card.setAttribute('rx', '6');
                const isSelJourney = (t.name === selTitle);
                card.setAttribute('fill', cardBg);
                card.setAttribute('stroke', isSelJourney ? 'var(--selection-color)' : cardBorder);
                if (isSelJourney) {
                  card.setAttribute('stroke-width', '2.5');
                  card.style.filter = selGlow;
                }
                cardG.appendChild(card);

                const tName = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                tName.setAttribute('x', `${x + 10}`);
                tName.setAttribute('y', `${ty + 20}`);
                tName.setAttribute('fill', primaryText);
                tName.setAttribute('font-size', '11.5px');
                tName.setAttribute('font-weight', '600');
                tName.textContent = t.name;
                cardG.appendChild(tName);

                const emoji = emojis[t.score] || '🙂';
                const tScore = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                tScore.setAttribute('x', `${x + 10}`);
                tScore.setAttribute('y', `${ty + 44}`);
                tScore.setAttribute('fill', textColor);
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
                cardG.addEventListener('mousedown', (e) => e.stopPropagation());
              cardG.addEventListener('click', (e) => {
                  e.stopPropagation();
                  if (typeof AppController !== 'undefined' && AppController.instance) {
                    AppController.instance.selectVisualObject({
                      type: 'Journey Touchpoint',
                      title: t.name,
                      fields: [
                        { key: 'name', label: 'Task Name', type: 'text', value: t.name },
                        { key: 'score', label: 'Satisfaction (1-5)', type: 'select', options: [1, 2, 3, 4, 5], value: t.score },
                        { key: 'actor', label: 'Actor', type: 'text', value: t.actor }
                      ],
                      onSave: (vals) => {
                        const escaped = t.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                        const regex = new RegExp(`^(\\s*)${escaped}(\\s*:\\s*)[0-9]+(\\s*:\\s*)${t.actor}`, 'm');
                        MultiDiagramVisualizer.updateCodeLine(regex, `$1${vals.name}$2${vals.score}$3${vals.actor}`);
                      }
                    });
                  }
                });

                nodesLayer.appendChild(cardG);
              });
            });
            break;
          }

          case 'mindmap': {
            const rawLines = (code || '').split('\n').filter(l => l.trim() && !l.trim().startsWith('%%') && !l.trim().startsWith('mindmap'));

            const parseNodeLine = (raw) => {
              let text = raw.trim();
              let shape = 'rounded';
              if (text.startsWith('root')) {
                text = text.replace(/^root/, '').trim();
              }
              if (text.startsWith('((') && text.endsWith('))')) {
                shape = 'circle';
                text = text.slice(2, -2).trim();
              } else if (text.startsWith('(') && text.endsWith(')')) {
                shape = 'rounded';
                text = text.slice(1, -1).trim();
              } else if (text.startsWith('[') && text.endsWith(']')) {
                shape = 'rect';
                text = text.slice(1, -1).trim();
              } else if (text.startsWith('))') && text.endsWith('((')) {
                shape = 'bang';
                text = text.slice(2, -2).trim();
              } else if (text.startsWith(')') && text.endsWith('(')) {
                shape = 'cloud';
                text = text.slice(1, -1).trim();
              }
              text = text.replace(/::icon\([^\)]+\)/g, '').trim();
              return { text: text || 'Node', shape };
            };

            const rootNode = { id: 'root', text: 'Central Topic', shape: 'circle', children: [], level: 0, x: 450, y: 300, width: 140, height: 44 };
            const stack = [{ indent: -1, node: rootNode }];

            rawLines.forEach((line) => {
              const leadingSpaces = line.search(/\S/);
              if (leadingSpaces === -1) return;
              const { text, shape } = parseNodeLine(line);

              if (stack.length === 1 && stack[0].node.children.length === 0 && (line.trim().startsWith('root') || leadingSpaces === 0)) {
                rootNode.text = text;
                rootNode.shape = shape;
                stack[0].indent = leadingSpaces;
                return;
              }

              while (stack.length > 1 && stack[stack.length - 1].indent >= leadingSpaces) {
                stack.pop();
              }

              const parent = stack[stack.length - 1].node;
              const newNode = {
                id: (typeof Utils !== 'undefined' && Utils.uid) ? Utils.uid('mm') : 'mm_' + Math.random().toString(36).substring(2, 7),
                text,
                shape,
                children: [],
                level: parent.level + 1,
                x: 0,
                y: 0,
                width: Math.max(90, Math.min(220, text.length * 7.5 + 24)),
                height: 32
              };
              parent.children.push(newNode);
              stack.push({ indent: leadingSpaces, node: newNode });
            });

            if (rootNode.children.length === 0) {
              rootNode.children = [
                { id: 'b1', text: 'Branch 1', shape: 'rounded', level: 1, children: [{ id: 'b1_1', text: 'Sub-topic A', shape: 'rounded', level: 2, children: [] }, { id: 'b1_2', text: 'Sub-topic B', shape: 'rounded', level: 2, children: [] }], width: 110, height: 32 },
                { id: 'b2', text: 'Branch 2', shape: 'rounded', level: 1, children: [{ id: 'b2_1', text: 'Sub-topic C', shape: 'rounded', level: 2, children: [] }], width: 110, height: 32 }
              ];
            }

            rootNode.width = Math.max(130, rootNode.text.length * 8 + 36);

            const calcSubtreeHeight = (n) => {
              if (n.children.length === 0) {
                n.treeHeight = n.height + 14;
                return n.treeHeight;
              }
              let sum = 0;
              n.children.forEach(c => {
                sum += calcSubtreeHeight(c);
              });
              n.treeHeight = Math.max(n.height + 14, sum);
              return n.treeHeight;
            };

            const leftBranches = [];
            const rightBranches = [];
            const tier1 = rootNode.children;
            const half = Math.ceil(tier1.length / 2);
            tier1.forEach((b, idx) => {
              if (idx < half) leftBranches.push(b);
              else rightBranches.push(b);
            });

            const leftHeight = leftBranches.reduce((acc, b) => acc + calcSubtreeHeight(b), 0);
            const rightHeight = rightBranches.reduce((acc, b) => acc + calcSubtreeHeight(b), 0);
            const totalTreeHeight = Math.max(leftHeight, rightHeight, 400);

            rootNode.y = Math.max(220, totalTreeHeight / 2 + 50);

            const layoutSubtree = (node, parentX, startY, isLeft) => {
              const hStep = node.level === 1 ? 160 : (node.width > 120 ? node.width + 30 : 135);
              node.x = isLeft ? parentX - hStep : parentX + hStep;
              node.y = startY + node.treeHeight / 2;

              let curChildY = startY;
              node.children.forEach(child => {
                layoutSubtree(child, node.x, curChildY, isLeft);
                curChildY += child.treeHeight;
              });
            };

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
            rootEl.setAttribute('fill', primaryFill);
            rootEl.setAttribute('stroke', isSelRoot ? 'var(--selection-color)' : primaryBorder);
            rootEl.setAttribute('stroke-width', isSelRoot ? '3.5' : '2.5');
            if (isSelRoot) rootEl.style.filter = selGlow;
            rootG.appendChild(rootEl);

            const rootTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            rootTxt.setAttribute('x', `${rootNode.x}`);
            rootTxt.setAttribute('y', `${rootNode.y}`);
            rootTxt.setAttribute('text-anchor', 'middle');
            rootTxt.setAttribute('dominant-baseline', 'central');
            rootTxt.setAttribute('fill', primaryText);
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
                    { key: 'text', label: 'Central Topic', type: 'text', value: rootNode.text }
                  ],
                  onSave: (vals) => {
                    const escaped = rootNode.text.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                    const regex = new RegExp(`(root[\\(\\[{]*)${escaped}([\\)\\]}]*)`);
                    MultiDiagramVisualizer.updateCodeLine(regex, `$1${vals.text}$2`);
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
              rect.setAttribute('fill', node.level === 1 ? cardBg : (isDark ? '#232527' : '#F8F9FA'));
              rect.setAttribute('stroke', isSelMM ? 'var(--selection-color)' : (node.level === 1 ? primaryBorder : cardBorder));
              rect.setAttribute('stroke-width', isSelMM ? '2.5' : (node.level === 1 ? '1.5' : '1'));
              if (isSelMM) rect.style.filter = selGlow;
              g.appendChild(rect);

              const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
              txt.setAttribute('x', `${node.x}`);
              txt.setAttribute('y', `${node.y}`);
              txt.setAttribute('text-anchor', 'middle');
              txt.setAttribute('dominant-baseline', 'central');
              txt.setAttribute('fill', node.level === 1 ? primaryText : textColor);
              txt.setAttribute('font-size', node.level === 1 ? '11.5px' : (node.level === 2 ? '11px' : '10px'));
              txt.setAttribute('font-weight', node.level <= 2 ? '600' : 'normal');
              txt.textContent = node.text;
              g.appendChild(txt);

              g.addEventListener('click', (e) => {
                e.stopPropagation();
                if (typeof AppController !== 'undefined' && AppController.instance) {
                  AppController.instance.selectVisualObject({
                    type: `Mindmap Tier ${node.level}`,
                    title: node.text,
                    fields: [
                      { key: 'text', label: 'Branch Topic', type: 'text', value: node.text }
                    ],
                    onSave: (vals) => {
                      const escaped = node.text.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                      const regex = new RegExp(`^(\\s*)${escaped}$`, 'm');
                      MultiDiagramVisualizer.updateCodeLine(regex, `$1${vals.text}`);
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

            rawLines.forEach(line => {
              const titleMatch = line.match(/^title\s+(.+)$/i);
              if (titleMatch) { title = titleMatch[1].trim(); return; }

              if (line.toLowerCase().startsWith('timeline')) return;

              const parts = line.split(':').map(p => p.trim()).filter(Boolean);
              if (parts.length >= 1) {
                const era = parts[0];
                const items = parts.slice(1);
                events.push({ era, items });
              }
            });

            if (events.length === 0) {
              events.push({ era: '2024', items: ['Alpha Launch', 'Prototype'] });
              events.push({ era: '2025', items: ['Beta Release', 'Multi-format'] });
            }

            const titleEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            titleEl.setAttribute('x', '380');
            titleEl.setAttribute('y', '50');
            titleEl.setAttribute('text-anchor', 'middle');
            titleEl.setAttribute('fill', textColor);
            titleEl.setAttribute('font-size', '15px');
            titleEl.setAttribute('font-weight', '700');
            titleEl.textContent = title;
            nodesLayer.appendChild(titleEl);

            const axisY = 180;
            const count = events.length;
            const spacing = Math.max(160, Math.min(240, 750 / (count || 1)));

            const axis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            axis.setAttribute('x1', '60');
            axis.setAttribute('y1', `${axisY}`);
            axis.setAttribute('x2', `${Math.max(700, 80 + count * spacing)}`);
            axis.setAttribute('y2', `${axisY}`);
            axis.setAttribute('stroke', primaryBorder);
            axis.setAttribute('stroke-width', '3');
            edgesLayer.appendChild(axis);

            events.forEach((ev, idx) => {
              const ex = 100 + idx * spacing;

              const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
              dot.setAttribute('cx', `${ex}`);
              dot.setAttribute('cy', `${axisY}`);
              dot.setAttribute('r', '7');
              dot.setAttribute('fill', primaryBorder);
              dot.setAttribute('stroke', cardBg);
              dot.setAttribute('stroke-width', '2');
              nodesLayer.appendChild(dot);

              const eraRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
              eraRect.setAttribute('x', `${ex - 50}`);
              eraRect.setAttribute('y', `${axisY - 45}`);
              eraRect.setAttribute('width', '100');
              eraRect.setAttribute('height', '26');
              eraRect.setAttribute('rx', '13');
              eraRect.setAttribute('fill', primaryFill);
              eraRect.setAttribute('stroke', primaryBorder);
              eraRect.setAttribute('stroke-width', '1.5');
              nodesLayer.appendChild(eraRect);

              const eraTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
              eraTxt.setAttribute('x', `${ex}`);
              eraTxt.setAttribute('y', `${axisY - 32}`);
              eraTxt.setAttribute('text-anchor', 'middle');
              eraTxt.setAttribute('dominant-baseline', 'central');
              eraTxt.setAttribute('fill', primaryText);
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
              cardRect.setAttribute('fill', cardBg);
              cardRect.setAttribute('stroke', isSelTime ? 'var(--selection-color)' : cardBorder);
              if (isSelTime) {
                cardRect.setAttribute('stroke-width', '2.5');
                cardRect.style.filter = selGlow;
              }
              cardG.appendChild(cardRect);

              ev.items.forEach((it, iIdx) => {
                const itemTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                itemTxt.setAttribute('x', `${ex - cardW / 2 + 12}`);
                itemTxt.setAttribute('y', `${axisY + 52 + iIdx * 22}`);
                itemTxt.setAttribute('fill', textColor);
                itemTxt.setAttribute('font-size', '11px');
                itemTxt.textContent = '✔ ' + it;
                cardG.appendChild(itemTxt);
              });

              cardG.addEventListener('click', (e) => {
                e.stopPropagation();
                if (typeof AppController !== 'undefined' && AppController.instance) {
                  AppController.instance.selectVisualObject({
                    type: 'Timeline Milestone',
                    title: ev.era,
                    fields: [
                      { key: 'era', label: 'Era / Year', type: 'text', value: ev.era },
                      { key: 'items', label: 'Milestone Events (Comma Separated)', type: 'text', value: ev.items.join(', ') }
                    ],
                    onSave: (vals) => {
                      const escaped = ev.era.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                      const newItems = vals.items.split(',').map(s => s.trim()).filter(Boolean).join(' : ');
                      const regex = new RegExp(`(${escaped}\\s*:\\s*)[^\n]+`, 'i');
                      MultiDiagramVisualizer.updateCodeLine(regex, `$1${newItems}`);
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
              'quadrant-1': 'Quadrant 1',
              'quadrant-2': 'Quadrant 2',
              'quadrant-3': 'Quadrant 3',
              'quadrant-4': 'Quadrant 4'
            };
            const items = [];
            const colors = ['#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#00BCD4', '#E91E63'];

            rawLines.forEach(line => {
              const titleMatch = line.match(/^title\s+(.+)$/i);
              if (titleMatch) { title = titleMatch[1].trim(); return; }

              const qMatch = line.match(/^quadrant-([1-4])\s+(.+)$/i);
              if (qMatch) {
                qNames[`quadrant-${qMatch[1]}`] = qMatch[2].trim();
                return;
              }

              const itemMatch = line.match(/^"([^"]+)"\s*:\s*\[\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\]/) ||
                                line.match(/^([^:]+)\s*:\s*\[\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\]/);
              if (itemMatch && !line.toLowerCase().startsWith('quadrant') && !line.toLowerCase().startsWith('x-axis') && !line.toLowerCase().startsWith('y-axis')) {
                const name = itemMatch[1].replace(/"/g, '').trim();
                const x = parseFloat(itemMatch[2]);
                const y = parseFloat(itemMatch[3]);
                if (!isNaN(x) && !isNaN(y)) {
                  items.push({ name, x, y, color: colors[items.length % colors.length] });
                }
              }
            });

            if (items.length === 0) {
              items.push({ name: 'Task A', x: 0.8, y: 0.8, color: colors[0] });
              items.push({ name: 'Task B', x: 0.3, y: 0.4, color: colors[1] });
            }

            const matrixX = 140, matrixY = 80, size = 340;
            const halfSize = size / 2;

            // Quadrant 2 (Top-Left - Urgent & Important / Soft Blue)
            const q2Bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            q2Bg.setAttribute('x', `${matrixX}`);
            q2Bg.setAttribute('y', `${matrixY}`);
            q2Bg.setAttribute('width', `${halfSize}`);
            q2Bg.setAttribute('height', `${halfSize}`);
            q2Bg.setAttribute('rx', '6');
            q2Bg.setAttribute('fill', isDark ? 'rgba(33, 150, 243, 0.16)' : '#E3F2FD');
            nodesLayer.appendChild(q2Bg);

            // Quadrant 1 (Top-Right - High Value / Soft Green)
            const q1Bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            q1Bg.setAttribute('x', `${matrixX + halfSize}`);
            q1Bg.setAttribute('y', `${matrixY}`);
            q1Bg.setAttribute('width', `${halfSize}`);
            q1Bg.setAttribute('height', `${halfSize}`);
            q1Bg.setAttribute('rx', '6');
            q1Bg.setAttribute('fill', isDark ? 'rgba(76, 175, 80, 0.16)' : '#E8F5E9');
            nodesLayer.appendChild(q1Bg);

            // Quadrant 3 (Bottom-Left - Low Priority / Soft Orange)
            const q3Bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            q3Bg.setAttribute('x', `${matrixX}`);
            q3Bg.setAttribute('y', `${matrixY + halfSize}`);
            q3Bg.setAttribute('width', `${halfSize}`);
            q3Bg.setAttribute('height', `${halfSize}`);
            q3Bg.setAttribute('rx', '6');
            q3Bg.setAttribute('fill', isDark ? 'rgba(255, 152, 0, 0.14)' : '#FFF3E0');
            nodesLayer.appendChild(q3Bg);

            // Quadrant 4 (Bottom-Right - Low Value / Soft Purple)
            const q4Bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            q4Bg.setAttribute('x', `${matrixX + halfSize}`);
            q4Bg.setAttribute('y', `${matrixY + halfSize}`);
            q4Bg.setAttribute('width', `${halfSize}`);
            q4Bg.setAttribute('height', `${halfSize}`);
            q4Bg.setAttribute('rx', '6');
            q4Bg.setAttribute('fill', isDark ? 'rgba(156, 39, 176, 0.15)' : '#F3E5F5');
            nodesLayer.appendChild(q4Bg);

            // Outer Border
            const bgBorder = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            bgBorder.setAttribute('x', `${matrixX}`);
            bgBorder.setAttribute('y', `${matrixY}`);
            bgBorder.setAttribute('width', `${size}`);
            bgBorder.setAttribute('height', `${size}`);
            bgBorder.setAttribute('rx', '6');
            bgBorder.setAttribute('fill', 'none');
            bgBorder.setAttribute('stroke', cardBorder);
            bgBorder.setAttribute('stroke-width', '1.8');
            nodesLayer.appendChild(bgBorder);

            // Cross Axis Dividers
            const vLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            vLine.setAttribute('x1', `${matrixX + halfSize}`);
            vLine.setAttribute('y1', `${matrixY}`);
            vLine.setAttribute('x2', `${matrixX + halfSize}`);
            vLine.setAttribute('y2', `${matrixY + size}`);
            vLine.setAttribute('stroke', cardBorder);
            vLine.setAttribute('stroke-width', '1.5');
            vLine.setAttribute('stroke-dasharray', '4 4');
            edgesLayer.appendChild(vLine);

            const hLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            hLine.setAttribute('x1', `${matrixX}`);
            hLine.setAttribute('y1', `${matrixY + halfSize}`);
            hLine.setAttribute('x2', `${matrixX + size}`);
            hLine.setAttribute('y2', `${matrixY + halfSize}`);
            hLine.setAttribute('stroke', cardBorder);
            hLine.setAttribute('stroke-width', '1.5');
            hLine.setAttribute('stroke-dasharray', '4 4');
            edgesLayer.appendChild(hLine);

            // Quadrant Header Labels
            const drawQLabel = (text, qx, qy, color) => {
              const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
              t.setAttribute('x', `${qx}`);
              t.setAttribute('y', `${qy}`);
              t.setAttribute('fill', color || textColor);
              t.setAttribute('font-size', '11.5px');
              t.setAttribute('font-weight', '700');
              t.textContent = text;
              nodesLayer.appendChild(t);
            };

            drawQLabel(`⚡ ${qNames['quadrant-2']}`, matrixX + 16, matrixY + 24, isDark ? '#64B5F6' : '#1976D2');
            drawQLabel(`⭐ ${qNames['quadrant-1']}`, matrixX + halfSize + 16, matrixY + 24, isDark ? '#81C784' : '#388E3C');
            drawQLabel(`☕ ${qNames['quadrant-3']}`, matrixX + 16, matrixY + halfSize + 24, isDark ? '#FFB74D' : '#F57C00');
            drawQLabel(`📦 ${qNames['quadrant-4']}`, matrixX + halfSize + 16, matrixY + halfSize + 24, isDark ? '#BA68C8' : '#7B1FA2');

            // Plot Items
            items.forEach(it => {
              const px = matrixX + it.x * size;
              const py = matrixY + (1 - it.y) * size;

              const itemG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
              itemG.style.cursor = 'pointer';

              const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
              circle.setAttribute('cx', `${px}`);
              circle.setAttribute('cy', `${py}`);
              circle.setAttribute('r', '8');
              const isSelQuad = (it.name === selTitle);
              circle.setAttribute('fill', it.color);
              circle.setAttribute('stroke', isSelQuad ? 'var(--selection-color)' : cardBg);
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
                      { key: 'y', label: 'Y Axis (0.0 - 1.0)', type: 'number', step: 0.05, min: 0, max: 1, value: it.y }
                    ],
                    onSave: (vals) => {
                      const escaped = it.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                      const regex = new RegExp(`(["']?)${escaped}(["']?\\s*:\\s*\\[)\\s*[0-9.]+\\s*,\\s*[0-9.]+\\s*\\]`, 'i');
                      MultiDiagramVisualizer.updateCodeLine(regex, `"${vals.name}" : [${vals.x}, ${vals.y}]`);
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

            const drawBox = (name, x, y, color) => {
              const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
              g.style.cursor = 'pointer';

              const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
              rect.setAttribute('x', `${x}`);
              rect.setAttribute('y', `${y}`);
              rect.setAttribute('width', '130');
              rect.setAttribute('height', '45');
              rect.setAttribute('rx', '4');
              const isSelSankey = (name === selTitle);
              rect.setAttribute('fill', color);
              rect.setAttribute('opacity', isSelSankey ? '1' : '0.85');
              if (isSelSankey) {
                rect.setAttribute('stroke', 'var(--selection-color)');
                rect.setAttribute('stroke-width', '3');
                rect.style.filter = selGlow;
              }
              g.appendChild(rect);

              const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
              txt.setAttribute('x', `${x + 65}`);
              txt.setAttribute('y', `${y + 22}`);
              txt.setAttribute('text-anchor', 'middle');
              txt.setAttribute('dominant-baseline', 'central');
              txt.setAttribute('fill', '#FFFFFF');
              txt.setAttribute('font-size', '11.5px');
              txt.setAttribute('font-weight', 'bold');
              txt.textContent = name;
              g.appendChild(txt);

              g.addEventListener('click', (e) => {
                e.stopPropagation();
                if (typeof AppController !== 'undefined' && AppController.instance) {
                  AppController.instance.selectVisualObject({
                    type: 'Sankey Node',
                    title: name,
                    fields: [
                      { key: 'name', label: 'Node Label', type: 'text', value: name }
                    ],
                    onSave: (vals) => {
                      const escaped = name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                      const regex = new RegExp(`^(\\s*)${escaped}(\\s*,)`, 'gm');
                      MultiDiagramVisualizer.updateCodeLine(regex, `$1${vals.name}$2`);
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

              const x1 = sInfo.x + 130;
              const y1 = sInfo.y + 22;
              const x2 = tInfo.x;
              const y2 = tInfo.y + 22;

              const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
              path.setAttribute('d', `M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`);
              path.setAttribute('fill', 'none');
              path.setAttribute('stroke', sInfo.color);
              path.setAttribute('stroke-width', `${Math.max(3, Math.min(24, f.val / 250))}`);
              path.setAttribute('opacity', '0.45');
              edgesLayer.appendChild(path);
            });
            break;
          }
        }
      }
    }
