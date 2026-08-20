// --- EXPORT MANAGER ---
    class ExportManager {
      static exportMMD(graph, filename = 'diagram.mmd') {
        const code = MermaidGenerator.generate(graph);
        const fn = filename.endsWith('.mmd') ? filename : `${filename}.mmd`;
        ExportManager.downloadFile(code, fn, 'text/plain');
      }

      static exportJSON(project, filename = 'project.graph.json') {
        const json = JSON.stringify(project, null, 2);
        const fn = (filename.endsWith('.json') || filename.endsWith('.graph.json')) ? filename : `${filename}.graph.json`;
        ExportManager.downloadFile(json, fn, 'application/json');
      }

      static prepareSvgElement(svgElement, graph, theme) {
        const clone = svgElement.cloneNode(true);
        clone.removeAttribute('id');
        clone.querySelector('#canvas-grid-bg')?.remove();
        clone.querySelector('#marquee-rect')?.remove();
        clone.querySelector('#temp-layer')?.remove();
        clone.querySelectorAll('.node-port').forEach(p => p.remove());

        clone.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));

        const viewport = clone.querySelector('#canvas-viewport');
        if (viewport) {
          viewport.removeAttribute('transform');
        }

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        if (graph && graph.nodes && graph.nodes.length > 0) {
          graph.nodes.forEach(n => {
            const w = n.width || 140;
            const h = n.height || 50;
            minX = Math.min(minX, n.x);
            minY = Math.min(minY, n.y);
            maxX = Math.max(maxX, n.x + w);
            maxY = Math.max(maxY, n.y + h);
          });
        } else {
          minX = 40; minY = 40; maxX = 760; maxY = 500;
        }

        const padding = 50;
        const x = minX - padding;
        const y = minY - padding;
        const width = Math.max(200, (maxX - minX) + padding * 2);
        const height = Math.max(150, (maxY - minY) + padding * 2);

        clone.setAttribute('viewBox', `${x} ${y} ${width} ${height}`);
        clone.setAttribute('width', `${width}`);
        clone.setAttribute('height', `${height}`);
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

        const isDark = theme === 'dark';
        const linkColor = isDark ? '#BBBBBB' : '#616161';
        const labelBgColor = isDark ? '#252526' : '#FFFFFF';
        const labelBorderColor = isDark ? '#383838' : '#E0E0E0';
        const textColor = isDark ? '#D4D4D4' : '#212121';

        let defs = clone.querySelector('defs');
        if (!defs) {
          defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
          clone.insertBefore(defs, clone.firstChild);
        }

        defs.querySelectorAll('path').forEach(p => {
          p.setAttribute('fill', linkColor);
        });

        const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
        styleEl.textContent = `
          .canvas-edge-path { fill: none !important; stroke: ${linkColor} !important; stroke-width: 2px; }
          .edge-label-bg { fill: ${labelBgColor} !important; stroke: ${labelBorderColor} !important; stroke-width: 1px; rx: 4px; }
          .edge-label-text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 11px; fill: ${textColor} !important; text-anchor: middle; dominant-baseline: central; }
          .node-shape { stroke-width: 1.8px; }
          text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
        `;
        defs.appendChild(styleEl);

        return { clone, width, height, x, y };
      }

      static exportSVG(svgElement, graph, theme, options = {}) {
        const bgOption = options.background || 'theme';
        const filename = options.filename ? (options.filename.endsWith('.svg') ? options.filename : `${options.filename}.svg`) : 'diagram.svg';
        const { clone } = ExportManager.prepareSvgElement(svgElement, graph, theme);

        if (bgOption !== 'transparent') {
          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          rect.setAttribute('width', '100%');
          rect.setAttribute('height', '100%');
          rect.setAttribute('fill', bgOption === 'white' ? '#FFFFFF' : (bgOption === 'dark' ? '#252526' : (theme === 'dark' ? '#252526' : '#FFFFFF')));
          clone.insertBefore(rect, clone.firstChild);
        }

        const svgData = new XMLSerializer().serializeToString(clone);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        ExportManager.downloadUrl(url, filename);
      }

      static exportPNG(svgElement, graph, theme, options = {}) {
        const bgOption = options.background || 'theme'; // 'transparent', 'theme', 'white', 'dark'
        const scale = options.scale || 2;
        const filename = options.filename ? (options.filename.endsWith('.png') ? options.filename : `${options.filename}.png`) : 'diagram.png';

        const { clone, width, height } = ExportManager.prepareSvgElement(svgElement, graph, theme);
        const svgData = new XMLSerializer().serializeToString(clone);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        const img = new Image();

        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = width * scale;
          canvas.height = height * scale;
          const ctx = canvas.getContext('2d');
          ctx.scale(scale, scale);

          if (bgOption !== 'transparent') {
            if (bgOption === 'white') {
              ctx.fillStyle = '#FFFFFF';
            } else if (bgOption === 'dark') {
              ctx.fillStyle = '#252526';
            } else {
              ctx.fillStyle = theme === 'dark' ? '#252526' : '#FFFFFF';
            }
            ctx.fillRect(0, 0, width, height);
          } else {
            ctx.clearRect(0, 0, width, height);
          }

          ctx.drawImage(img, 0, 0, width, height);
          URL.revokeObjectURL(url);

          canvas.toBlob(blob => {
            if (blob) {
              const pngUrl = URL.createObjectURL(blob);
              ExportManager.downloadUrl(pngUrl, filename);
            }
          }, 'image/png');
        };

        img.onerror = () => {
          URL.revokeObjectURL(url);
          Utils.showToast('Failed to render PNG image', 'error');
        };

        img.src = url;
      }

      static downloadFile(content, filename, type) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        ExportManager.downloadUrl(url, filename);
      }

      static downloadUrl(url, filename) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    }