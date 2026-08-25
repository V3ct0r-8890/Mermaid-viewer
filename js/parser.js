// --- MERMAID CODE PARSER ---
    class MermaidParser {
      static detectDiagramType(code) {
        const firstLines = code.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('%%')).slice(0, 3).join(' ');
        if (/^flowchart\s+LR/i.test(firstLines)) return 'flowchart_lr';
        if (/^flowchart/i.test(firstLines) || /^graph/i.test(firstLines)) return 'flowchart_td';
        if (/^sequenceDiagram/i.test(firstLines)) return 'sequence';
        if (/^classDiagram/i.test(firstLines)) return 'classDiagram';
        if (/^stateDiagram/i.test(firstLines)) return 'stateDiagram';
        if (/^erDiagram/i.test(firstLines)) return 'erDiagram';
        if (/^gantt/i.test(firstLines)) return 'gantt';
        if (/^pie/i.test(firstLines)) return 'pie';
        if (/^gitGraph/i.test(firstLines)) return 'gitGraph';
        if (/^journey/i.test(firstLines)) return 'journey';
        if (/^mindmap/i.test(firstLines)) return 'mindmap';
        if (/^timeline/i.test(firstLines)) return 'timeline';
        if (/^quadrantChart/i.test(firstLines)) return 'quadrant';
        if (/^C4Context/i.test(firstLines) || /^C4/i.test(firstLines)) return 'c4context';
        if (/^sankey/i.test(firstLines)) return 'sankey';
        return 'flowchart_td';
      }

      static parse(code, currentGraph) {
        const detectedType = MermaidParser.detectDiagramType(code);
        const lines = code.split('\n');
        const newGraph = new GraphModel();
        newGraph.diagramType = detectedType;
        newGraph.customRawCode = code;
        newGraph.gridSnap = currentGraph.gridSnap;
        newGraph.gridSize = currentGraph.gridSize;
        newGraph.rules = currentGraph.rules;

        // 1. Parse Flowchart
        if (detectedType === 'flowchart_td' || detectedType === 'flowchart_lr') {
          const initCurveM = code.match(/["']?curve["']?\s*:\s*["']?([A-Za-z0-9_]+)["']?/i);
          if (initCurveM) {
            newGraph.curveStyle = initCurveM[1];
          }
          let lineIdx = 0;
          try {
            for (lineIdx = 0; lineIdx < lines.length; lineIdx++) {
              const rawLine = lines[lineIdx].trim();
              if (!rawLine || rawLine.startsWith('%%')) continue;

              const headerMatch = rawLine.match(/^(?:flowchart|graph)\s+(TD|TB|LR|RL|BT)/i);
              if (headerMatch) {
                const dir = headerMatch[1].toUpperCase();
                newGraph.layoutDirection = (dir === 'LR' || dir === 'RL') ? 'LR' : 'TD';
                continue;
              }

              const styleMatch = rawLine.match(/^style\s+([A-Za-z0-9_]+)\s+(.+)$/i);
              if (styleMatch) {
                const targetId = styleMatch[1];
                const styleProps = styleMatch[2];
                const node = newGraph.getNode(targetId);
                if (node) {
                  const fillM = styleProps.match(/fill:([^,;]+)/);
                  const strokeM = styleProps.match(/stroke:([^,;]+)/);
                  const colorM = styleProps.match(/color:([^,;]+)/);
                  if (fillM) node.fillColor = fillM[1].trim();
                  if (strokeM) node.borderColor = strokeM[1].trim();
                  if (colorM) node.fontColor = colorM[1].trim();
                }
                continue;
              }

              const linkStyleMatch = rawLine.match(/^linkStyle\s+(\d+)\s+(.+)$/i);
              if (linkStyleMatch) {
                const idx = parseInt(linkStyleMatch[1], 10);
                const props = linkStyleMatch[2];
                if (newGraph.edges[idx]) {
                  const strokeM = props.match(/stroke:([^,;]+)/);
                  const widthM = props.match(/stroke-width:([^,;]+)/);
                  if (strokeM) newGraph.edges[idx].color = strokeM[1].trim();
                  if (widthM) newGraph.edges[idx].strokeWidth = parseFloat(widthM[1]);
                }
                continue;
              }

              const edgeRegex = /([A-Za-z0-9_]+(?:\s*[\(\[\{\/][^\)\]\}]+[\)\]\}\/]+)?)\s*(<==>|<-->|==>|-.->|--->|-->)\s*(?:\|"?([^\|"]*)"?\|\s*)?([A-Za-z0-9_]+(?:\s*[\(\[\{\/][^\)\]\}]+[\)\]\}\/]+)?)/;
              const edgeMatch = rawLine.match(edgeRegex);

              if (edgeMatch) {
                const srcRaw = edgeMatch[1].trim();
                const arrowType = edgeMatch[2].trim();
                const label = edgeMatch[3] ? edgeMatch[3].trim() : undefined;
                const tgtRaw = edgeMatch[4].trim();

                const srcNode = MermaidParser.parseNodeToken(srcRaw, currentGraph, newGraph);
                const tgtNode = MermaidParser.parseNodeToken(tgtRaw, currentGraph, newGraph);

                newGraph.addEdge({
                  id: Utils.uid('edge'),
                  source: srcNode.id,
                  target: tgtNode.id,
                  label,
                  type: arrowType
                });
                continue;
              }

              const nodeToken = MermaidParser.parseNodeToken(rawLine, currentGraph, newGraph);
              if (!nodeToken) {
                return { graph: null, error: `Invalid syntax at line ${lineIdx + 1}: "${rawLine}"`, errorLine: lineIdx + 1 };
              }
            }

            const existingPos = new Map(currentGraph.nodes.map(n => [n.id, { x: n.x, y: n.y }]));
            const missingAny = newGraph.nodes.some(n => !existingPos.has(n.id) || n.id === 'visual_chart_bounds');

            newGraph.nodes.forEach(n => {
              if (existingPos.has(n.id) && n.id !== 'visual_chart_bounds') {
                n.x = existingPos.get(n.id).x;
                n.y = existingPos.get(n.id).y;
              }
            });

            if (missingAny) {
              const hasSampleNodes = newGraph.getNode('Client') && newGraph.getNode('API') && newGraph.getNode('Auth') && newGraph.getNode('Database') && newGraph.nodes.length === 4;
              if (hasSampleNodes && newGraph.layoutDirection === 'TD') {
                const cNode = newGraph.getNode('Client');
                const aNode = newGraph.getNode('API');
                const authNode = newGraph.getNode('Auth');
                const dNode = newGraph.getNode('Database');
                if (cNode) { cNode.x = 140; cNode.y = 80; }
                if (aNode) { aNode.x = 140; aNode.y = 220; }
                if (authNode) { authNode.x = 380; authNode.y = 220; }
                if (dNode) { dNode.x = 140; dNode.y = 360; }
              } else {
                AutoLayoutEngine.layout(newGraph, newGraph.layoutDirection || 'TD');
              }
            }

            return { graph: newGraph, error: null };
          } catch (e) {
            return { graph: null, error: `Parse error at line ${lineIdx + 1}: ${e.message}`, errorLine: lineIdx + 1 };
          }
        }

        // 2. Parse State Diagram
        if (detectedType === 'stateDiagram') {
          lines.forEach(l => {
            const line = l.trim();
            if (!line || line.startsWith('stateDiagram') || line.startsWith('%%')) return;
            const match = line.match(/^(\[\*\]|[A-Za-z0-9_]+)\s*-->\s*(\[\*\]|[A-Za-z0-9_]+)(?:\s*:\s*(.+))?$/);
            if (match) {
              const src = match[1];
              const tgt = match[2];
              const label = match[3] ? match[3].trim() : undefined;

              [src, tgt].forEach(id => {
                if (!newGraph.getNode(id)) {
                  newGraph.addNode({
                    id,
                    text: id === '[*]' ? '●' : id,
                    shape: id === '[*]' ? 'circle' : 'rounded',
                    width: id === '[*]' ? 40 : 140,
                    height: id === '[*]' ? 40 : 50,
                    fillColor: id === '[*]' ? '#212121' : '#E3F2FD',
                    borderColor: id === '[*]' ? '#000000' : '#90CAF9',
                    fontColor: id === '[*]' ? '#FFFFFF' : '#0D47A1'
                  });
                }
              });

              newGraph.addEdge({
                id: Utils.uid('edge'),
                source: src,
                target: tgt,
                label,
                type: '-->'
              });
            }
          });
          AutoLayoutEngine.layout(newGraph, 'TD');
          return { graph: newGraph, error: null };
        }

        // 3. Parse Class Diagram
        if (detectedType === 'classDiagram') {
          let curClass = null;
          lines.forEach(l => {
            const line = l.trim();
            if (!line || line.startsWith('classDiagram') || line.startsWith('%%')) return;

            const cMatch = line.match(/^class\s+([A-Za-z0-9_]+)(?:\s*\{)?/);
            if (cMatch) {
              curClass = cMatch[1];
              if (!newGraph.getNode(curClass)) {
                newGraph.addNode({
                  id: curClass,
                  text: curClass,
                  shape: 'rectangle',
                  width: 170,
                  height: 90,
                  fillColor: '#E3F2FD',
                  borderColor: '#90CAF9',
                  fontColor: '#0D47A1'
                });
              }
              return;
            }

            if (line === '}') {
              curClass = null;
              return;
            }

            const inhMatch = line.match(/^([A-Za-z0-9_]+)\s*<\|--\s*([A-Za-z0-9_]+)/);
            if (inhMatch) {
              const baseC = inhMatch[1];
              const subC = inhMatch[2];
              [baseC, subC].forEach(id => {
                if (!newGraph.getNode(id)) {
                  newGraph.addNode({ id, text: id, shape: 'rectangle', width: 160, height: 70, fillColor: '#E3F2FD', borderColor: '#90CAF9', fontColor: '#0D47A1' });
                }
              });
              newGraph.addEdge({ id: Utils.uid('edge'), source: baseC, target: subC, type: '-->', label: 'Inherits' });
            }
          });
          AutoLayoutEngine.layout(newGraph, 'TD');
          return { graph: newGraph, error: null };
        }

        // 4. Parse ER Diagram (Rendered by MultiDiagramVisualizer suite)
        if (detectedType === 'erDiagram') {
          newGraph.addNode({ id: 'visual_chart_bounds', text: '', shape: 'rectangle', x: 40, y: 40, width: 780, height: 500, fillColor: 'transparent', borderColor: 'transparent', fontColor: 'transparent' });
          return { graph: newGraph, error: null };
        }

        // 5. Parse C4 Context (Rendered by MultiDiagramVisualizer suite)
        if (detectedType === 'c4context') {
          newGraph.addNode({ id: 'visual_chart_bounds', text: '', shape: 'rectangle', x: 40, y: 40, width: 850, height: 550, fillColor: 'transparent', borderColor: 'transparent', fontColor: 'transparent' });
          return { graph: newGraph, error: null };
        }

        // For Specialized Visual Chart Diagrams (Sequence, Gantt, Pie, Git, Journey, Mindmap, Timeline, Quadrant, Sankey)
        // Register visual bounds node so zoom-to-fit and canvas framing work
        newGraph.addNode({ id: 'visual_chart_bounds', text: '', shape: 'rectangle', x: 40, y: 40, width: 740, height: 460, fillColor: 'transparent', borderColor: 'transparent', fontColor: 'transparent' });
        return { graph: newGraph, error: null };
      }

      static parseNodeToken(token, oldGraph, newGraph) {
        token = token.trim();
        let id = '';
        let text = '';
        let shape = 'rectangle';

        if (/^([A-Za-z0-9_]+)\s*\(\(\(([\s\S]+)\)\)\)$/.test(token)) {
          const m = token.match(/^([A-Za-z0-9_]+)\s*\(\(\(([\s\S]+)\)\)\)$/);
          id = m[1];
          text = m[2].replace(/^["']|["']$/g, '');
          shape = 'double_circle';
        } else if (/^([A-Za-z0-9_]+)\s*\(\(([\s\S]+)\)\)$/.test(token)) {
          const m = token.match(/^([A-Za-z0-9_]+)\s*\(\(([\s\S]+)\)\)$/);
          id = m[1];
          text = m[2].replace(/^["']|["']$/g, '');
          shape = 'circle';
        } else if (/^([A-Za-z0-9_]+)\s*\(\[([\s\S]+)\]\)$/.test(token)) {
          const m = token.match(/^([A-Za-z0-9_]+)\s*\(\[([\s\S]+)\]\)$/);
          id = m[1];
          text = m[2].replace(/^["']|["']$/g, '');
          shape = 'stadium';
        } else if (/^([A-Za-z0-9_]+)\s*\(([\s\S]+)\)$/.test(token)) {
          const m = token.match(/^([A-Za-z0-9_]+)\s*\(([\s\S]+)\)$/);
          id = m[1];
          text = m[2].replace(/^["']|["']$/g, '');
          shape = 'rounded';
        } else if (/^([A-Za-z0-9_]+)\s*\[\[([\s\S]+)\]\]$/.test(token)) {
          const m = token.match(/^([A-Za-z0-9_]+)\s*\[\[([\s\S]+)\]\]$/);
          id = m[1];
          text = m[2].replace(/^["']|["']$/g, '');
          shape = 'subroutine';
        } else if (/^([A-Za-z0-9_]+)\s*\[\(([\s\S]+)\)\]$/.test(token)) {
          const m = token.match(/^([A-Za-z0-9_]+)\s*\[\(([\s\S]+)\)\]$/);
          id = m[1];
          text = m[2].replace(/^["']|["']$/g, '');
          shape = 'cylinder';
        } else if (/^([A-Za-z0-9_]+)\s*>([\s\S]+)\]$/.test(token)) {
          const m = token.match(/^([A-Za-z0-9_]+)\s*>([\s\S]+)\]$/);
          id = m[1];
          text = m[2].replace(/^["']|["']$/g, '');
          shape = 'asymmetric';
        } else if (/^([A-Za-z0-9_]+)\s*\{\{([\s\S]+)\}\}$/.test(token)) {
          const m = token.match(/^([A-Za-z0-9_]+)\s*\{\{([\s\S]+)\}\}$/);
          id = m[1];
          text = m[2].replace(/^["']|["']$/g, '');
          shape = 'hexagon';
        } else if (/^([A-Za-z0-9_]+)\s*\{([\s\S]+)\}$/.test(token)) {
          const m = token.match(/^([A-Za-z0-9_]+)\s*\{([\s\S]+)\}$/);
          id = m[1];
          text = m[2].replace(/^["']|["']$/g, '');
          shape = 'diamond';
        } else if (/^([A-Za-z0-9_]+)\s*\[\/([\s\S]+)\/\]$/.test(token)) {
          const m = token.match(/^([A-Za-z0-9_]+)\s*\[\/([\s\S]+)\/\]$/);
          id = m[1];
          text = m[2].replace(/^["']|["']$/g, '');
          shape = 'parallelogram';
        } else if (/^([A-Za-z0-9_]+)\s*\[\\([\s\S]+)\\\]$/.test(token)) {
          const m = token.match(/^([A-Za-z0-9_]+)\s*\[\\([\s\S]+)\\\]$/);
          id = m[1];
          text = m[2].replace(/^["']|["']$/g, '');
          shape = 'parallelogram_alt';
        } else if (/^([A-Za-z0-9_]+)\s*\[\/([\s\S]+)\\\]$/.test(token)) {
          const m = token.match(/^([A-Za-z0-9_]+)\s*\[\/([\s\S]+)\\\]$/);
          id = m[1];
          text = m[2].replace(/^["']|["']$/g, '');
          shape = 'trapezoid';
        } else if (/^([A-Za-z0-9_]+)\s*\[\\([\s\S]+)\/\]$/.test(token)) {
          const m = token.match(/^([A-Za-z0-9_]+)\s*\[\\([\s\S]+)\/\]$/);
          id = m[1];
          text = m[2].replace(/^["']|["']$/g, '');
          shape = 'trapezoid_alt';
        } else if (/^([A-Za-z0-9_]+)\s*\[([\s\S]+)\]$/.test(token)) {
          const m = token.match(/^([A-Za-z0-9_]+)\s*\[([\s\S]+)\]$/);
          id = m[1];
          text = m[2].replace(/^["']|["']$/g, '');
          shape = 'rectangle';
        } else if (/^[A-Za-z0-9_]+$/.test(token)) {
          id = token;
          text = token;
          shape = 'rectangle';
        }

        let node = newGraph.getNode(id);
        if (!node) {
          const oldNode = oldGraph.getNode(id);
          node = {
            id,
            text: text || id,
            shape,
            x: oldNode ? oldNode.x : 100,
            y: oldNode ? oldNode.y : 100,
            width: 140,
            height: 50,
            fillColor: oldNode ? oldNode.fillColor : '#E3F2FD',
            borderColor: oldNode ? oldNode.borderColor : '#90CAF9',
            fontColor: oldNode ? oldNode.fontColor : '#0D47A1'
          };
          newGraph.addNode(node);
        } else {
          if (text) node.text = text;
          if (shape) node.shape = shape;
        }

        return node;
      }
    }