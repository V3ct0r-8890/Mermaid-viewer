// --- DEDICATED MULTI-DIAGRAM VISUAL SUITE ---
    class MultiDiagramVisualizer {
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
              const boxW = Math.max(100, p.name.length * 8 + 24);
              const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
              rect.setAttribute('x', `${p.x - boxW / 2}`);
              rect.setAttribute('y', `${topY}`);
              rect.setAttribute('width', `${boxW}`);
              rect.setAttribute('height', '36');
              rect.setAttribute('rx', p.isActor ? '18' : '4');
              rect.setAttribute('fill', primaryFill);
              rect.setAttribute('stroke', primaryBorder);
              rect.setAttribute('stroke-width', '1.8');
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
              const midX = (x1 + x2) / 2;
              const badgeTextStr = autoNumber ? `${idx + 1}. ${m.text}` : m.text;
              const badgeW = badgeTextStr.length * 6.8 + 24;
              const badgeBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
              badgeBg.setAttribute('x', `${midX - badgeW / 2}`);
              badgeBg.setAttribute('y', `${y - 18}`);
              badgeBg.setAttribute('width', `${badgeW}`);
              badgeBg.setAttribute('height', '18');
              badgeBg.setAttribute('rx', '4');
              badgeBg.setAttribute('fill', cardBg);
              badgeBg.setAttribute('stroke', cardBorder);
              badgeBg.setAttribute('stroke-width', '1');
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
              path.setAttribute('fill', d.color);
              path.setAttribute('stroke', cardBg);
              path.setAttribute('stroke-width', '2');
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
                if (tIdx % 2 === 1) {
                  const rowBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                  rowBg.setAttribute('x', '30');
                  rowBg.setAttribute('y', `${curY}`);
                  rowBg.setAttribute('width', `${timelineX + timelineW - 30}`);
                  rowBg.setAttribute('height', `${rowH - 4}`);
                  rowBg.setAttribute('rx', '3');
                  rowBg.setAttribute('fill', isDark ? '#1F2224' : '#FAFAFA');
                  nodesLayer.appendChild(rowBg);
                }

                // Task Name
                const tTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                tTxt.setAttribute('x', '65');
                tTxt.setAttribute('y', `${curY + 18}`);
                tTxt.setAttribute('fill', textColor);
                tTxt.setAttribute('font-size', '11.5px');
                tTxt.setAttribute('font-weight', '500');
                tTxt.textContent = t.name;
                nodesLayer.appendChild(tTxt);

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
                  nodesLayer.appendChild(mDia);

                  const mTag = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                  mTag.setAttribute('x', `${mx + 14}`);
                  mTag.setAttribute('y', `${my + 4}`);
                  mTag.setAttribute('fill', t.color);
                  mTag.setAttribute('font-size', '10px');
                  mTag.setAttribute('font-weight', 'bold');
                  mTag.textContent = 'Milestone';
                  nodesLayer.appendChild(mTag);
                } else {
                  const bar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                  bar.setAttribute('x', `${bx}`);
                  bar.setAttribute('y', `${curY + 6}`);
                  bar.setAttribute('width', `${bw}`);
                  bar.setAttribute('height', '18');
                  bar.setAttribute('rx', '4');
                  bar.setAttribute('fill', t.color);
                  nodesLayer.appendChild(bar);

                  const durText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                  durText.setAttribute('x', bw > 30 ? `${bx + bw / 2}` : `${bx + bw + 6}`);
                  durText.setAttribute('y', `${curY + 19}`);
                  durText.setAttribute('text-anchor', bw > 30 ? 'middle' : 'start');
                  durText.setAttribute('fill', bw > 30 ? '#FFFFFF' : textColor);
                  durText.setAttribute('font-size', '10px');
                  durText.setAttribute('font-weight', '600');
                  durText.textContent = `${t.dur}d`;
                  nodesLayer.appendChild(durText);
                }

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

            rawLines.forEach((line, idx) => {
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
              const chMatch = line.match(/^checkout\s+([A-Za-z0-9_-]+)/i);
              if (chMatch) {
                curBranch = chMatch[1];
                return;
              }
              const mMatch = line.match(/^merge\s+([A-Za-z0-9_-]+)/i);
              if (mMatch) {
                const targetB = curBranch;
                const sourceB = mMatch[1];
                commits.push({ type: 'merge', sourceB, targetB, id: `Merge ${sourceB}`, tag: null });
                return;
              }
              const cMatch = line.match(/^commit(?:\s+id:\s*"([^"]+)")?(?:\s+tag:\s*"([^"]+)")?/i);
              if (cMatch || line.startsWith('commit')) {
                const id = (cMatch && cMatch[1]) ? cMatch[1] : `c${commits.length + 1}`;
                const tag = (cMatch && cMatch[2]) ? cMatch[2] : null;
                commits.push({ type: 'commit', branch: curBranch, id, tag });
              }
            });

            if (commits.length === 0) {
              commits.push({ type: 'commit', branch: 'main', id: 'init', tag: 'v0.1' });
              commits.push({ type: 'commit', branch: 'main', id: 'feat', tag: null });
            }

            branches.forEach(b => {
              const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
              line.setAttribute('x1', '60');
              line.setAttribute('y1', `${b.y}`);
              line.setAttribute('x2', `${Math.max(600, 100 + commits.length * 80)}`);
              line.setAttribute('y2', `${b.y}`);
              line.setAttribute('stroke', b.color);
              line.setAttribute('stroke-width', '3');
              line.setAttribute('opacity', '0.35');
              edgesLayer.appendChild(line);

              const lbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
              lbl.setAttribute('x', '45');
              lbl.setAttribute('y', `${b.y + 4}`);
              lbl.setAttribute('text-anchor', 'end');
              lbl.setAttribute('fill', b.color);
              lbl.setAttribute('font-size', '11.5px');
              lbl.setAttribute('font-weight', 'bold');
              lbl.textContent = b.name;
              nodesLayer.appendChild(lbl);
            });

            commits.forEach((c, idx) => {
              const cx = 100 + idx * 75;
              const bObj = branches.find(b => b.name === (c.branch || c.targetB)) || branches[0];
              const cy = bObj.y;

              if (c.type === 'merge') {
                const srcB = branches.find(b => b.name === c.sourceB) || branches[0];
                const arc = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                arc.setAttribute('d', `M ${cx - 50} ${srcB.y} C ${cx - 20} ${srcB.y}, ${cx - 20} ${cy}, ${cx} ${cy}`);
                arc.setAttribute('fill', 'none');
                arc.setAttribute('stroke', srcB.color);
                arc.setAttribute('stroke-width', '2.5');
                edgesLayer.appendChild(arc);
              }

              const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
              dot.setAttribute('cx', `${cx}`);
              dot.setAttribute('cy', `${cy}`);
              dot.setAttribute('r', '8');
              dot.setAttribute('fill', bObj.color);
              dot.setAttribute('stroke', '#FFFFFF');
              dot.setAttribute('stroke-width', '2');
              nodesLayer.appendChild(dot);

              const idTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
              idTxt.setAttribute('x', `${cx}`);
              idTxt.setAttribute('y', `${cy + 22}`);
              idTxt.setAttribute('text-anchor', 'middle');
              idTxt.setAttribute('fill', textColor);
              idTxt.setAttribute('font-size', '10px');
              idTxt.textContent = c.id;
              nodesLayer.appendChild(idTxt);

              if (c.tag) {
                const tagG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                const tagW = c.tag.length * 6.5 + 14;
                const tagBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                tagBg.setAttribute('x', `${cx - tagW / 2}`);
                tagBg.setAttribute('y', `${cy - 28}`);
                tagBg.setAttribute('width', `${tagW}`);
                tagBg.setAttribute('height', '16');
                tagBg.setAttribute('rx', '3');
                tagBg.setAttribute('fill', '#FF9800');
                tagG.appendChild(tagBg);

                const tagTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                tagTxt.setAttribute('x', `${cx}`);
                tagTxt.setAttribute('y', `${cy - 18}`);
                tagTxt.setAttribute('text-anchor', 'middle');
                tagTxt.setAttribute('fill', '#FFFFFF');
                tagTxt.setAttribute('font-size', '9.5px');
                tagTxt.setAttribute('font-weight', 'bold');
                tagTxt.textContent = c.tag;
                tagG.appendChild(tagTxt);
                nodesLayer.appendChild(tagG);
              }
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
                const card = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                card.setAttribute('x', `${x}`);
                card.setAttribute('y', `${ty}`);
                card.setAttribute('width', `${stageW - 16}`);
                card.setAttribute('height', '80');
                card.setAttribute('rx', '6');
                card.setAttribute('fill', cardBg);
                card.setAttribute('stroke', cardBorder);
                nodesLayer.appendChild(card);

                const tName = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                tName.setAttribute('x', `${x + 10}`);
                tName.setAttribute('y', `${ty + 20}`);
                tName.setAttribute('fill', primaryText);
                tName.setAttribute('font-size', '11.5px');
                tName.setAttribute('font-weight', '600');
                tName.textContent = t.name;
                nodesLayer.appendChild(tName);

                const emoji = emojis[t.score] || '🙂';
                const tScore = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                tScore.setAttribute('x', `${x + 10}`);
                tScore.setAttribute('y', `${ty + 44}`);
                tScore.setAttribute('fill', textColor);
                tScore.setAttribute('font-size', '11px');
                tScore.textContent = `${emoji} Satisfaction: ${t.score}/5`;
                nodesLayer.appendChild(tScore);

                const tActor = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                tActor.setAttribute('x', `${x + 10}`);
                tActor.setAttribute('y', `${ty + 64}`);
                tActor.setAttribute('fill', linkColor);
                tActor.setAttribute('font-size', '10px');
                tActor.textContent = `👤 ${t.actor}`;
                nodesLayer.appendChild(tActor);
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
            const rootEl = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rootEl.setAttribute('x', `${rootNode.x - rootNode.width / 2}`);
            rootEl.setAttribute('y', `${rootNode.y - rootNode.height / 2}`);
            rootEl.setAttribute('width', `${rootNode.width}`);
            rootEl.setAttribute('height', `${rootNode.height}`);
            rootEl.setAttribute('rx', rootNode.shape === 'circle' ? `${rootNode.height / 2}` : '8');
            rootEl.setAttribute('fill', primaryFill);
            rootEl.setAttribute('stroke', primaryBorder);
            rootEl.setAttribute('stroke-width', '2.5');
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
              const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
              rect.setAttribute('x', `${node.x - node.width / 2}`);
              rect.setAttribute('y', `${node.y - node.height / 2}`);
              rect.setAttribute('width', `${node.width}`);
              rect.setAttribute('height', `${node.height}`);
              rect.setAttribute('rx', node.level === 1 ? '6' : '4');
              rect.setAttribute('fill', node.level === 1 ? cardBg : (isDark ? '#232527' : '#F8F9FA'));
              rect.setAttribute('stroke', node.level === 1 ? primaryBorder : cardBorder);
              rect.setAttribute('stroke-width', node.level === 1 ? '1.5' : '1');
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
            let title = 'Timeline';
            const events = [];

            rawLines.forEach(line => {
              const titleMatch = line.match(/^title\s+(.+)$/i);
              if (titleMatch) { title = titleMatch[1].trim(); return; }
              if (line.toLowerCase().startsWith('timeline')) return;

              const parts = line.split(':').map(p => p.trim());
              if (parts.length >= 2) {
                const year = parts[0];
                const items = parts.slice(1).filter(Boolean);
                events.push({ year, items });
              }
            });

            if (events.length === 0) {
              events.push({ year: '2024', items: ['Phase 1', 'Kickoff'] });
              events.push({ year: '2025', items: ['Phase 2', 'Rollout'] });
            }

            const count = events.length;
            const spacing = Math.max(180, Math.min(260, 700 / (count || 1)));
            const axisY = 200;

            const titleEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            titleEl.setAttribute('x', '380');
            titleEl.setAttribute('y', '45');
            titleEl.setAttribute('text-anchor', 'middle');
            titleEl.setAttribute('fill', textColor);
            titleEl.setAttribute('font-size', '15px');
            titleEl.setAttribute('font-weight', '700');
            titleEl.textContent = title;
            nodesLayer.appendChild(titleEl);

            const axisLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            axisLine.setAttribute('x1', '60');
            axisLine.setAttribute('y1', `${axisY}`);
            axisLine.setAttribute('x2', `${60 + count * spacing}`);
            axisLine.setAttribute('y2', `${axisY}`);
            axisLine.setAttribute('stroke', primaryBorder);
            axisLine.setAttribute('stroke-width', '3');
            edgesLayer.appendChild(axisLine);

            events.forEach((ev, idx) => {
              const ex = 100 + idx * spacing;
              const circ = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
              circ.setAttribute('cx', `${ex}`);
              circ.setAttribute('cy', `${axisY}`);
              circ.setAttribute('r', '10');
              circ.setAttribute('fill', primaryFill);
              circ.setAttribute('stroke', primaryBorder);
              circ.setAttribute('stroke-width', '3');
              nodesLayer.appendChild(circ);

              const badgeG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
              const badgeW = Math.max(60, ev.year.length * 8 + 20);
              const badgeBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
              badgeBg.setAttribute('x', `${ex - badgeW / 2}`);
              badgeBg.setAttribute('y', `${axisY - 45}`);
              badgeBg.setAttribute('width', `${badgeW}`);
              badgeBg.setAttribute('height', '24');
              badgeBg.setAttribute('rx', '12');
              badgeBg.setAttribute('fill', '#2196F3');
              badgeG.appendChild(badgeBg);

              const badgeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
              badgeText.setAttribute('x', `${ex}`);
              badgeText.setAttribute('y', `${axisY - 33}`);
              badgeText.setAttribute('text-anchor', 'middle');
              badgeText.setAttribute('dominant-baseline', 'central');
              badgeText.setAttribute('fill', '#FFFFFF');
              badgeText.setAttribute('font-size', '11.5px');
              badgeText.setAttribute('font-weight', 'bold');
              badgeText.textContent = ev.year;
              badgeG.appendChild(badgeText);
              nodesLayer.appendChild(badgeG);

              const cardG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
              const cardW = Math.max(140, spacing - 30);
              const cardH = Math.max(60, 26 + ev.items.length * 22);
              const cardRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
              cardRect.setAttribute('x', `${ex - cardW / 2}`);
              cardRect.setAttribute('y', `${axisY + 30}`);
              cardRect.setAttribute('width', `${cardW}`);
              cardRect.setAttribute('height', `${cardH}`);
              cardRect.setAttribute('rx', '6');
              cardRect.setAttribute('fill', cardBg);
              cardRect.setAttribute('stroke', cardBorder);
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
              items.push({ name: 'Task A', x: 0.75, y: 0.85, color: colors[0] });
              items.push({ name: 'Task B', x: 0.30, y: 0.40, color: colors[1] });
            }

            const ox = 120, oy = 70, qw = 220, qh = 160;

            const titleEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            titleEl.setAttribute('x', `${ox + qw}`);
            titleEl.setAttribute('y', '45');
            titleEl.setAttribute('text-anchor', 'middle');
            titleEl.setAttribute('fill', textColor);
            titleEl.setAttribute('font-size', '15px');
            titleEl.setAttribute('font-weight', '700');
            titleEl.textContent = title;
            nodesLayer.appendChild(titleEl);

            const quads = [
              { name: qNames['quadrant-2'], rx: ox, ry: oy, bg: 'rgba(244, 67, 54, 0.08)' },
              { name: qNames['quadrant-1'], rx: ox + qw, ry: oy, bg: 'rgba(33, 150, 243, 0.08)' },
              { name: qNames['quadrant-3'], rx: ox, ry: oy + qh, bg: 'rgba(158, 158, 158, 0.08)' },
              { name: qNames['quadrant-4'], rx: ox + qw, ry: oy + qh, bg: 'rgba(76, 175, 80, 0.08)' }
            ];

            quads.forEach(q => {
              const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
              rect.setAttribute('x', `${q.rx}`);
              rect.setAttribute('y', `${q.ry}`);
              rect.setAttribute('width', `${qw}`);
              rect.setAttribute('height', `${qh}`);
              rect.setAttribute('fill', q.bg);
              rect.setAttribute('stroke', cardBorder);
              rect.setAttribute('stroke-width', '1');
              nodesLayer.appendChild(rect);

              const lbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
              lbl.setAttribute('x', `${q.rx + 10}`);
              lbl.setAttribute('y', `${q.ry + 20}`);
              lbl.setAttribute('fill', linkColor);
              lbl.setAttribute('font-size', '11px');
              lbl.setAttribute('font-weight', '600');
              lbl.textContent = q.name;
              nodesLayer.appendChild(lbl);
            });

            items.forEach(it => {
              const px = ox + it.x * (qw * 2);
              const py = oy + (1 - it.y) * (qh * 2);

              const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
              dot.setAttribute('cx', `${px}`);
              dot.setAttribute('cy', `${py}`);
              dot.setAttribute('r', '6');
              dot.setAttribute('fill', it.color);
              dot.setAttribute('stroke', '#FFFFFF');
              dot.setAttribute('stroke-width', '1.5');
              nodesLayer.appendChild(dot);

              const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
              txt.setAttribute('x', `${px + 8}`);
              txt.setAttribute('y', `${py + 4}`);
              txt.setAttribute('fill', textColor);
              txt.setAttribute('font-size', '11px');
              txt.setAttribute('font-weight', '500');
              txt.textContent = it.name;
              nodesLayer.appendChild(txt);
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
              const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
              rect.setAttribute('x', `${x}`);
              rect.setAttribute('y', `${y}`);
              rect.setAttribute('width', '130');
              rect.setAttribute('height', '45');
              rect.setAttribute('rx', '4');
              rect.setAttribute('fill', color);
              rect.setAttribute('opacity', '0.85');
              nodesLayer.appendChild(rect);

              const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
              txt.setAttribute('x', `${x + 65}`);
              txt.setAttribute('y', `${y + 22}`);
              txt.setAttribute('text-anchor', 'middle');
              txt.setAttribute('dominant-baseline', 'central');
              txt.setAttribute('fill', '#FFFFFF');
              txt.setAttribute('font-size', '11.5px');
              txt.setAttribute('font-weight', 'bold');
              txt.textContent = name;
              nodesLayer.appendChild(txt);
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