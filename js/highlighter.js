// --- SYNTAX HIGHLIGHTER ---
    class SyntaxHighlighter {
      static highlight(code) {
        const lines = code.split('\n');
        return lines.map(line => {
          if (line.trim().startsWith('%%')) {
            return `<span class="hl-comment">${Utils.escapeHtml(line)}</span>`;
          }

          let formatted = Utils.escapeHtml(line);
          formatted = formatted.replace(/\b(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram-v2|stateDiagram|erDiagram|gantt|pie|gitGraph|journey|mindmap|timeline|quadrantChart|C4Context|C4Container|C4Component|sankey-beta|requirementDiagram)\b/g, '<span class="hl-keyword">$1</span>');
          formatted = formatted.replace(/\b(TD|TB|LR|RL|BT)\b/g, '<span class="hl-dir">$1</span>');
          formatted = formatted.replace(/\b(autonumber|participant|actor|activate|deactivate|loop|alt|else|opt|par|critical|rect|Note over|Note right of|Note left of)\b/g, '<span class="hl-keyword">$1</span>');
          formatted = formatted.replace(/\b(class|interface|abstract|enum)\b/g, '<span class="hl-keyword">$1</span>');
          formatted = formatted.replace(/\b(title|dateFormat|axisFormat|section|completed|active|crit|done|after|task|score)\b/g, '<span class="hl-dir">$1</span>');
          formatted = formatted.replace(/\b(commit|branch|checkout|merge|cherry-pick|tag)\b/g, '<span class="hl-keyword">$1</span>');
          formatted = formatted.replace(/\b(x-axis|y-axis|quadrant-1|quadrant-2|quadrant-3|quadrant-4)\b/g, '<span class="hl-dir">$1</span>');
          formatted = formatted.replace(/\b(style|Person|System|System_Ext|Container|Component|Rel)\b/g, '<span class="hl-keyword">$1</span>');
          formatted = formatted.replace(/(&lt;==&gt;|&lt;--&gt;|==&gt;|-\.-&gt;|---&gt;|--&gt;|-&gt;&gt;|--&gt;&gt;|-x|--x|&lt;\|--|--\|&gt;|\|\|--o\{|\|\|--\|\{|\}\|--\|\{|\}\|--o\{)/g, '<span class="hl-arrow">$1</span>');
          formatted = formatted.replace(/(\|.*?\|)/g, '<span class="hl-label">$1</span>');
          formatted = formatted.replace(/(&quot;.*?&quot;)/g, '<span class="hl-shape">$1</span>');

          return formatted;
        }).join('\n');
      }
    }