// --- SEQUENCE DIAGRAM VISUALIZER ---
MultiDiagramVisualizer.register('sequence', function(code, nodesLayer, edgesLayer, isDark) {
  const primaryText = isDark ? '#FFFFFF' : '#1F2937';
  const textColor = isDark ? '#E0E0E0' : '#374151';
  const cardBg = isDark ? '#222538' : '#EEF0FF';
  const cardBorder = isDark ? '#7986CB' : '#5C6BC0';
  const lifelineColor = isDark ? '#7986CB' : '#7986CB';
  const linkColor = isDark ? '#E0E0E0' : '#374151';
  const selTitle = (typeof AppController !== 'undefined' && AppController.instance && AppController.instance.selectedVisualObject) ? AppController.instance.selectedVisualObject.title : null;
  const selGlow = 'drop-shadow(0 0 6px rgba(33, 150, 243, 0.8))';

  // 1. DYNAMIC PARSER
  const rawLines = (code || '').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('%%') && !l.startsWith('sequenceDiagram'));

  let autoNumber = false;
  const participantsMap = new Map();
  const events = [];

  const ensureParticipant = (id, alias = null, isActor = false) => {
    if (!participantsMap.has(id)) {
      participantsMap.set(id, {
        id,
        label: alias || id,
        isActor
      });
    } else {
      const p = participantsMap.get(id);
      if (alias) p.label = alias;
      if (isActor) p.isActor = true;
    }
    return participantsMap.get(id);
  };

  let curAlt = null;

  rawLines.forEach(line => {
    if (line === 'autonumber') {
      autoNumber = true;
      return;
    }

    const actorM = line.match(/^actor\s+([A-Za-z0-9_]+)(?:\s+as\s+(.+))?/i);
    if (actorM) {
      ensureParticipant(actorM[1], actorM[2] ? actorM[2].trim() : null, true);
      return;
    }

    const partM = line.match(/^participant\s+([A-Za-z0-9_]+)(?:\s+as\s+(.+))?/i);
    if (partM) {
      ensureParticipant(partM[1], partM[2] ? partM[2].trim() : null, false);
      return;
    }

    const actM = line.match(/^activate\s+([A-Za-z0-9_]+)/i);
    if (actM) {
      events.push({ type: 'activate', id: actM[1] });
      return;
    }
    const deactM = line.match(/^deactivate\s+([A-Za-z0-9_]+)/i);
    if (deactM) {
      events.push({ type: 'deactivate', id: deactM[1] });
      return;
    }

    const altM = line.match(/^alt(?:\s+(.+))?/i);
    if (altM) {
      curAlt = { label: altM[1] ? altM[1].trim() : 'alt', elseLabel: null };
      events.push({ type: 'alt_start', label: curAlt.label });
      return;
    }
    const elseM = line.match(/^else(?:\s+(.+))?/i);
    if (elseM) {
      events.push({ type: 'else', label: elseM[1] ? elseM[1].trim() : '' });
      return;
    }
    if (line === 'end') {
      events.push({ type: 'end' });
      curAlt = null;
      return;
    }

    const msgM = line.match(/^([A-Za-z0-9_]+)\s*(-->>|->>|-->|->)\s*([A-Za-z0-9_]+)\s*:\s*(.+)$/);
    if (msgM) {
      const src = msgM[1];
      const arrow = msgM[2];
      const tgt = msgM[3];
      const label = msgM[4].trim();

      ensureParticipant(src);
      ensureParticipant(tgt);

      events.push({
        type: 'message',
        src,
        tgt,
        arrow,
        label,
        isDashed: arrow.includes('--')
      });
    }
  });

  const participants = Array.from(participantsMap.values());
  if (participants.length === 0) {
    ensureParticipant('Customer', null, true);
    ensureParticipant('Shop', 'Web Shop', false);
    ensureParticipant('Pay', 'Payment Service', false);
    ensureParticipant('Bank', null, false);
  }

  // 2. PARTICIPANT HORIZONTAL POSITIONS
  const partPositions = new Map();
  const baseSpacing = 270;
  const startX = 100;
  const partCardW = 160;
  const partCardH = 50;

  participants.forEach((p, idx) => {
    const defaultX = startX + idx * baseSpacing;
    const pos = MultiDiagramVisualizer.getPosition(p.id, defaultX, 40);
    const size = MultiDiagramVisualizer.getSize(p.id, partCardW, partCardH);
    partPositions.set(p.id, { x: pos.x, y: 40, isActor: p.isActor, label: p.label, id: p.id, width: size.width, height: size.height });
  });

  let curY = 190;
  const stepY = 60;
  const messageLayouts = [];
  let msgCounter = 1;

  let altBoxStart = null;
  let altBoxElse = null;
  let altBoxEnd = null;
  let altTitle = 'Payment approved';
  let elseTitle = 'Payment declined';

  events.forEach(ev => {
    if (ev.type === 'message') {
      messageLayouts.push({
        num: autoNumber ? msgCounter++ : null,
        src: ev.src,
        tgt: ev.tgt,
        label: ev.label,
        isDashed: ev.isDashed,
        y: curY
      });
      curY += stepY;
    } else if (ev.type === 'alt_start') {
      altBoxStart = curY - 25;
      altTitle = ev.label;
      curY += 20;
    } else if (ev.type === 'else') {
      altBoxElse = curY - 15;
      elseTitle = ev.label;
      curY += 20;
    } else if (ev.type === 'end') {
      altBoxEnd = curY + 10;
      curY += 30;
    }
  });

  const bottomY = curY + 40;

  // 3. RENDER LIFELINES
  participants.forEach(p => {
    const pPos = partPositions.get(p.id);
    const lineX = pPos.x;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', `${lineX}`);
    line.setAttribute('y1', '90');
    line.setAttribute('x2', `${lineX}`);
    line.setAttribute('y2', `${bottomY}`);
    line.setAttribute('stroke', lifelineColor);
    line.setAttribute('stroke-width', '1.5');
    edgesLayer.appendChild(line);
  });

  // 4. RENDER ACTIVATION BARS
  const shopPos = partPositions.get('Shop');
  if (shopPos) {
    const actShop = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    actShop.setAttribute('x', `${shopPos.x - 6}`);
    actShop.setAttribute('y', '190');
    actShop.setAttribute('width', '12');
    actShop.setAttribute('height', `${bottomY - 210}`);
    actShop.setAttribute('rx', '1');
    actShop.setAttribute('fill', isDark ? '#2D3748' : '#F3F4F6');
    actShop.setAttribute('stroke', isDark ? '#90CAF9' : '#7986CB');
    actShop.setAttribute('stroke-width', '1.2');
    edgesLayer.appendChild(actShop);
  }

  const payPos = partPositions.get('Pay');
  if (payPos) {
    const actPay = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    actPay.setAttribute('x', `${payPos.x - 6}`);
    actPay.setAttribute('y', '270');
    actPay.setAttribute('width', '12');
    actPay.setAttribute('height', `${bottomY - 290}`);
    actPay.setAttribute('rx', '1');
    actPay.setAttribute('fill', isDark ? '#2D3748' : '#F3F4F6');
    actPay.setAttribute('stroke', isDark ? '#90CAF9' : '#7986CB');
    actPay.setAttribute('stroke-width', '1.2');
    edgesLayer.appendChild(actPay);
  }

  // 5. RENDER ALT / ELSE FRAME
  if (altBoxStart && altBoxEnd) {
    const minX = Math.min(...Array.from(partPositions.values()).map(p => p.x)) - 14;
    const maxX = (payPos ? payPos.x : 650) + 16;
    const frameW = maxX - minX;
    const frameH = altBoxEnd - altBoxStart;

    const altG = document.createElementNS('http://www.w3.org/2000/svg', 'g');

    const altRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    altRect.setAttribute('x', `${minX}`);
    altRect.setAttribute('y', `${altBoxStart}`);
    altRect.setAttribute('width', `${frameW}`);
    altRect.setAttribute('height', `${frameH}`);
    altRect.setAttribute('fill', 'transparent');
    altRect.setAttribute('stroke', isDark ? '#9FA8DA' : '#7986CB');
    altRect.setAttribute('stroke-width', '1.5');
    altRect.setAttribute('stroke-dasharray', '3 3');
    altG.appendChild(altRect);

    const tabBg = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    tabBg.setAttribute('d', `M ${minX} ${altBoxStart} L ${minX + 55} ${altBoxStart} L ${minX + 65} ${altBoxStart + 14} L ${minX + 55} ${altBoxStart + 28} L ${minX} ${altBoxStart + 28} Z`);
    tabBg.setAttribute('fill', isDark ? '#222538' : '#EEF0FF');
    tabBg.setAttribute('stroke', isDark ? '#9FA8DA' : '#7986CB');
    tabBg.setAttribute('stroke-width', '1.2');
    altG.appendChild(tabBg);

    const tabTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    tabTxt.setAttribute('x', `${minX + 27}`);
    tabTxt.setAttribute('y', `${altBoxStart + 18}`);
    tabTxt.setAttribute('text-anchor', 'middle');
    tabTxt.setAttribute('fill', primaryText);
    tabTxt.setAttribute('font-size', '13px');
    tabTxt.setAttribute('font-weight', '700');
    tabTxt.textContent = 'alt';
    altG.appendChild(tabTxt);

    const cond1Txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    cond1Txt.setAttribute('x', `${(shopPos ? shopPos.x : 360) + 40}`);
    cond1Txt.setAttribute('y', `${altBoxStart + 20}`);
    cond1Txt.setAttribute('text-anchor', 'middle');
    cond1Txt.setAttribute('fill', primaryText);
    cond1Txt.setAttribute('font-size', '13.5px');
    cond1Txt.setAttribute('font-weight', '600');
    cond1Txt.textContent = `[${altTitle}]`;
    altG.appendChild(cond1Txt);

    if (altBoxElse) {
      const elseLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      elseLine.setAttribute('x1', `${minX}`);
      elseLine.setAttribute('y1', `${altBoxElse}`);
      elseLine.setAttribute('x2', `${maxX}`);
      elseLine.setAttribute('y2', `${altBoxElse}`);
      elseLine.setAttribute('stroke', isDark ? '#9FA8DA' : '#7986CB');
      elseLine.setAttribute('stroke-width', '1.5');
      elseLine.setAttribute('stroke-dasharray', '3 3');
      altG.appendChild(elseLine);

      const cond2Txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      cond2Txt.setAttribute('x', `${(shopPos ? shopPos.x : 360) + 40}`);
      cond2Txt.setAttribute('y', `${altBoxElse + 20}`);
      cond2Txt.setAttribute('text-anchor', 'middle');
      cond2Txt.setAttribute('fill', primaryText);
      cond2Txt.setAttribute('font-size', '13.5px');
      cond2Txt.setAttribute('font-weight', '600');
      cond2Txt.textContent = `[${elseTitle}]`;
      altG.appendChild(cond2Txt);
    }

    edgesLayer.appendChild(altG);
  }

  // 6. RENDER MESSAGES & AUTONUMBER BADGES
  const nodeObstacles = Array.from(partPositions.values()).map(p => ({ x: p.x - p.width / 2, y: p.y - p.height / 2, width: p.width, height: p.height }));
  const placedLabelRects = [];

  messageLayouts.forEach(msg => {
    const sPos = partPositions.get(msg.src);
    const tPos = partPositions.get(msg.tgt);
    if (!sPos || !tPos) return;

    const x1 = sPos.x;
    const x2 = tPos.x;
    const y = msg.y;
    const isLeftToRight = x2 > x1;

    const msgKey = `${msg.src}->${msg.tgt}:${msg.label}`;
    const msgColor = MultiDiagramVisualizer.getColor(msgKey, linkColor);
    const msgWidth = MultiDiagramVisualizer.getColor(`${msgKey}_width`, '1.4');

    // Connector routing. Both ends of a message sit on the same y (they run between
    // lifelines), so the shared engine would collapse all three styles into one flat
    // line — the styles are expressed vertically instead: a bow for curved, a lift-and-
    // drop bracket for stepped.
    const connStyle = Utils.normalizeConnector(MultiDiagramVisualizer.getColor(`${msgKey}_conn`, 'straight'), 'straight');
    const stepLift = 16;
    let msgPathD;
    if (connStyle === 'curve') {
      const bow = Utils.clamp(Math.abs(x2 - x1) * 0.12, 12, 28);
      msgPathD = `M ${x1} ${y} Q ${(x1 + x2) / 2} ${y - bow}, ${x2} ${y}`;
    } else if (connStyle === 'step') {
      msgPathD = `M ${x1} ${y} L ${x1} ${y - stepLift} L ${x2} ${y - stepLift} L ${x2} ${y}`;
    } else {
      msgPathD = `M ${x1} ${y} L ${x2} ${y}`;
    }

    const msgG = document.createElementNS('http://www.w3.org/2000/svg', 'g');

    const hitbox = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hitbox.setAttribute('d', msgPathD);
    hitbox.setAttribute('fill', 'none');
    hitbox.setAttribute('stroke', 'transparent');
    hitbox.setAttribute('stroke-width', '24');
    hitbox.style.cursor = 'pointer';
    msgG.appendChild(hitbox);

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    line.setAttribute('d', msgPathD);
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke', msgColor);
    line.setAttribute('stroke-width', msgWidth);
    if (msg.isDashed) line.setAttribute('stroke-dasharray', '4 3');
    msgG.appendChild(line);

    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    const ax = isLeftToRight ? x2 : x2;
    if (connStyle === 'step') {
      // A stepped message arrives travelling straight down its target lifeline.
      arrow.setAttribute('points', `${ax},${y} ${ax - 5},${y - 9} ${ax + 5},${y - 9}`);
    } else if (isLeftToRight) {
      arrow.setAttribute('points', `${ax},${y} ${ax - 9},${y - 5} ${ax - 9},${y + 5}`);
    } else {
      arrow.setAttribute('points', `${ax},${y} ${ax + 9},${y - 5} ${ax + 9},${y + 5}`);
    }
    arrow.setAttribute('fill', msg.isDashed ? (isDark ? '#222538' : '#FFFFFF') : msgColor);
    arrow.setAttribute('stroke', msgColor);
    arrow.setAttribute('stroke-width', '1.2');
    msgG.appendChild(arrow);

    if (msg.num !== null) {
      const badgeG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      badgeG.setAttribute('transform', `translate(${x1}, ${y})`);

      const badgeCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      badgeCircle.setAttribute('r', '12');
      badgeCircle.setAttribute('fill', '#2D2D2D');
      badgeCircle.setAttribute('stroke', '#FFFFFF');
      badgeCircle.setAttribute('stroke-width', '1');
      badgeG.appendChild(badgeCircle);

      const badgeTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      badgeTxt.setAttribute('text-anchor', 'middle');
      badgeTxt.setAttribute('dominant-baseline', 'central');
      badgeTxt.setAttribute('fill', '#FFFFFF');
      badgeTxt.setAttribute('font-size', '11.5px');
      badgeTxt.setAttribute('font-weight', '700');
      badgeTxt.textContent = `${msg.num}`;
      badgeG.appendChild(badgeTxt);

      msgG.appendChild(badgeG);
    }

    const labelW = msg.label.length * 6.5 + 8;
    const labelH = 16;
    // Stepped messages route above the line, so the label starts above the lifted leg.
    const labelBaseY = connStyle === 'step' ? y - stepLift - 9 : y - 9;
    const { x: labelX, y: labelY } = Utils.findClearLabelPosition((x1 + x2) / 2, labelBaseY, labelW, labelH, [...nodeObstacles, ...placedLabelRects]);
    placedLabelRects.push({ x: labelX - labelW / 2, y: labelY - labelH / 2, width: labelW, height: labelH });

    const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textEl.setAttribute('x', `${labelX}`);
    textEl.setAttribute('y', `${labelY}`);
    textEl.setAttribute('text-anchor', 'middle');
    textEl.setAttribute('fill', primaryText);
    textEl.setAttribute('font-size', '13.5px');
    textEl.setAttribute('font-weight', '500');
    textEl.textContent = msg.label;
    msgG.appendChild(textEl);

    const allPartOptions = participants.map(p => ({ value: p.id, label: p.label ? `${p.id} (${p.label})` : p.id }));

    msgG.addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof AppController !== 'undefined' && AppController.instance) {
        AppController.instance.selectVisualObject({
          type: 'Sequence Message Link',
          title: msg.label || `${msg.src} -> ${msg.tgt}`,
          fields: [
            { key: 'src', label: 'From (Sender)', type: 'select', value: msg.src, options: allPartOptions },
            { key: 'tgt', label: 'To (Receiver)', type: 'select', value: msg.tgt, options: allPartOptions },
            { key: 'label', label: Utils.FIELD_LABELS.linkLabel, type: 'text', value: msg.label },
            { key: 'arrow', label: `${Utils.FIELD_LABELS.linkType} (Includes Bi-directional)`, type: 'select', value: msg.arrow || (msg.isDashed ? '-->>' : '->>'), options: [
                { value: '->>', label: 'Forward Solid Synchronous (->>)' },
                { value: '-->>', label: 'Forward Dashed Return (-->>)' },
                { value: '->', label: 'Forward Open Async (->)' },
                { value: '-->', label: 'Forward Dashed Open (-->)' },
                { value: '<->', label: 'Bidirectional Open (<->)' },
                { value: '<->>', label: 'Bidirectional Solid (<->>)' }
            ]},
            { key: 'color', label: Utils.FIELD_LABELS.lineColor, type: 'color', value: msgColor },
            { key: 'width', label: Utils.FIELD_LABELS.lineWidth, type: 'select', value: msgWidth, options: Utils.widthOptions(['1', '1.4', '2.2', '3'], '1.4') },
            { key: 'connector', label: Utils.FIELD_LABELS.connector, type: 'select', value: connStyle, options: Utils.CONNECTOR_OPTIONS }
          ],
          onSave: (vals) => {
            const newMsgKey = `${vals.src || msg.src}->${vals.tgt || msg.tgt}:${vals.label !== undefined ? vals.label : msg.label}`;
            MultiDiagramVisualizer.setColor(newMsgKey, vals.color);
            MultiDiagramVisualizer.setColor(`${newMsgKey}_width`, vals.width);
            MultiDiagramVisualizer.setColor(`${newMsgKey}_conn`, vals.connector);
            MultiDiagramVisualizer.syncColorToCode(newMsgKey, vals.color);
            MultiDiagramVisualizer.updateCodeLine((curCode) => {
              const lines = curCode.split('\n');
              for (let i = 0; i < lines.length; i++) {
                const m = lines[i].match(new RegExp(`(${msg.src})\\s*(-->>|->>|-->|->|<->|<->>)\\s*(${msg.tgt})\\s*:\\s*(.+)`));
                if (m) {
                  const lead = lines[i].match(/^\s*/)[0] || '    ';
                  lines[i] = `${lead}${vals.src || msg.src}${vals.arrow || msg.arrow}${vals.tgt || msg.tgt}: ${vals.label || msg.label}`;
                  break;
                }
              }
              return lines.join('\n');
            });
          }
        });
      }
    });

    edgesLayer.appendChild(msgG);
  });

  // 7. RENDER PARTICIPANT HEADERS & FOOTERS
  participants.forEach(p => {
    const pPos = partPositions.get(p.id);
    const fillColor = MultiDiagramVisualizer.getColor(p.id, cardBg);
    const fontColor = MultiDiagramVisualizer.getColor(`${p.id}_font`, primaryText);
    const borderColor = MultiDiagramVisualizer.getColor(`${p.id}_border`, cardBorder);
    const isSelected = (p.label === selTitle || p.id === selTitle);

    const renderHeaderOrFooter = (yPos, isTop = true) => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      // A service participant is a box that takes its size directly; an actor is a
      // stick figure, so it is scaled by the same ratio instead.
      const actorScale = p.isActor
        ? ` scale(${pPos.width / partCardW}, ${pPos.height / partCardH})`
        : '';
      g.setAttribute('transform', `translate(${pPos.x}, ${yPos})${actorScale}`);
      g.style.cursor = 'grab';

      if (p.isActor) {
        const head = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        head.setAttribute('cx', '0');
        head.setAttribute('cy', '-16');
        head.setAttribute('r', '14');
        head.setAttribute('fill', fillColor);
        head.setAttribute('stroke', isSelected ? 'var(--selection-color)' : borderColor);
        head.setAttribute('stroke-width', '2');
        if (isSelected) head.style.filter = selGlow;
        g.appendChild(head);

        const body = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        body.setAttribute('x1', '0');
        body.setAttribute('y1', '-2');
        body.setAttribute('x2', '0');
        body.setAttribute('y2', '22');
        body.setAttribute('stroke', borderColor);
        body.setAttribute('stroke-width', '2');
        g.appendChild(body);

        const arms = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        arms.setAttribute('x1', '-18');
        arms.setAttribute('y1', '6');
        arms.setAttribute('x2', '18');
        arms.setAttribute('y2', '6');
        arms.setAttribute('stroke', borderColor);
        arms.setAttribute('stroke-width', '2');
        g.appendChild(arms);

        const legL = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        legL.setAttribute('x1', '0');
        legL.setAttribute('y1', '22');
        legL.setAttribute('x2', '-16');
        legL.setAttribute('y2', '42');
        legL.setAttribute('stroke', borderColor);
        legL.setAttribute('stroke-width', '2');
        g.appendChild(legL);

        const legR = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        legR.setAttribute('x1', '0');
        legR.setAttribute('y1', '22');
        legR.setAttribute('x2', '16');
        legR.setAttribute('y2', '42');
        legR.setAttribute('stroke', borderColor);
        legR.setAttribute('stroke-width', '2');
        g.appendChild(legR);

        const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        txt.setAttribute('x', '0');
        txt.setAttribute('y', '58');
        txt.setAttribute('text-anchor', 'middle');
        txt.setAttribute('fill', fontColor);
        txt.setAttribute('font-size', '14px');
        txt.setAttribute('font-weight', '700');
        txt.textContent = p.label;
        g.appendChild(txt);
      } else {
        const cardW = pPos.width;
        const cardH = pPos.height;

        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', `${-cardW / 2}`);
        rect.setAttribute('y', `${-cardH / 2}`);
        rect.setAttribute('width', `${cardW}`);
        rect.setAttribute('height', `${cardH}`);
        rect.setAttribute('rx', '4');
        rect.setAttribute('fill', fillColor);
        rect.setAttribute('stroke', isSelected ? 'var(--selection-color)' : borderColor);
        rect.setAttribute('stroke-width', isSelected ? '2.5' : '1.5');
        if (isSelected) rect.style.filter = selGlow;
        g.appendChild(rect);

        const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        txt.setAttribute('x', '0');
        txt.setAttribute('y', '5');
        txt.setAttribute('text-anchor', 'middle');
        txt.setAttribute('fill', fontColor);
        txt.setAttribute('font-size', '14px');
        txt.setAttribute('font-weight', '700');
        txt.textContent = p.label;
        g.appendChild(txt);
      }

      MultiDiagramVisualizer.makeDraggable(
        g,
        p.id,
        () => MultiDiagramVisualizer.getPosition(p.id, pPos.x, 40),
        (nx, ny) => MultiDiagramVisualizer.setPosition(p.id, nx, 40)
      );

      g.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof AppController !== 'undefined' && AppController.instance) {
          AppController.instance.selectVisualObject({
            type: p.isActor ? 'Actor Participant' : 'Service Participant',
            title: p.label,
            fields: [
              { key: 'name', label: 'Participant Name', type: 'text', value: p.label },
              ...Utils.sizeFields(pPos.width, pPos.height),
              { key: 'font', label: Utils.FIELD_LABELS.font, type: 'color', value: fontColor },
              { key: 'fill', label: Utils.FIELD_LABELS.fill, type: 'color', value: fillColor },
              { key: 'border', label: Utils.FIELD_LABELS.border, type: 'color', value: borderColor }
            ],
            onSave: (vals) => {
              MultiDiagramVisualizer.setSize(p.id, vals.nodeW, vals.nodeH);
              MultiDiagramVisualizer.setColor(p.id, vals.fill);
              MultiDiagramVisualizer.setColor(`${p.id}_font`, vals.font);
              MultiDiagramVisualizer.setColor(`${p.id}_border`, vals.border);
              MultiDiagramVisualizer.syncColorToCode(p.id, vals.fill);
              MultiDiagramVisualizer.syncColorToCode(`${p.id}_font`, vals.font);
              MultiDiagramVisualizer.syncColorToCode(`${p.id}_border`, vals.border);
            }
          });
        }
      });

      nodesLayer.appendChild(g);
    };

    renderHeaderOrFooter(p.isActor ? 35 : 40, true);
    renderHeaderOrFooter(p.isActor ? bottomY + 30 : bottomY + 30, false);
  });
});
MultiDiagramVisualizer.register('sequenceDiagram', MultiDiagramVisualizer.renderers.get('sequence'));
