// --- MINDMAP VISUALIZER ---
MultiDiagramVisualizer.register('mindmap', function(code, nodesLayer, edgesLayer, isDark) {
  const primaryText = isDark ? '#FFFFFF' : '#212121';
  const textColor = isDark ? '#E0E0E0' : '#424242';
  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const cardBorder = isDark ? '#424242' : '#E0E0E0';
  const primaryBorder = isDark ? '#1976D2' : '#0288D1';
  const primaryFill = isDark ? '#1E3A5F' : '#E3F2FD';
  const linkColor = isDark ? '#90CAF9' : '#1976D2';
  const selTitle = (typeof AppController !== 'undefined' && AppController.instance && AppController.instance.selectedVisualObject) ? AppController.instance.selectedVisualObject.title : null;
  const selGlow = 'drop-shadow(0 0 6px rgba(33, 150, 243, 0.8))';


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
        const rFill = MultiDiagramVisualizer.getColor('root', primaryFill);
        const rFont = MultiDiagramVisualizer.getColor('root_font', primaryText);
        const rBorder = MultiDiagramVisualizer.getColor('root_border', primaryBorder);
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
                { key: 'font', label: '1. Font / Text Color', type: 'color', value: rFont },
                { key: 'fill', label: '2. Node Fill Color', type: 'color', value: rFill },
                { key: 'border', label: '3. Node Border / Stroke Color', type: 'color', value: rBorder }
              ],
              onSave: (vals) => {
                MultiDiagramVisualizer.setColor('root', vals.fill);
                MultiDiagramVisualizer.setColor('root_font', vals.font);
                MultiDiagramVisualizer.setColor('root_border', vals.border);
                MultiDiagramVisualizer.syncColorToCode('root', vals.fill);
                MultiDiagramVisualizer.syncColorToCode('root_font', vals.font);
                MultiDiagramVisualizer.syncColorToCode('root_border', vals.border);
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

        // Draw Nodes & Curves across all tiers
        const renderNodeRecursive = (node, parentNode, isLeft) => {
          if (parentNode) {
            const px = parentNode === rootNode ? (isLeft ? parentNode.x - parentNode.width / 2 : parentNode.x + parentNode.width / 2) : (isLeft ? parentNode.x - parentNode.width / 2 : parentNode.x + parentNode.width / 2);
            const py = parentNode.y;
            const cx = isLeft ? node.x + node.width / 2 : node.x - node.width / 2;
            const cy = node.y;

            const linkKey = `link_${parentNode.text}_to_${node.text}`;
            const linkTitle = `Branch: ${parentNode.text} → ${node.text}`;

            const defaultWidth = node.level === 1 ? '2.2' : (node.level === 2 ? '1.6' : '1.2');
            const defaultColor = node.level === 1 ? primaryBorder : linkColor;

            const lColor = MultiDiagramVisualizer.getColor(linkKey, defaultColor);
            const lWidth = MultiDiagramVisualizer.getColor(`${linkKey}_width`, defaultWidth);
            const lRouting = MultiDiagramVisualizer.getColor(`${linkKey}_routing`, 'bezier');
            const lStyle = MultiDiagramVisualizer.getColor(`${linkKey}_style`, 'solid');

            const isLinkSel = (selTitle === linkTitle || selTitle === linkKey);

            let pathD;
            const midX = (px + cx) / 2;

            if (lRouting === 'step') {
              pathD = `M ${px} ${py} L ${midX} ${py} L ${midX} ${cy} L ${cx} ${cy}`;
            } else if (lRouting === 'linear') {
              pathD = `M ${px} ${py} L ${cx} ${cy}`;
            } else {
              pathD = `M ${px} ${py} C ${midX} ${py}, ${midX} ${cy}, ${cx} ${cy}`;
            }

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
                    { key: 'color', label: '1. Branch Line Color', type: 'color', value: lColor },
                    { key: 'width', label: '2. Line Thickness', type: 'select', value: lWidth, options: [
                        { value: '1.2', label: 'Thin (1.2px)' },
                        { value: '1.6', label: 'Medium (1.6px)' },
                        { value: '2.2', label: 'Thick (2.2px - Default)' },
                        { value: '3.2', label: 'Heavy (3.2px)' }
                    ]},
                    { key: 'routing', label: '3. Connector Routing / Curve Style', type: 'select', value: lRouting, options: [
                        { value: 'bezier', label: 'Smooth S-Curve (Bezier)' },
                        { value: 'step', label: 'Orthogonal Step (90° Corners)' },
                        { value: 'linear', label: 'Straight Line (Linear)' }
                    ]},
                    { key: 'style', label: '4. Line Dash Style', type: 'select', value: lStyle, options: [
                        { value: 'solid', label: 'Solid (──────)' },
                        { value: 'dashed', label: 'Dashed (– – – –)' },
                        { value: 'dotted', label: 'Dotted (········)' }
                    ]}
                  ],
                  onSave: (vals) => {
                    MultiDiagramVisualizer.setColor(linkKey, vals.color);
                    MultiDiagramVisualizer.setColor(`${linkKey}_width`, vals.width);
                    MultiDiagramVisualizer.setColor(`${linkKey}_routing`, vals.routing);
                    MultiDiagramVisualizer.setColor(`${linkKey}_style`, vals.style);
                    MultiDiagramVisualizer.syncColorToCode(linkKey, vals.color);
                  }
                });
              }
            });

            edgesLayer.appendChild(linkG);
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
          const defaultNodeFont = node.level === 1 ? primaryText : textColor;
          const defaultNodeBorder = node.level === 1 ? primaryBorder : cardBorder;
          const nodeFill = MultiDiagramVisualizer.getColor(node.text, defaultNodeFill);
          const nodeFont = MultiDiagramVisualizer.getColor(`${node.text}_font`, defaultNodeFont);
          const nodeBorder = MultiDiagramVisualizer.getColor(`${node.text}_border`, defaultNodeBorder);

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
            selBox.setAttribute('rx', node.level === 1 ? '8' : '6');
            selBox.setAttribute('fill', 'none');
            selBox.setAttribute('stroke', 'var(--selection-color)');
            selBox.setAttribute('stroke-width', '1.5');
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

          g.addEventListener('mousedown', (e) => e.stopPropagation());
          g.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof AppController !== 'undefined' && AppController.instance) {
              AppController.instance.selectVisualObject({
                type: `Mindmap Tier ${node.level}`,
                title: node.text,
                fields: [
                  { key: 'text', label: 'Branch Topic', type: 'text', value: node.text },
                  { key: 'font', label: '1. Font / Text Color', type: 'color', value: nodeFont },
                  { key: 'fill', label: '2. Node Fill Color', type: 'color', value: nodeFill },
                  { key: 'border', label: '3. Node Border / Stroke Color', type: 'color', value: nodeBorder }
                ],
                onSave: (vals) => {
                  MultiDiagramVisualizer.setColor(vals.text, vals.fill);
                  MultiDiagramVisualizer.setColor(`${vals.text}_font`, vals.font);
                  MultiDiagramVisualizer.setColor(`${vals.text}_border`, vals.border);
                  MultiDiagramVisualizer.syncColorToCode(vals.text, vals.fill);
                  MultiDiagramVisualizer.syncColorToCode(`${vals.text}_font`, vals.font);
                  MultiDiagramVisualizer.syncColorToCode(`${vals.text}_border`, vals.border);
                  MultiDiagramVisualizer.updateCodeLine((curCode) => {
                    const lines = curCode.split('\n');
                    const esc = node.text.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                    const idx = lines.findIndex(l => new RegExp(`^\\s*[\[\(\{]*${esc}[\]\)\}\s]*(?:\\s*|::.*)$`, 'i').test(l.trim()));
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
});
