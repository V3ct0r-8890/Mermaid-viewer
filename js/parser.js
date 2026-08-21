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

          const classDefMatch = rawLine.match(/^classDef\s+([A-Za-z0-9_]+)\s+(.+)$/i);
          if (classDefMatch) continue;
          const classApplyMatch = rawLine.match(/^class\s+([A-Za-z0-9_,\s]+)\s+([A-Za-z0-9_]+)$/i);
          if (classApplyMatch) continue;

          let line = rawLine.replace(/%%.*$/, '').trim();
          if (!line) continue;

          const linkPattern = /(-->|---|==>|-.->|--\s*["']?([^"'-]+)["']?\s*-->|--\s*["']?([^"'-]+)["']?\s*---|==\s*["']?([^"'-]+)["']?\s*==>|-\.\s*["']?([^"'-]+)["']?\s*\.->|-->\|([^|]+)\||\=\=>\|([^|]+)\|)/g;
          let match;
          let lastIndex = 0;
          const tokens = [];
          const links = [];

          while ((match = linkPattern.exec(line)) !== null) {
            const rawToken = line.substring(lastIndex, match.index).trim();
            if (rawToken) tokens.push(rawToken);

            let linkType = '-->';
            let label = undefined;

            const fullMatch = match[0];
            if (fullMatch.startsWith('==')) {
              linkType = '==>';
              if (match[7]) label = match[7].trim();
              else if (match[4]) label = match[4].trim();
            } else if (fullMatch.startsWith('-.') || fullMatch.startsWith('-.')) {
              linkType = '-.->';
              if (match[5]) label = match[5].trim();
            } else if (fullMatch === '---' || fullMatch.startsWith('-- ') || fullMatch.startsWith('--"')) {
              linkType = '---';
              if (match[3]) label = match[3].trim();
            } else {
              linkType = '-->';
              if (match[6]) label = match[6].trim();
              else if (match[2]) label = match[2].trim();
            }

            links.push({ type: linkType, label });
            lastIndex = linkPattern.lastIndex;
          }

          const tailToken = line.substring(lastIndex).trim();
          if (tailToken) tokens.push(tailToken);

          if (tokens.length >= 2 && links.length === tokens.length - 1) {
            for (let i = 0; i < links.length; i++) {
              const srcNode = MermaidParser.parseNodeToken(tokens[i], currentGraph, newGraph);
              const tgtNode = MermaidParser.parseNodeToken(tokens[i + 1], currentGraph, newGraph);

              const edgeId = Utils.uid('edge');
              newGraph.addEdge({
                id: edgeId,
                source: srcNode.id,
                target: tgtNode.id,
                label: links[i].label,
                type: links[i].type
              });
            }
          } else if (tokens.length === 1) {
            MermaidParser.parseNodeToken(tokens[0], currentGraph, newGraph);
          }
        }

        const hasOldPositions = newGraph.nodes.some(n => currentGraph.getNode(n.id) !== undefined);
        if (!hasOldPositions) {
          if (newGraph.nodes.length === 4 && newGraph.getNode('Client') && newGraph.getNode('API')) {
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

    // For All Specialized Visual Chart Diagrams (Sequence, Class, State, ER, C4, Gantt, Pie, Git, Journey, Mindmap, Timeline, Quadrant, Sankey)
    newGraph.addNode({ id: 'visual_chart_bounds', text: '', shape: 'rectangle', x: 40, y: 40, width: 780, height: 480, fillColor: 'transparent', borderColor: 'transparent', fontColor: 'transparent' });
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
