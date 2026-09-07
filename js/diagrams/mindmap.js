// --- MINDMAP VISUALIZER ---
MultiDiagramVisualizer.register('mindmap', function(code, nodesLayer, edgesLayer, isDark) {
  const primaryText = isDark ? '#FFFFFF' : '#1F2937';
  const textColor = isDark ? '#E5E7EB' : '#374151';
  const cardBg = isDark ? '#1E222A' : '#FFFFFF';
  const cardBorder = isDark ? '#7986CB' : '#5C6BC0';
  const primaryBorder = isDark ? '#1976D2' : '#0288D1';
  const primaryFill = isDark ? '#1E3A5F' : '#E3F2FD';
  const linkColor = isDark ? '#90CAF9' : '#1976D2';
  const selTitle = (typeof AppController !== 'undefined' && AppController.instance && AppController.instance.selectedVisualObject) ? AppController.instance.selectedVisualObject.title : null;
  const selGlow = 'drop-shadow(0 0 6px rgba(33, 150, 243, 0.8))';

  const pastelBranchColors = isDark
    ? ['#1E3A5F', '#1B4D3E', '#4A3B18', '#3E244D', '#1B4A4E', '#4D1E36']
    : ['#E3F2FD', '#E8F5E9', '#FFF3E0', '#F3E5F5', '#E0F7FA', '#FCE4EC'];

  const pastelBranchBorders = isDark
    ? ['#42A5F5', '#66BB6A', '#FFA726', '#AB47BC', '#26C6DA', '#EC407A']
    : ['#90CAF9', '#A5D6A7', '#FFE082', '#CE93D8', '#80DEEA', '#F48FB1'];

  const rawLines = (code || '').split('\n').filter(l => l && !l.trim().startsWith('%%') && !l.trim().startsWith('mindmap'));
  let rootNode = null;
  const stack = [];
  let nodeCounter = 0;

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
      const shapeMatch = text.match(/^(\(\([\s\S]+\)\)|\([\s\S]+\)|\b\[\[[\s\S]+\]\]|\[[\s\S]+\]|\{\{[\s\S]+\}\}|\)[\s\S]+\()/);
      if (shapeMatch) {
        if (text.startsWith('((')) shape = 'circle';
        else if (text.startsWith('(')) shape = 'rounded';
        else if (text.startsWith('[')) shape = 'rectangle';
        else if (text.startsWith('{{')) shape = 'hexagon';
        else if (text.startsWith(')')) shape = 'cloud';
        text = text.replace(/^[\(\[\{\)\s]+|[\)\]\}\(\s]+$/g, '').trim();
      }
    }

    nodeCounter++;
    const nodeObj = {
      id: `mm_node_${nodeCounter}`,
      text,
      shape,
      icon,
      indent,
      children: [],
      level: 0,
      branchIdx: 0,
      x: 0,
      y: 0,
      width: Math.max(90, text.length * 7.5 + 32),
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
    rootNode = { id: 'mm_root', text: 'Central Topic', shape: 'circle', children: [], level: 0, width: 140, height: 42, x: 0, y: 0 };
  }

  const rootDefPos = MultiDiagramVisualizer.getPosition('root', 440, 280);
  rootNode.x = rootDefPos.x;
  rootNode.y = rootDefPos.y;

  const leftBranches = [];
  const rightBranches = [];

  rootNode.children.forEach((child, idx) => {
    child.branchIdx = idx;
    if (idx % 2 === 0) rightBranches.push(child);
    else leftBranches.push(child);
  });

  const assignBranchIndices = (node, bIdx) => {
    node.branchIdx = bIdx;
    node.children.forEach(c => assignBranchIndices(c, bIdx));
  };
  rootNode.children.forEach((child, idx) => assignBranchIndices(child, idx));

  // Flat topic list, used by the branch-link inspector to offer re-parenting.
  const allTopics = [];
  const collectTopics = (node) => {
    allTopics.push(node);
    node.children.forEach(collectTopics);
  };
  collectTopics(rootNode);
  const allTopicOptions = allTopics.map(n => ({ value: n.text, label: n.level === 0 ? `${n.text} (root)` : n.text }));

  // Text of a mindmap source line, mirroring how the parser above strips shape
  // wrappers and ::icon() so a topic can be matched back to the line that defines it.
  const lineTopicText = (line) => {
    const t = (line || '').trim();
    if (!t) return '';
    const rootM = t.match(/^root(?:\(\(|\(|\[|\{\{|\)\(|\)\])?([^\)\]\}\(]+)/i);
    if (rootM) return rootM[1].trim();
    return t
      .replace(/::icon\([^\)]+\)/, '')
      .trim()
      .replace(/^[\(\[\{\)\s]+|[\)\]\}\(\s]+$/g, '')
      .trim();
  };

  // Moves a topic (with its whole subtree) under another topic by re-indenting and
  // re-inserting those lines. Refuses moves that would put a topic inside itself.
  const reparentTopic = (curCode, childText, newParentText) => {
    const lines = curCode.split('\n');
    const indentOf = (l) => l.search(/\S/);
    const findLine = (text) => lines.findIndex(l => l.trim() && lineTopicText(l) === text);

    const childIdx = findLine(childText);
    if (childIdx === -1) return curCode;

    const childIndent = indentOf(lines[childIdx]);
    let endIdx = childIdx + 1;
    while (endIdx < lines.length && (!lines[endIdx].trim() || indentOf(lines[endIdx]) > childIndent)) endIdx++;

    const parentIdx = findLine(newParentText);
    if (parentIdx === -1 || (parentIdx >= childIdx && parentIdx < endIdx)) return curCode;

    const block = lines.slice(childIdx, endIdx);
    const delta = (indentOf(lines[parentIdx]) + 2) - childIndent;
    const reindented = block.map(l => (l.trim() ? ' '.repeat(Math.max(0, indentOf(l) + delta)) + l.trim() : l));

    const remaining = [...lines.slice(0, childIdx), ...lines.slice(endIdx)];
    const insertAfter = remaining.findIndex(l => l.trim() && lineTopicText(l) === newParentText);
    if (insertAfter === -1) return curCode;
    remaining.splice(insertAfter + 1, 0, ...reindented);
    return remaining.join('\n');
  };

  const calcSubtreeHeight = (node) => {
    if (node.children.length === 0) {
      node.treeHeight = node.height + 20;
      return node.treeHeight;
    }
    let h = 0;
    node.children.forEach(c => { h += calcSubtreeHeight(c); });
    node.treeHeight = Math.max(node.height + 20, h);
    return node.treeHeight;
  };

  leftBranches.forEach(b => calcSubtreeHeight(b));
  rightBranches.forEach(b => calcSubtreeHeight(b));

  const layoutSubtree = (node, parentX, startY, isLeft) => {
    const horizDist = node.level === 1 ? 170 : 140;
    const defX = isLeft ? parentX - horizDist : parentX + horizDist;
    const defY = startY + node.treeHeight / 2;

    const pos = MultiDiagramVisualizer.getPosition(node.text, defX, defY);
    node.x = pos.x;
    node.y = pos.y;

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

  // 1. DRAW ROOT NODE
  const rootG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  rootG.style.cursor = 'grab';
  const isSelRoot = (rootNode.text === selTitle || selTitle === 'Mindmap Root' || selTitle === 'root');
  const rFill = MultiDiagramVisualizer.getColor('root', primaryFill);
  const rFont = MultiDiagramVisualizer.getColor('root_font', primaryText);
  const rBorder = MultiDiagramVisualizer.getColor('root_border', primaryBorder);

  const rootEl = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rootEl.setAttribute('x', `${rootNode.x - rootNode.width / 2}`);
  rootEl.setAttribute('y', `${rootNode.y - rootNode.height / 2}`);
  rootEl.setAttribute('width', `${rootNode.width}`);
  rootEl.setAttribute('height', `${rootNode.height}`);
  rootEl.setAttribute('rx', rootNode.shape === 'circle' ? `${rootNode.height / 2}` : '8');
  rootEl.setAttribute('fill', rFill);
  rootEl.setAttribute('stroke', rBorder);
  rootEl.setAttribute('stroke-width', '2.5');
  rootG.appendChild(rootEl);

  if (isSelRoot) {
    const selRootBox = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    selRootBox.setAttribute('x', `${rootNode.x - rootNode.width / 2 - 4}`);
    selRootBox.setAttribute('y', `${rootNode.y - rootNode.height / 2 - 4}`);
    selRootBox.setAttribute('width', `${rootNode.width + 8}`);
    selRootBox.setAttribute('height', `${rootNode.height + 8}`);
    selRootBox.setAttribute('rx', rootNode.shape === 'circle' ? `${rootNode.height / 2 + 4}` : '10');
    selRootBox.setAttribute('fill', 'none');
    selRootBox.setAttribute('stroke', 'var(--selection-color)');
    selRootBox.setAttribute('stroke-width', '1.8');
    selRootBox.setAttribute('stroke-dasharray', '4 3');
    selRootBox.style.pointerEvents = 'none';
    rootG.appendChild(selRootBox);
  }

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

  MultiDiagramVisualizer.makeDraggable(
    rootG,
    'root',
    () => MultiDiagramVisualizer.getPosition('root', 440, 280),
    (nx, ny) => MultiDiagramVisualizer.setPosition('root', nx, ny)
  );

  rootG.addEventListener('click', (e) => {
    e.stopPropagation();
    if (typeof AppController !== 'undefined' && AppController.instance) {
      AppController.instance.selectVisualObject({
        type: 'Mindmap Root',
        title: rootNode.text,
        fields: [
          { key: 'text', label: 'Topic Name', type: 'text', value: rootNode.text },
          { key: 'shape', label: 'Root Shape', type: 'select', value: rootNode.shape || 'circle', options: [
            { value: 'circle', label: 'Circle ((Root))' },
            { value: 'rounded', label: 'Rounded (Root)' },
            { value: 'rectangle', label: 'Rectangle [Root]' },
            { value: 'hexagon', label: 'Hexagon {{Root}}' },
            { value: 'cloud', label: 'Cloud )Root(' }
          ]},
          { key: 'font', label: Utils.FIELD_LABELS.font, type: 'color', value: rFont },
          { key: 'fill', label: Utils.FIELD_LABELS.fill, type: 'color', value: rFill },
          { key: 'border', label: Utils.FIELD_LABELS.border, type: 'color', value: rBorder }
        ],
        onSave: (vals) => {
          MultiDiagramVisualizer.setColor('root', vals.fill);
          MultiDiagramVisualizer.setColor('root_font', vals.font);
          MultiDiagramVisualizer.setColor('root_border', vals.border);
          MultiDiagramVisualizer.syncColorToCode('root', vals.fill);
          MultiDiagramVisualizer.syncColorToCode('root_font', vals.font);
          MultiDiagramVisualizer.syncColorToCode('root_border', vals.border);

          if (AppController.instance.selectedVisualObject) {
            AppController.instance.selectedVisualObject.title = vals.text;
          }

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

  // 2. DRAW BRANCH NODES AND CONNECTORS
  const renderNodeRecursive = (node, parentNode, isLeft) => {
    if (parentNode) {
      const px = parentNode === rootNode ? (isLeft ? parentNode.x - parentNode.width / 2 : parentNode.x + parentNode.width / 2) : (isLeft ? parentNode.x - parentNode.width / 2 : parentNode.x + parentNode.width / 2);
      const py = parentNode.y;
      const cx = isLeft ? node.x + node.width / 2 : node.x - node.width / 2;
      const cy = node.y;

      const linkKey = `link_${parentNode.text}_to_${node.text}`;
      const linkTitle = `Branch: ${parentNode.text} → ${node.text}`;

      const bColor = pastelBranchBorders[node.branchIdx % pastelBranchBorders.length];
      const defaultWidth = node.level === 1 ? '2.2' : (node.level === 2 ? '1.6' : '1.2');
      const defaultColor = node.level === 1 ? bColor : linkColor;

      const lColor = MultiDiagramVisualizer.getColor(linkKey, defaultColor);
      const lWidth = MultiDiagramVisualizer.getColor(`${linkKey}_width`, defaultWidth);
      // Legacy 'bezier'/'linear' values from older saved diagrams normalize to the
      // shared connector vocabulary.
      const lRouting = Utils.normalizeConnector(MultiDiagramVisualizer.getColor(`${linkKey}_routing`, 'curve'), 'curve');
      const lStyle = MultiDiagramVisualizer.getColor(`${linkKey}_style`, 'solid');

      const isLinkSel = (selTitle === linkTitle || selTitle === linkKey);

      const pathD = Utils.buildConnectorPath(px, py, cx, cy, lRouting, { orientation: 'h' });

      const linkG = document.createElementNS('http://www.w3.org/2000/svg', 'g');

      // Click Hitbox
      const hitPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      hitPath.setAttribute('d', pathD);
      hitPath.setAttribute('fill', 'none');
      hitPath.setAttribute('stroke', 'transparent');
      hitPath.setAttribute('stroke-width', '20');
      hitPath.style.cursor = 'pointer';
      linkG.appendChild(hitPath);

      // Visible Curve / Line
      const curve = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      curve.setAttribute('d', pathD);
      curve.setAttribute('fill', 'none');
      curve.setAttribute('stroke', isLinkSel ? 'var(--selection-color)' : lColor);
      curve.setAttribute('stroke-width', isLinkSel ? `${parseFloat(lWidth) + 1.5}` : lWidth);
      if (isLinkSel) curve.style.filter = selGlow;

      if (lStyle === 'dashed') {
        curve.setAttribute('stroke-dasharray', '5 4');
      } else if (lStyle === 'dotted') {
        curve.setAttribute('stroke-dasharray', '2 3');
      }

      linkG.appendChild(curve);

      // Click handler for Inspector
      linkG.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof AppController !== 'undefined' && AppController.instance) {
          AppController.instance.selectVisualObject({
            type: 'Mindmap Branch Link',
            title: linkTitle,
            fields: [
              { key: 'from', label: 'From (Parent Topic)', type: 'select', value: parentNode.text, options: allTopicOptions },
              { key: 'to', label: 'To (Child Topic)', type: 'select', value: node.text, options: allTopicOptions },
              { key: 'color', label: Utils.FIELD_LABELS.lineColor, type: 'color', value: lColor },
              { key: 'width', label: Utils.FIELD_LABELS.lineWidth, type: 'select', value: lWidth, options: Utils.widthOptions(['1.2', '1.6', '2.2', '3.2'], '2.2') },
              { key: 'routing', label: Utils.FIELD_LABELS.connector, type: 'select', value: lRouting, options: Utils.CONNECTOR_OPTIONS },
              { key: 'style', label: Utils.FIELD_LABELS.lineDash, type: 'select', value: lStyle, options: Utils.DASH_OPTIONS }
            ],
            onSave: (vals) => {
              const newParent = vals.from || parentNode.text;
              const newChild = vals.to || node.text;
              const newKey = `link_${newParent}_to_${newChild}`;
              MultiDiagramVisualizer.setColor(newKey, vals.color);
              MultiDiagramVisualizer.setColor(`${newKey}_width`, vals.width);
              MultiDiagramVisualizer.setColor(`${newKey}_routing`, vals.routing);
              MultiDiagramVisualizer.setColor(`${newKey}_style`, vals.style);
              MultiDiagramVisualizer.syncColorToCode(newKey, vals.color);
              // Re-attaching a branch moves that topic's whole subtree in the outline.
              if (newParent !== parentNode.text || newChild !== node.text) {
                MultiDiagramVisualizer.updateCodeLine((curCode) => reparentTopic(curCode, newChild, newParent));
              }
            }
          });
        }
      });

      edgesLayer.appendChild(linkG);
    }

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.style.cursor = 'grab';

    const bFill = pastelBranchColors[node.branchIdx % pastelBranchColors.length];
    const bBorder = pastelBranchBorders[node.branchIdx % pastelBranchBorders.length];

    const defaultNodeFill = node.level === 1 ? bFill : (isDark ? '#232527' : '#F8F9FA');
    const defaultNodeFont = node.level === 1 ? primaryText : textColor;
    const defaultNodeBorder = node.level === 1 ? bBorder : cardBorder;

    const nodeFill = MultiDiagramVisualizer.getColor(node.text, defaultNodeFill);
    const nodeFont = MultiDiagramVisualizer.getColor(`${node.text}_font`, defaultNodeFont);
    const nodeBorder = MultiDiagramVisualizer.getColor(`${node.text}_border`, defaultNodeBorder);

    const isSelMM = (node.text === selTitle || selTitle === `Mindmap: ${node.text}`);

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', `${node.x - node.width / 2}`);
    rect.setAttribute('y', `${node.y - node.height / 2}`);
    rect.setAttribute('width', `${node.width}`);
    rect.setAttribute('height', `${node.height}`);
    rect.setAttribute('rx', node.shape === 'circle' ? `${node.height / 2}` : (node.shape === 'rectangle' ? '2' : '6'));
    rect.setAttribute('fill', nodeFill);
    rect.setAttribute('stroke', nodeBorder);
    rect.setAttribute('stroke-width', node.level === 1 ? '1.8' : '1.2');
    g.appendChild(rect);

    if (isSelMM) {
      const selBox = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      selBox.setAttribute('x', `${node.x - node.width / 2 - 3.5}`);
      selBox.setAttribute('y', `${node.y - node.height / 2 - 3.5}`);
      selBox.setAttribute('width', `${node.width + 7}`);
      selBox.setAttribute('height', `${node.height + 7}`);
      selBox.setAttribute('rx', node.shape === 'circle' ? `${node.height / 2 + 4}` : '8');
      selBox.setAttribute('fill', 'none');
      selBox.setAttribute('stroke', 'var(--selection-color)');
      selBox.setAttribute('stroke-width', '1.6');
      selBox.setAttribute('stroke-dasharray', '4 3');
      selBox.style.pointerEvents = 'none';
      g.appendChild(selBox);
    }

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

    MultiDiagramVisualizer.makeDraggable(
      g,
      node.text,
      () => MultiDiagramVisualizer.getPosition(node.text, node.x, node.y),
      (nx, ny) => MultiDiagramVisualizer.setPosition(node.text, nx, ny)
    );

    g.addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof AppController !== 'undefined' && AppController.instance) {
        AppController.instance.selectVisualObject({
          type: `Mindmap Tier ${node.level}`,
          title: node.text,
          fields: [
            { key: 'text', label: 'Topic Name', type: 'text', value: node.text },
            { key: 'shape', label: 'Node Shape', type: 'select', value: node.shape || 'rounded', options: [
              { value: 'rounded', label: 'Rounded (Topic)' },
              { value: 'rectangle', label: 'Rectangle [Topic]' },
              { value: 'circle', label: 'Circle ((Topic))' },
              { value: 'hexagon', label: 'Hexagon {{Topic}}' },
              { value: 'cloud', label: 'Cloud )Topic(' }
            ]},
            { key: 'font', label: Utils.FIELD_LABELS.font, type: 'color', value: nodeFont },
            { key: 'fill', label: Utils.FIELD_LABELS.fill, type: 'color', value: nodeFill },
            { key: 'border', label: Utils.FIELD_LABELS.border, type: 'color', value: nodeBorder }
          ],
          onSave: (vals) => {
            MultiDiagramVisualizer.setColor(vals.text, vals.fill);
            MultiDiagramVisualizer.setColor(`${vals.text}_font`, vals.font);
            MultiDiagramVisualizer.setColor(`${vals.text}_border`, vals.border);
            MultiDiagramVisualizer.syncColorToCode(vals.text, vals.fill);
            MultiDiagramVisualizer.syncColorToCode(`${vals.text}_font`, vals.font);
            MultiDiagramVisualizer.syncColorToCode(`${vals.text}_border`, vals.border);

            if (typeof AppController !== 'undefined' && AppController.instance && AppController.instance.selectedVisualObject) {
              AppController.instance.selectedVisualObject.title = vals.text;
            }

            if (vals.text !== node.text || (vals.shape && vals.shape !== node.shape)) {
              MultiDiagramVisualizer.updateCodeLine((curCode) => {
                const lines = curCode.split('\n');
                const esc = node.text.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                const idx = lines.findIndex(l => !l.trim().startsWith('%%') && new RegExp(`^\\s*[\[\(\{]*${esc}[\]\)\}\s]*(?:\\s*|::.*)$`, 'i').test(l.trim()));
                if (idx !== -1) {
                  const lead = lines[idx].match(/^(\s*)/)[1] || '      ';
                  const shapeBrackets = {
                    'rounded': ['(', ')'],
                    'rectangle': ['[', ']'],
                    'circle': ['((', '))'],
                    'hexagon': ['{{', '}}'],
                    'cloud': [')', '(']
                  };
                  const br = shapeBrackets[vals.shape] || ['', ''];
                  const iconPart = node.icon ? `::icon(${node.icon})` : '';
                  lines[idx] = `${lead}${br[0]}${vals.text}${br[1]}${iconPart}`;
                }
                return lines.join('\n');
              });
            }
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
});
MultiDiagramVisualizer.register('mindMap', MultiDiagramVisualizer.renderers.get('mindmap'));
