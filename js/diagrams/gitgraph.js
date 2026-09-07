// --- GIT GRAPH VISUALIZER ---
MultiDiagramVisualizer.register('gitgraph', function(code, nodesLayer, edgesLayer, isDark) {
  const primaryText = isDark ? '#FFFFFF' : '#212121';
  const textColor = isDark ? '#E0E0E0' : '#424242';
  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const cardBorder = isDark ? '#424242' : '#E0E0E0';
  const primaryBorder = isDark ? '#1976D2' : '#0288D1';
  const linkColor = isDark ? '#90CAF9' : '#1976D2';
  const selTitle = (typeof AppController !== 'undefined' && AppController.instance && AppController.instance.selectedVisualObject) ? AppController.instance.selectedVisualObject.title : null;
  const selGlow = 'drop-shadow(0 0 6px rgba(33, 150, 243, 0.8))';


        const rawLines = (code || '').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('%%'));
        const branches = new Map();
        branches.set('main', { name: 'main', color: '#2196F3', y: 120 });
        let activeBranch = 'main';
        const branchColors = ['#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#00BCD4', '#E91E63', '#673AB7'];
        let branchCount = 1;
        const commits = [];

        rawLines.forEach(line => {
          if (line.toLowerCase().startsWith('gitgraph')) return;

          const brMatch = line.match(/^branch\s+([A-Za-z0-9_\/\-]+)/i);
          if (brMatch) {
            const bName = brMatch[1];
            if (!branches.has(bName)) {
              branches.set(bName, {
                name: bName,
                color: branchColors[branchCount % branchColors.length],
                y: 120 + branchCount * 65
              });
              branchCount++;
            }
            activeBranch = bName;
            return;
          }

          const coMatch = line.match(/^checkout\s+([A-Za-z0-9_\/\-]+)/i);
          if (coMatch) {
            activeBranch = coMatch[1];
            return;
          }

          const mergeMatch = line.match(/^merge\s+([A-Za-z0-9_\/\-]+)(?:\s+id:\s*["']?([^"']+)["']?)?(?:\s+tag:\s*["']?([^"']+)["']?)?/i);
          if (mergeMatch) {
            const fromBranch = mergeMatch[1];
            const id = mergeMatch[2] || `Merge ${fromBranch}`;
            const tag = mergeMatch[3];
            const bInfo = branches.get(activeBranch) || { color: '#2196F3', y: 120 };
            commits.push({
              id,
              tag,
              branch: activeBranch,
              isMerge: true,
              mergeFrom: fromBranch,
              color: MultiDiagramVisualizer.getColor(id, '#9C27B0'),
              fontColor: MultiDiagramVisualizer.getColor(`${id}_font`, textColor)
            });
            return;
          }

          const commitMatch = line.match(/^commit(?:\s+id:\s*["']?([^"']+)["']?)?(?:\s+tag:\s*["']?([^"']+)["']?)?/i);
          if (commitMatch) {
            const id = commitMatch[1] || `c${commits.length + 1}`;
            const tag = commitMatch[2];
            const bInfo = branches.get(activeBranch) || { color: '#2196F3', y: 120 };
            commits.push({
              id,
              tag,
              branch: activeBranch,
              isMerge: false,
              color: MultiDiagramVisualizer.getColor(id, bInfo.color),
              fontColor: MultiDiagramVisualizer.getColor(`${id}_font`, textColor)
            });
          }
        });

        if (commits.length === 0) {
          commits.push({ id: 'Initial Commit', branch: 'main', color: '#2196F3', fontColor: textColor });
          commits.push({ id: 'Feature Setup', branch: 'main', color: '#2196F3', fontColor: textColor });
        }

        const totalWidth = Math.max(700, commits.length * 105 + 140);

        // Title
        const titleEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        titleEl.setAttribute('x', '40');
        titleEl.setAttribute('y', '45');
        titleEl.setAttribute('fill', primaryText);
        titleEl.setAttribute('font-size', '15px');
        titleEl.setAttribute('font-weight', 'bold');
        titleEl.textContent = 'Git Version Graph';
        nodesLayer.appendChild(titleEl);

        // Draw Branch Tracks & Badges
        branches.forEach(b => {
          const track = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          track.setAttribute('x1', '120');
          track.setAttribute('y1', `${b.y}`);
          track.setAttribute('x2', `${totalWidth - 30}`);
          track.setAttribute('y2', `${b.y}`);
          track.setAttribute('stroke', b.color);
          track.setAttribute('stroke-width', '3');
          track.setAttribute('opacity', '0.4');
          edgesLayer.appendChild(track);

          const bBadge = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          bBadge.style.cursor = 'pointer';
          const bNameLen = b.name.length * 7 + 18;

          const bRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          bRect.setAttribute('x', `${110 - bNameLen}`);
          bRect.setAttribute('y', `${b.y - 12}`);
          bRect.setAttribute('width', `${bNameLen}`);
          bRect.setAttribute('height', '24');
          bRect.setAttribute('rx', '12');
          bRect.setAttribute('fill', b.color);
          bRect.setAttribute('opacity', '0.9');
          bBadge.appendChild(bRect);

          const bText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          bText.setAttribute('x', `${110 - bNameLen / 2}`);
          bText.setAttribute('y', `${b.y + 4}`);
          bText.setAttribute('text-anchor', 'middle');
          bText.setAttribute('fill', '#FFFFFF');
          bText.setAttribute('font-size', '11px');
          bText.setAttribute('font-weight', 'bold');
          bText.textContent = b.name;
          bBadge.appendChild(bText);

          nodesLayer.appendChild(bBadge);
        });

        // Draw Commit Connectors (sequential commit links)
        const commitPositions = [];
        commits.forEach((c, idx) => {
          const x = 140 + idx * 95;
          const bInfo = branches.get(c.branch) || { y: 120, color: '#2196F3' };
          const y = bInfo.y;
          commitPositions.push({ x, y, branch: c.branch, isMerge: c.isMerge, mergeFrom: c.mergeFrom });

          if (idx > 0) {
            const prev = commitPositions[idx - 1];
            const prevId = commits[idx - 1].id;
            const connKey = `gitconn_${prevId}_to_${c.id}`;
            const connTitle = `${prevId} → ${c.id}`;
            const isConnSel = (selTitle === connTitle || selTitle === connKey);
            // A same-branch hop is a straight run; a branch switch curves across.
            const defaultConn = prev.branch === c.branch ? 'straight' : 'curve';
            const connStyle = Utils.normalizeConnector(MultiDiagramVisualizer.getColor(`${connKey}_conn`, defaultConn), defaultConn);
            const connColor = MultiDiagramVisualizer.getColor(connKey, bInfo.color);
            const connWidth = MultiDiagramVisualizer.getColor(`${connKey}_width`, '3');
            const connD = Utils.buildConnectorPath(prev.x, prev.y, x, y, connStyle, { orientation: 'h', minCurve: 35, maxCurve: 60 });

            const connG = document.createElementNS('http://www.w3.org/2000/svg', 'g');

            const connHit = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            connHit.setAttribute('d', connD);
            connHit.setAttribute('stroke', 'transparent');
            connHit.setAttribute('stroke-width', '20');
            connHit.setAttribute('fill', 'none');
            connHit.style.cursor = 'pointer';
            connG.appendChild(connHit);

            const conn = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            conn.setAttribute('d', connD);
            conn.setAttribute('stroke', isConnSel ? 'var(--selection-color)' : connColor);
            conn.setAttribute('stroke-width', isConnSel ? `${parseFloat(connWidth) + 1.5}` : connWidth);
            conn.setAttribute('fill', 'none');
            if (isConnSel) conn.style.filter = selGlow;
            connG.appendChild(conn);

            connG.addEventListener('mousedown', (e) => e.stopPropagation());
            connG.addEventListener('click', (e) => {
              e.stopPropagation();
              if (typeof AppController !== 'undefined' && AppController.instance) {
                AppController.instance.selectVisualObject({
                  type: 'Git Commit Link',
                  title: connTitle,
                  fields: [
                    // The commit chain's order comes from the source itself, so the ends
                    // are shown for orientation rather than as reconnect controls.
                    { key: 'from', label: 'From (Previous Commit)', type: 'select', value: prevId, options: [{ value: prevId, label: prevId }] },
                    { key: 'to', label: 'To (This Commit)', type: 'select', value: c.id, options: [{ value: c.id, label: c.id }] },
                    { key: 'color', label: 'Connector Color', type: 'color', value: connColor },
                    { key: 'width', label: 'Line Thickness', type: 'select', value: connWidth, options: [
                        { value: '1.5', label: 'Thin (1.5px)' },
                        { value: '3', label: 'Medium (3px - Default)' },
                        { value: '4', label: 'Thick (4px)' },
                        { value: '5', label: 'Heavy (5px)' }
                    ]},
                    { key: 'connector', label: 'Connector / Line Routing', type: 'select', value: connStyle, options: Utils.CONNECTOR_OPTIONS }
                  ],
                  onSave: (vals) => {
                    MultiDiagramVisualizer.setColor(connKey, vals.color);
                    MultiDiagramVisualizer.setColor(`${connKey}_width`, vals.width);
                    MultiDiagramVisualizer.setColor(`${connKey}_conn`, vals.connector);
                    MultiDiagramVisualizer.syncColorToCode(connKey, vals.color);
                  }
                });
              }
            });

            edgesLayer.appendChild(connG);
          }

          // If merge, draw merge curve from merged branch
          if (c.isMerge && c.mergeFrom) {
            const fromBranchInfo = branches.get(c.mergeFrom);
            if (fromBranchInfo) {
              const mergeKey = `gitmerge_${c.mergeFrom}_to_${c.id}`;
              const mergeTitle = `merge ${c.mergeFrom} → ${c.id}`;
              const isMergeSel = (selTitle === mergeTitle || selTitle === mergeKey);
              const mergeStyle = Utils.normalizeConnector(MultiDiagramVisualizer.getColor(`${mergeKey}_conn`, 'curve'), 'curve');
              const mergeColor = MultiDiagramVisualizer.getColor(mergeKey, fromBranchInfo.color);
              const mergeWidth = MultiDiagramVisualizer.getColor(`${mergeKey}_width`, '2.5');
              const mergeD = Utils.buildConnectorPath(x - 70, fromBranchInfo.y, x, y, mergeStyle, { orientation: 'h', minCurve: 35, maxCurve: 50 });

              const mergeG = document.createElementNS('http://www.w3.org/2000/svg', 'g');

              const mergeHit = document.createElementNS('http://www.w3.org/2000/svg', 'path');
              mergeHit.setAttribute('d', mergeD);
              mergeHit.setAttribute('stroke', 'transparent');
              mergeHit.setAttribute('stroke-width', '20');
              mergeHit.setAttribute('fill', 'none');
              mergeHit.style.cursor = 'pointer';
              mergeG.appendChild(mergeHit);

              const mergeLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
              mergeLine.setAttribute('d', mergeD);
              mergeLine.setAttribute('stroke', isMergeSel ? 'var(--selection-color)' : mergeColor);
              mergeLine.setAttribute('stroke-width', isMergeSel ? `${parseFloat(mergeWidth) + 1.5}` : mergeWidth);
              mergeLine.setAttribute('stroke-dasharray', '4,3');
              mergeLine.setAttribute('fill', 'none');
              if (isMergeSel) mergeLine.style.filter = selGlow;
              mergeG.appendChild(mergeLine);

              mergeG.addEventListener('mousedown', (e) => e.stopPropagation());
              mergeG.addEventListener('click', (e) => {
                e.stopPropagation();
                if (typeof AppController !== 'undefined' && AppController.instance) {
                  const branchOptions = Array.from(branches.keys()).map(b => ({ value: b, label: b }));
                  AppController.instance.selectVisualObject({
                    type: 'Git Merge Link',
                    title: mergeTitle,
                    fields: [
                      { key: 'from', label: 'From (Merged Branch)', type: 'select', value: c.mergeFrom, options: branchOptions },
                      { key: 'to', label: 'To (Target Branch)', type: 'select', value: c.branch, options: branchOptions },
                      { key: 'color', label: 'Merge Line Color', type: 'color', value: mergeColor },
                      { key: 'width', label: 'Line Thickness', type: 'select', value: mergeWidth, options: [
                          { value: '1.5', label: 'Thin (1.5px)' },
                          { value: '2.5', label: 'Medium (2.5px - Default)' },
                          { value: '3.5', label: 'Thick (3.5px)' },
                          { value: '4.5', label: 'Heavy (4.5px)' }
                      ]},
                      { key: 'connector', label: 'Connector / Line Routing', type: 'select', value: mergeStyle, options: Utils.CONNECTOR_OPTIONS }
                    ],
                    onSave: (vals) => {
                      const newFrom = vals.from || c.mergeFrom;
                      const newKey = `gitmerge_${newFrom}_to_${c.id}`;
                      MultiDiagramVisualizer.setColor(newKey, vals.color);
                      MultiDiagramVisualizer.setColor(`${newKey}_width`, vals.width);
                      MultiDiagramVisualizer.setColor(`${newKey}_conn`, vals.connector);
                      MultiDiagramVisualizer.syncColorToCode(newKey, vals.color);
                      // Both ends are real source edits: the merged branch is the `merge`
                      // line's argument, the target branch is the `checkout` before it.
                      if (newFrom !== c.mergeFrom || (vals.to && vals.to !== c.branch)) {
                        MultiDiagramVisualizer.updateCodeLine((curCode) => {
                          const lines = curCode.split('\n');
                          const mergeIdx = lines.findIndex(l => new RegExp(`^\\s*merge\\s+${c.mergeFrom}\\b`, 'i').test(l));
                          if (mergeIdx === -1) return curCode;
                          const lead = lines[mergeIdx].match(/^(\s*)/)[1] || '  ';
                          lines[mergeIdx] = `${lead}merge ${newFrom}`;
                          if (vals.to && vals.to !== c.branch) {
                            for (let i = mergeIdx - 1; i >= 0; i--) {
                              if (/^\s*checkout\s+/i.test(lines[i])) {
                                const cLead = lines[i].match(/^(\s*)/)[1] || '  ';
                                lines[i] = `${cLead}checkout ${vals.to}`;
                                break;
                              }
                            }
                          }
                          return lines.join('\n');
                        });
                      }
                    }
                  });
                }
              });

              edgesLayer.appendChild(mergeG);
            }
          }
        });

        // Draw Commits Nodes & Badges
        commits.forEach((c, idx) => {
          const { x, y } = commitPositions[idx];

          const commitG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          commitG.style.cursor = 'pointer';

          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttribute('cx', `${x}`);
          circle.setAttribute('cy', `${y}`);
          circle.setAttribute('r', c.isMerge ? '12' : '10');
          const isSelGit = (c.id === selTitle);
          // Pastel body, full-strength branch colour on the rim.
          const commitFill = MultiDiagramVisualizer.getColor(`${c.id}_fill`, Utils.toPastel(c.color, isDark));
          const commitBorder = MultiDiagramVisualizer.getColor(`${c.id}_border`, c.color);
          circle.setAttribute('fill', commitFill);
          circle.setAttribute('stroke', isSelGit ? 'var(--selection-color)' : commitBorder);
          circle.setAttribute('stroke-width', isSelGit ? '3.5' : '2.5');
          if (isSelGit) circle.style.filter = selGlow;
          commitG.appendChild(circle);

          if (c.isMerge) {
            const innerC = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            innerC.setAttribute('cx', `${x}`);
            innerC.setAttribute('cy', `${y}`);
            innerC.setAttribute('r', '5');
            innerC.setAttribute('fill', commitBorder);
            commitG.appendChild(innerC);
          }

          // Commit message text
          const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          txt.setAttribute('x', `${x}`);
          txt.setAttribute('y', `${y + 25}`);
          txt.setAttribute('text-anchor', 'middle');
          txt.setAttribute('fill', c.fontColor || textColor);
          txt.setAttribute('font-size', '10px');
          txt.setAttribute('font-weight', '500');
          txt.textContent = c.id;
          commitG.appendChild(txt);

          // Release Tag
          if (c.tag) {
            const tagG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            const tagW = c.tag.length * 6.5 + 24;
            const tagRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
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
                  { key: 'tag', label: 'Release Tag (Optional)', type: 'text', value: c.tag || '' },
                  { key: 'color', label: 'Commit Base Color', type: 'color', value: c.color },
                  { key: 'font', label: '1. Label Font Color', type: 'color', value: c.fontColor || textColor },
                  { key: 'fill', label: '2. Node Fill Color (Pastel)', type: 'color', value: commitFill },
                  { key: 'border', label: '3. Node Border / Stroke Color', type: 'color', value: commitBorder }
                ],
                onSave: (vals) => {
                  MultiDiagramVisualizer.setColor(vals.id, vals.color);
                  MultiDiagramVisualizer.setColor(`${vals.id}_font`, vals.font);
                  MultiDiagramVisualizer.setColor(`${vals.id}_fill`, vals.fill);
                  MultiDiagramVisualizer.setColor(`${vals.id}_border`, vals.border);
                  MultiDiagramVisualizer.syncColorToCode(vals.id, vals.color);
                  MultiDiagramVisualizer.syncColorToCode(`${vals.id}_fill`, vals.fill);
                  MultiDiagramVisualizer.syncColorToCode(`${vals.id}_border`, vals.border);
                  MultiDiagramVisualizer.updateCodeLine((curCode) => {
                    const lines = curCode.split('\n');
                    const esc = c.id.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                    const idx = lines.findIndex(l => new RegExp(`(?:commit|merge)\\s+.*?id:\\s*["']?${esc}["']?`, 'i').test(l.trim()));
                    if (idx !== -1) {
                      const lead = lines[idx].match(/^(\s*)/)[1] || '  ';
                      const tagPart = vals.tag ? ` tag: "${vals.tag}"` : '';
                      if (lines[idx].trim().startsWith('merge')) {
                        const mBranch = lines[idx].trim().match(/^merge\s+([A-Za-z0-9_\/\-]+)/i)[1];
                        lines[idx] = `${lead}merge ${mBranch} id: "${vals.id}"${tagPart}`;
                      } else {
                        lines[idx] = `${lead}commit id: "${vals.id}"${tagPart}`;
                      }
                    }
                    return lines.join('\n');
                  });
                }
              });
            }
          });

          nodesLayer.appendChild(commitG);
        });
});
MultiDiagramVisualizer.register('gitGraph', MultiDiagramVisualizer.renderers.get('gitgraph'));
