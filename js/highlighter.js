// --- SYNTAX HIGHLIGHTER ---
    class SyntaxHighlighter {
      static highlight(code) {
        const lines = (code || '').split('\n');
        return lines.map(line => {
          if (line.trim().startsWith('%%')) {
            return `<span class="hl-comment">${Utils.escapeHtml(line)}</span>`;
          }

          const tokenRegex = /("(?:[^"\\]|\\.)*")|(-->>|->>|-->|==>|-\.->|---|--\|>|<\|--|-x|--x|<==>|<-->|\|\|--o\{|\|\|--\|\{|\}\|--\|\{|\}\|--o\{)|(\|[^|\n]+\|)|(\b(?:flowchart|graph|sequenceDiagram|classDiagram|stateDiagram-v2|stateDiagram|erDiagram|gantt|pie|gitGraph|journey|mindmap|timeline|quadrantChart|C4Context|C4Container|C4Component|sankey-beta|requirementDiagram|autonumber|participant|actor|activate|deactivate|loop|alt|else|opt|par|critical|rect|class|interface|abstract|enum|commit|branch|checkout|merge|tag|style|Person|System|System_Ext|Container|Component|Rel)\b)|(\b(?:TD|TB|LR|RL|BT|title|dateFormat|axisFormat|section|completed|active|crit|done|after|task|score|x-axis|y-axis|quadrant-1|quadrant-2|quadrant-3|quadrant-4)\b)|([^\s"|<-]+|\s+|.)/g;

          let result = '';
          let match;
          while ((match = tokenRegex.exec(line)) !== null) {
            const [full, str, arrow, pipe, kw, dir] = match;
            if (str) {
              result += `<span class="hl-shape">${Utils.escapeHtml(str)}</span>`;
            } else if (arrow) {
              result += `<span class="hl-arrow">${Utils.escapeHtml(arrow)}</span>`;
            } else if (pipe) {
              result += `<span class="hl-label">${Utils.escapeHtml(pipe)}</span>`;
            } else if (kw) {
              result += `<span class="hl-keyword">${Utils.escapeHtml(kw)}</span>`;
            } else if (dir) {
              result += `<span class="hl-dir">${Utils.escapeHtml(dir)}</span>`;
            } else {
              result += Utils.escapeHtml(full);
            }
          }
          return result || Utils.escapeHtml(line);
        }).join('\n');
      }
    }