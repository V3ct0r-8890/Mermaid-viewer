// --- DEDICATED MULTI-DIAGRAM VISUAL SUITE (UNIFIED THEME & DEDICATED CONFIGS) ---
class MultiDiagramVisualizer {
  static customColors = new Map();

  static getColor(key, fallback) {
    if (!key) return fallback;
    const cleanKey = String(key).replace(/^["']|["']$/g, '').trim();
    return MultiDiagramVisualizer.customColors.get(cleanKey) || fallback;
  }

  static setColor(key, color) {
    if (key && color) {
      const cleanKey = String(key).replace(/^["']|["']$/g, '').trim();
      MultiDiagramVisualizer.customColors.set(cleanKey, color);
    }
  }

  static parseColorDirectives(code) {
    if (!code) return;
    const matches = code.matchAll(/%%\s*@color:\s*([^=\n]+)\s*=\s*(#[A-Fa-f0-9]{3,8})/g);
    for (const m of matches) {
      const key = m[1].trim();
      const color = m[2].trim();
      MultiDiagramVisualizer.customColors.set(key, color);
    }
  }

  static syncColorToCode(key, color) {
    const app = (typeof AppController !== 'undefined' && AppController.instance) ? AppController.instance : null;
    if (!app || !app.codeEditor) return;
    const cleanKey = String(key).replace(/^["']|["']$/g, '').trim();
    let curCode = app.codeEditor.value;
    const colorDir = `%% @color: ${cleanKey} = ${color}`;
    const escapedKey = cleanKey.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const reg = new RegExp(`^%%\\s*@color:\\s*${escapedKey}\\s*=[^\\n]*$`, 'm');

    if (reg.test(curCode)) {
      curCode = curCode.replace(reg, colorDir);
    } else {
      curCode = curCode.trimEnd() + '\n' + colorDir;
    }

    app.codeEditor.value = curCode;
    if (app.codeHighlight) {
      app.codeHighlight.innerHTML = SyntaxHighlighter.highlight(curCode);
    }
  }

  static updateCodeLine(pattern, replacement) {
    const app = (typeof AppController !== 'undefined' && AppController.instance) ? AppController.instance : null;
    if (!app || !app.codeEditor) return;
    let curCode = app.codeEditor.value;
    let newCode;
    if (typeof pattern === 'function') {
      newCode = pattern(curCode);
    } else {
      newCode = curCode.replace(pattern, replacement);
    }

    app.codeEditor.value = newCode;
    if (app.codeHighlight) {
      app.codeHighlight.innerHTML = SyntaxHighlighter.highlight(newCode);
    }
    app.applyCodeToGraph(false);
  }

  static render(diagramType, code, nodesLayer, edgesLayer, isDark) {
    nodesLayer.innerHTML = '';
    edgesLayer.innerHTML = '';

    MultiDiagramVisualizer.parseColorDirectives(code);

    const type = (diagramType || '').toLowerCase();
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
      // =========================================================================
      // 1. SEQUENCE DIAGRAM
      // =========================================================================
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

        const startX = 70;
        const gapX = 170;
        const topY = 50;
        const totalHeight = Math.max(380, topY + 90 + messages.length * 60);

        participants.forEach((p, idx) => {
          p.x = startX + idx * gapX;

          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', `${p.x}`);
          line.setAttribute('y1', `${topY + 36}`);
          line.setAttribute('x2', `${p.x}`);
          line.setAttribute('y2', `${totalHeight}`);
          line.setAttribute('stroke', linkColor);
          line.setAttribute('stroke-width', '1.5');
          line.setAttribute('stroke-dasharray', '4,4');
          edgesLayer.appendChild(line);

          const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          g.style.cursor = 'pointer';

          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          rect.setAttribute('x', `${p.x - 55}`);
          rect.setAttribute('y', `${topY}`);
          rect.setAttribute('width', '110');
          rect.setAttribute('height', '36');
          rect.setAttribute('rx', p.isActor ? '18' : '6');
          const isSelP = (p.name === selTitle || p.id === selTitle);
          const pFill = MultiDiagramVisualizer.getColor(p.id, primaryFill);
          const pFont = MultiDiagramVisualizer.getColor(p.id + ':font', primaryText);
          rect.setAttribute('fill', pFill);
          rect.setAttribute('stroke', isSelP ? 'var(--selection-color)' : primaryBorder);
          rect.setAttribute('stroke-width', isSelP ? '3' : '1.8');
          if (isSelP) rect.style.filter = selGlow;
          g.appendChild(rect);

          const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          text.setAttribute('x', `${p.x}`);
          text.setAttribute('y', `${topY + 18}`);
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
                type: p.isActor ? 'Actor' : 'Participant',
                title: p.name,
                fields: [
                  { key: 'name', label: 'Display Name', type: 'text', value: p.name },
                  { key: 'type', label: 'Actor Shape', type: 'select', value: p.isActor ? 'actor' : 'participant', options: [
                    { value: 'participant', label: 'Participant (Box)' },
                    { value: 'actor', label: 'Actor (Stick Figure / Pill)' }
                  ]},
                  { key: 'fill', label: 'Fill Color', type: 'color', value: pFill },
                  { key: 'font', label: 'Font / Text Color', type: 'color', value: pFont }
                ],
                onSave: (vals) => {
                  MultiDiagramVisualizer.setColor(p.id, vals.fill);
                  MultiDiagramVisualizer.setColor(p.id + ':font', vals.font);
                  MultiDiagramVisualizer.syncColorToCode(p.id, vals.fill);
                  MultiDiagramVisualizer.syncColorToCode(p.id + ':font', vals.font);
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

        messages.forEach((m, idx) => {
          const y = topY + 70 + idx * 55;
          const pFrom = participantMap.get(m.from);
          const pTo = participantMap.get(m.to);
          if (!pFrom || !pTo) return;

          const x1 = pFrom.x;
          const x2 = pTo.x;
          const msgKey = `${m.from}->${m.to}:${m.text}`;
          const msgColor = MultiDiagramVisualizer.getColor(msgKey, MultiDiagramVisualizer.getColor(`${m.from}->${m.to}`, linkColor));
          const msgFont = MultiDiagramVisualizer.getColor(msgKey + ':font', textColor);

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

          const arrowHead = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
          if (x2 > x1) {
            arrowHead.setAttribute('points', `${x2 - 8},${y - 4.5} ${x2},${y} ${x2 - 8},${y + 4.5}`);
          } else {
            arrowHead.setAttribute('points', `${x2 + 8},${y - 4.5} ${x2},${y} ${x2 + 8},${y + 4.5}`);
          }
          arrowHead.setAttribute('fill', msgColor);
          lineG.appendChild(arrowHead);
          edgesLayer.appendChild(lineG);

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
          badgeBg.setAttribute('stroke', isSelM ? 'var(--selection-color)' : (msgColor !== linkColor ? msgColor : cardBorder));
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
                  { key: 'color', label: 'Line / Arrow Color', type: 'color', value: msgColor },
                  { key: 'font', label: 'Message Font Color', type: 'color', value: msgFont }
                ],
                onSave: (vals) => {
                  const newKey = `${m.from}->${m.to}:${vals.text}`;
                  MultiDiagramVisualizer.setColor(newKey, vals.color);
                  MultiDiagramVisualizer.setColor(newKey + ':font', vals.font);
                  MultiDiagramVisualizer.syncColorToCode(newKey, vals.color);
                  MultiDiagramVisualizer.syncColorToCode(newKey + ':font', vals.font);
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
        break;
      }

      // =========================================================================
      // 2. CLASS DIAGRAM (UML)
      // =========================================================================
      case 'classdiagram': {
        const rawLines = (code || '').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('%%') && !l.startsWith('classDiagram'));
        const classes = [];
        const classMap = new Map();
        const relations = [];

        let currentClass = null;
        rawLines.forEach(line => {
          const classMatch = line.match(/^class\s+([A-Za-z0-9_]+)(?:\s*\{)?/i);
          if (classMatch) {
            const cName = classMatch[1];
            currentClass = { name: cName, members: [], methods: [] };
            classes.push(currentClass);
            classMap.set(cName, currentClass);
            return;
          }

          if (line === '}') {
            currentClass = null;
            return;
          }

          const relMatch = line.match(/^([A-Za-z0-9_]+)\s*(<\|--|\*--|o--|-->|\.\.>|--)\s*([A-Za-z0-9_]+)(?:\s*:\s*(.+))?/);
          if (relMatch) {
            const src = relMatch[1];
            const type = relMatch[2];
            const tgt = relMatch[3];
            const label = relMatch[4] || '';
            [src, tgt].forEach(name => {
              if (!classMap.has(name)) {
                const c = { name, members: [], methods: [] };
                classes.push(c);
                classMap.set(name, c);
              }
            });
            relations.push({ src, type, tgt, label });
            return;
          }

          if (currentClass) {
            if (line.includes('(')) currentClass.methods.push(line);
            else currentClass.members.push(line);
          }
        });

        if (classes.length === 0) {
          classes.push({ name: 'BankAccount', members: ['+String owner', '+Decimal balance'], methods: ['+deposit(amount)', '+withdraw(amount)'] });
          classes.push({ name: 'SavingsAccount', members: ['+Decimal interestRate'], methods: ['+addInterest()'] });
          classes.push({ name: 'CheckingAccount', members: ['+Decimal overdraftLimit'], methods: [] });
          relations.push({ src: 'BankAccount', type: '<|--', tgt: 'SavingsAccount', label: '' });
          relations.push({ src: 'BankAccount', type: '<|--', tgt: 'CheckingAccount', label: '' });
        }

        const colW = 210;
        const startX = 60;
        const startY = 60;

        classes.forEach((c, idx) => {
          const col = idx % 2 === 0 ? 0 : 1;
          const x = startX + (idx === 0 && classes.length >= 3 ? 160 : col * 290);
          const y = startY + (idx === 0 && classes.length >= 3 ? 0 : 170);
          const h = 42 + (c.members.length + c.methods.length) * 18 + 16;

          c.x = x + colW / 2;
          c.y = y + h / 2;
          c.topY = y;
          c.bottomY = y + h;

          const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          g.style.cursor = 'pointer';

          const isSelC = (c.name === selTitle);
          const cFill = MultiDiagramVisualizer.getColor(c.name, primaryFill);
          const cFont = MultiDiagramVisualizer.getColor(c.name + ':font', primaryText);

          const card = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          card.setAttribute('x', `${x}`);
          card.setAttribute('y', `${y}`);
          card.setAttribute('width', `${colW}`);
          card.setAttribute('height', `${h}`);
          card.setAttribute('rx', '6');
          card.setAttribute('fill', cFill);
          card.setAttribute('stroke', isSelC ? 'var(--selection-color)' : primaryBorder);
          card.setAttribute('stroke-width', isSelC ? '3' : '1.8');
          if (isSelC) card.style.filter = selGlow;
          g.appendChild(card);

          // Class Name Header
          const nameTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          nameTxt.setAttribute('x', `${x + colW / 2}`);
          nameTxt.setAttribute('y', `${y + 22}`);
          nameTxt.setAttribute('text-anchor', 'middle');
          nameTxt.setAttribute('fill', cFont);
          nameTxt.setAttribute('font-size', '13px');
          nameTxt.setAttribute('font-weight', 'bold');
          nameTxt.textContent = c.name;
          g.appendChild(nameTxt);

          // Header Divider
          const divLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          divLine.setAttribute('x1', `${x}`);
          divLine.setAttribute('y1', `${y + 34}`);
          divLine.setAttribute('x2', `${x + colW}`);
          divLine.setAttribute('y2', `${y + 34}`);
          divLine.setAttribute('stroke', primaryBorder);
          divLine.setAttribute('stroke-width', '1');
          g.appendChild(divLine);

          let curItemY = y + 50;
          c.members.forEach(m => {
            const mTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            mTxt.setAttribute('x', `${x + 12}`);
            mTxt.setAttribute('y', `${curItemY}`);
            mTxt.setAttribute('fill', cFont);
            mTxt.setAttribute('font-size', '11px');
            mTxt.textContent = m;
            g.appendChild(mTxt);
            curItemY += 18;
          });

          if (c.methods.length > 0) {
            const mDiv = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            mDiv.setAttribute('x1', `${x}`);
            mDiv.setAttribute('y1', `${curItemY - 4}`);
            mDiv.setAttribute('x2', `${x + colW}`);
            mDiv.setAttribute('y2', `${curItemY - 4}`);
            mDiv.setAttribute('stroke', primaryBorder);
            mDiv.setAttribute('stroke-width', '0.8');
            mDiv.setAttribute('stroke-dasharray', '2,2');
            g.appendChild(mDiv);
            curItemY += 8;

            c.methods.forEach(mt => {
              const mtTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
              mtTxt.setAttribute('x', `${x + 12}`);
              mtTxt.setAttribute('y', `${curItemY}`);
              mtTxt.setAttribute('fill', cFont);
              mtTxt.setAttribute('font-size', '11px');
              mtTxt.textContent = mt;
              g.appendChild(mtTxt);
              curItemY += 18;
            });
          }

          g.addEventListener('mousedown', (e) => e.stopPropagation());
          g.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof AppController !== 'undefined' && AppController.instance) {
              AppController.instance.selectVisualObject({
                type: 'UML Class',
                title: c.name,
                fields: [
                  { key: 'name', label: 'Class Name', type: 'text', value: c.name },
                  { key: 'members', label: 'Attributes (1 per line)', type: 'textarea', rows: 3, value: c.members.join('\n') },
                  { key: 'methods', label: 'Methods (1 per line)', type: 'textarea', rows: 3, value: c.methods.join('\n') },
                  { key: 'fill', label: 'Class Fill Color', type: 'color', value: cFill },
                  { key: 'font', label: 'Font / Text Color', type: 'color', value: cFont }
                ],
                onSave: (vals) => {
                  MultiDiagramVisualizer.setColor(vals.name, vals.fill);
                  MultiDiagramVisualizer.setColor(vals.name + ':font', vals.font);
                  MultiDiagramVisualizer.syncColorToCode(vals.name, vals.fill);
                  MultiDiagramVisualizer.syncColorToCode(vals.name + ':font', vals.font);
                  MultiDiagramVisualizer.updateCodeLine((curCode) => {
                    const esc = c.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                    const reg = new RegExp(`class\\s+${esc}\\s*\\{[^\\}]*\\}`, 'm');
                    const memLines = vals.members.split('\n').map(s => s.trim()).filter(Boolean).map(s => `    ${s}`).join('\n');
                    const methLines = vals.methods.split('\n').map(s => s.trim()).filter(Boolean).map(s => `    ${s}`).join('\n');
                    const newBlock = `class ${vals.name} {\n${memLines}${memLines && methLines ? '\n' : ''}${methLines}\n  }`;
                    return reg.test(curCode) ? curCode.replace(reg, newBlock) : curCode + '\n' + newBlock;
                  });
                }
              });
            }
          });

          nodesLayer.appendChild(g);
        });

        // Draw UML Relationships with Full Click Configuration
        relations.forEach(r => {
          const s = classMap.get(r.src);
          const t = classMap.get(r.tgt);
          if (!s || !t) return;

          const relKey = `${r.src}->${r.tgt}`;
          const relColor = MultiDiagramVisualizer.getColor(relKey, linkColor);
          const relFont = MultiDiagramVisualizer.getColor(relKey + ':font', textColor);
          const isSelRel = (`${r.src} → ${r.tgt}` === selTitle);

          const x1 = s.x;
          const y1 = s.bottomY;
          const x2 = t.x;
          const y2 = t.topY;

          const lineG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          lineG.style.cursor = 'pointer';

          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          const midY = (y1 + y2) / 2;
          path.setAttribute('d', `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`);
          path.setAttribute('fill', 'none');
          path.setAttribute('stroke', isSelRel ? 'var(--selection-color)' : relColor);
          path.setAttribute('stroke-width', isSelRel ? '3' : '2');
          if (r.type === '..>') path.setAttribute('stroke-dasharray', '4,4');
          if (isSelRel) path.style.filter = selGlow;
          lineG.appendChild(path);

          // Inheritance open triangle arrow
          const tri = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
          tri.setAttribute('points', `${x1},${y1} ${x1 - 6},${y1 + 10} ${x1 + 6},${y1 + 10}`);
          tri.setAttribute('fill', cardBg);
          tri.setAttribute('stroke', isSelRel ? 'var(--selection-color)' : relColor);
          tri.setAttribute('stroke-width', '1.8');
          lineG.appendChild(tri);

          lineG.addEventListener('mousedown', (e) => e.stopPropagation());
          lineG.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof AppController !== 'undefined' && AppController.instance) {
              AppController.instance.selectVisualObject({
                type: 'UML Relationship',
                title: `${r.src} → ${r.tgt}`,
                fields: [
                  { key: 'type', label: 'Relationship Type', type: 'select', value: r.type || '<|--', options: [
                    { value: '<|--', label: 'Inherits (<|--)' },
                    { value: '*--', label: 'Composition (*--)' },
                    { value: 'o--', label: 'Aggregation (o--)' },
                    { value: '-->', label: 'Association (-->)' },
                    { value: '..>', label: 'Dependency (..>)' }
                  ]},
                  { key: 'label', label: 'Relation Label (Optional)', type: 'text', value: r.label || '' },
                  { key: 'color', label: 'Line / Arrow Color', type: 'color', value: relColor },
                  { key: 'font', label: 'Label Font Color', type: 'color', value: relFont }
                ],
                onSave: (vals) => {
                  MultiDiagramVisualizer.setColor(relKey, vals.color);
                  MultiDiagramVisualizer.setColor(relKey + ':font', vals.font);
                  MultiDiagramVisualizer.syncColorToCode(relKey, vals.color);
                  MultiDiagramVisualizer.syncColorToCode(relKey + ':font', vals.font);
                  MultiDiagramVisualizer.updateCodeLine((curCode) => {
                    const esc1 = r.src.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                    const esc2 = r.tgt.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                    const reg = new RegExp(`^\\s*${esc1}\\s*(?:<\\|--|\\*--|o--|-->|\\.\\.>|--)\\s*${esc2}(?:\\s*:.*)?$`, 'm');
                    return curCode.replace(reg, `  ${r.src} ${vals.type} ${r.tgt}${vals.label ? ' : ' + vals.label : ''}`);
                  });
                }
              });
            }
          });

          edgesLayer.appendChild(lineG);
        });
        break;
      }

      // =========================================================================
      // 3. STATE DIAGRAM
      // =========================================================================
      case 'statediagram': {
        const rawLines = (code || '').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('%%') && !l.toLowerCase().startsWith('statediagram'));
        const stateSet = new Set();
        const transitions = [];

        rawLines.forEach(line => {
          const transMatch = line.match(/^(\[\*\]|[A-Za-z0-9_]+)\s*-->\s*(\[\*\]|[A-Za-z0-9_]+)(?:\s*:\s*(.+))?/);
          if (transMatch) {
            const from = transMatch[1];
            const to = transMatch[2];
            if (from !== '[*]') stateSet.add(from);
            if (to !== '[*]') stateSet.add(to);
            transitions.push({ from, to, label: transMatch[3] || '' });
          }
        });

        const stateList = Array.from(stateSet);
        if (stateList.length === 0) stateList.push('Idle', 'Processing', 'Succeeded', 'Failed', 'Retrying', 'DeadLetter');

        // Layout states across clean 2-tier pipeline
        const positions = {
          '[*]': { x: 50, y: 100 },
          'Idle': { x: 170, y: 100 },
          'Processing': { x: 350, y: 100 },
          'Succeeded': { x: 540, y: 100 },
          'Failed': { x: 350, y: 220 },
          'Retrying': { x: 520, y: 220 },
          'DeadLetter': { x: 680, y: 220 }
        };

        // Draw start state ●
        const startCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        startCircle.setAttribute('cx', '50');
        startCircle.setAttribute('cy', '100');
        startCircle.setAttribute('r', '14');
        startCircle.setAttribute('fill', primaryText);
        nodesLayer.appendChild(startCircle);

        // Draw end state bullseyes ◉
        const drawEndState = (cx, cy) => {
          const outC = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          outC.setAttribute('cx', `${cx}`);
          outC.setAttribute('cy', `${cy}`);
          outC.setAttribute('r', '14');
          outC.setAttribute('fill', 'none');
          outC.setAttribute('stroke', primaryText);
          outC.setAttribute('stroke-width', '2');
          nodesLayer.appendChild(outC);

          const inC = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          inC.setAttribute('cx', `${cx}`);
          inC.setAttribute('cy', `${cy}`);
          inC.setAttribute('r', '8');
          inC.setAttribute('fill', primaryText);
          nodesLayer.appendChild(inC);
        };

        drawEndState(690, 100);
        drawEndState(780, 220);

        stateList.forEach((sName, idx) => {
          const pos = positions[sName] || { x: 170 + (idx % 3) * 180, y: 100 + Math.floor(idx / 3) * 120 };
          const x = pos.x;
          const y = pos.y;
          const w = 120;
          const h = 42;

          const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          g.style.cursor = 'pointer';

          const sFill = MultiDiagramVisualizer.getColor(sName, primaryFill);
          const sFont = MultiDiagramVisualizer.getColor(sName + ':font', primaryText);
          const isSelS = (sName === selTitle);

          const capsule = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          capsule.setAttribute('x', `${x - w / 2}`);
          capsule.setAttribute('y', `${y - h / 2}`);
          capsule.setAttribute('width', `${w}`);
          capsule.setAttribute('height', `${h}`);
          capsule.setAttribute('rx', '21');
          capsule.setAttribute('fill', sFill);
          capsule.setAttribute('stroke', isSelS ? 'var(--selection-color)' : primaryBorder);
          capsule.setAttribute('stroke-width', isSelS ? '3' : '1.8');
          if (isSelS) capsule.style.filter = selGlow;
          g.appendChild(capsule);

          const sText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          sText.setAttribute('x', `${x}`);
          sText.setAttribute('y', `${y}`);
          sText.setAttribute('text-anchor', 'middle');
          sText.setAttribute('dominant-baseline', 'central');
          sText.setAttribute('fill', sFont);
          sText.setAttribute('font-size', '12px');
          sText.setAttribute('font-weight', '600');
          sText.textContent = sName;
          g.appendChild(sText);

          g.addEventListener('mousedown', (e) => e.stopPropagation());
          g.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof AppController !== 'undefined' && AppController.instance) {
              AppController.instance.selectVisualObject({
                type: 'State Capsule',
                title: sName,
                fields: [
                  { key: 'name', label: 'State Name', type: 'text', value: sName },
                  { key: 'fill', label: 'State Fill Color', type: 'color', value: sFill },
                  { key: 'font', label: 'Font / Text Color', type: 'color', value: sFont }
                ],
                onSave: (vals) => {
                  MultiDiagramVisualizer.setColor(vals.name, vals.fill);
                  MultiDiagramVisualizer.setColor(vals.name + ':font', vals.font);
                  MultiDiagramVisualizer.syncColorToCode(vals.name, vals.fill);
                  MultiDiagramVisualizer.syncColorToCode(vals.name + ':font', vals.font);
                  MultiDiagramVisualizer.updateCodeLine((curCode) => {
                    const esc = sName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                    return curCode.replace(new RegExp(`\\b${esc}\\b`, 'g'), vals.name);
                  });
                }
              });
            }
          });

          nodesLayer.appendChild(g);
        });

        // Draw State Transitions
        transitions.forEach(tr => {
          let p1 = positions[tr.from] || { x: 100, y: 100 };
          let p2 = positions[tr.to] || (tr.to === '[*]' ? (tr.from === 'DeadLetter' ? { x: 780, y: 220 } : { x: 690, y: 100 }) : { x: 300, y: 200 });

          const trKey = `${tr.from}->${tr.to}`;
          const trColor = MultiDiagramVisualizer.getColor(trKey, linkColor);
          const trFont = MultiDiagramVisualizer.getColor(trKey + ':font', textColor);
          const isSelTr = (`${tr.from} → ${tr.to}` === selTitle);

          const lineG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          lineG.style.cursor = 'pointer';

          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          const midX = (p1.x + p2.x) / 2;
          const midY = (p1.y + p2.y) / 2;

          if (p1.y === p2.y) {
            path.setAttribute('d', `M ${p1.x + (tr.from === '[*]' ? 14 : 60)} ${p1.y} L ${p2.x - (tr.to === '[*]' ? 14 : 60)} ${p2.y}`);
          } else if (tr.from === 'Processing' && tr.to === 'Failed') {
            path.setAttribute('d', `M ${p1.x} ${p1.y + 21} L ${p2.x} ${p2.y - 21}`);
          } else if (tr.from === 'Retrying' && tr.to === 'Processing') {
            path.setAttribute('d', `M ${p1.x - 20} ${p1.y - 21} C ${p1.x - 40} ${midY}, ${p2.x + 40} ${midY}, ${p2.x + 20} ${p2.y + 21}`);
          } else {
            path.setAttribute('d', `M ${p1.x} ${p1.y + 21} C ${p1.x} ${midY}, ${p2.x} ${midY}, ${p2.x} ${p2.y - 21}`);
          }

          path.setAttribute('fill', 'none');
          path.setAttribute('stroke', isSelTr ? 'var(--selection-color)' : trColor);
          path.setAttribute('stroke-width', isSelTr ? '3' : '2');
          if (isSelTr) path.style.filter = selGlow;
          lineG.appendChild(path);

          if (tr.label) {
            const lblBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            const lblW = tr.label.length * 6.8 + 18;
            lblBg.setAttribute('x', `${midX - lblW / 2}`);
            lblBg.setAttribute('y', `${midY - 10}`);
            lblBg.setAttribute('width', `${lblW}`);
            lblBg.setAttribute('height', '20');
            lblBg.setAttribute('rx', '4');
            lblBg.setAttribute('fill', cardBg);
            lblBg.setAttribute('stroke', isSelTr ? 'var(--selection-color)' : cardBorder);
            lblBg.setAttribute('stroke-width', '1');
            lineG.appendChild(lblBg);

            const lblTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            lblTxt.setAttribute('x', `${midX}`);
            lblTxt.setAttribute('y', `${midY}`);
            lblTxt.setAttribute('text-anchor', 'middle');
            lblTxt.setAttribute('dominant-baseline', 'central');
            lblTxt.setAttribute('fill', trFont);
            lblTxt.setAttribute('font-size', '10px');
            lblTxt.setAttribute('font-weight', '500');
            lblTxt.textContent = tr.label;
            lineG.appendChild(lblTxt);
          }

          lineG.addEventListener('mousedown', (e) => e.stopPropagation());
          lineG.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof AppController !== 'undefined' && AppController.instance) {
              AppController.instance.selectVisualObject({
                type: 'State Transition',
                title: `${tr.from} → ${tr.to}`,
                fields: [
                  { key: 'label', label: 'Transition Label', type: 'text', value: tr.label },
                  { key: 'color', label: 'Transition Color', type: 'color', value: trColor },
                  { key: 'font', label: 'Label Font Color', type: 'color', value: trFont }
                ],
                onSave: (vals) => {
                  MultiDiagramVisualizer.setColor(trKey, vals.color);
                  MultiDiagramVisualizer.setColor(trKey + ':font', vals.font);
                  MultiDiagramVisualizer.syncColorToCode(trKey, vals.color);
                  MultiDiagramVisualizer.syncColorToCode(trKey + ':font', vals.font);
                  MultiDiagramVisualizer.updateCodeLine((curCode) => {
                    const esc1 = tr.from.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                    const esc2 = tr.to.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                    const reg = new RegExp(`^\\s*${esc1}\\s*-->\\s*${esc2}(?:\\s*:.*)?$`, 'm');
                    return curCode.replace(reg, `  ${tr.from} --> ${tr.to}${vals.label ? ' : ' + vals.label : ''}`);
                  });
                }
              });
            }
          });

          edgesLayer.appendChild(lineG);
        });
        break;
      }

      // =========================================================================
      // 4. ER DIAGRAM
      // =========================================================================
      case 'erdiagram': {
        const rawLines = (code || '').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('%%') && !l.startsWith('erDiagram'));
        const entities = [];
        const entityMap = new Map();
        const relationships = [];
        let curEntity = null;

        rawLines.forEach(line => {
          const entMatch = line.match(/^([A-Za-z0-9_]+)\s*\{/);
          if (entMatch) {
            curEntity = { name: entMatch[1], fields: [] };
            entities.push(curEntity);
            entityMap.set(entMatch[1], curEntity);
            return;
          }

          if (line === '}') {
            curEntity = null;
            return;
          }

          const relMatch = line.match(/^([A-Za-z0-9_]+)\s*(\|\|--o\{|\|\|--\|\{|\}\|--\|\{|\}\|--o\{|--)\s*([A-Za-z0-9_]+)(?:\s*:\s*(.+))?/);
          if (relMatch) {
            const src = relMatch[1];
            const tgt = relMatch[3];
            [src, tgt].forEach(name => {
              if (!entityMap.has(name)) {
                const ent = { name, fields: [] };
                entities.push(ent);
                entityMap.set(name, ent);
              }
            });
            relationships.push({ src, card: relMatch[2], tgt, label: relMatch[4] || '' });
            return;
          }

          if (curEntity) {
            curEntity.fields.push(line);
          }
        });

        if (entities.length === 0) {
          entities.push({ name: 'CUSTOMER', fields: ['int id PK', 'string name', 'string email'] });
          entities.push({ name: 'ORDER', fields: ['int id PK', 'int customer_id FK', 'date order_date', 'decimal total_amount'] });
          entities.push({ name: 'ORDER_ITEM', fields: ['int id PK', 'int order_id FK', 'int product_id FK', 'int quantity'] });
          entities.push({ name: 'PRODUCT', fields: ['int id PK', 'string name', 'decimal price'] });
          relationships.push({ src: 'CUSTOMER', card: '||--o{', tgt: 'ORDER', label: 'places' });
          relationships.push({ src: 'ORDER', card: '||--|{', tgt: 'ORDER_ITEM', label: 'contains' });
          relationships.push({ src: 'PRODUCT', card: '||--o{', tgt: 'ORDER_ITEM', label: 'included_in' });
        }

        const colW = 210;
        entities.forEach((ent, idx) => {
          const col = idx % 2;
          const row = Math.floor(idx / 2);
          const x = 70 + col * 320;
          const y = 60 + row * 190;
          const h = 42 + Math.max(2, ent.fields.length) * 20 + 16;

          ent.x = x + colW / 2;
          ent.y = y + h / 2;
          ent.leftX = x;
          ent.rightX = x + colW;
          ent.topY = y;
          ent.bottomY = y + h;

          const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          g.style.cursor = 'pointer';

          const isSelE = (ent.name === selTitle);
          const eFill = MultiDiagramVisualizer.getColor(ent.name, primaryFill);
          const eFont = MultiDiagramVisualizer.getColor(ent.name + ':font', primaryText);

          const box = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          box.setAttribute('x', `${x}`);
          box.setAttribute('y', `${y}`);
          box.setAttribute('width', `${colW}`);
          box.setAttribute('height', `${h}`);
          box.setAttribute('rx', '6');
          box.setAttribute('fill', eFill);
          box.setAttribute('stroke', isSelE ? 'var(--selection-color)' : primaryBorder);
          box.setAttribute('stroke-width', isSelE ? '3' : '1.8');
          if (isSelE) box.style.filter = selGlow;
          g.appendChild(box);

          const eName = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          eName.setAttribute('x', `${x + colW / 2}`);
          eName.setAttribute('y', `${y + 22}`);
          eName.setAttribute('text-anchor', 'middle');
          eName.setAttribute('fill', eFont);
          eName.setAttribute('font-size', '13px');
          eName.setAttribute('font-weight', 'bold');
          eName.textContent = ent.name;
          g.appendChild(eName);

          const divLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          divLine.setAttribute('x1', `${x}`);
          divLine.setAttribute('y1', `${y + 34}`);
          divLine.setAttribute('x2', `${x + colW}`);
          divLine.setAttribute('y2', `${y + 34}`);
          divLine.setAttribute('stroke', primaryBorder);
          divLine.setAttribute('stroke-width', '1');
          g.appendChild(divLine);

          ent.fields.forEach((f, fIdx) => {
            const fTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            fTxt.setAttribute('x', `${x + 12}`);
            fTxt.setAttribute('y', `${y + 52 + fIdx * 20}`);
            fTxt.setAttribute('fill', eFont);
            fTxt.setAttribute('font-size', '11px');
            fTxt.textContent = f;
            g.appendChild(fTxt);
          });

          g.addEventListener('mousedown', (e) => e.stopPropagation());
          g.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof AppController !== 'undefined' && AppController.instance) {
              AppController.instance.selectVisualObject({
                type: 'ER Entity',
                title: ent.name,
                fields: [
                  { key: 'name', label: 'Entity Name', type: 'text', value: ent.name },
                  { key: 'fields', label: 'Attributes (1 per line)', type: 'textarea', rows: 4, value: ent.fields.join('\n') },
                  { key: 'fill', label: 'Entity Fill Color', type: 'color', value: eFill },
                  { key: 'font', label: 'Font / Text Color', type: 'color', value: eFont }
                ],
                onSave: (vals) => {
                  MultiDiagramVisualizer.setColor(vals.name, vals.fill);
                  MultiDiagramVisualizer.setColor(vals.name + ':font', vals.font);
                  MultiDiagramVisualizer.syncColorToCode(vals.name, vals.fill);
                  MultiDiagramVisualizer.syncColorToCode(vals.name + ':font', vals.font);
                  MultiDiagramVisualizer.updateCodeLine((curCode) => {
                    const esc = ent.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                    const reg = new RegExp(`${esc}\\s*\\{[^\\}]*\\}`, 'm');
                    const fieldLines = vals.fields.split('\n').map(s => s.trim()).filter(Boolean).map(s => `    ${s}`).join('\n');
                    const newBlock = `${vals.name} {\n${fieldLines}\n  }`;
                    return reg.test(curCode) ? curCode.replace(reg, newBlock) : curCode + '\n' + newBlock;
                  });
                }
              });
            }
          });

          nodesLayer.appendChild(g);
        });

        // Draw Relationships with Full Click Configuration
        relationships.forEach(r => {
          const s = entityMap.get(r.src);
          const t = entityMap.get(r.tgt);
          if (!s || !t) return;

          const relKey = `${r.src}->${r.tgt}`;
          const relColor = MultiDiagramVisualizer.getColor(relKey, linkColor);
          const relFont = MultiDiagramVisualizer.getColor(relKey + ':font', textColor);
          const isSelERRel = (`${r.src} → ${r.tgt}` === selTitle);

          const lineG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          lineG.style.cursor = 'pointer';

          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', `${s.x}`);
          line.setAttribute('y1', `${s.y}`);
          line.setAttribute('x2', `${t.x}`);
          line.setAttribute('y2', `${t.y}`);
          line.setAttribute('stroke', isSelERRel ? 'var(--selection-color)' : relColor);
          line.setAttribute('stroke-width', isSelERRel ? '3' : '2');
          if (isSelERRel) line.style.filter = selGlow;
          lineG.appendChild(line);

          if (r.label) {
            const midX = (s.x + t.x) / 2;
            const midY = (s.y + t.y) / 2;
            const badgeW = r.label.length * 6.5 + 18;
            const badgeBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            badgeBg.setAttribute('x', `${midX - badgeW / 2}`);
            badgeBg.setAttribute('y', `${midY - 9}`);
            badgeBg.setAttribute('width', `${badgeW}`);
            badgeBg.setAttribute('height', '18');
            badgeBg.setAttribute('rx', '4');
            badgeBg.setAttribute('fill', cardBg);
            badgeBg.setAttribute('stroke', cardBorder);
            badgeBg.setAttribute('stroke-width', '1');
            lineG.appendChild(badgeBg);

            const badgeTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            badgeTxt.setAttribute('x', `${midX}`);
            badgeTxt.setAttribute('y', `${midY}`);
            badgeTxt.setAttribute('text-anchor', 'middle');
            badgeTxt.setAttribute('dominant-baseline', 'central');
            badgeTxt.setAttribute('fill', relFont);
            badgeTxt.setAttribute('font-size', '10px');
            badgeTxt.textContent = r.label;
            lineG.appendChild(badgeTxt);
          }

          lineG.addEventListener('mousedown', (e) => e.stopPropagation());
          lineG.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof AppController !== 'undefined' && AppController.instance) {
              AppController.instance.selectVisualObject({
                type: 'ER Relationship',
                title: `${r.src} → ${r.tgt}`,
                fields: [
                  { key: 'card', label: 'Cardinality Symbol', type: 'select', value: r.card || '||--o{', options: [
                    { value: '||--o{', label: 'One to Many (||--o{)' },
                    { value: '||--|{', label: 'One to Mandatory Many (||--|{)' },
                    { value: '}|--|{', label: 'Many to Many (}|--|{)' },
                    { value: '}|--o{', label: 'Many to Optional Many (}|--o{)' },
                    { value: '--', label: 'Direct Link (--)' }
                  ]},
                  { key: 'label', label: 'Relationship Label', type: 'text', value: r.label || '' },
                  { key: 'color', label: 'Line Color', type: 'color', value: relColor },
                  { key: 'font', label: 'Label Font Color', type: 'color', value: relFont }
                ],
                onSave: (vals) => {
                  MultiDiagramVisualizer.setColor(relKey, vals.color);
                  MultiDiagramVisualizer.setColor(relKey + ':font', vals.font);
                  MultiDiagramVisualizer.syncColorToCode(relKey, vals.color);
                  MultiDiagramVisualizer.syncColorToCode(relKey + ':font', vals.font);
                  MultiDiagramVisualizer.updateCodeLine((curCode) => {
                    const esc1 = r.src.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                    const esc2 = r.tgt.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                    const reg = new RegExp(`^\\s*${esc1}\\s*(?:\\|\\|--o\\{|\\|\\|--\\|\\{|\\}\\|--\\|\\{|\\}\\|--o\\{|--)\\s*${esc2}(?:\\s*:.*)?$`, 'm');
                    return curCode.replace(reg, `  ${r.src} ${vals.card} ${r.tgt}${vals.label ? ' : ' + vals.label : ''}`);
                  });
                }
              });
            }
          });

          edgesLayer.appendChild(lineG);
        });
        break;
      }

      // =========================================================================
      // 5. C4 CONTEXT ARCHITECTURE
      // =========================================================================
      case 'c4context': {
        const rawLines = (code || '').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('%%') && !l.toLowerCase().startsWith('c4context'));
        const elements = [];
        const elementMap = new Map();
        const rels = [];

        rawLines.forEach(line => {
          const match = line.match(/^(Person|System|System_Ext)\s*\(\s*([A-Za-z0-9_]+)\s*,\s*["']([^"']+)["'](?:,\s*["']([^"']+)["'])?\)/i);
          if (match) {
            const el = { type: match[1], id: match[2], label: match[3], desc: match[4] || '' };
            elements.push(el);
            elementMap.set(match[2], el);
            return;
          }

          const relMatch = line.match(/^Rel\s*\(\s*([A-Za-z0-9_]+)\s*,\s*([A-Za-z0-9_]+)\s*,\s*["']([^"']+)["'](?:,\s*["']([^"']+)["'])?\)/i);
          if (relMatch) {
            rels.push({ src: relMatch[1], tgt: relMatch[2], label: relMatch[3], tech: relMatch[4] || '' });
          }
        });

        if (elements.length === 0) {
          elements.push({ type: 'Person', id: 'customer', label: 'Customer', desc: 'A client of the bank' });
          elements.push({ type: 'System', id: 'banking_system', label: 'Internet Banking', desc: 'Allows customers to view accounts' });
          elements.push({ type: 'System_Ext', id: 'mail_system', label: 'E-mail System', desc: 'Internal Microsoft Exchange' });
          elements.push({ type: 'System_Ext', id: 'mainframe', label: 'Mainframe Banking', desc: 'Core legacy banking system' });
          rels.push({ src: 'customer', tgt: 'banking_system', label: 'Uses', tech: 'HTTPS' });
          rels.push({ src: 'banking_system', tgt: 'mail_system', label: 'Sends e-mails', tech: 'SMTP' });
          rels.push({ src: 'banking_system', tgt: 'mainframe', label: 'Queries balance', tech: 'REST/JSON' });
        }

        const posMap = {
          'customer': { x: 70, y: 130 },
          'banking_system': { x: 320, y: 130 },
          'mail_system': { x: 570, y: 70 },
          'mainframe': { x: 570, y: 220 }
        };

        elements.forEach((el, idx) => {
          const pos = posMap[el.id] || { x: 70 + (idx % 3) * 250, y: 80 + Math.floor(idx / 3) * 160 };
          const x = pos.x;
          const y = pos.y;
          const w = 190;
          const h = 90;

          el.x = x + w / 2;
          el.y = y + h / 2;
          el.leftX = x;
          el.rightX = x + w;

          const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          g.style.cursor = 'pointer';

          const isSelC4 = (el.label === selTitle || el.id === selTitle);
          const defaultC4Fill = el.type === 'Person' ? '#08427B' : (el.type === 'System_Ext' ? '#999999' : '#1168BD');
          const defaultC4Font = '#FFFFFF';
          const elFill = MultiDiagramVisualizer.getColor(el.id, defaultC4Fill);
          const elFont = MultiDiagramVisualizer.getColor(el.id + ':font', defaultC4Font);

          const card = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          card.setAttribute('x', `${x}`);
          card.setAttribute('y', `${y}`);
          card.setAttribute('width', `${w}`);
          card.setAttribute('height', `${h}`);
          card.setAttribute('rx', el.type === 'Person' ? '12' : '6');
          card.setAttribute('fill', elFill);
          card.setAttribute('stroke', isSelC4 ? 'var(--selection-color)' : '#FFFFFF');
          card.setAttribute('stroke-width', isSelC4 ? '3.5' : '1.5');
          if (isSelC4) card.style.filter = selGlow;
          g.appendChild(card);

          const iconText = el.type === 'Person' ? '👤 ' : '🏢 ';
          const titleTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          titleTxt.setAttribute('x', `${x + w / 2}`);
          titleTxt.setAttribute('y', `${y + 26}`);
          titleTxt.setAttribute('text-anchor', 'middle');
          titleTxt.setAttribute('fill', elFont);
          titleTxt.setAttribute('font-size', '12.5px');
          titleTxt.setAttribute('font-weight', 'bold');
          titleTxt.textContent = iconText + el.label;
          g.appendChild(titleTxt);

          const typeTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          typeTxt.setAttribute('x', `${x + w / 2}`);
          typeTxt.setAttribute('y', `${y + 44}`);
          typeTxt.setAttribute('text-anchor', 'middle');
          typeTxt.setAttribute('fill', elFont);
          typeTxt.setAttribute('font-size', '9.5px');
          typeTxt.setAttribute('opacity', '0.85');
          typeTxt.textContent = `[${el.type}]`;
          g.appendChild(typeTxt);

          const descTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          descTxt.setAttribute('x', `${x + w / 2}`);
          descTxt.setAttribute('y', `${y + 66}`);
          descTxt.setAttribute('text-anchor', 'middle');
          descTxt.setAttribute('fill', elFont);
          descTxt.setAttribute('font-size', '9.5px');
          descTxt.textContent = el.desc.length > 28 ? el.desc.substring(0, 26) + '...' : el.desc;
          g.appendChild(descTxt);

          g.addEventListener('mousedown', (e) => e.stopPropagation());
          g.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof AppController !== 'undefined' && AppController.instance) {
              AppController.instance.selectVisualObject({
                type: `C4 ${el.type}`,
                title: el.label,
                fields: [
                  { key: 'label', label: 'Display Name', type: 'text', value: el.label },
                  { key: 'desc', label: 'Description', type: 'text', value: el.desc },
                  { key: 'fill', label: 'Card Fill Color', type: 'color', value: elFill },
                  { key: 'font', label: 'Font / Text Color', type: 'color', value: elFont }
                ],
                onSave: (vals) => {
                  MultiDiagramVisualizer.setColor(el.id, vals.fill);
                  MultiDiagramVisualizer.setColor(el.id + ':font', vals.font);
                  MultiDiagramVisualizer.syncColorToCode(el.id, vals.fill);
                  MultiDiagramVisualizer.syncColorToCode(el.id + ':font', vals.font);
                  MultiDiagramVisualizer.updateCodeLine((curCode) => {
                    const esc = el.id.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                    const reg = new RegExp(`(${el.type}\\s*\\(\\s*)${esc}(\\s*,\\s*)"[^"]*"(?:\\s*,\\s*"[^"]*")?(\\))`, 'i');
                    return curCode.replace(reg, `$1${el.id}$2"${vals.label}", "${vals.desc}"$3`);
                  });
                }
              });
            }
          });

          nodesLayer.appendChild(g);
        });

        // Draw C4 Relationships with HTTPS / SMTP Badges & Click Selection
        rels.forEach(r => {
          const s = elementMap.get(r.src);
          const t = elementMap.get(r.tgt);
          if (!s || !t) return;

          const relKey = `${r.src}->${r.tgt}`;
          const relColor = MultiDiagramVisualizer.getColor(relKey, linkColor);
          const relFont = MultiDiagramVisualizer.getColor(relKey + ':font', textColor);
          const isSelC4Rel = (`${r.src} → ${r.tgt}` === selTitle || r.label === selTitle);

          const x1 = s.rightX;
          const y1 = s.y;
          const x2 = t.leftX;
          const y2 = t.y;

          const lineG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          lineG.style.cursor = 'pointer';

          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          const midX = (x1 + x2) / 2;
          path.setAttribute('d', `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`);
          path.setAttribute('fill', 'none');
          path.setAttribute('stroke', isSelC4Rel ? 'var(--selection-color)' : relColor);
          path.setAttribute('stroke-width', isSelC4Rel ? '3' : '2');
          path.setAttribute('stroke-dasharray', '5,4');
          if (isSelC4Rel) path.style.filter = selGlow;
          lineG.appendChild(path);

          // Arrowhead
          const tri = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
          tri.setAttribute('points', `${x2 - 8},${y2 - 5} ${x2},${y2} ${x2 - 8},${y2 + 5}`);
          tri.setAttribute('fill', isSelC4Rel ? 'var(--selection-color)' : relColor);
          lineG.appendChild(tri);

          // Tech Badge
          const badgeTextStr = `${r.label}${r.tech ? ' [' + r.tech + ']' : ''}`;
          const badgeW = badgeTextStr.length * 6.5 + 20;
          const badgeBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          badgeBg.setAttribute('x', `${midX - badgeW / 2}`);
          badgeBg.setAttribute('y', `${(y1 + y2) / 2 - 10}`);
          badgeBg.setAttribute('width', `${badgeW}`);
          badgeBg.setAttribute('height', '20');
          badgeBg.setAttribute('rx', '4');
          badgeBg.setAttribute('fill', cardBg);
          badgeBg.setAttribute('stroke', isSelC4Rel ? 'var(--selection-color)' : cardBorder);
          badgeBg.setAttribute('stroke-width', '1');
          lineG.appendChild(badgeBg);

          const badgeTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          badgeTxt.setAttribute('x', `${midX}`);
          badgeTxt.setAttribute('y', `${(y1 + y2) / 2}`);
          badgeTxt.setAttribute('text-anchor', 'middle');
          badgeTxt.setAttribute('dominant-baseline', 'central');
          badgeTxt.setAttribute('fill', relFont);
          badgeTxt.setAttribute('font-size', '9.5px');
          badgeTxt.setAttribute('font-weight', '500');
          badgeTxt.textContent = badgeTextStr;
          lineG.appendChild(badgeTxt);

          lineG.addEventListener('mousedown', (e) => e.stopPropagation());
          lineG.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof AppController !== 'undefined' && AppController.instance) {
              AppController.instance.selectVisualObject({
                type: 'C4 Relationship',
                title: `${r.src} → ${r.tgt}`,
                fields: [
                  { key: 'label', label: 'Relationship Label', type: 'text', value: r.label },
                  { key: 'tech', label: 'Technology / Protocol', type: 'text', value: r.tech },
                  { key: 'color', label: 'Line / Arrow Color', type: 'color', value: relColor },
                  { key: 'font', label: 'Badge Font Color', type: 'color', value: relFont }
                ],
                onSave: (vals) => {
                  MultiDiagramVisualizer.setColor(relKey, vals.color);
                  MultiDiagramVisualizer.setColor(relKey + ':font', vals.font);
                  MultiDiagramVisualizer.syncColorToCode(relKey, vals.color);
                  MultiDiagramVisualizer.syncColorToCode(relKey + ':font', vals.font);
                  MultiDiagramVisualizer.updateCodeLine((curCode) => {
                    const esc1 = r.src.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                    const esc2 = r.tgt.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                    const reg = new RegExp(`Rel\\s*\\(\\s*${esc1}\\s*,\\s*${esc2}\\s*,\\s*"[^"]*"(?:\\s*,\\s*"[^"]*")?\\)`, 'i');
                    return curCode.replace(reg, `Rel(${r.src}, ${r.tgt}, "${vals.label}", "${vals.tech}")`);
                  });
                }
              });
            }
          });

          edgesLayer.appendChild(lineG);
        });
        break;
      }

      // =========================================================================
      // 6. PIE CHART
      // =========================================================================
      case 'pie': {
        const rawLines = (code || '').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('%%'));
        let title = 'Data Distribution';
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
            data.push({
              label: rawLbl,
              val: parseFloat(m[2]),
              color: MultiDiagramVisualizer.getColor(rawLbl, colors[data.length % colors.length]),
              fontColor: MultiDiagramVisualizer.getColor(rawLbl + ':font', textColor)
            });
          }
        });

        if (data.length === 0) {
          data.push({ label: 'Category A', val: 40, color: '#2196F3', fontColor: textColor });
          data.push({ label: 'Category B', val: 35, color: '#4CAF50', fontColor: textColor });
          data.push({ label: 'Category C', val: 25, color: '#FF9800', fontColor: textColor });
        }

        const total = data.reduce((acc, d) => acc + d.val, 0) || 1;
        const cx = 220;
        const cy = 200;
        const r = 130;

        const titleEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        titleEl.setAttribute('x', '220');
        titleEl.setAttribute('y', '36');
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
                    { key: 'val', label: 'Value / Proportion', type: 'number', step: 1, min: 0, value: d.val },
                    { key: 'color', label: 'Slice Color', type: 'color', value: d.color },
                    { key: 'font', label: 'Label Font Color', type: 'color', value: d.fontColor }
                  ],
                  onSave: (vals) => {
                    MultiDiagramVisualizer.setColor(vals.label, vals.color);
                    MultiDiagramVisualizer.setColor(vals.label + ':font', vals.font);
                    MultiDiagramVisualizer.syncColorToCode(vals.label, vals.color);
                    MultiDiagramVisualizer.syncColorToCode(vals.label + ':font', vals.font);
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

          const legG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          legG.style.cursor = 'pointer';
          const legY = 80 + idx * 28;

          const legRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          legRect.setAttribute('x', '390');
          legRect.setAttribute('y', `${legY}`);
          legRect.setAttribute('width', '14');
          legRect.setAttribute('height', '14');
          legRect.setAttribute('rx', '3');
          legRect.setAttribute('fill', d.color);
          legG.appendChild(legRect);

          const pct = ((d.val / total) * 100).toFixed(1);
          const legText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          legText.setAttribute('x', '412');
          legText.setAttribute('y', `${legY + 11}`);
          legText.setAttribute('fill', d.fontColor);
          legText.setAttribute('font-size', '11.5px');
          legText.textContent = `${d.label} (${pct}%)`;
          legG.appendChild(legText);

          attachPieClick(legG);
          nodesLayer.appendChild(legG);

          curAngle = nextAngle;
        });
        break;
      }

      // =========================================================================
      // 7. GANTT ROADMAP & WEEK TIMELINE
      // =========================================================================
      case 'gantt': {
        const rawLines = (code || '').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('%%'));
        let title = 'Project Sprint Roadmap';
        const sections = [];
        let currentSection = { name: 'Sprint Tasks', tasks: [] };
        sections.push(currentSection);

        const parseDateOffset = (dateStr) => {
          const t = Date.parse(dateStr);
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

            const defaultColor = isCrit ? '#F44336' : (isDone ? '#4CAF50' : (isActive ? '#FF9800' : '#2196F3'));

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
              color: MultiDiagramVisualizer.getColor(name, defaultColor),
              fontColor: MultiDiagramVisualizer.getColor(name + ':font', textColor)
            };

            currentSection.tasks.push(taskObj);
            allTasks.push(taskObj);
          }
        });

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

        const titleEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        titleEl.setAttribute('x', '30');
        titleEl.setAttribute('y', '32');
        titleEl.setAttribute('fill', primaryText);
        titleEl.setAttribute('font-size', '15px');
        titleEl.setAttribute('font-weight', 'bold');
        titleEl.textContent = title;
        nodesLayer.appendChild(titleEl);

        const startX = 200;
        const pxPerDay = 16;
        const totalDays = (minTime && maxTime) ? Math.max(35, Math.ceil((maxTime - minTime) / 86400000) + 7) : 42;
        const numWeeks = Math.ceil(totalDays / 7);

        let taskCount = 0;
        sections.forEach(s => { taskCount += s.tasks.length; });
        const estTotalHeight = 85 + sections.length * 36 + taskCount * 28 + 30;

        for (let w = 0; w < numWeeks; w++) {
          const wx = startX + w * 7 * pxPerDay;
          const ww = 7 * pxPerDay;

          const gridLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          gridLine.setAttribute('x1', `${wx}`);
          gridLine.setAttribute('y1', '44');
          gridLine.setAttribute('x2', `${wx}`);
          gridLine.setAttribute('y2', `${estTotalHeight}`);
          gridLine.setAttribute('stroke', cardBorder);
          gridLine.setAttribute('stroke-width', '1');
          gridLine.setAttribute('stroke-dasharray', '3,3');
          gridLine.setAttribute('opacity', '0.45');
          edgesLayer.appendChild(gridLine);

          const weekBox = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          weekBox.setAttribute('x', `${wx}`);
          weekBox.setAttribute('y', '44');
          weekBox.setAttribute('width', `${ww - 2}`);
          weekBox.setAttribute('height', '30');
          weekBox.setAttribute('rx', '4');
          weekBox.setAttribute('fill', isDark ? '#2B2D30' : '#ECEFF1');
          weekBox.setAttribute('stroke', cardBorder);
          weekBox.setAttribute('stroke-width', '1');
          nodesLayer.appendChild(weekBox);

          let weekLabel = `Week ${w + 1}`;
          let subLabel = `Day ${w * 7 + 1}-${(w + 1) * 7}`;

          if (minTime) {
            const wStartDate = new Date(minTime + w * 7 * 86400000);
            const wEndDate = new Date(minTime + (w * 7 + 6) * 86400000);
            const wNum = getWeekNumber(wStartDate);
            weekLabel = `Week ${wNum}`;
            const m1 = wStartDate.toLocaleString('en-US', { month: 'short' });
            const m2 = wEndDate.toLocaleString('en-US', { month: 'short' });
            subLabel = m1 === m2 ? `${m1} ${wStartDate.getDate()}-${wEndDate.getDate()}` : `${m1} ${wStartDate.getDate()}-${m2} ${wEndDate.getDate()}`;
          }

          const wText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          wText.setAttribute('x', `${wx + ww / 2}`);
          wText.setAttribute('y', '56');
          wText.setAttribute('text-anchor', 'middle');
          wText.setAttribute('fill', primaryText);
          wText.setAttribute('font-size', '10.5px');
          wText.setAttribute('font-weight', 'bold');
          wText.textContent = weekLabel;
          nodesLayer.appendChild(wText);

          const subText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          subText.setAttribute('x', `${wx + ww / 2}`);
          subText.setAttribute('y', '68');
          subText.setAttribute('text-anchor', 'middle');
          subText.setAttribute('fill', linkColor);
          subText.setAttribute('font-size', '8.5px');
          subText.textContent = subLabel;
          nodesLayer.appendChild(subText);
        }

        let curY = 88;
        let globalDayCounter = 0;

        sections.forEach(sec => {
          if (sec.tasks.length === 0) return;

          const secText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          secText.setAttribute('x', '30');
          secText.setAttribute('y', `${curY + 16}`);
          secText.setAttribute('fill', primaryBorder);
          secText.setAttribute('font-size', '12px');
          secText.setAttribute('font-weight', 'bold');
          secText.textContent = `§ ${sec.name}`;
          nodesLayer.appendChild(secText);

          curY += 26;

          sec.tasks.forEach(t => {
            let dayOffset = globalDayCounter;
            if (minTime && t.startDate) {
              const tTime = parseDateOffset(t.startDate);
              if (tTime) {
                dayOffset = Math.max(0, Math.round((tTime - minTime) / (1000 * 60 * 60 * 24)));
              }
            }

            const taskRowG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            taskRowG.style.cursor = 'pointer';

            const lbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            lbl.setAttribute('x', '45');
            lbl.setAttribute('y', `${curY + 16}`);
            lbl.setAttribute('fill', t.fontColor);
            lbl.setAttribute('font-size', '11px');
            lbl.setAttribute('font-weight', '500');
            lbl.textContent = t.name;
            taskRowG.appendChild(lbl);

            const bx = startX + dayOffset * pxPerDay;
            const bw = Math.max(18, t.dur * pxPerDay);

            if (t.milestone) {
              const diamond = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
              diamond.setAttribute('points', `${bx}, ${curY + 5} ${bx + 10}, ${curY + 15} ${bx}, ${curY + 25} ${bx - 10}, ${curY + 15}`);
              diamond.setAttribute('fill', '#9C27B0');
              taskRowG.appendChild(diamond);
            } else {
              const bar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
              bar.setAttribute('x', `${bx}`);
              bar.setAttribute('y', `${curY + 4}`);
              bar.setAttribute('width', `${bw}`);
              bar.setAttribute('height', '20');
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
              durText.setAttribute('x', bw > 25 ? `${bx + bw / 2}` : `${bx + bw + 5}`);
              durText.setAttribute('y', `${curY + 17}`);
              durText.setAttribute('text-anchor', bw > 25 ? 'middle' : 'start');
              durText.setAttribute('fill', bw > 25 ? '#FFFFFF' : t.fontColor);
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
                    { key: 'dur', label: 'Duration (Days)', type: 'number', min: 1, step: 1, value: t.dur },
                    { key: 'status', label: 'Task Status', type: 'select', value: t.status || 'normal', options: [
                      { value: 'normal', label: 'Normal Task' },
                      { value: 'active', label: 'Active (In Progress)' },
                      { value: 'done', label: 'Done (Completed)' },
                      { value: 'crit', label: 'Critical Path (Red)' },
                      { value: 'milestone', label: 'Milestone' }
                    ]},
                    { key: 'color', label: 'Bar Color', type: 'color', value: t.color },
                    { key: 'font', label: 'Task Font / Text Color', type: 'color', value: t.fontColor }
                  ],
                  onSave: (vals) => {
                    MultiDiagramVisualizer.setColor(vals.name, vals.color);
                    MultiDiagramVisualizer.setColor(vals.name + ':font', vals.font);
                    MultiDiagramVisualizer.syncColorToCode(vals.name, vals.color);
                    MultiDiagramVisualizer.syncColorToCode(vals.name + ':font', vals.font);
                    MultiDiagramVisualizer.updateCodeLine((curCode) => {
                      const lines = curCode.split('\n');
                      const esc = t.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                      const idx = lines.findIndex(l => new RegExp(`^\\s*${esc}\\s*:`, 'i').test(l.trim()));
                      if (idx !== -1) {
                        const lead = lines[idx].match(/^(\s*)/)[1] || '    ';
                        const stStr = vals.status && vals.status !== 'normal' ? `${vals.status}, ` : '';
                        lines[idx] = `${lead}${vals.name} : ${stStr}${t.id ? t.id + ', ' : ''}${vals.dur}d`;
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
          curY += 10;
        });
        break;
      }

      // =========================================================================
      // 8. GIT GRAPH (BRANCHES, COMMITS, MERGES, RELEASE TAGS)
      // =========================================================================
      case 'gitgraph': {
        const rawLines = (code || '').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('%%'));
        const branches = new Map();
        branches.set('main', { name: 'main', color: '#2196F3', y: 100 });
        let activeBranch = 'main';
        const actions = [];

        const branchColors = ['#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#00BCD4'];
        let branchCount = 1;

        rawLines.forEach(line => {
          if (line.toLowerCase().startsWith('gitgraph')) return;

          const brMatch = line.match(/^branch\s+([A-Za-z0-9_\/.-]+)/i);
          if (brMatch) {
            const bName = brMatch[1];
            if (!branches.has(bName)) {
              branches.set(bName, {
                name: bName,
                color: branchColors[branchCount % branchColors.length],
                y: 100 + branchCount * 75
              });
              branchCount++;
            }
            activeBranch = bName;
            return;
          }

          const coMatch = line.match(/^checkout\s+([A-Za-z0-9_\/.-]+)/i);
          if (coMatch) {
            activeBranch = coMatch[1];
            return;
          }

          const mergeMatch = line.match(/^merge\s+([A-Za-z0-9_\/.-]+)(?:\s+id:\s*["']?([^"']+)["']?)?/i);
          if (mergeMatch) {
            const srcBranch = mergeMatch[1];
            const id = mergeMatch[2] || `Merge ${srcBranch}`;
            const bInfo = branches.get(activeBranch) || { color: '#2196F3', y: 100 };
            actions.push({
              type: 'merge',
              id,
              branch: activeBranch,
              srcBranch,
              color: MultiDiagramVisualizer.getColor(id, bInfo.color),
              fontColor: MultiDiagramVisualizer.getColor(id + ':font', textColor)
            });
            return;
          }

          const commitMatch = line.match(/^commit(?:\s+id:\s*["']?([^"']+)["']?)?(?:\s+tag:\s*["']?([^"']+)["']?)?/i);
          if (commitMatch) {
            const id = commitMatch[1] || `Commit ${actions.length + 1}`;
            const tag = commitMatch[2];
            const bInfo = branches.get(activeBranch) || { color: '#2196F3', y: 100 };
            actions.push({
              type: 'commit',
              id,
              tag,
              branch: activeBranch,
              color: MultiDiagramVisualizer.getColor(id, bInfo.color),
              fontColor: MultiDiagramVisualizer.getColor(id + ':font', textColor)
            });
          }
        });

        if (actions.length === 0) {
          actions.push({ type: 'commit', id: 'Initial Commit', branch: 'main', color: '#2196F3', fontColor: textColor });
          actions.push({ type: 'commit', id: 'Core Foundation', branch: 'main', color: '#2196F3', fontColor: textColor });
        }

        // Draw Branch Tracks with Full Click Configuration
        branches.forEach(b => {
          const track = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          track.setAttribute('x1', '60');
          track.setAttribute('y1', `${b.y}`);
          track.setAttribute('x2', `${Math.max(650, actions.length * 95 + 140)}`);
          track.setAttribute('y2', `${b.y}`);
          track.setAttribute('stroke', b.color);
          track.setAttribute('stroke-width', '3');
          track.setAttribute('opacity', '0.35');
          edgesLayer.appendChild(track);

          const bLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          bLabel.setAttribute('x', '50');
          bLabel.setAttribute('y', `${b.y + 4}`);
          bLabel.setAttribute('text-anchor', 'end');
          bLabel.setAttribute('fill', b.color);
          bLabel.setAttribute('font-size', '11px');
          bLabel.setAttribute('font-weight', 'bold');
          bLabel.style.cursor = 'pointer';
          bLabel.textContent = b.name;

          bLabel.addEventListener('mousedown', (e) => e.stopPropagation());
          bLabel.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof AppController !== 'undefined' && AppController.instance) {
              AppController.instance.selectVisualObject({
                type: 'Git Branch',
                title: b.name,
                fields: [
                  { key: 'name', label: 'Branch Name', type: 'text', value: b.name },
                  { key: 'color', label: 'Branch Track Color', type: 'color', value: b.color }
                ],
                onSave: (vals) => {
                  MultiDiagramVisualizer.setColor(vals.name, vals.color);
                  MultiDiagramVisualizer.syncColorToCode(vals.name, vals.color);
                  MultiDiagramVisualizer.updateCodeLine((curCode) => {
                    const esc = b.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                    return curCode.replace(new RegExp(`\\b${esc}\\b`, 'g'), vals.name);
                  });
                }
              });
            }
          });

          nodesLayer.appendChild(bLabel);
        });

        // Draw Commits & Merges
        let lastPosMap = new Map();

        actions.forEach((act, idx) => {
          const x = 110 + idx * 88;
          const bInfo = branches.get(act.branch) || { y: 100, color: '#2196F3' };
          const y = bInfo.y;

          if (act.type === 'merge' && act.srcBranch) {
            const srcBInfo = branches.get(act.srcBranch);
            if (srcBInfo) {
              const mergeLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
              const prevSrcX = lastPosMap.get(act.srcBranch) || (x - 70);
              mergeLine.setAttribute('d', `M ${prevSrcX} ${srcBInfo.y} C ${x - 30} ${srcBInfo.y}, ${x - 30} ${y}, ${x} ${y}`);
              mergeLine.setAttribute('fill', 'none');
              mergeLine.setAttribute('stroke', srcBInfo.color);
              mergeLine.setAttribute('stroke-width', '2.5');
              mergeLine.setAttribute('stroke-dasharray', '4,3');
              edgesLayer.appendChild(mergeLine);
            }
          }

          lastPosMap.set(act.branch, x);

          const commitG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          commitG.style.cursor = 'pointer';

          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttribute('cx', `${x}`);
          circle.setAttribute('cy', `${y}`);
          circle.setAttribute('r', '10');
          const isSelGit = (act.id === selTitle);
          circle.setAttribute('fill', act.color);
          circle.setAttribute('stroke', isSelGit ? 'var(--selection-color)' : '#FFFFFF');
          circle.setAttribute('stroke-width', isSelGit ? '3.5' : '2.5');
          if (isSelGit) circle.style.filter = selGlow;
          commitG.appendChild(circle);

          const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          txt.setAttribute('x', `${x}`);
          txt.setAttribute('y', `${y + 24}`);
          txt.setAttribute('text-anchor', 'middle');
          txt.setAttribute('fill', act.fontColor);
          txt.setAttribute('font-size', '10.5px');
          txt.setAttribute('font-weight', '500');
          txt.textContent = act.id;
          commitG.appendChild(txt);

          if (act.tag) {
            const tagG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            const tagW = act.tag.length * 6.5 + 20;
            const tagRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            tagRect.setAttribute('x', `${x - tagW / 2}`);
            tagRect.setAttribute('y', `${y - 28}`);
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
            tagText.textContent = '🏷 ' + act.tag;
            tagG.appendChild(tagText);
            commitG.appendChild(tagG);
          }

          commitG.addEventListener('mousedown', (e) => e.stopPropagation());
          commitG.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof AppController !== 'undefined' && AppController.instance) {
              AppController.instance.selectVisualObject({
                type: act.type === 'merge' ? 'Git Merge Commit' : 'Git Commit',
                title: act.id,
                fields: [
                  { key: 'id', label: 'Commit Message / ID', type: 'text', value: act.id },
                  { key: 'tag', label: 'Release Tag (Optional)', type: 'text', value: act.tag || '' },
                  { key: 'color', label: 'Commit Color', type: 'color', value: act.color },
                  { key: 'font', label: 'Label Font Color', type: 'color', value: act.fontColor }
                ],
                onSave: (vals) => {
                  MultiDiagramVisualizer.setColor(vals.id, vals.color);
                  MultiDiagramVisualizer.setColor(vals.id + ':font', vals.font);
                  MultiDiagramVisualizer.syncColorToCode(vals.id, vals.color);
                  MultiDiagramVisualizer.syncColorToCode(vals.id + ':font', vals.font);
                  MultiDiagramVisualizer.updateCodeLine((curCode) => {
                    const lines = curCode.split('\n');
                    const esc = act.id.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                    const idx = lines.findIndex(l => new RegExp(`(commit|merge)\\s+(?:id:\\s*["']?${esc}["']?|.*${esc})`, 'i').test(l.trim()));
                    if (idx !== -1) {
                      const lead = lines[idx].match(/^(\s*)/)[1] || '  ';
                      const tagPart = vals.tag ? ` tag: "${vals.tag}"` : '';
                      if (act.type === 'merge') {
                        lines[idx] = `${lead}merge ${act.srcBranch} id: "${vals.id}"`;
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
        break;
      }

      // =========================================================================
      // 9. USER JOURNEY MAP
      // =========================================================================
      case 'journey': {
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
            curSection.tasks.push({
              name,
              score: parseInt(taskMatch[2]),
              actor: taskMatch[3].trim(),
              color: MultiDiagramVisualizer.getColor(name, cardBg),
              fontColor: MultiDiagramVisualizer.getColor(name + ':font', textColor)
            });
          }
        });

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
            card.setAttribute('fill', t.color);
            card.setAttribute('stroke', isSelJ ? 'var(--selection-color)' : cardBorder);
            card.setAttribute('stroke-width', isSelJ ? '2.5' : '1.5');
            if (isSelJ) card.style.filter = selGlow;
            cardG.appendChild(card);

            const tName = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            tName.setAttribute('x', `${x + 10}`);
            tName.setAttribute('y', `${ty + 22}`);
            tName.setAttribute('fill', t.fontColor !== textColor ? t.fontColor : primaryText);
            tName.setAttribute('font-size', '11.5px');
            tName.setAttribute('font-weight', '600');
            tName.textContent = t.name;
            cardG.appendChild(tName);

            const emoji = emojis[t.score] || '🙂';
            const tScore = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            tScore.setAttribute('x', `${x + 10}`);
            tScore.setAttribute('y', `${ty + 44}`);
            tScore.setAttribute('fill', t.fontColor);
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
                    { key: 'color', label: 'Card Fill Color', type: 'color', value: t.color },
                    { key: 'font', label: 'Card Font Color', type: 'color', value: t.fontColor }
                  ],
                  onSave: (vals) => {
                    MultiDiagramVisualizer.setColor(vals.name, vals.color);
                    MultiDiagramVisualizer.setColor(vals.name + ':font', vals.font);
                    MultiDiagramVisualizer.syncColorToCode(vals.name, vals.color);
                    MultiDiagramVisualizer.syncColorToCode(vals.name + ':font', vals.font);
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
        break;
      }

      // =========================================================================
      // 10. MINDMAP
      // =========================================================================
      case 'mindmap': {
        const rawLines = (code || '').split('\n').filter(l => l && !l.trim().startsWith('%%') && !l.trim().startsWith('mindmap'));
        let rootNode = null;
        const stack = [];

        rawLines.forEach(rawLine => {
          const indent = rawLine.search(/\S/);
          if (indent === -1) return;
          const trimmed = rawLine.trim();

          const rootMatch = trimmed.match(/^root(?:\(\(|\(|\[|\{\{|\)\(|\)\])?([^\)\]\}\(]+)(?:\)\)|\)|\]|\}\}|\)\(|\(\[)?/i);
          let text = trimmed;
          let shape = 'rounded';
          let icon = null;

          if (rootMatch && !rootNode) {
            text = rootMatch[1].trim();
            shape = 'circle';
          } else {
            const iconMatch = text.match(/::icon\(([^\)]+)\)/);
            if (iconMatch) {
              icon = iconMatch[1];
              text = text.replace(/::icon\([^\)]+\)/, '').trim();
            }
            const shapeMatch = text.match(/^(\(\([\s\S]+\)\)|\([\s\S]+\)|\[\[[\s\S]+\]\]|\[[\s\S]+\]|\{\{[\s\S]+\}\}|\)[\s\S]+\()/);
            if (shapeMatch) {
              if (text.startsWith('((')) shape = 'circle';
              else if (text.startsWith('(')) shape = 'rounded';
              else if (text.startsWith('[')) shape = 'rectangle';
              else if (text.startsWith('{{')) shape = 'hexagon';
              else if (text.startsWith(')')) shape = 'cloud';
              text = text.replace(/^[\(\[\{\)\s]+|[\)\]\}\(\s]+$/g, '').trim();
            }
          }

          const nodeObj = {
            text,
            shape,
            icon,
            indent,
            children: [],
            level: 0,
            x: 0,
            y: 0,
            width: Math.max(90, text.length * 7.5 + 28),
            height: 34
          };

          if (!rootNode) {
            nodeObj.level = 0;
            nodeObj.width = Math.max(130, text.length * 8 + 36);
            nodeObj.height = 42;
            rootNode = nodeObj;
            stack.push(nodeObj);
          } else {
            while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
              stack.pop();
            }
            const parent = stack[stack.length - 1];
            nodeObj.level = parent.level + 1;
            parent.children.push(nodeObj);
            stack.push(nodeObj);
          }
        });

        if (!rootNode) {
          rootNode = { text: 'Central Topic', shape: 'circle', children: [], level: 0, width: 140, height: 42, x: 0, y: 0 };
        }

        rootNode.x = 420;
        rootNode.y = 260;

        const leftBranches = [];
        const rightBranches = [];

        rootNode.children.forEach((child, idx) => {
          if (idx % 2 === 0) rightBranches.push(child);
          else leftBranches.push(child);
        });

        const calcSubtreeHeight = (node) => {
          if (node.children.length === 0) {
            node.treeHeight = node.height + 18;
            return node.treeHeight;
          }
          let h = 0;
          node.children.forEach(c => { h += calcSubtreeHeight(c); });
          node.treeHeight = Math.max(node.height + 18, h);
          return node.treeHeight;
        };

        leftBranches.forEach(b => calcSubtreeHeight(b));
        rightBranches.forEach(b => calcSubtreeHeight(b));

        const layoutSubtree = (node, parentX, startY, isLeft) => {
          const horizDist = node.level === 1 ? 160 : 130;
          node.x = isLeft ? parentX - horizDist : parentX + horizDist;
          node.y = startY + node.treeHeight / 2;

          let curY = startY;
          node.children.forEach(child => {
            layoutSubtree(child, node.x, curY, isLeft);
            curY += child.treeHeight;
          });
        };

        const leftHeight = leftBranches.reduce((acc, b) => acc + b.treeHeight, 0);
        const rightHeight = rightBranches.reduce((acc, b) => acc + b.treeHeight, 0);

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

        const rootG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        rootG.style.cursor = 'pointer';
        const rootEl = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rootEl.setAttribute('x', `${rootNode.x - rootNode.width / 2}`);
        rootEl.setAttribute('y', `${rootNode.y - rootNode.height / 2}`);
        rootEl.setAttribute('width', `${rootNode.width}`);
        rootEl.setAttribute('height', `${rootNode.height}`);
        rootEl.setAttribute('rx', rootNode.shape === 'circle' ? `${rootNode.height / 2}` : '8');
        const isSelRoot = (rootNode.text === selTitle);
        const rFill = MultiDiagramVisualizer.getColor('root', primaryFill);
        const rFont = MultiDiagramVisualizer.getColor('root:font', primaryText);
        rootEl.setAttribute('fill', rFill);
        rootEl.setAttribute('stroke', isSelRoot ? 'var(--selection-color)' : primaryBorder);
        rootEl.setAttribute('stroke-width', isSelRoot ? '3.5' : '2.5');
        if (isSelRoot) rootEl.style.filter = selGlow;
        rootG.appendChild(rootEl);

        const rootTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        rootTxt.setAttribute('x', `${rootNode.x}`);
        rootTxt.setAttribute('y', `${rootNode.y}`);
        rootTxt.setAttribute('text-anchor', 'middle');
        rootTxt.setAttribute('dominant-baseline', 'central');
        rootTxt.setAttribute('fill', rFont);
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
                { key: 'text', label: 'Central Topic', type: 'text', value: rootNode.text },
                { key: 'shape', label: 'Root Shape', type: 'select', value: rootNode.shape || 'circle', options: [
                  { value: 'circle', label: 'Circle ((Root))' },
                  { value: 'rounded', label: 'Rounded (Root)' },
                  { value: 'rectangle', label: 'Rectangle [Root]' },
                  { value: 'hexagon', label: 'Hexagon {{Root}}' },
                  { value: 'cloud', label: 'Cloud )Root(' }
                ]},
                { key: 'fill', label: 'Root Fill Color', type: 'color', value: rFill },
                { key: 'font', label: 'Root Font Color', type: 'color', value: rFont }
              ],
              onSave: (vals) => {
                MultiDiagramVisualizer.setColor('root', vals.fill);
                MultiDiagramVisualizer.setColor('root:font', vals.font);
                MultiDiagramVisualizer.syncColorToCode('root', vals.fill);
                MultiDiagramVisualizer.syncColorToCode('root:font', vals.font);
                MultiDiagramVisualizer.updateCodeLine((curCode) => {
                  const shapeBrackets = {
                    'circle': ['((', '))'],
                    'rounded': ['(', ')'],
                    'rectangle': ['[', ']'],
                    'hexagon': ['{{', '}}'],
                    'cloud': [')', '(']
                  };
                  const br = shapeBrackets[vals.shape] || ['((', '))'];
                  return curCode.replace(/^(\s*root)(?:[\(\[\{\)\s]+[^\n\(\[\{\)\s]+[\)\]\}\(\s]+|\s+[^\n]+)?/m, `$1${br[0]}${vals.text}${br[1]}`);
                });
              }
            });
          }
        });
        nodesLayer.appendChild(rootG);

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
          const defaultNodeFill = node.level === 1 ? cardBg : (isDark ? '#232527' : '#F8F9FA');
          const nodeFill = MultiDiagramVisualizer.getColor(node.text, defaultNodeFill);
          const defaultNodeFont = node.level === 1 ? primaryText : textColor;
          const nodeFont = MultiDiagramVisualizer.getColor(node.text + ':font', defaultNodeFont);
          rect.setAttribute('fill', nodeFill);
          rect.setAttribute('stroke', isSelMM ? 'var(--selection-color)' : (node.level === 1 ? primaryBorder : cardBorder));
          rect.setAttribute('stroke-width', isSelMM ? '2.5' : (node.level === 1 ? '1.5' : '1'));
          if (isSelMM) rect.style.filter = selGlow;
          g.appendChild(rect);

          const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          txt.setAttribute('x', `${node.x}`);
          txt.setAttribute('y', `${node.y}`);
          txt.setAttribute('text-anchor', 'middle');
          txt.setAttribute('dominant-baseline', 'central');
          txt.setAttribute('fill', nodeFont);
          txt.setAttribute('font-size', node.level === 1 ? '11.5px' : (node.level === 2 ? '11px' : '10px'));
          txt.setAttribute('font-weight', node.level <= 2 ? '600' : 'normal');
          txt.textContent = (node.icon ? '📌 ' : '') + node.text;
          g.appendChild(txt);

          g.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof AppController !== 'undefined' && AppController.instance) {
              AppController.instance.selectVisualObject({
                type: `Mindmap Tier ${node.level}`,
                title: node.text,
                fields: [
                  { key: 'text', label: 'Branch Topic', type: 'text', value: node.text },
                  { key: 'color', label: 'Branch Fill Color', type: 'color', value: nodeFill },
                  { key: 'font', label: 'Branch Font Color', type: 'color', value: nodeFont }
                ],
                onSave: (vals) => {
                  MultiDiagramVisualizer.setColor(vals.text, vals.color);
                  MultiDiagramVisualizer.setColor(vals.text + ':font', vals.font);
                  MultiDiagramVisualizer.syncColorToCode(vals.text, vals.color);
                  MultiDiagramVisualizer.syncColorToCode(vals.text + ':font', vals.font);
                  MultiDiagramVisualizer.updateCodeLine((curCode) => {
                    const lines = curCode.split('\n');
                    const esc = node.text.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                    const idx = lines.findIndex(l => new RegExp(`^\\s*[\\[\\(\\{]*${esc}[\\]\\)\\}\\s]*(?:\\s*|::.*)$`, 'i').test(l.trim()));
                    if (idx !== -1) {
                      const lead = lines[idx].match(/^(\s*)/)[1] || '      ';
                      lines[idx] = `${lead}${vals.text}`;
                    }
                    return lines.join('\n');
                  });
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

      // =========================================================================
      // 11. TIMELINE
      // =========================================================================
      case 'timeline': {
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
            events.push({
              era,
              items: items.length > 0 ? items : ['Milestone Event'],
              color: MultiDiagramVisualizer.getColor(era, colors[events.length % colors.length]),
              fontColor: MultiDiagramVisualizer.getColor(era + ':font', textColor)
            });
          }
        });

        if (events.length === 0) {
          events.push({ era: '2024', items: ['Alpha Prototype'], color: '#2196F3', fontColor: textColor });
          events.push({ era: '2025', items: ['Beta Release'], color: '#4CAF50', fontColor: textColor });
          events.push({ era: '2026', items: ['Production Launch'], color: '#FF9800', fontColor: textColor });
        }

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

          const nodeCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          nodeCircle.setAttribute('cx', `${ex}`);
          nodeCircle.setAttribute('cy', `${axisY}`);
          nodeCircle.setAttribute('r', '10');
          nodeCircle.setAttribute('fill', ev.color);
          nodeCircle.setAttribute('stroke', '#FFFFFF');
          nodeCircle.setAttribute('stroke-width', '3');
          nodesLayer.appendChild(nodeCircle);

          const eraTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          eraTxt.setAttribute('x', `${ex}`);
          eraTxt.setAttribute('y', `${axisY - 24}`);
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
          cardRect.setAttribute('stroke', isSelTime ? 'var(--selection-color)' : (ev.color !== colors[eIdx % colors.length] ? ev.color : cardBorder));
          if (isSelTime) {
            cardRect.setAttribute('stroke-width', '2.5');
            cardRect.style.filter = selGlow;
          }
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

          cardG.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof AppController !== 'undefined' && AppController.instance) {
              AppController.instance.selectVisualObject({
                type: 'Timeline Milestone',
                title: ev.era,
                fields: [
                  { key: 'era', label: 'Era / Year', type: 'text', value: ev.era },
                  { key: 'items', label: 'Milestone Events (Comma Separated)', type: 'textarea', rows: 2, value: ev.items.join(', ') },
                  { key: 'color', label: 'Milestone Accent Color', type: 'color', value: ev.color },
                  { key: 'font', label: 'Milestone Font Color', type: 'color', value: ev.fontColor }
                ],
                onSave: (vals) => {
                  MultiDiagramVisualizer.setColor(vals.era, vals.color);
                  MultiDiagramVisualizer.setColor(vals.era + ':font', vals.font);
                  MultiDiagramVisualizer.syncColorToCode(vals.era, vals.color);
                  MultiDiagramVisualizer.syncColorToCode(vals.era + ':font', vals.font);
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
        break;
      }

      // =========================================================================
      // 12. QUADRANT MATRIX
      // =========================================================================
      case 'quadrant': {
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
              color: MultiDiagramVisualizer.getColor(rawItemName, colors[items.length % colors.length]),
              fontColor: MultiDiagramVisualizer.getColor(rawItemName + ':font', textColor)
            });
          }
        });

        const cx = 350;
        const cy = 250;
        const boxSize = 180;

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
          nodesLayer.appendChild(t);
        };

        addQBadge('⭐ ' + qNames.q1, cx + boxSize / 2, cy - boxSize + 18);
        addQBadge('🔥 ' + qNames.q2, cx - boxSize / 2, cy - boxSize + 18);
        addQBadge('💤 ' + qNames.q3, cx - boxSize / 2, cy + 20);
        addQBadge('⚡ ' + qNames.q4, cx + boxSize / 2, cy + 20);

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
          circle.setAttribute('fill', it.color);
          circle.setAttribute('stroke', isSelQuad ? 'var(--selection-color)' : '#FFFFFF');
          circle.setAttribute('stroke-width', isSelQuad ? '3.5' : '2');
          if (isSelQuad) circle.style.filter = selGlow;
          itemG.appendChild(circle);

          const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          txt.setAttribute('x', `${px + 12}`);
          txt.setAttribute('y', `${py + 4}`);
          txt.setAttribute('fill', it.fontColor);
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
                  { key: 'color', label: 'Point Color', type: 'color', value: it.color },
                  { key: 'font', label: 'Point Font Color', type: 'color', value: it.fontColor }
                ],
                onSave: (vals) => {
                  MultiDiagramVisualizer.setColor(vals.name, vals.color);
                  MultiDiagramVisualizer.setColor(vals.name + ':font', vals.font);
                  MultiDiagramVisualizer.syncColorToCode(vals.name, vals.color);
                  MultiDiagramVisualizer.syncColorToCode(vals.name + ':font', vals.font);
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
        break;
      }

      // =========================================================================
      // 13. SANKEY FLOW DIAGRAM
      // =========================================================================
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

        const drawBox = (name, x, y, defaultColor) => {
          const color = MultiDiagramVisualizer.getColor(name, defaultColor);
          const fontColor = MultiDiagramVisualizer.getColor(name + ':font', '#FFFFFF');
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
          txt.setAttribute('fill', fontColor);
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
                  { key: 'name', label: 'Node Label', type: 'text', value: name },
                  { key: 'color', label: 'Node Fill Color', type: 'color', value: color },
                  { key: 'font', label: 'Node Font Color', type: 'color', value: fontColor }
                ],
                onSave: (vals) => {
                  MultiDiagramVisualizer.setColor(vals.name, vals.color);
                  MultiDiagramVisualizer.setColor(vals.name + ':font', vals.font);
                  MultiDiagramVisualizer.syncColorToCode(vals.name, vals.color);
                  MultiDiagramVisualizer.syncColorToCode(vals.name + ':font', vals.font);
                  MultiDiagramVisualizer.updateCodeLine((curCode) => {
                    const lines = curCode.split('\n');
                    for (let i = 0; i < lines.length; i++) {
                      const parts = lines[i].split(',').map(s => s.trim());
                      if (parts.length >= 3) {
                        let changed = false;
                        if (parts[0].toLowerCase() === name.toLowerCase()) { parts[0] = vals.name; changed = true; }
                        if (parts[1].toLowerCase() === name.toLowerCase()) { parts[1] = vals.name; changed = true; }
                        if (changed) {
                          const lead = lines[i].match(/^(\s*)/)[1] || '  ';
                          lines[i] = `${lead}${parts.join(', ')}`;
                        }
                      }
                    }
                    return lines.join('\n');
                  });
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
          const flowKey = `${f.src}->${f.tgt}`;
          const flowColor = MultiDiagramVisualizer.getColor(flowKey, sInfo.color);
          const isSelFlow = (`${f.src} → ${f.tgt}` === selTitle);

          const x1 = sInfo.x + 130;
          const y1 = sInfo.y + 22;
          const x2 = tInfo.x;
          const y2 = tInfo.y + 22;

          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', `M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`);
          path.setAttribute('fill', 'none');
          path.setAttribute('stroke', isSelFlow ? 'var(--selection-color)' : flowColor);
          path.setAttribute('stroke-width', `${Math.max(4, Math.min(26, f.val / 250))}`);
          path.setAttribute('opacity', isSelFlow ? '1' : '0.45');
          if (isSelFlow) path.style.filter = selGlow;
          path.style.cursor = 'pointer';

          path.addEventListener('mousedown', (e) => e.stopPropagation());
          path.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof AppController !== 'undefined' && AppController.instance) {
              AppController.instance.selectVisualObject({
                type: 'Sankey Flow',
                title: `${f.src} → ${f.tgt}`,
                fields: [
                  { key: 'src', label: 'Source Node', type: 'text', value: f.src },
                  { key: 'tgt', label: 'Target Node', type: 'text', value: f.tgt },
                  { key: 'val', label: 'Flow Volume / Value', type: 'number', min: 1, step: 10, value: f.val },
                  { key: 'color', label: 'Flow Band Color', type: 'color', value: flowColor }
                ],
                onSave: (vals) => {
                  const newFlowKey = `${vals.src}->${vals.tgt}`;
                  MultiDiagramVisualizer.setColor(newFlowKey, vals.color);
                  MultiDiagramVisualizer.syncColorToCode(newFlowKey, vals.color);
                  MultiDiagramVisualizer.updateCodeLine((curCode) => {
                    const lines = curCode.split('\n');
                    for (let i = 0; i < lines.length; i++) {
                      const parts = lines[i].split(',').map(s => s.trim());
                      if (parts.length >= 3) {
                        if (parts[0].toLowerCase() === f.src.toLowerCase() && parts[1].toLowerCase() === f.tgt.toLowerCase()) {
                          const lead = lines[i].match(/^(\s*)/)[1] || '  ';
                          lines[i] = `${lead}${vals.src}, ${vals.tgt}, ${vals.val}`;
                          break;
                        }
                      }
                    }
                    return lines.join('\n');
                  });
                }
              });
            }
          });

          edgesLayer.appendChild(path);
        });
        break;
      }
    }
  }
}
