// --- MERMAID CODE GENERATOR ---
    class MermaidGenerator {
      static generate(graph) {
        if (graph.customRawCode) {
          return graph.customRawCode;
        }

        if (graph.diagramType && graph.diagramType !== 'flowchart_td' && graph.diagramType !== 'flowchart_lr') {
          const tpl = DIAGRAM_TEMPLATES.find(t => t.id === graph.diagramType);
          if (tpl) return tpl.code;
        }

        const lines = [];
        lines.push(`flowchart ${graph.layoutDirection}`);

        const declaredNodes = new Set();
        const styles = [];

        const formatNodeShape = (n) => {
          const txt = `"${n.text || n.id}"`;
          switch (n.shape) {
            case 'rectangle': return `${n.id}[${txt}]`;
            case 'rounded': return `${n.id}(${txt})`;
            case 'circle': return `${n.id}((${txt}))`;
            case 'diamond': return `${n.id}{${txt}}`;
            case 'hexagon': return `${n.id}{{${txt}}}`;
            case 'parallelogram': return `${n.id}[/${txt}/]`;
            default: return `${n.id}[${txt}]`;
          }
        };

        graph.edges.forEach(e => {
          const src = graph.getNode(e.source);
          const tgt = graph.getNode(e.target);
          if (!src || !tgt) return;

          const srcRep = declaredNodes.has(src.id) ? src.id : formatNodeShape(src);
          declaredNodes.add(src.id);

          const tgtRep = declaredNodes.has(tgt.id) ? tgt.id : formatNodeShape(tgt);
          declaredNodes.add(tgt.id);

          const labelPart = e.label ? `|"${e.label}"| ` : '';
          lines.push(`  ${srcRep} ${e.type}${labelPart}${tgtRep}`);
        });

        graph.nodes.forEach(n => {
          if (!declaredNodes.has(n.id)) {
            lines.push(`  ${formatNodeShape(n)}`);
            declaredNodes.add(n.id);
          }
          const hasCustomFill = n.fillColor && n.fillColor !== '#E3F2FD' && n.fillColor !== '#2D4A66';
          const hasCustomBorder = n.borderColor && n.borderColor !== '#90CAF9' && n.borderColor !== '#4FC3F7';
          const hasCustomFont = n.fontColor && n.fontColor !== '#0D47A1' && n.fontColor !== '#E1F5FE';
          if (hasCustomFill || hasCustomBorder || hasCustomFont) {
            styles.push(`  style ${n.id} fill:${n.fillColor},stroke:${n.borderColor},color:${n.fontColor}`);
          }
        });

        if (styles.length > 0) {
          lines.push('');
          lines.push('  %% Styling');
          lines.push(...styles);
        }

        return lines.join('\n');
      }
    }