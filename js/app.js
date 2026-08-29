// --- MAIN APPLICATION CONTROLLER ---
    class AppController {
      constructor() {
        AppController.instance = this;
        this.themeMgr = new ThemeManager();
        this.historyMgr = new HistoryManager();
        this.graph = new GraphModel();

        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.isPanning = false;
        this.panStartX = 0;
        this.panStartY = 0;

        this.selectedNodeIds = new Set();
        this.selectedEdgeId = null;
        this.selectedVisualObject = null;

        this.isDraggingNodes = false;
        this.dragStartPos = { x: 0, y: 0 };
        this.nodeInitialPositions = new Map();

        this.isMarquee = false;
        this.marqueeStart = { x: 0, y: 0 };

        this.isConnecting = false;
        this.connectingSourceId = null;
        this.connectingSourcePort = 'right';

        this.searchResults = [];
        this.searchIdx = 0;
      }

      init() {
        this.cacheDom();
        this.setupEventListeners();
        this.setupTemplatesModal();
        this.setupInitialDiagram();
        this.renderAll();
        this.updateToolbarLabels();
        this.recordHistory();
        setTimeout(() => this.zoomToFit(), 60);
      }

      cacheDom() {
        this.svg = document.getElementById('canvas-svg');
        this.viewportG = document.getElementById('canvas-viewport');
        this.nodesLayer = document.getElementById('nodes-layer');
        this.edgesLayer = document.getElementById('edges-layer');
        this.tempLayer = document.getElementById('temp-layer');
        this.marqueeRect = document.getElementById('marquee-rect');
        this.codeEditor = document.getElementById('code-editor');
        this.codeHighlight = document.getElementById('code-highlight').querySelector('code');
        this.typeSelect = document.getElementById('diagram-type-select');
      }

      setupInitialDiagram() {
        this.graph.diagramType = 'flowchart_td';
        this.graph.addNode({ id: 'Client', text: 'Client App', shape: 'rounded', x: 140, y: 80, fillColor: '#E3F2FD', borderColor: '#90CAF9', fontColor: '#0D47A1' });
        this.graph.addNode({ id: 'API', text: 'API Gateway', shape: 'rectangle', x: 140, y: 220, fillColor: '#E3F2FD', borderColor: '#90CAF9', fontColor: '#0D47A1' });
        this.graph.addNode({ id: 'Auth', text: 'Auth Service', shape: 'diamond', x: 380, y: 220, fillColor: '#FFF3E0', borderColor: '#FFE082', fontColor: '#E65100' });
        this.graph.addNode({ id: 'Database', text: 'PostgreSQL DB', shape: 'circle', x: 140, y: 360, fillColor: '#E8F5E9', borderColor: '#A5D6A7', fontColor: '#1B5E20' });

        this.graph.addEdge({ id: 'e1', source: 'Client', target: 'API', type: '-->', label: 'HTTP Request' });
        this.graph.addEdge({ id: 'e2', source: 'API', target: 'Auth', type: '-->', label: 'Verify' });
        this.graph.addEdge({ id: 'e3', source: 'API', target: 'Database', type: '==>', label: 'Query Data' });

        if (this.typeSelect) this.typeSelect.value = 'flowchart_td';
      }

      recordHistory() {
        this.historyMgr.record(this.graph.toProject(this.themeMgr.currentTheme));
        this.updateMermaidCode();
        this.updateStatusBar();
      }

      renderAll() {
        this.updateTransform();
        this.nodesLayer.innerHTML = '';
        this.edgesLayer.innerHTML = '';

        const isVisualSpecial = ['sequence', 'gantt', 'pie', 'gitGraph', 'gitgraph', 'journey', 'mindmap', 'timeline', 'quadrant', 'sankey', 'erDiagram', 'erdiagram', 'c4context', 'stateDiagram', 'statediagram', 'stateDiagram-v2', 'statediagram-v2', 'classDiagram', 'classdiagram', 'treemap', 'treemap-beta'].includes(this.graph.diagramType);

        if (isVisualSpecial) {
          const isDark = this.themeMgr.currentTheme === 'dark';
          const code = this.graph.customRawCode || MermaidGenerator.generate(this.graph);
          MultiDiagramVisualizer.render(this.graph.diagramType, code, this.nodesLayer, this.edgesLayer, isDark);
        } else {
          this.renderEdges();
          this.renderNodes();
        }

        this.renderMinimap();
        this.renderRulesList();
        this.updatePropertiesPanel();
        this.updateStatusBar();
      }

      updateTransform() {
        this.viewportG.setAttribute('transform', `translate(${this.panX}, ${this.panY}) scale(${this.zoom})`);
        const zoomText = `${Math.round(this.zoom * 100)}%`;
        document.getElementById('sb-zoom').textContent = `Zoom: ${zoomText}`;
        this.updateScrollbars();
      }

      renderNodes() {
        this.nodesLayer.innerHTML = '';

        this.graph.nodes.forEach(node => {
          if (node.id === 'visual_chart_bounds') return;

          const isSelected = this.selectedNodeIds.has(node.id);
          const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          g.setAttribute('class', `canvas-node ${isSelected ? 'selected' : ''}`);
          g.setAttribute('data-id', node.id);
          g.setAttribute('transform', `translate(${node.x}, ${node.y})`);

          const w = node.width || 140;
          const h = node.height || 50;
          const fill = node.fillColor || 'var(--node-fill)';
          const stroke = node.borderColor || 'var(--node-border)';

          let shapeEl;
          switch (node.shape) {
            case 'rounded':
              shapeEl = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
              shapeEl.setAttribute('x', '0');
              shapeEl.setAttribute('y', '0');
              shapeEl.setAttribute('width', `${w}`);
              shapeEl.setAttribute('height', `${h}`);
              shapeEl.setAttribute('rx', '12');
              shapeEl.setAttribute('ry', '12');
              break;

            case 'stadium':
              shapeEl = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
              shapeEl.setAttribute('x', '0');
              shapeEl.setAttribute('y', '0');
              shapeEl.setAttribute('width', `${w}`);
              shapeEl.setAttribute('height', `${h}`);
              shapeEl.setAttribute('rx', `${h / 2}`);
              shapeEl.setAttribute('ry', `${h / 2}`);
              break;

            case 'subroutine': {
              const subG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
              const mainR = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
              mainR.setAttribute('x', '0');
              mainR.setAttribute('y', '0');
              mainR.setAttribute('width', `${w}`);
              mainR.setAttribute('height', `${h}`);
              mainR.setAttribute('rx', '3');
              mainR.setAttribute('fill', fill);
              mainR.setAttribute('stroke', stroke);
              mainR.setAttribute('stroke-width', '1.8');
              mainR.setAttribute('class', 'node-shape');
              subG.appendChild(mainR);

              const l1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
              l1.setAttribute('x1', '12');
              l1.setAttribute('y1', '0');
              l1.setAttribute('x2', '12');
              l1.setAttribute('y2', `${h}`);
              l1.setAttribute('stroke', stroke);
              l1.setAttribute('stroke-width', '1.8');
              subG.appendChild(l1);

              const l2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
              l2.setAttribute('x1', `${w - 12}`);
              l2.setAttribute('y1', '0');
              l2.setAttribute('x2', `${w - 12}`);
              l2.setAttribute('y2', `${h}`);
              l2.setAttribute('stroke', stroke);
              l2.setAttribute('stroke-width', '1.8');
              subG.appendChild(l2);

              shapeEl = subG;
              break;
            }

            case 'cylinder': {
              const cylG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
              const ry = Math.min(10, h * 0.2);
              const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
              path.setAttribute('d', `M 0,${ry} L 0,${h - ry} A ${w / 2},${ry} 0 0,0 ${w},${h - ry} L ${w},${ry} A ${w / 2},${ry} 0 0,0 0,${ry} Z`);
              path.setAttribute('fill', fill);
              path.setAttribute('stroke', stroke);
              path.setAttribute('stroke-width', '1.8');
              path.setAttribute('class', 'node-shape');
              cylG.appendChild(path);

              const topEll = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
              topEll.setAttribute('cx', `${w / 2}`);
              topEll.setAttribute('cy', `${ry}`);
              topEll.setAttribute('rx', `${w / 2}`);
              topEll.setAttribute('ry', `${ry}`);
              topEll.setAttribute('fill', fill);
              topEll.setAttribute('stroke', stroke);
              topEll.setAttribute('stroke-width', '1.8');
              cylG.appendChild(topEll);

              shapeEl = cylG;
              break;
            }

            case 'circle':
              shapeEl = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
              shapeEl.setAttribute('cx', `${w / 2}`);
              shapeEl.setAttribute('cy', `${h / 2}`);
              shapeEl.setAttribute('rx', `${w / 2}`);
              shapeEl.setAttribute('ry', `${h / 2}`);
              break;

            case 'double_circle': {
              const dcG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
              const outEll = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
              outEll.setAttribute('cx', `${w / 2}`);
              outEll.setAttribute('cy', `${h / 2}`);
              outEll.setAttribute('rx', `${w / 2}`);
              outEll.setAttribute('ry', `${h / 2}`);
              outEll.setAttribute('fill', fill);
              outEll.setAttribute('stroke', stroke);
              outEll.setAttribute('stroke-width', '1.8');
              outEll.setAttribute('class', 'node-shape');
              dcG.appendChild(outEll);

              const inEll = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
              inEll.setAttribute('cx', `${w / 2}`);
              inEll.setAttribute('cy', `${h / 2}`);
              inEll.setAttribute('rx', `${Math.max(6, w / 2 - 5)}`);
              inEll.setAttribute('ry', `${Math.max(6, h / 2 - 5)}`);
              inEll.setAttribute('fill', 'none');
              inEll.setAttribute('stroke', stroke);
              inEll.setAttribute('stroke-width', '1.5');
              dcG.appendChild(inEll);

              shapeEl = dcG;
              break;
            }

            case 'asymmetric':
              shapeEl = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
              shapeEl.setAttribute('points', `0,0 ${w},0 ${w},${h} 0,${h} 16,${h / 2}`);
              break;

            case 'diamond':
              shapeEl = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
              shapeEl.setAttribute('points', `${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}`);
              break;

            case 'hexagon':
              shapeEl = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
              shapeEl.setAttribute('points', `18,0 ${w - 18},0 ${w},${h / 2} ${w - 18},${h} 18,${h} 0,${h / 2}`);
              break;

            case 'parallelogram':
              shapeEl = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
              shapeEl.setAttribute('points', `18,0 ${w},0 ${w - 18},${h} 0,${h}`);
              break;

            case 'parallelogram_alt':
              shapeEl = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
              shapeEl.setAttribute('points', `0,0 ${w - 18},0 ${w},${h} 18,${h}`);
              break;

            case 'trapezoid':
              shapeEl = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
              shapeEl.setAttribute('points', `18,0 ${w - 18},0 ${w},${h} 0,${h}`);
              break;

            case 'trapezoid_alt':
              shapeEl = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
              shapeEl.setAttribute('points', `0,0 ${w},0 ${w - 18},${h} 18,${h}`);
              break;

            case 'rectangle':
            default:
              shapeEl = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
              shapeEl.setAttribute('x', '0');
              shapeEl.setAttribute('y', '0');
              shapeEl.setAttribute('width', `${w}`);
              shapeEl.setAttribute('height', `${h}`);
              shapeEl.setAttribute('rx', '4');
              shapeEl.setAttribute('ry', '4');
              break;
          }

          if (shapeEl.tagName !== 'g') {
            shapeEl.setAttribute('class', 'node-shape');
            shapeEl.setAttribute('fill', fill);
            shapeEl.setAttribute('stroke', stroke);
            shapeEl.setAttribute('stroke-width', '1.8');
          }
          g.appendChild(shapeEl);

          const textLines = (node.text || node.id).split('\n');
          if (textLines.length === 1) {
            const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            textEl.setAttribute('x', `${w / 2}`);
            textEl.setAttribute('y', `${h / 2}`);
            textEl.setAttribute('text-anchor', 'middle');
            textEl.setAttribute('dominant-baseline', 'central');
            textEl.setAttribute('fill', node.fontColor || 'var(--node-text)');
            textEl.setAttribute('font-size', '12px');
            textEl.setAttribute('font-weight', '500');
            textEl.setAttribute('pointer-events', 'none');
            textEl.textContent = textLines[0];
            g.appendChild(textEl);
          } else {
            const startY = (h - (textLines.length - 1) * 16) / 2;
            textLines.forEach((tl, tIdx) => {
              const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
              textEl.setAttribute('x', `${w / 2}`);
              textEl.setAttribute('y', `${startY + tIdx * 16}`);
              textEl.setAttribute('text-anchor', 'middle');
              textEl.setAttribute('dominant-baseline', 'central');
              textEl.setAttribute('fill', node.fontColor || 'var(--node-text)');
              textEl.setAttribute('font-size', tIdx === 0 ? '12px' : '10.5px');
              textEl.setAttribute('font-weight', tIdx === 0 ? 'bold' : 'normal');
              textEl.setAttribute('pointer-events', 'none');
              textEl.textContent = tl;
              g.appendChild(textEl);
            });
          }

          const ports = [
            { pos: 'top', x: w / 2, y: 0 },
            { pos: 'right', x: w, y: h / 2 },
            { pos: 'bottom', x: w / 2, y: h },
            { pos: 'left', x: 0, y: h / 2 }
          ];

          ports.forEach(p => {
            const portEl = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            portEl.setAttribute('class', 'node-port');
            portEl.setAttribute('cx', `${p.x}`);
            portEl.setAttribute('cy', `${p.y}`);
            portEl.setAttribute('r', '5');
            portEl.setAttribute('data-node-id', node.id);
            portEl.setAttribute('data-port-pos', p.pos);

            portEl.addEventListener('mousedown', (e) => {
              e.stopPropagation();
              this.startConnecting(node.id, p.pos, e);
            });

            g.appendChild(portEl);
          });

          g.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            e.stopPropagation();
            this.handleNodeMouseDown(node.id, e);
          });

          g.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.openNodeDialog(node);
          });

          this.nodesLayer.appendChild(g);
        });
      }

      renderEdges() {
        this.edgesLayer.innerHTML = '';

        this.graph.edges.forEach(edge => {
          const src = this.graph.getNode(edge.source);
          const tgt = this.graph.getNode(edge.target);
          if (!src || !tgt) return;

          const isSelected = this.selectedEdgeId === edge.id;
          const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          g.setAttribute('class', `canvas-edge ${isSelected ? 'selected' : ''}`);
          g.setAttribute('data-id', edge.id);
          g.style.cursor = 'pointer';

          const { sx, sy, tx, ty, srcDir, tgtDir } = this.calculateEdgeEndpoints(src, tgt);

          const dx = tx - sx;
          const dy = ty - sy;
          const curveStyle = edge.curve || 'basis';
          let d = '';

          if (curveStyle === 'linear') {
            // 1. Direct straight line
            d = `M ${sx} ${sy} L ${tx} ${ty}`;
          } else if (curveStyle === 'step') {
            // 2. Orthogonal Step (90° right angles)
            if (srcDir === 'bottom' || srcDir === 'top') {
              const midY = (sy + ty) / 2;
              d = `M ${sx} ${sy} L ${sx} ${midY} L ${tx} ${midY} L ${tx} ${ty}`;
            } else {
              const midX = (sx + tx) / 2;
              d = `M ${sx} ${sy} L ${midX} ${sy} L ${midX} ${ty} L ${tx} ${ty}`;
            }
          } else {
            // 3. Smooth Bezier Curve (basis)
            if (Math.abs(dx) < 2 && (srcDir === 'top' || srcDir === 'bottom') && (tgtDir === 'top' || tgtDir === 'bottom')) {
              d = `M ${sx} ${sy} L ${tx} ${ty}`;
            } else if (Math.abs(dy) < 2 && (srcDir === 'left' || srcDir === 'right') && (tgtDir === 'left' || tgtDir === 'right')) {
              d = `M ${sx} ${sy} L ${tx} ${ty}`;
            } else {
              const dist = Math.max(35, Math.min(100, Math.sqrt(dx * dx + dy * dy) * 0.4));
              let cx1 = sx, cy1 = sy;
              let cx2 = tx, cy2 = ty;

              if (srcDir === 'bottom') cy1 = sy + dist;
              else if (srcDir === 'top') cy1 = sy - dist;
              else if (srcDir === 'right') cx1 = sx + dist;
              else if (srcDir === 'left') cx1 = sx - dist;

              if (tgtDir === 'top') cy2 = ty - dist;
              else if (tgtDir === 'bottom') cy2 = ty + dist;
              else if (tgtDir === 'left') cx2 = tx - dist;
              else if (tgtDir === 'right') cx2 = tx + dist;

              d = `M ${sx} ${sy} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${tx} ${ty}`;
            }
          }

          // Safari & Chrome compatible invisible 28px wide hitbox
          const hitPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          hitPath.setAttribute('d', d);
          hitPath.setAttribute('fill', 'none');
          hitPath.setAttribute('stroke', '#000000');
          hitPath.setAttribute('stroke-width', '28');
          hitPath.setAttribute('opacity', '0.001');
          hitPath.style.cursor = 'pointer';
          hitPath.style.pointerEvents = 'stroke';
          g.appendChild(hitPath);

          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', d);
          path.setAttribute('class', 'canvas-edge-path');
          path.style.cursor = 'pointer';
          path.style.pointerEvents = 'stroke';

          const isThick = edge.type === '==>' || edge.type === '<==>';
          const isDashed = edge.type === '-.->';
          const isBi = edge.type === '<-->' || edge.type === '<==>';

          const endMarkerId = this.getOrCreateMarker(edge.color, isThick, false, isSelected);
          path.setAttribute('marker-end', `url(#${endMarkerId})`);

          if (isBi) {
            const startMarkerId = this.getOrCreateMarker(edge.color, isThick, true, isSelected);
            path.setAttribute('marker-start', `url(#${startMarkerId})`);
          }

          if (isThick) {
            path.style.strokeWidth = isSelected ? '4.5px' : (edge.strokeWidth ? `${edge.strokeWidth}px` : '3.5px');
          } else {
            path.style.strokeWidth = isSelected ? '3px' : (edge.strokeWidth ? `${edge.strokeWidth}px` : '2px');
          }

          if (edge.color) {
            path.style.stroke = edge.color;
          }

          if (isDashed) {
            path.setAttribute('stroke-dasharray', '5,4');
          }

          if (isSelected) {
            path.style.filter = 'drop-shadow(0 0 6px rgba(33, 150, 243, 0.9))';
          }

          g.appendChild(path);

          if (edge.label) {
            const midX = (sx + tx) / 2;
            const midY = (sy + ty) / 2;

            const labelG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            labelG.setAttribute('transform', `translate(${midX}, ${midY})`);
            labelG.style.cursor = 'pointer';

            const labelText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            labelText.setAttribute('class', 'edge-label-text');
            if (edge.textColor) {
              labelText.style.fill = edge.textColor;
            }
            labelText.textContent = edge.label;
            labelG.appendChild(labelText);

            const textWidth = edge.label.length * 6.5 + 16;
            const textHeight = 20;

            const labelBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            labelBg.setAttribute('class', 'edge-label-bg');
            labelBg.setAttribute('x', `${-textWidth / 2}`);
            labelBg.setAttribute('y', `${-textHeight / 2}`);
            labelBg.setAttribute('width', `${textWidth}`);
            labelBg.setAttribute('height', `${textHeight}`);
            labelBg.setAttribute('rx', '4');
            if (isSelected) {
              labelBg.style.stroke = 'var(--selection-color)';
              labelBg.style.strokeWidth = '2.5';
              labelBg.style.filter = 'drop-shadow(0 0 5px rgba(33, 150, 243, 0.8))';
            }

            labelG.insertBefore(labelBg, labelText);
            g.appendChild(labelG);
          }

          const selectThisEdge = () => {
            this.selectedNodeIds.clear();
            this.selectedEdgeId = edge.id;
            this.selectedVisualObject = null;
            this.renderAll();
            this.updatePropertiesPanel();
            document.querySelector('.left-tab[data-tab="properties"]')?.click();
          };

          [g, hitPath, path].forEach(el => {
            el.addEventListener('mousedown', (e) => {
              e.stopPropagation();
              selectThisEdge();
            });
            el.addEventListener('click', (e) => {
              e.stopPropagation();
              selectThisEdge();
            });
          });

          g.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.openLinkDialog(edge);
          });

          this.edgesLayer.appendChild(g);
        });
      }

      calculateEdgeEndpoints(src, tgt) {
        const sw = src.width || 140;
        const sh = src.height || 50;
        const tw = tgt.width || 140;
        const th = tgt.height || 50;

        const scx = src.x + sw / 2;
        const scy = src.y + sh / 2;
        const tcx = tgt.x + tw / 2;
        const tcy = tgt.y + th / 2;

        let sx = scx, sy = scy, tx = tcx, ty = tcy;
        let srcDir = 'bottom', tgtDir = 'top';

        if (Math.abs(tcx - scx) > Math.abs(tcy - scy) * 1.1) {
          if (tcx > scx) {
            sx = src.x + sw;
            sy = scy;
            tx = tgt.x;
            ty = tcy;
            srcDir = 'right';
            tgtDir = 'left';
          } else {
            sx = src.x;
            sy = scy;
            tx = tgt.x + tw;
            ty = tcy;
            srcDir = 'left';
            tgtDir = 'right';
          }
        } else {
          if (tcy > scy) {
            sx = scx;
            sy = src.y + sh;
            tx = tcx;
            ty = tgt.y;
            srcDir = 'bottom';
            tgtDir = 'top';
          } else {
            sx = scx;
            sy = src.y;
            tx = tcx;
            ty = tgt.y + th;
            srcDir = 'top';
            tgtDir = 'bottom';
          }
        }

        return { sx, sy, tx, ty, srcDir, tgtDir };
      }

      getOrCreateMarker(color, isThick, isStart, isSelected) {
        if (isSelected) {
          if (isThick) {
            return isStart ? 'marker-start-thick-selected' : 'marker-thick-selected';
          } else {
            return isStart ? 'marker-start-arrow-selected' : 'marker-arrow-selected';
          }
        }

        if (!color || color === 'var(--link-color)' || color === '#616161' || color === '#BBBBBB') {
          if (isThick) {
            return isStart ? 'marker-start-thick' : 'marker-thick';
          } else {
            return isStart ? 'marker-start-arrow' : 'marker-arrow';
          }
        }

        const colorId = color.replace(/[^A-Za-z0-9]/g, '');
        const markerId = `marker-${isStart ? 'start-' : ''}${isThick ? 'thick-' : 'arrow-'}${colorId}`;

        let defs = this.svg.querySelector('defs');
        if (!defs) {
          defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
          this.svg.insertBefore(defs, this.svg.firstChild);
        }

        let existing = defs.querySelector(`#${markerId}`);
        if (!existing) {
          const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
          marker.setAttribute('id', markerId);
          marker.setAttribute('viewBox', '0 0 10 10');
          marker.setAttribute('orient', 'auto');

          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('fill', color);

          if (isThick) {
            marker.setAttribute('refX', isStart ? '2' : '8');
            marker.setAttribute('refY', '5');
            marker.setAttribute('markerWidth', '3.5');
            marker.setAttribute('markerHeight', '3.5');
            path.setAttribute('d', isStart ? 'M 10 0 L 0 5 L 10 10 z' : 'M 0 0 L 10 5 L 0 10 z');
          } else {
            marker.setAttribute('refX', isStart ? '1' : '9');
            marker.setAttribute('refY', '5');
            marker.setAttribute('markerWidth', '6');
            marker.setAttribute('markerHeight', '6');
            path.setAttribute('d', isStart ? 'M 10 1.5 L 0 5 L 10 8.5 z' : 'M 0 1.5 L 10 5 L 0 8.5 z');
          }

          marker.appendChild(path);
          defs.appendChild(marker);
        }

        return markerId;
      }

      // --- LIVE PROPERTIES EDITOR ---
      selectVisualObject(info) {
        this.selectedVisualObject = info;

        const inspectorTab = document.querySelector('.left-tab[data-tab="properties"]');
        if (inspectorTab) inspectorTab.click();

        this.renderAll();
        this.updatePropertiesPanel();
      }

      toggleCodePanel(forceState = null) {
        const rightPanel = document.getElementById('right-panel');
        const rightSplitter = document.getElementById('right-splitter');
        const btnToggle = document.getElementById('btn-toggle-code');

        const isCollapsed = rightPanel.classList.contains('collapsed');
        const shouldCollapse = forceState !== null ? !forceState : !isCollapsed;

        if (shouldCollapse) {
          rightPanel.classList.add('collapsed');
          rightSplitter.classList.add('collapsed');
          if (btnToggle) btnToggle.classList.remove('active');
        } else {
          rightPanel.classList.remove('collapsed');
          rightSplitter.classList.remove('collapsed');
          if (btnToggle) btnToggle.classList.add('active');
        }
        this.updateScrollbars();
      }

      updatePropertiesPanel() {
        const propEmpty = document.getElementById('prop-empty');
        const nodeForm = document.getElementById('node-props-form');
        const edgeForm = document.getElementById('edge-props-form');
        const visualForm = document.getElementById('visual-props-form');
        const visualFields = document.getElementById('visual-prop-fields');

        // Priority 1: Multi-diagram Visual Object (Sequence, Class, State, ER, C4, etc.)
        if (this.selectedVisualObject) {
          propEmpty.style.display = 'none';
          if (nodeForm) nodeForm.style.display = 'none';
          if (edgeForm) edgeForm.style.display = 'none';
          if (visualForm) {
            visualForm.style.display = 'block';
            document.getElementById('visual-prop-title').textContent = this.selectedVisualObject.title || 'Object Properties';
            document.getElementById('visual-prop-type-badge').textContent = this.selectedVisualObject.type || 'Item';

            if (visualFields) {
              visualFields.innerHTML = '';
              const initialValues = {};
              const draftValues = {};
              const inputElements = {};

              (this.selectedVisualObject.fields || []).forEach(f => {
                initialValues[f.key] = f.value;
                draftValues[f.key] = f.value;

                const grp = document.createElement('div');
                grp.className = 'prop-group';

                const lbl = document.createElement('label');
                lbl.textContent = f.label;
                grp.appendChild(lbl);

                if (f.type === 'select') {
                  const sel = document.createElement('select');
                  sel.className = 'prop-input';
                  (f.options || []).forEach(opt => {
                    const optEl = document.createElement('option');
                    optEl.value = opt.value !== undefined ? opt.value : opt;
                    optEl.textContent = opt.label || opt;
                    if (String(optEl.value) === String(f.value)) optEl.selected = true;
                    sel.appendChild(optEl);
                  });
                  sel.addEventListener('change', (e) => {
                    draftValues[f.key] = e.target.value;
                  });
                  inputElements[f.key] = sel;
                  grp.appendChild(sel);
                } else if (f.type === 'textarea') {
                  const ta = document.createElement('textarea');
                  ta.className = 'prop-input';
                  ta.rows = f.rows || 3;
                  ta.value = f.value || '';
                  ta.style.resize = 'vertical';
                  ta.style.fontFamily = 'monospace';
                  ta.style.fontSize = '12px';
                  ta.addEventListener('input', (e) => {
                    draftValues[f.key] = e.target.value;
                  });
                  inputElements[f.key] = ta;
                  grp.appendChild(ta);
                } else if (f.type === 'color') {
                  const colorWrap = document.createElement('div');
                  colorWrap.style.display = 'flex';
                  colorWrap.style.alignItems = 'center';
                  colorWrap.style.gap = '8px';
                  colorWrap.style.marginBottom = '6px';

                  const colInp = document.createElement('input');
                  colInp.type = 'color';
                  colInp.className = 'prop-color-input';
                  colInp.value = f.value && f.value.startsWith('#') ? f.value.substring(0, 7) : '#2196F3';

                  const hexTxt = document.createElement('span');
                  hexTxt.style.fontSize = '12px';
                  hexTxt.style.fontFamily = 'monospace';
                  hexTxt.style.color = 'var(--text-muted)';
                  hexTxt.textContent = colInp.value.toUpperCase();

                  colInp.addEventListener('input', (e) => {
                    draftValues[f.key] = e.target.value;
                    hexTxt.textContent = e.target.value.toUpperCase();
                  });

                  colorWrap.appendChild(colInp);
                  colorWrap.appendChild(hexTxt);
                  grp.appendChild(colorWrap);

                  const swatchRow = document.createElement('div');
                  swatchRow.style.display = 'flex';
                  swatchRow.style.gap = '5px';
                  swatchRow.style.flexWrap = 'wrap';

                  const isFillProp = f.key === 'fill' || (f.label && f.label.toLowerCase().includes('fill'));
                  const palette = isFillProp
                    ? ['#E3F2FD', '#E8F5E9', '#FFF3E0', '#FFEBEE', '#F3E5F5', '#E0F7FA', '#FFF9C4', '#FCE4EC', '#ECEFF1', '#FFFFFF']
                    : ['#0D47A1', '#1B5E20', '#E65100', '#B71C1C', '#4A148C', '#006064', '#212121', '#616161', '#90CAF9', '#FFFFFF'];
                  palette.forEach(c => {
                    const sw = document.createElement('div');
                    sw.style.width = '18px';
                    sw.style.height = '18px';
                    sw.style.borderRadius = '3px';
                    sw.style.backgroundColor = c;
                    sw.style.cursor = 'pointer';
                    sw.style.border = '1px solid rgba(128,128,128,0.4)';
                    sw.title = c;
                    sw.addEventListener('click', () => {
                      colInp.value = c;
                      hexTxt.textContent = c.toUpperCase();
                      draftValues[f.key] = c;
                    });
                    swatchRow.appendChild(sw);
                  });
                  grp.appendChild(swatchRow);
                  inputElements[f.key] = colInp;
                } else if (f.type === 'number') {
                  const numInp = document.createElement('input');
                  numInp.type = 'number';
                  numInp.className = 'prop-input';
                  if (f.min !== undefined) numInp.min = f.min;
                  if (f.max !== undefined) numInp.max = f.max;
                  if (f.step !== undefined) numInp.step = f.step;
                  numInp.value = f.value;
                  numInp.addEventListener('input', (e) => {
                    draftValues[f.key] = parseFloat(e.target.value) || 0;
                  });
                  inputElements[f.key] = numInp;
                  grp.appendChild(numInp);
                } else {
                  const txt = document.createElement('input');
                  txt.type = 'text';
                  txt.className = 'prop-input';
                  txt.value = f.value || '';
                  txt.addEventListener('input', (e) => {
                    draftValues[f.key] = e.target.value;
                  });
                  inputElements[f.key] = txt;
                  grp.appendChild(txt);
                }

                visualFields.appendChild(grp);
              });

              // Action Buttons Row (Save / Reset / Deselect)
              const btnRow = document.createElement('div');
              btnRow.style.display = 'flex';
              btnRow.style.gap = '8px';
              btnRow.style.marginTop = '16px';

              const btnSave = document.createElement('button');
              btnSave.className = 'prop-action-btn primary';
              btnSave.style.flex = '1';
              btnSave.textContent = 'Save / Apply';
              btnSave.title = 'Apply changes to diagram and code';
              btnSave.addEventListener('click', () => {
                if (this.selectedVisualObject && this.selectedVisualObject.onSave) {
                  this.selectedVisualObject.onSave(draftValues);
                  (this.selectedVisualObject.fields || []).forEach(f => {
                    f.value = draftValues[f.key];
                    initialValues[f.key] = draftValues[f.key];
                  });
                  this.graph.customRawCode = this.codeEditor.value;
                  this.renderAll();
                  this.recordHistory();
                  Utils.showToast('Properties applied', 'success');
                }
              });

              const btnReset = document.createElement('button');
              btnReset.className = 'prop-action-btn';
              btnReset.style.flex = '1';
              btnReset.textContent = 'Reset';
              btnReset.title = 'Revert unapplied changes';
              btnReset.addEventListener('click', () => {
                (this.selectedVisualObject.fields || []).forEach(f => {
                  draftValues[f.key] = initialValues[f.key];
                  if (inputElements[f.key]) {
                    inputElements[f.key].value = initialValues[f.key];
                  }
                });
                Utils.showToast('Properties reset', 'info');
              });

              const btnDeselect = document.createElement('button');
              btnDeselect.className = 'prop-action-btn danger';
              btnDeselect.style.padding = '6px 10px';
              btnDeselect.textContent = '✕';
              btnDeselect.title = 'Deselect object';
              btnDeselect.addEventListener('click', () => {
                this.selectedNodeIds.clear();
                this.selectedEdgeId = null;
                this.selectedVisualObject = null;
                this.renderAll();
                this.updatePropertiesPanel();
              });

              btnRow.appendChild(btnSave);
              btnRow.appendChild(btnReset);
              btnRow.appendChild(btnDeselect);
              visualFields.appendChild(btnRow);
            }
          }
          return;
        }

        if (visualForm) visualForm.style.display = 'none';

        // Priority 2: Flowchart Node Selected
        if (this.selectedNodeIds && this.selectedNodeIds.size === 1) {
          const nodeId = Array.from(this.selectedNodeIds)[0];
          const node = this.graph.getNode(nodeId);
          if (node) {
            propEmpty.style.display = 'none';
            if (edgeForm) edgeForm.style.display = 'none';
            if (nodeForm) nodeForm.style.display = 'block';

            this.nodeInitialValues = {
              text: node.text || node.id,
              shape: node.shape || 'rectangle',
              width: String(node.width || 140),
              height: String(node.height || 50),
              x: String(node.x),
              y: String(node.y),
              fillColor: node.fillColor || '#E3F2FD',
              borderColor: node.borderColor || '#90CAF9',
              fontColor: node.fontColor || '#0D47A1'
            };

            document.getElementById('prop-node-id-badge').textContent = node.id;
            document.getElementById('prop-node-text').value = this.nodeInitialValues.text;
            document.getElementById('prop-node-shape').value = this.nodeInitialValues.shape;
            document.getElementById('prop-node-w').value = this.nodeInitialValues.width;
            document.getElementById('prop-node-h').value = this.nodeInitialValues.height;
            document.getElementById('prop-node-x').value = this.nodeInitialValues.x;
            document.getElementById('prop-node-y').value = this.nodeInitialValues.y;
            document.getElementById('prop-node-font').value = this.nodeInitialValues.fontColor;
            const fontValEl = document.getElementById('prop-node-font-val');
            if (fontValEl) fontValEl.textContent = this.nodeInitialValues.fontColor;

            document.getElementById('prop-node-fill').value = this.nodeInitialValues.fillColor;
            const fillValEl = document.getElementById('prop-node-fill-val');
            if (fillValEl) fillValEl.textContent = this.nodeInitialValues.fillColor;

            document.getElementById('prop-node-border').value = this.nodeInitialValues.borderColor;
            const borderValEl = document.getElementById('prop-node-border-val');
            if (borderValEl) borderValEl.textContent = this.nodeInitialValues.borderColor;
            return;
          }
        }

        // Priority 3: Flowchart Link / Arrow Selected
        if (this.selectedEdgeId) {
          const edge = this.graph.getEdge(this.selectedEdgeId);
          if (edge) {
            propEmpty.style.display = 'none';
            if (nodeForm) nodeForm.style.display = 'none';
            if (edgeForm) edgeForm.style.display = 'block';

            this.edgeInitialValues = {
              source: edge.source,
              target: edge.target,
              label: edge.label || '',
              type: edge.type || '-->',
              curve: edge.curve || 'basis',
              color: edge.color || (this.themeMgr.currentTheme === 'dark' ? '#BBBBBB' : '#616161'),
              strokeWidth: String(edge.strokeWidth || 2),
              textColor: edge.textColor || (this.themeMgr.currentTheme === 'dark' ? '#D4D4D4' : '#212121')
            };

            const srcSel = document.getElementById('prop-edge-source');
            const tgtSel = document.getElementById('prop-edge-target');
            if (srcSel && tgtSel) {
              srcSel.innerHTML = '';
              tgtSel.innerHTML = '';
              const availableNodes = this.graph.nodes.filter(n => n.id !== 'visual_chart_bounds');
              availableNodes.forEach(n => {
                const opt1 = document.createElement('option');
                opt1.value = n.id;
                opt1.textContent = `${n.id} (${n.text || n.id})`;
                srcSel.appendChild(opt1);

                const opt2 = document.createElement('option');
                opt2.value = n.id;
                opt2.textContent = `${n.id} (${n.text || n.id})`;
                tgtSel.appendChild(opt2);
              });
              srcSel.value = edge.source;
              tgtSel.value = edge.target;
            }

            document.getElementById('prop-edge-label').value = this.edgeInitialValues.label;
            document.getElementById('prop-edge-type').value = this.edgeInitialValues.type;
            const curveSel = document.getElementById('prop-edge-curve');
            if (curveSel) curveSel.value = this.edgeInitialValues.curve;
            const edgeColorInp = document.getElementById('prop-edge-color');
            if (edgeColorInp) edgeColorInp.value = this.edgeInitialValues.color;
            const edgeColorVal = document.getElementById('prop-edge-color-val');
            if (edgeColorVal) edgeColorVal.textContent = this.edgeInitialValues.color;
            const edgeWidthSel = document.getElementById('prop-edge-width');
            if (edgeWidthSel) edgeWidthSel.value = this.edgeInitialValues.strokeWidth;
            const edgeTxtColInp = document.getElementById('prop-edge-text-color');
            if (edgeTxtColInp) edgeTxtColInp.value = this.edgeInitialValues.textColor;
            const edgeTxtColVal = document.getElementById('prop-edge-text-color-val');
            if (edgeTxtColVal) edgeTxtColVal.textContent = this.edgeInitialValues.textColor;
            return;
          }
        }

        propEmpty.style.display = 'block';
        if (nodeForm) nodeForm.style.display = 'none';
        if (edgeForm) edgeForm.style.display = 'none';
      }

      setupPropertiesListeners() {
        document.querySelectorAll('.left-tab').forEach(tab => {
          tab.addEventListener('click', () => {
            document.querySelectorAll('.left-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            const targetId = 'tab-' + tab.getAttribute('data-tab');
            const targetEl = document.getElementById(targetId);
            if (targetEl) targetEl.classList.add('active');
          });
        });

        // Node Form Save & Reset
        document.getElementById('btn-node-prop-save')?.addEventListener('click', () => {
          if (this.selectedNodeIds.size !== 1) return;
          const nodeId = Array.from(this.selectedNodeIds)[0];
          const node = this.graph.getNode(nodeId);
          if (!node) return;

          node.text = document.getElementById('prop-node-text').value.trim() || node.id;
          node.shape = document.getElementById('prop-node-shape').value;
          node.width = parseInt(document.getElementById('prop-node-w').value) || 140;
          node.height = parseInt(document.getElementById('prop-node-h').value) || 50;
          node.x = parseInt(document.getElementById('prop-node-x').value) || 0;
          node.y = parseInt(document.getElementById('prop-node-y').value) || 0;
          node.fillColor = document.getElementById('prop-node-fill').value;
          document.getElementById('prop-node-fill-val').textContent = node.fillColor;
          node.borderColor = document.getElementById('prop-node-border').value;
          node.fontColor = document.getElementById('prop-node-font').value;

          this.graph.customRawCode = null;
          this.renderNodes();
          this.renderEdges();
          this.renderMinimap();
          this.updateMermaidCode();
          this.recordHistory();
          Utils.showToast('Node properties applied', 'success');
        });

        document.getElementById('btn-node-prop-reset')?.addEventListener('click', () => {
          if (!this.nodeInitialValues) return;
          document.getElementById('prop-node-text').value = this.nodeInitialValues.text;
          document.getElementById('prop-node-shape').value = this.nodeInitialValues.shape;
          document.getElementById('prop-node-w').value = this.nodeInitialValues.width;
          document.getElementById('prop-node-h').value = this.nodeInitialValues.height;
          document.getElementById('prop-node-x').value = this.nodeInitialValues.x;
          document.getElementById('prop-node-y').value = this.nodeInitialValues.y;
          document.getElementById('prop-node-font').value = this.nodeInitialValues.fontColor;
          const fontValReset = document.getElementById('prop-node-font-val');
          if (fontValReset) fontValReset.textContent = this.nodeInitialValues.fontColor;

          document.getElementById('prop-node-fill').value = this.nodeInitialValues.fillColor;
          const fillValReset = document.getElementById('prop-node-fill-val');
          if (fillValReset) fillValReset.textContent = this.nodeInitialValues.fillColor;

          document.getElementById('prop-node-border').value = this.nodeInitialValues.borderColor;
          const borderValReset = document.getElementById('prop-node-border-val');
          if (borderValReset) borderValReset.textContent = this.nodeInitialValues.borderColor;
          Utils.showToast('Node properties reset', 'info');
        });

        document.getElementById('btn-node-prop-deselect')?.addEventListener('click', () => {
          this.selectedNodeIds.clear();
          this.renderAll();
          this.updatePropertiesPanel();
        });

        // 1. Font Color input & swatches
        document.getElementById('prop-node-font')?.addEventListener('input', (e) => {
          const valEl = document.getElementById('prop-node-font-val');
          if (valEl) valEl.textContent = e.target.value;
        });
        document.querySelectorAll('#node-font-swatches .color-swatch').forEach(swatch => {
          swatch.addEventListener('click', () => {
            const col = swatch.getAttribute('data-color');
            const inp = document.getElementById('prop-node-font');
            const valEl = document.getElementById('prop-node-font-val');
            if (inp) inp.value = col;
            if (valEl) valEl.textContent = col;
          });
        });

        // 2. Node Fill Color input & swatches
        document.getElementById('prop-node-fill')?.addEventListener('input', (e) => {
          const valEl = document.getElementById('prop-node-fill-val');
          if (valEl) valEl.textContent = e.target.value;
        });
        document.querySelectorAll('#node-fill-swatches .color-swatch').forEach(swatch => {
          swatch.addEventListener('click', () => {
            const col = swatch.getAttribute('data-color');
            const inp = document.getElementById('prop-node-fill');
            const valEl = document.getElementById('prop-node-fill-val');
            if (inp) inp.value = col;
            if (valEl) valEl.textContent = col;
          });
        });

        // 3. Node Border Color input & swatches
        document.getElementById('prop-node-border')?.addEventListener('input', (e) => {
          const valEl = document.getElementById('prop-node-border-val');
          if (valEl) valEl.textContent = e.target.value;
        });
        document.querySelectorAll('#node-border-swatches .color-swatch').forEach(swatch => {
          swatch.addEventListener('click', () => {
            const col = swatch.getAttribute('data-color');
            const inp = document.getElementById('prop-node-border');
            const valEl = document.getElementById('prop-node-border-val');
            if (inp) inp.value = col;
            if (valEl) valEl.textContent = col;
          });
        });

        const btnDup = document.getElementById('btn-prop-duplicate');
        if (btnDup) {
          btnDup.addEventListener('click', () => {
            if (this.selectedNodeIds.size !== 1) return;
            const nodeId = Array.from(this.selectedNodeIds)[0];
            const node = this.graph.getNode(nodeId);
            if (!node) return;

            const newId = Utils.uid('node');
            this.graph.addNode({
              id: newId,
              text: (node.text || node.id) + ' (Copy)',
              shape: node.shape,
              x: node.x + 40,
              y: node.y + 40,
              width: node.width,
              height: node.height,
              fillColor: node.fillColor,
              borderColor: node.borderColor,
              fontColor: node.fontColor
            });

            this.selectedNodeIds.clear();
            this.selectedNodeIds.add(newId);
            this.renderAll();
            this.recordHistory();
            Utils.showToast(`Duplicated ${node.id} as ${newId}`, 'success');
          });
        }

        const btnConn = document.getElementById('btn-prop-connect');
        if (btnConn) {
          btnConn.addEventListener('click', () => {
            if (this.selectedNodeIds.size !== 1) return;
            const nodeId = Array.from(this.selectedNodeIds)[0];
            this.openLinkDialog(undefined, nodeId);
          });
        }

        const btnDel = document.getElementById('btn-prop-delete');
        if (btnDel) {
          btnDel.addEventListener('click', () => this.deleteSelected());
        }

        // Edge Form Save & Reset
        document.getElementById('btn-edge-prop-save')?.addEventListener('click', () => {
          if (!this.selectedEdgeId) return;
          const edge = this.graph.getEdge(this.selectedEdgeId);
          if (!edge) return;

          const newSrc = document.getElementById('prop-edge-source')?.value;
          const newTgt = document.getElementById('prop-edge-target')?.value;
          if (newSrc) edge.source = newSrc;
          if (newTgt) edge.target = newTgt;

          edge.label = document.getElementById('prop-edge-label').value.trim() || undefined;
          edge.type = document.getElementById('prop-edge-type').value;
          const curveVal = document.getElementById('prop-edge-curve')?.value;
          if (curveVal) {
            edge.curve = curveVal;
            this.graph.curveStyle = curveVal;
          }
          const col = document.getElementById('prop-edge-color')?.value;
          if (col) edge.color = col;
          const wid = parseFloat(document.getElementById('prop-edge-width')?.value);
          if (!isNaN(wid)) edge.strokeWidth = wid;
          const txtCol = document.getElementById('prop-edge-text-color')?.value;
          if (txtCol) edge.textColor = txtCol;

          this.graph.customRawCode = null;
          this.renderEdges();
          this.updateMermaidCode();
          this.recordHistory();
          Utils.showToast('Link properties applied', 'success');
        });

        document.getElementById('btn-edge-prop-reset')?.addEventListener('click', () => {
          if (!this.edgeInitialValues) return;
          if (document.getElementById('prop-edge-source')) document.getElementById('prop-edge-source').value = this.edgeInitialValues.source;
          if (document.getElementById('prop-edge-target')) document.getElementById('prop-edge-target').value = this.edgeInitialValues.target;
          document.getElementById('prop-edge-label').value = this.edgeInitialValues.label;
          document.getElementById('prop-edge-type').value = this.edgeInitialValues.type;
          const curveReset = document.getElementById('prop-edge-curve');
          if (curveReset) curveReset.value = this.edgeInitialValues.curve || 'basis';
          const edgeColorInp = document.getElementById('prop-edge-color');
          if (edgeColorInp) edgeColorInp.value = this.edgeInitialValues.color;
          const edgeColorVal = document.getElementById('prop-edge-color-val');
          if (edgeColorVal) edgeColorVal.textContent = this.edgeInitialValues.color;
          const edgeWidthSel = document.getElementById('prop-edge-width');
          if (edgeWidthSel) edgeWidthSel.value = this.edgeInitialValues.strokeWidth;
          const edgeTextColInp = document.getElementById('prop-edge-text-color');
          if (edgeTextColInp) edgeTextColInp.value = this.edgeInitialValues.textColor || '#212121';
          const edgeTextColVal = document.getElementById('prop-edge-text-color-val');
          if (edgeTextColVal) edgeTextColVal.textContent = this.edgeInitialValues.textColor || '#212121';
          Utils.showToast('Link properties reset', 'info');
        });

        document.getElementById('prop-edge-color')?.addEventListener('input', (e) => {
          const valEl = document.getElementById('prop-edge-color-val');
          if (valEl) valEl.textContent = e.target.value;
        });

        document.querySelectorAll('#edge-color-swatches .color-swatch').forEach(swatch => {
          swatch.addEventListener('click', () => {
            const col = swatch.getAttribute('data-color');
            const inp = document.getElementById('prop-edge-color');
            const valEl = document.getElementById('prop-edge-color-val');
            if (inp) inp.value = col;
            if (valEl) valEl.textContent = col;
          });
        });

        document.getElementById('prop-edge-text-color')?.addEventListener('input', (e) => {
          const valEl = document.getElementById('prop-edge-text-color-val');
          if (valEl) valEl.textContent = e.target.value;
        });

        document.querySelectorAll('#edge-text-color-swatches .color-swatch').forEach(sw => {
          sw.addEventListener('click', () => {
            const color = sw.getAttribute('data-color');
            const inp = document.getElementById('prop-edge-text-color');
            const val = document.getElementById('prop-edge-text-color-val');
            if (inp) inp.value = color;
            if (val) val.textContent = color;
          });
        });

        document.getElementById('btn-edge-prop-deselect')?.addEventListener('click', () => {
          this.selectedEdgeId = null;
          this.renderAll();
          this.updatePropertiesPanel();
        });

        const edgeDelBtn = document.getElementById('btn-prop-edge-delete');
        if (edgeDelBtn) {
          edgeDelBtn.addEventListener('click', () => this.deleteSelected());
        }

        const gridSnapInp = document.getElementById('prop-grid-snap');
        if (gridSnapInp) {
          gridSnapInp.addEventListener('change', (e) => {
            this.graph.gridSnap = e.target.checked;
            this.recordHistory();
          });
        }

        const btnLayoutTD = document.getElementById('btn-canvas-layout-td');
        if (btnLayoutTD) {
          btnLayoutTD.addEventListener('click', () => this.runAutoLayout('TD'));
        }

        const btnLayoutLR = document.getElementById('btn-canvas-layout-lr');
        if (btnLayoutLR) {
          btnLayoutLR.addEventListener('click', () => this.runAutoLayout('LR'));
        }
      }

      renderMinimap() {
        const miniContent = document.getElementById('minimap-content');
        const miniViewport = document.getElementById('minimap-viewport');
        miniContent.innerHTML = '';

        if (this.graph.nodes.length === 0) return;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        this.graph.nodes.forEach(n => {
          minX = Math.min(minX, n.x);
          minY = Math.min(minY, n.y);
          maxX = Math.max(maxX, n.x + (n.width || 140));
          maxY = Math.max(maxY, n.y + (n.height || 50));
        });

        const pad = 100;
        minX -= pad; minY -= pad;
        maxX += pad; maxY += pad;

        const graphW = Math.max(400, maxX - minX);
        const graphH = Math.max(300, maxY - minY);

        const mapW = 180;
        const mapH = 120;
        const scale = Math.min(mapW / graphW, mapH / graphH);

        this.graph.nodes.forEach(n => {
          if (n.id === 'visual_chart_bounds') return;
          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          rect.setAttribute('x', `${(n.x - minX) * scale}`);
          rect.setAttribute('y', `${(n.y - minY) * scale}`);
          rect.setAttribute('width', `${(n.width || 140) * scale}`);
          rect.setAttribute('height', `${(n.height || 50) * scale}`);
          rect.setAttribute('fill', 'var(--node-border)');
          rect.setAttribute('rx', '1');
          miniContent.appendChild(rect);
        });

        const canvasRect = this.svg.getBoundingClientRect();
        const vpX = (-this.panX / this.zoom - minX) * scale;
        const vpY = (-this.panY / this.zoom - minY) * scale;
        const vpW = (canvasRect.width / this.zoom) * scale;
        const vpH = (canvasRect.height / this.zoom) * scale;

        miniViewport.setAttribute('x', `${Math.max(0, vpX)}`);
        miniViewport.setAttribute('y', `${Math.max(0, vpY)}`);
        miniViewport.setAttribute('width', `${Math.min(mapW, vpW)}`);
        miniViewport.setAttribute('height', `${Math.min(mapH, vpH)}`);
      }

      updateMermaidCode() {
        const code = this.graph.customRawCode || MermaidGenerator.generate(this.graph);
        this.codeEditor.value = code;
        this.codeHighlight.innerHTML = SyntaxHighlighter.highlight(code);
        document.getElementById('editor-error').textContent = 'Valid Mermaid';
        document.getElementById('editor-error').style.color = 'var(--text-muted)';
        
        const detected = MermaidParser.detectDiagramType(code);
        const typeItem = DIAGRAM_TEMPLATES.find(t => t.id === detected);
        const label = typeItem ? typeItem.badge : 'Mermaid Diagram';
        document.getElementById('editor-type-label').textContent = label;
        if (this.typeSelect && this.typeSelect.value !== detected) {
          this.typeSelect.value = detected;
        }
      }

      applyCodeToGraph(isAuto = false) {
        const code = this.codeEditor.value;
        const res = MermaidParser.parse(code, this.graph);
        if (res.error) {
          document.getElementById('editor-error').textContent = res.error;
          document.getElementById('editor-error').style.color = 'var(--btn-danger)';
          if (!isAuto) Utils.showToast(res.error, 'error');
          return;
        }

        if (res.graph) {
          this.graph.fromProject(res.graph.toProject(this.themeMgr.currentTheme));
          const isFlow = (this.graph.diagramType === 'flowchart_td' || this.graph.diagramType === 'flowchart_lr');
          this.graph.customRawCode = isFlow ? null : code;
          document.getElementById('editor-error').textContent = 'Valid Mermaid';
          document.getElementById('editor-error').style.color = 'var(--text-muted)';
          this.renderAll();
          if (!isAuto) {
            this.recordHistory();
            Utils.showToast('Diagram updated from code', 'success');
          }
        }
      }

      setupEventListeners() {
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));

        this.svg.addEventListener('mousedown', (e) => this.handleCanvasMouseDown(e));
        window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        window.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.svg.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });

        // Code Editor: lightweight syntax highlight on input, explicit apply on button or Ctrl+Enter
        this.codeEditor.addEventListener('input', () => {
          this.codeHighlight.innerHTML = SyntaxHighlighter.highlight(this.codeEditor.value);
          const detected = MermaidParser.detectDiagramType(this.codeEditor.value);
          if (this.typeSelect && this.typeSelect.value !== detected) {
            this.typeSelect.value = detected;
          }
        });

        this.codeEditor.addEventListener('keydown', (e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            this.applyCodeToGraph(false);
          }
        });

        this.codeEditor.addEventListener('scroll', () => {
          document.getElementById('code-highlight').scrollTop = this.codeEditor.scrollTop;
          document.getElementById('code-highlight').scrollLeft = this.codeEditor.scrollLeft;
        });

        document.getElementById('btn-sync-code').addEventListener('click', () => this.applyCodeToGraph(false));
        document.getElementById('btn-toggle-code')?.addEventListener('click', () => this.toggleCodePanel());
        document.getElementById('btn-close-code')?.addEventListener('click', () => this.toggleCodePanel(false));

        if (this.typeSelect) {
          this.typeSelect.addEventListener('change', (e) => {
            const selectedId = e.target.value;
            const tpl = DIAGRAM_TEMPLATES.find(t => t.id === selectedId);
            if (tpl) {
              this.loadTemplate(tpl);
            }
          });
        }

        document.getElementById('btn-new')?.addEventListener('click', () => this.confirmNew());
        document.getElementById('btn-templates')?.addEventListener('click', () => this.openTemplatesDialog());
        document.getElementById('btn-open')?.addEventListener('click', () => document.getElementById('file-input')?.click());
        document.getElementById('btn-export-dialog')?.addEventListener('click', () => this.openExportDialog());
        document.getElementById('btn-undo')?.addEventListener('click', () => this.handleUndo());
        document.getElementById('btn-redo')?.addEventListener('click', () => this.handleRedo());

        document.getElementById('btn-add-node')?.addEventListener('click', () => this.openNodeDialog());
        document.getElementById('btn-add-link')?.addEventListener('click', () => this.openLinkDialog());
        document.getElementById('btn-autolayout-td')?.addEventListener('click', () => this.runAutoLayout('TD'));
        document.getElementById('btn-autolayout-lr')?.addEventListener('click', () => this.runAutoLayout('LR'));

        document.getElementById('btn-theme')?.addEventListener('click', () => {
          this.themeMgr.toggle();
          this.renderAll();
        });

        document.getElementById('btn-rules')?.addEventListener('click', () => this.openRulesDialog());
        document.getElementById('btn-add-rule-quick')?.addEventListener('click', () => this.openRulesDialog());

        document.getElementById('btn-zoom-in')?.addEventListener('click', () => this.zoomAtCenter(1.2));
        document.getElementById('btn-zoom-out')?.addEventListener('click', () => this.zoomAtCenter(0.8));
        document.getElementById('btn-zoom-fit')?.addEventListener('click', () => this.zoomToFit());
        document.getElementById('btn-zoom-reset')?.addEventListener('click', () => {
          this.zoom = 1;
          this.panX = 0;
          this.panY = 0;
          this.renderAll();
        });

        document.getElementById('btn-search-toggle')?.addEventListener('click', () => this.toggleSearchBox());
        document.getElementById('btn-search-close')?.addEventListener('click', () => this.toggleSearchBox(false));
        document.getElementById('search-input')?.addEventListener('input', (e) => this.handleSearchInput(e.target.value));
        document.getElementById('btn-search-next')?.addEventListener('click', () => this.navigateSearch(1));
        document.getElementById('btn-search-prev')?.addEventListener('click', () => this.navigateSearch(-1));

        document.querySelectorAll('.shape-item').forEach(item => {
          item.addEventListener('click', () => {
            const shape = item.getAttribute('data-shape');
            this.createNodeAtCenter(shape);
          });
        });

        document.getElementById('file-input')?.addEventListener('change', (e) => this.handleFileOpen(e));

        window.addEventListener('resize', () => {
          this.updateScrollbars();
          this.renderMinimap();
        });

        this.setupSplitters();
        this.setupModals();
        this.setupPropertiesListeners();
        this.setupScrollbarListeners();
      }

      setupTemplatesModal() {
        const grid = document.getElementById('templates-grid');
        if (!grid) return;
        grid.innerHTML = '';

        DIAGRAM_TEMPLATES.forEach(tpl => {
          const card = document.createElement('div');
          card.className = 'template-card';
          card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span class="template-title">${tpl.name}</span>
              <span class="template-badge">${tpl.badge}</span>
            </div>
            <div class="template-desc">${tpl.desc}</div>
          `;

          card.addEventListener('click', () => {
            this.loadTemplate(tpl);
            this.closeModal('templates-modal');
          });

          grid.appendChild(card);
        });
      }

      openTemplatesDialog() {
        document.getElementById('templates-modal')?.classList.add('open');
      }

      loadTemplate(tpl) {
        this.selectedNodeIds.clear();
        this.selectedEdgeId = null;
        this.selectedVisualObject = null;
        this.updatePropertiesPanel();

        if (typeof MultiDiagramVisualizer !== 'undefined') {
          MultiDiagramVisualizer.customColors.clear();
          MultiDiagramVisualizer.nodePositions.clear();
        }
        this.nodesLayer.innerHTML = '';
        this.edgesLayer.innerHTML = '';

        this.recordHistory();
        this.graph.diagramType = tpl.id;
        this.graph.customRawCode = (tpl.id === 'flowchart_td' || tpl.id === 'flowchart_lr') ? null : tpl.code;
        if (this.typeSelect) this.typeSelect.value = tpl.id;

        this.codeEditor.value = tpl.code;
        this.codeHighlight.innerHTML = SyntaxHighlighter.highlight(tpl.code);

        if (tpl.id === 'flowchart_td') {
          this.graph.nodes = [];
          this.graph.edges = [];
          this.setupInitialDiagram();
        } else {
          this.graph.nodes = [];
          this.graph.edges = [];
          const res = MermaidParser.parse(tpl.code, this.graph);
          if (res.graph) {
            this.graph.fromProject(res.graph.toProject(this.themeMgr.currentTheme));
            if (tpl.id === 'flowchart_lr') {
              AutoLayoutEngine.layout(this.graph, 'LR');
            }
          }
        }

        this.renderAll();
        this.recordHistory();
        setTimeout(() => this.zoomToFit(), 30);
        Utils.showToast(`Loaded ${tpl.name} template`, 'success');
      }

      setupSplitters() {
        const leftSplitter = document.getElementById('left-splitter');
        const rightSplitter = document.getElementById('right-splitter');
        const leftPanel = document.getElementById('left-panel');
        const rightPanel = document.getElementById('right-panel');

        let draggingSplitter = null;

        leftSplitter.addEventListener('mousedown', () => { draggingSplitter = 'left'; leftSplitter.classList.add('active'); });
        rightSplitter.addEventListener('mousedown', () => { draggingSplitter = 'right'; rightSplitter.classList.add('active'); });

        window.addEventListener('mousemove', (e) => {
          if (!draggingSplitter) return;
          if (draggingSplitter === 'left') {
            const newW = Utils.clamp(e.clientX, 180, 420);
            leftPanel.style.width = `${newW}px`;
          } else if (draggingSplitter === 'right') {
            const newW = Utils.clamp(window.innerWidth - e.clientX, 200, 600);
            rightPanel.style.width = `${newW}px`;
          }
        });

        window.addEventListener('mouseup', () => {
          if (draggingSplitter) {
            leftSplitter.classList.remove('active');
            rightSplitter.classList.remove('active');
            draggingSplitter = null;
          }
        });
      }

      setupModals() {
        document.getElementById('node-modal-close').addEventListener('click', () => this.closeModal('node-modal'));
        document.getElementById('node-modal-cancel').addEventListener('click', () => this.closeModal('node-modal'));
        document.getElementById('node-modal-save').addEventListener('click', () => this.saveNodeFromModal());

        document.getElementById('link-modal-close').addEventListener('click', () => this.closeModal('link-modal'));
        document.getElementById('link-modal-cancel').addEventListener('click', () => this.closeModal('link-modal'));
        document.getElementById('link-modal-create').addEventListener('click', () => this.saveLinkFromModal());

        document.getElementById('rules-modal-close').addEventListener('click', () => this.closeModal('rules-modal'));
        document.getElementById('rules-modal-done').addEventListener('click', () => this.closeModal('rules-modal'));
        document.getElementById('rm-add-btn').addEventListener('click', () => this.addRuleFromModal());

        document.getElementById('templates-modal-close')?.addEventListener('click', () => this.closeModal('templates-modal'));
        document.getElementById('templates-modal-cancel')?.addEventListener('click', () => this.closeModal('templates-modal'));

        document.getElementById('export-modal-close')?.addEventListener('click', () => this.closeModal('export-modal'));
        document.getElementById('export-modal-cancel')?.addEventListener('click', () => this.closeModal('export-modal'));

        document.getElementById('btn-do-export-png')?.addEventListener('click', () => {
          const bg = document.getElementById('export-bg-option').value;
          const scale = parseInt(document.getElementById('export-scale-option').value, 10) || 2;
          const filename = document.getElementById('export-filename').value.trim() || 'diagram';
          ExportManager.exportPNG(this.svg, this.graph, this.themeMgr.currentTheme, { background: bg, scale, filename });
          this.closeModal('export-modal');
        });

        document.getElementById('btn-do-export-svg')?.addEventListener('click', () => {
          const bg = document.getElementById('export-bg-option').value;
          const filename = document.getElementById('export-filename').value.trim() || 'diagram';
          ExportManager.exportSVG(this.svg, this.graph, this.themeMgr.currentTheme, { background: bg, filename });
          this.closeModal('export-modal');
        });

        document.getElementById('btn-do-export-mmd')?.addEventListener('click', () => {
          const filename = document.getElementById('export-filename').value.trim() || 'diagram';
          ExportManager.exportMMD(this.graph, filename);
          this.closeModal('export-modal');
        });

        document.getElementById('btn-do-export-json')?.addEventListener('click', () => {
          const filename = document.getElementById('export-filename').value.trim() || 'diagram';
          ExportManager.exportJSON(this.graph.toProject(this.themeMgr.currentTheme), filename);
          this.closeModal('export-modal');
        });
      }

      openExportDialog() {
        const modal = document.getElementById('export-modal');
        if (modal) {
          const fnInp = document.getElementById('export-filename');
          if (fnInp) {
            const typeName = (this.graph && this.graph.diagramType) ? this.graph.diagramType.replace('_', '-') : 'diagram';
            fnInp.value = `${typeName}-diagram`;
          }
          modal.classList.add('open');
        }
      }

      handleCanvasMouseDown(e) {
        // Any click on background (svg, background rect, viewport, layers)
        const isBg = e.target === this.svg || e.target.id === 'canvas-grid-bg' || e.target.id === 'canvas-viewport' || e.target === this.nodesLayer || e.target === this.edgesLayer;

        if (e.button === 1 || e.spaceKey || (e.button === 0 && isBg)) {
          if (e.button === 0 && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
            if (this.selectedNodeIds.size > 0 || this.selectedEdgeId !== null || this.selectedVisualObject !== null) {
              this.selectedNodeIds.clear();
              this.selectedEdgeId = null;
              this.selectedVisualObject = null;
              this.renderAll();
              this.updatePropertiesPanel();
            }
          }

          if (e.shiftKey) {
            // Shift + Drag = Marquee Selection Box
            this.isMarquee = true;
            const pt = this.getCanvasPoint(e);
            this.marqueeStart = pt;
            this.marqueeRect.setAttribute('x', `${pt.x}`);
            this.marqueeRect.setAttribute('y', `${pt.y}`);
            this.marqueeRect.setAttribute('width', '0');
            this.marqueeRect.setAttribute('height', '0');
            this.marqueeRect.style.display = 'block';
          } else {
            // Left click + Drag on background = Move / Pan screen!
            this.isPanning = true;
            this.panStartX = e.clientX - this.panX;
            this.panStartY = e.clientY - this.panY;
            this.svg.classList.add('panning');
          }
        }
      }

      handleNodeMouseDown(nodeId, e) {
        if (!this.selectedNodeIds.has(nodeId)) {
          if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
            this.selectedNodeIds.clear();
          }
          this.selectedNodeIds.add(nodeId);
        } else if (e.shiftKey || e.ctrlKey || e.metaKey) {
          this.selectedNodeIds.delete(nodeId);
        }

        this.selectedEdgeId = null;
        this.selectedVisualObject = null;
        this.renderAll();

        document.querySelector('.left-tab[data-tab="properties"]')?.click();

        this.isDraggingNodes = true;
        this.dragStartPos = { x: e.clientX, y: e.clientY };
        this.nodeInitialPositions.clear();
        this.selectedNodeIds.forEach(id => {
          const n = this.graph.getNode(id);
          if (n) {
            this.nodeInitialPositions.set(id, { x: n.x, y: n.y });
          }
        });
      }

      handleMouseMove(e) {
        const pt = this.getCanvasPoint(e);
        document.getElementById('sb-pos').textContent = `X: ${Math.round(pt.x)}, Y: ${Math.round(pt.y)}`;

        if (this.isPanning) {
          this.panX = e.clientX - this.panStartX;
          this.panY = e.clientY - this.panStartY;
          this.updateTransform();
          this.renderMinimap();
        } else if (this.isDraggingNodes) {
          const dx = (e.clientX - this.dragStartPos.x) / this.zoom;
          const dy = (e.clientY - this.dragStartPos.y) / this.zoom;

          this.selectedNodeIds.forEach(id => {
            const n = this.graph.getNode(id);
            const initPos = this.nodeInitialPositions.get(id);
            if (n && initPos) {
              let nx = initPos.x + dx;
              let ny = initPos.y + dy;
              if (this.graph.gridSnap) {
                nx = Utils.snap(nx, this.graph.gridSize);
                ny = Utils.snap(ny, this.graph.gridSize);
              }
              n.x = nx;
              n.y = ny;
            }
          });
          this.renderEdges();
          this.renderNodes();
          this.renderMinimap();
          this.updatePropertiesPanel();
          this.updateScrollbars();
        } else if (this.isMarquee) {
          const curPt = this.getCanvasPoint(e);
          const x = Math.min(this.marqueeStart.x, curPt.x);
          const y = Math.min(this.marqueeStart.y, curPt.y);
          const w = Math.abs(curPt.x - this.marqueeStart.x);
          const h = Math.abs(curPt.y - this.marqueeStart.y);

          this.marqueeRect.setAttribute('x', `${x}`);
          this.marqueeRect.setAttribute('y', `${y}`);
          this.marqueeRect.setAttribute('width', `${w}`);
          this.marqueeRect.setAttribute('height', `${h}`);

          this.selectedNodeIds.clear();
          this.graph.nodes.forEach(n => {
            const nw = n.width || 140;
            const nh = n.height || 50;
            if (n.x < x + w && n.x + nw > x && n.y < y + h && n.y + nh > y) {
              this.selectedNodeIds.add(n.id);
            }
          });
          this.renderNodes();
          this.updatePropertiesPanel();
        } else if (this.isConnecting) {
          const src = this.graph.getNode(this.connectingSourceId);
          if (src) {
            const sw = src.width || 140;
            const sh = src.height || 50;
            let sx = src.x + sw / 2;
            let sy = src.y + sh / 2;
            if (this.connectingSourcePort === 'top') { sx = src.x + sw / 2; sy = src.y; }
            else if (this.connectingSourcePort === 'right') { sx = src.x + sw; sy = src.y + sh / 2; }
            else if (this.connectingSourcePort === 'bottom') { sx = src.x + sw / 2; sy = src.y + sh; }
            else if (this.connectingSourcePort === 'left') { sx = src.x; sy = src.y + sh / 2; }

            this.tempLayer.innerHTML = `<line x1="${sx}" y1="${sy}" x2="${pt.x}" y2="${pt.y}" class="connecting-line" />`;
          }
        }
      }

      handleMouseUp(e) {
        if (this.isDraggingNodes) {
          this.isDraggingNodes = false;
          this.recordHistory();
        }
        if (this.isPanning) {
          this.isPanning = false;
          this.svg.classList.remove('panning');
        }
        if (this.isMarquee) {
          this.isMarquee = false;
          this.marqueeRect.style.display = 'none';
        }
        if (this.isConnecting) {
          this.isConnecting = false;
          this.tempLayer.innerHTML = '';
          document.getElementById('canvas-panel')?.classList.remove('connecting');

          const pt = this.getCanvasPoint(e);
          const targetNode = this.graph.nodes.find(n => {
            const nw = n.width || 140;
            const nh = n.height || 50;
            return pt.x >= n.x && pt.x <= n.x + nw && pt.y >= n.y && pt.y <= n.y + nh;
          });

          if (targetNode && targetNode.id !== this.connectingSourceId) {
            this.openLinkDialog(undefined, this.connectingSourceId, targetNode.id);
          }
          this.connectingSourceId = null;
        }
      }

      // --- CANVAS SCROLLBARS ENGINE ---
      getWorldBounds() {
        let minX = 0, minY = 0, maxX = 1200, maxY = 800;
        if (this.graph.nodes && this.graph.nodes.length > 0) {
          this.graph.nodes.forEach(n => {
            if (n.id === 'visual_chart_bounds') return;
            minX = Math.min(minX, n.x - 200);
            minY = Math.min(minY, n.y - 200);
            maxX = Math.max(maxX, n.x + (n.width || 140) + 200);
            maxY = Math.max(maxY, n.y + (n.height || 50) + 200);
          });
        }
        minX = Math.min(minX, -600);
        minY = Math.min(minY, -400);
        maxX = Math.max(maxX, 1600);
        maxY = Math.max(maxY, 1200);
        return { minX, minY, maxX, maxY, totalW: maxX - minX, totalH: maxY - minY };
      }

      updateScrollbars() {
        const hThumb = document.getElementById('canvas-h-thumb');
        const vThumb = document.getElementById('canvas-v-thumb');
        if (!hThumb || !vThumb || !this.svg) return;

        const rect = this.svg.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const bounds = this.getWorldBounds();
        const visibleW = rect.width / this.zoom;
        const visibleH = rect.height / this.zoom;
        const visibleX = -this.panX / this.zoom;
        const visibleY = -this.panY / this.zoom;

        const trackW = rect.width - 12;
        const trackH = rect.height - 12;

        const thumbW = Utils.clamp((visibleW / bounds.totalW) * trackW, 30, trackW);
        const thumbH = Utils.clamp((visibleH / bounds.totalH) * trackH, 30, trackH);

        const thumbX = Utils.clamp(((visibleX - bounds.minX) / bounds.totalW) * trackW, 0, trackW - thumbW);
        const thumbY = Utils.clamp(((visibleY - bounds.minY) / bounds.totalH) * trackH, 0, trackH - thumbH);

        hThumb.style.width = `${thumbW}px`;
        hThumb.style.left = `${thumbX}px`;

        vThumb.style.height = `${thumbH}px`;
        vThumb.style.top = `${thumbY}px`;
      }

      setupScrollbarListeners() {
        const hTrack = document.getElementById('canvas-h-scrollbar');
        const vTrack = document.getElementById('canvas-v-scrollbar');
        const hThumb = document.getElementById('canvas-h-thumb');
        const vThumb = document.getElementById('canvas-v-thumb');
        if (!hTrack || !vTrack || !hThumb || !vThumb) return;

        let isDraggingH = false;
        let isDraggingV = false;
        let startThumbX = 0;
        let startThumbY = 0;
        let startPanX = 0;
        let startPanY = 0;

        hThumb.addEventListener('mousedown', (e) => {
          e.stopPropagation();
          isDraggingH = true;
          startThumbX = e.clientX;
          startPanX = this.panX;
          hThumb.classList.add('dragging');
        });

        vThumb.addEventListener('mousedown', (e) => {
          e.stopPropagation();
          isDraggingV = true;
          startThumbY = e.clientY;
          startPanY = this.panY;
          vThumb.classList.add('dragging');
        });

        hTrack.addEventListener('mousedown', (e) => {
          if (e.target === hThumb) return;
          const rect = hTrack.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const bounds = this.getWorldBounds();
          const targetWorldX = bounds.minX + (clickX / rect.width) * bounds.totalW;
          this.panX = -targetWorldX * this.zoom + this.svg.clientWidth / 2;
          this.renderAll();
        });

        vTrack.addEventListener('mousedown', (e) => {
          if (e.target === vThumb) return;
          const rect = vTrack.getBoundingClientRect();
          const clickY = e.clientY - rect.top;
          const bounds = this.getWorldBounds();
          const targetWorldY = bounds.minY + (clickY / rect.height) * bounds.totalH;
          this.panY = -targetWorldY * this.zoom + this.svg.clientHeight / 2;
          this.renderAll();
        });

        window.addEventListener('mousemove', (e) => {
          if (isDraggingH) {
            const rect = this.svg.getBoundingClientRect();
            const trackW = rect.width - 12;
            const bounds = this.getWorldBounds();
            const deltaX = e.clientX - startThumbX;
            const deltaWorldX = (deltaX / trackW) * bounds.totalW;
            this.panX = startPanX - deltaWorldX * this.zoom;
            this.updateTransform();
            this.renderMinimap();
          } else if (isDraggingV) {
            const rect = this.svg.getBoundingClientRect();
            const trackH = rect.height - 12;
            const bounds = this.getWorldBounds();
            const deltaY = e.clientY - startThumbY;
            const deltaWorldY = (deltaY / trackH) * bounds.totalH;
            this.panY = startPanY - deltaWorldY * this.zoom;
            this.updateTransform();
            this.renderMinimap();
          }
        });

        window.addEventListener('mouseup', () => {
          if (isDraggingH) {
            isDraggingH = false;
            hThumb.classList.remove('dragging');
          }
          if (isDraggingV) {
            isDraggingV = false;
            vThumb.classList.remove('dragging');
          }
        });
      }

      startConnecting(nodeId, portPos, e) {
        this.isConnecting = true;
        this.connectingSourceId = nodeId;
        this.connectingSourcePort = portPos;
        document.getElementById('canvas-panel')?.classList.add('connecting');
      }

      handleWheel(e) {
        e.preventDefault();
        // Zoom only when Cmd (Mac) or Ctrl (Windows/Linux) is pressed
        if (e.ctrlKey || e.metaKey) {
          const factor = e.deltaY < 0 ? 1.1 : 0.9;
          this.zoomAtPoint(factor, e.clientX, e.clientY);
        } else {
          // Normal mouse scroll: pan canvas vertically and horizontally (e.g. shiftKey, trackpad or 2D wheel)
          let dx = e.deltaX;
          let dy = e.deltaY;

          // If Shift is pressed and no horizontal delta, shift vertical scroll to horizontal scroll
          if (e.shiftKey && dx === 0) {
            dx = dy;
            dy = 0;
          }

          this.panX -= dx;
          this.panY -= dy;
          this.renderAll();
        }
      }

      zoomAtPoint(factor, clientX, clientY) {
        const oldZoom = this.zoom;
        const newZoom = Utils.clamp(oldZoom * factor, 0.25, 4.0);
        if (newZoom === oldZoom) return;

        const rect = this.svg.getBoundingClientRect();
        const mouseX = clientX - rect.left;
        const mouseY = clientY - rect.top;

        this.panX = mouseX - (mouseX - this.panX) * (newZoom / oldZoom);
        this.panY = mouseY - (mouseY - this.panY) * (newZoom / oldZoom);
        this.zoom = newZoom;

        this.renderAll();
      }

      zoomAtCenter(factor) {
        const rect = this.svg.getBoundingClientRect();
        this.zoomAtPoint(factor, rect.left + rect.width / 2, rect.top + rect.height / 2);
      }

      zoomToFit() {
        const rect = this.svg.getBoundingClientRect();
        if (!rect.width || !rect.height) {
          setTimeout(() => this.zoomToFit(), 50);
          return;
        }

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        // 1. Check rendered SVG elements in nodesLayer and edgesLayer
        try {
          if (this.nodesLayer && typeof this.nodesLayer.getBBox === 'function') {
            const nBox = this.nodesLayer.getBBox();
            if (nBox && nBox.width > 20 && nBox.height > 20) {
              minX = Math.min(minX, nBox.x);
              minY = Math.min(minY, nBox.y);
              maxX = Math.max(maxX, nBox.x + nBox.width);
              maxY = Math.max(maxY, nBox.y + nBox.height);
            }
          }
          if (this.edgesLayer && typeof this.edgesLayer.getBBox === 'function') {
            const eBox = this.edgesLayer.getBBox();
            if (eBox && eBox.width > 20 && eBox.height > 20) {
              minX = Math.min(minX, eBox.x);
              minY = Math.min(minY, eBox.y);
              maxX = Math.max(maxX, eBox.x + eBox.width);
              maxY = Math.max(maxY, eBox.y + eBox.height);
            }
          }
        } catch (err) {}

        // 2. Fallback to graph node coordinates
        if (minX === Infinity && this.graph.nodes.length > 0) {
          this.graph.nodes.forEach(n => {
            if (n.id === 'visual_chart_bounds' && n.width && n.height) {
              minX = Math.min(minX, n.x || 30);
              minY = Math.min(minY, n.y || 30);
              maxX = Math.max(maxX, (n.x || 30) + n.width);
              maxY = Math.max(maxY, (n.y || 30) + n.height);
            } else if (n.id !== 'visual_chart_bounds') {
              minX = Math.min(minX, n.x);
              minY = Math.min(minY, n.y);
              maxX = Math.max(maxX, n.x + (n.width || 140));
              maxY = Math.max(maxY, n.y + (n.height || 50));
            }
          });
        }

        if (minX === Infinity || maxX === -Infinity || minX >= maxX || minY >= maxY) {
          this.zoom = 1;
          this.panX = 0;
          this.panY = 0;
          this.updateTransform();
          return;
        }

        const pad = 40;
        const graphW = maxX - minX + pad * 2;
        const graphH = maxY - minY + pad * 2;

        const fitZoom = Utils.clamp(Math.min(rect.width / graphW, rect.height / graphH), 0.2, 1.4);
        this.zoom = fitZoom;
        this.panX = (rect.width - (maxX + minX) * fitZoom) / 2;
        this.panY = (rect.height - (maxY + minY) * fitZoom) / 2;

        this.updateTransform();
      }

      getCanvasPoint(e) {
        const rect = this.svg.getBoundingClientRect();
        return {
          x: (e.clientX - rect.left - this.panX) / this.zoom,
          y: (e.clientY - rect.top - this.panY) / this.zoom
        };
      }

      handleKeyDown(e) {
        const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);

        if (e.key === 'Escape') {
          this.closeAllModals();
          this.toggleSearchBox(false);
          this.selectedNodeIds.clear();
          this.selectedEdgeId = null;
          this.selectedVisualObject = null;
          this.renderAll();
          this.updatePropertiesPanel();
          return;
        }

        if (isInput && e.target.id !== 'code-editor') {
          return;
        }

        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            this.handleRedo();
          } else {
            this.handleUndo();
          }
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
          e.preventDefault();
          this.handleRedo();
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
          e.preventDefault();
          this.openExportDialog();
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
          e.preventDefault();
          this.confirmNew();
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
          e.preventDefault();
          document.getElementById('file-input').click();
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
          e.preventDefault();
          this.toggleSearchBox(true);
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a' && !isInput) {
          e.preventDefault();
          this.selectedNodeIds = new Set(this.graph.nodes.map(n => n.id));
          this.renderAll();
        } else if ((e.key === 'Delete' || e.key === 'Backspace') && !isInput) {
          e.preventDefault();
          this.deleteSelected();
        } else if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
          e.preventDefault();
          this.zoomAtCenter(1.2);
        } else if ((e.ctrlKey || e.metaKey) && (e.key === '-' || e.key === '_')) {
          e.preventDefault();
          this.zoomAtCenter(0.8);
        } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
          e.preventDefault();
          this.zoomToFit();
        }
      }

      handleUndo() {
        const prev = this.historyMgr.undo();
        if (prev) {
          this.graph.fromProject(prev);
          this.renderAll();
          this.updateMermaidCode();
          Utils.showToast('Reverted to previous layout (Undo)', 'info');
        }
      }

      handleRedo() {
        const next = this.historyMgr.redo();
        if (next) {
          this.graph.fromProject(next);
          this.renderAll();
          this.updateMermaidCode();
          Utils.showToast('Redo', 'info');
        }
      }

      createNodeAtCenter(shape = 'rectangle') {
        const rect = this.svg.getBoundingClientRect();
        const center = this.getCanvasPoint({ clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 });

        let id = 'node_' + (this.graph.nodes.length + 1);
        while (this.graph.getNode(id)) {
          id = Utils.uid('node');
        }

        const node = {
          id,
          text: `Node ${this.graph.nodes.length + 1}`,
          shape,
          x: Utils.snap(center.x - 70),
          y: Utils.snap(center.y - 25),
          width: 140,
          height: 50,
          fillColor: '#E3F2FD',
          borderColor: '#90CAF9',
          fontColor: '#0D47A1'
        };

        this.graph.addNode(node);
        this.selectedNodeIds.clear();
        this.selectedNodeIds.add(node.id);
        this.renderAll();
        this.recordHistory();
        Utils.showToast(`Added ${node.id}`, 'success');
      }

      getDiagramCategory() {
        const type = String(this.graph.diagramType || '').toLowerCase();
        if (type.startsWith('flowchart')) return 'flowchart';
        if (type.startsWith('sequence')) return 'sequence';
        if (type.startsWith('class')) return 'class';
        if (type.startsWith('state')) return 'state';
        if (type.startsWith('er')) return 'er';
        if (type.startsWith('gantt')) return 'gantt';
        if (type.startsWith('pie')) return 'pie';
        if (type.startsWith('git')) return 'git';
        if (type.startsWith('mindmap')) return 'mindmap';
        if (type.startsWith('timeline')) return 'timeline';
        if (type.startsWith('quadrant')) return 'quadrant';
        if (type.startsWith('c4')) return 'c4';
        if (type.startsWith('sankey')) return 'sankey';
        if (type.startsWith('treemap')) return 'treemap';
        return 'flowchart';
      }

      updateToolbarLabels() {
        const cat = this.getDiagramCategory();
        const btnNode = document.getElementById('btn-add-node');
        const btnLink = document.getElementById('btn-add-link');
        
        const nodeLabels = {
          flowchart: 'Node',
          sequence: 'Actor',
          class: 'Class',
          state: 'State',
          er: 'Entity',
          gantt: 'Task',
          pie: 'Slice',
          git: 'Commit',
          mindmap: 'Topic',
          timeline: 'Event',
          quadrant: 'Item',
          c4: 'System',
          sankey: 'Flow',
          treemap: 'Category'
        };

        const linkLabels = {
          flowchart: 'Link',
          sequence: 'Message',
          class: 'Relation',
          state: 'Transition',
          er: 'Relation',
          gantt: 'Dependency',
          pie: '—',
          git: 'Merge',
          mindmap: 'Branch',
          timeline: '—',
          quadrant: '—',
          c4: 'Relation',
          sankey: 'Flow Link',
          treemap: '—'
        };

        if (btnNode && btnNode.querySelector('span')) {
          btnNode.querySelector('span').textContent = nodeLabels[cat] || 'Node';
        }
        if (btnLink && btnLink.querySelector('span')) {
          btnLink.querySelector('span').textContent = linkLabels[cat] || 'Link';
          btnLink.style.display = (linkLabels[cat] === '—') ? 'none' : 'flex';
        }
      }

      openNodeDialog(node) {
        const cat = this.getDiagramCategory();
        const modal = document.getElementById('node-modal');
        const title = document.getElementById('node-modal-title');
        const body = modal.querySelector('.modal-body');
        const btnSave = document.getElementById('node-modal-save');

        body.innerHTML = '';
        this.currentCreateCategory = cat;
        this.currentCreateCallback = null;

        const addField = (lblText, inputEl) => {
          const grp = document.createElement('div');
          grp.className = 'form-group';
          const lbl = document.createElement('label');
          lbl.textContent = lblText;
          grp.appendChild(lbl);
          grp.appendChild(inputEl);
          body.appendChild(grp);
          return inputEl;
        };

        const code = this.codeEditor.value;

        if (cat === 'flowchart') {
          title.textContent = node ? 'Edit Node: ' + node.id : 'Add Flowchart Node';
          btnSave.textContent = node ? 'Save Node' : 'Create Node';

          const idInp = addField('Node ID', document.createElement('input'));
          idInp.className = 'form-control';
          idInp.value = node ? node.id : `node_${this.graph.nodes.length + 1}`;
          if (node) idInp.disabled = true;

          const textInp = addField('Display Text', document.createElement('input'));
          textInp.className = 'form-control';
          textInp.value = node ? (node.text || node.id) : 'New Step';

          const shapeSel = addField('Shape', document.createElement('select'));
          shapeSel.className = 'form-control';
          [
            { v: 'rectangle', l: 'Rectangle [Process]' },
            { v: 'rounded', l: 'Rounded Rectangle (Item)' },
            { v: 'stadium', l: 'Stadium / Pill ([Start / End])' },
            { v: 'subroutine', l: 'Subroutine [[Subprocess]]' },
            { v: 'cylinder', l: 'Cylinder [(Database)]' },
            { v: 'circle', l: 'Circle ((Point))' },
            { v: 'diamond', l: 'Diamond {Decision}' },
            { v: 'hexagon', l: 'Hexagon {{Prep}}' }
          ].forEach(s => {
            const o = document.createElement('option');
            o.value = s.v; o.textContent = s.l;
            if (node && node.shape === s.v) o.selected = true;
            shapeSel.appendChild(o);
          });

          let fromSel = null, toSel = null, typeSel = null, labelInp = null;

          if (!node) {
            const availableNodes = this.graph.nodes.filter(n => n.id !== 'visual_chart_bounds');

            fromSel = addField('Connect Link From (Predecessor Node)', document.createElement('select'));
            fromSel.className = 'form-control';
            fromSel.innerHTML = '<option value="">-- None (Standalone Node) --</option>';
            availableNodes.forEach(n => {
              const opt = document.createElement('option');
              opt.value = n.id;
              opt.textContent = `${n.id} (${n.text || n.id})`;
              fromSel.appendChild(opt);
            });

            toSel = addField('Connect Link To (Successor Node)', document.createElement('select'));
            toSel.className = 'form-control';
            toSel.innerHTML = '<option value="">-- None --</option>';
            availableNodes.forEach(n => {
              const opt = document.createElement('option');
              opt.value = n.id;
              opt.textContent = `${n.id} (${n.text || n.id})`;
              toSel.appendChild(opt);
            });

            typeSel = addField('Arrow Style', document.createElement('select'));
            typeSel.className = 'form-control';
            typeSel.innerHTML = '<option value="-->">Solid Arrow (--&gt;)</option><option value="==>">Thick Arrow (==&gt;)</option><option value="-.->">Dotted Arrow (-.-&gt;)</option><option value="---">Open Line (---)</option>';

            labelInp = addField('Link Label (Optional)', document.createElement('input'));
            labelInp.className = 'form-control';
            labelInp.placeholder = 'e.g. Yes / No / Action';
          }

          this.currentCreateCallback = () => {
            const id = idInp.value.trim().replace(/\s+/g, '_');
            const text = textInp.value.trim() || id;
            const shape = shapeSel.value;
            if (!id) return Utils.showToast('ID cannot be empty', 'error');

            if (node) {
              node.text = text;
              node.shape = shape;
            } else {
              const rect = this.svg.getBoundingClientRect();
              const center = this.getCanvasPoint({ clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 });

              let posX = Utils.snap(center.x - 70);
              let posY = Utils.snap(center.y - 25);

              const fromId = fromSel ? fromSel.value : '';
              const toId = toSel ? toSel.value : '';
              const edgeType = typeSel ? typeSel.value : '-->';
              const edgeLabel = labelInp ? labelInp.value.trim() : '';

              if (fromId) {
                const parentNode = this.graph.getNode(fromId);
                if (parentNode) {
                  const isLR = String(this.graph.diagramType).toLowerCase().includes('lr');
                  posX = isLR ? parentNode.x + parentNode.width + 80 : parentNode.x;
                  posY = isLR ? parentNode.y : parentNode.y + parentNode.height + 70;
                }
              }

              this.graph.addNode({
                id,
                text,
                shape,
                x: posX,
                y: posY,
                width: 140,
                height: 50,
                fillColor: '#E3F2FD',
                borderColor: '#90CAF9',
                fontColor: '#0D47A1'
              });

              if (fromId) {
                this.graph.addEdge({
                  id: Utils.uid('edge'),
                  source: fromId,
                  target: id,
                  type: edgeType,
                  label: edgeLabel || undefined
                });
              }

              if (toId) {
                this.graph.addEdge({
                  id: Utils.uid('edge'),
                  source: id,
                  target: toId,
                  type: edgeType,
                  label: undefined
                });
              }
            }
            this.updateMermaidCode();
          };
        } else if (cat === 'sequence') {
          title.textContent = 'Add Sequence Participant / Actor';
          btnSave.textContent = 'Add Participant';

          const kindSel = addField('Type', document.createElement('select'));
          kindSel.className = 'form-control';
          kindSel.innerHTML = '<option value="participant">Participant (Box)</option><option value="actor">Actor (Stick Figure)</option>';

          const aliasInp = addField('Alias / ID', document.createElement('input'));
          aliasInp.className = 'form-control';
          aliasInp.placeholder = 'e.g. Auth';

          const labelInp = addField('Display Label (Optional)', document.createElement('input'));
          labelInp.className = 'form-control';
          labelInp.placeholder = 'e.g. Authentication Service';

          this.currentCreateCallback = () => {
            const alias = aliasInp.value.trim().replace(/\s+/g, '_');
            const label = labelInp.value.trim();
            const kind = kindSel.value;
            if (!alias) return Utils.showToast('Alias ID is required', 'error');

            const stmt = label ? `    ${kind} ${alias} as ${label}` : `    ${kind} ${alias}`;
            MultiDiagramVisualizer.updateCodeLine((curCode) => {
              const lines = curCode.split('\n');
              const seqIdx = lines.findIndex(l => l.trim().toLowerCase().startsWith('sequencediagram'));
              const insertIdx = seqIdx !== -1 ? seqIdx + 1 : 0;
              lines.splice(insertIdx, 0, stmt);
              return lines.join('\n');
            });
            Utils.showToast(`Added ${kind}: ${alias}`, 'success');
          };
        } else if (cat === 'class') {
          title.textContent = 'Add Class (UML Card)';
          btnSave.textContent = 'Add Class';

          const nameInp = addField('Class Name', document.createElement('input'));
          nameInp.className = 'form-control';
          nameInp.placeholder = 'e.g. Vehicle / OrderManager';

          const attrInp = addField('Attributes (one per line)', document.createElement('textarea'));
          attrInp.className = 'form-control';
          attrInp.rows = 3;
          attrInp.style.fontFamily = 'monospace';
          attrInp.placeholder = '+String brand\n+int maxSpeed';

          const methInp = addField('Methods (one per line)', document.createElement('textarea'));
          methInp.className = 'form-control';
          methInp.rows = 3;
          methInp.style.fontFamily = 'monospace';
          methInp.placeholder = '+start()\n+stop()';

          this.currentCreateCallback = () => {
            const cName = nameInp.value.trim().replace(/\s+/g, '');
            if (!cName) return Utils.showToast('Class name is required', 'error');

            const attrs = attrInp.value.split('\n').map(s => s.trim()).filter(Boolean).map(a => `      ${a}`).join('\n');
            const meths = methInp.value.split('\n').map(s => s.trim()).filter(Boolean).map(m => `      ${m}`).join('\n');

            let bodyStr = '';
            if (attrs) bodyStr += attrs + '\n';
            if (meths) bodyStr += meths + '\n';

            const stmt = `    class ${cName}{\n${bodyStr}    }`;
            MultiDiagramVisualizer.updateCodeLine((curCode) => `${curCode.trimEnd()}\n${stmt}`);
            Utils.showToast(`Added Class: ${cName}`, 'success');
          };
        } else if (cat === 'state') {
          title.textContent = 'Add State & Transition';
          btnSave.textContent = 'Add State';

          const idInp = addField('State Name / ID', document.createElement('input'));
          idInp.className = 'form-control';
          idInp.placeholder = 'e.g. Processing / Verified';

          const descInp = addField('State Description (Optional)', document.createElement('input'));
          descInp.className = 'form-control';
          descInp.placeholder = 'e.g. Verifying user credentials';

          // Helper to extract all existing states from code
          const extractAllStates = (c) => {
            const list = new Set(['[*]']);
            (c || '').split('\n').forEach(l => {
              const trimmed = l.trim();
              if (!trimmed || trimmed.startsWith('%%') || trimmed.startsWith('stateDiagram')) return;
              const sm = trimmed.match(/^state\s+([A-Za-z0-9_]+)/i);
              if (sm && sm[1] !== '<<choice>>' && sm[1] !== '<<fork>>' && sm[1] !== '<<join>>') list.add(sm[1]);
              const cm = trimmed.match(/^([A-Za-z0-9_]+)\s*:/);
              if (cm && !trimmed.includes('-->')) list.add(cm[1]);
              const asM = trimmed.match(/^state\s+"[^"]+"\s+as\s+([A-Za-z0-9_]+)/i);
              if (asM) list.add(asM[1]);
              const tm = trimmed.match(/^(\[\*\]|[A-Za-z0-9_]+)\s*-->\s*(\[\*\]|[A-Za-z0-9_]+)/);
              if (tm) {
                if (tm[1] !== '[*]') list.add(tm[1]);
                if (tm[2] !== '[*]') list.add(tm[2]);
              }
            });
            return Array.from(list);
          };

          const existingStates = extractAllStates(code);

          const fromSel = addField('Connect Link From (Predecessor)', document.createElement('select'));
          fromSel.className = 'form-control';
          fromSel.innerHTML = '<option value="">-- None (Standalone State) --</option>';
          existingStates.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s;
            opt.textContent = s === '[*]' ? '[*] (Start State)' : s;
            fromSel.appendChild(opt);
          });

          const toSel = addField('Connect Link To (Successor)', document.createElement('select'));
          toSel.className = 'form-control';
          toSel.innerHTML = '<option value="">-- None --</option>';
          existingStates.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s;
            opt.textContent = s === '[*]' ? '[*] (End State)' : s;
            toSel.appendChild(opt);
          });

          const condInp = addField('Transition Condition / Label (Optional)', document.createElement('input'));
          condInp.className = 'form-control';
          condInp.placeholder = 'e.g. timeout / start / battery < 20%';

          this.currentCreateCallback = () => {
            const sId = idInp.value.trim().replace(/\s+/g, '_');
            const desc = descInp.value.trim();
            const fromState = fromSel.value;
            const toState = toSel.value;
            const cond = condInp.value.trim();
            if (!sId) return Utils.showToast('State name is required', 'error');

            let stmts = [];
            stmts.push(desc ? `    ${sId} : ${desc}` : `    state ${sId}`);
            if (fromState) {
              stmts.push(cond ? `    ${fromState} --> ${sId} : ${cond}` : `    ${fromState} --> ${sId}`);
            }
            if (toState) {
              stmts.push(`    ${sId} --> ${toState}`);
            }

            MultiDiagramVisualizer.updateCodeLine((curCode) => `${curCode.trimEnd()}\n${stmts.join('\n')}`);
            Utils.showToast(`Added State: ${sId}`, 'success');
          };
        } else if (cat === 'er') {
          title.textContent = 'Add Entity (Database Table)';
          btnSave.textContent = 'Add Entity';

          const nameInp = addField('Entity Table Name', document.createElement('input'));
          nameInp.className = 'form-control';
          nameInp.placeholder = 'e.g. INVOICE / PAYMENT';

          const attrInp = addField('Attributes (type name [PK/FK/UK] ["comment"])', document.createElement('textarea'));
          attrInp.className = 'form-control';
          attrInp.rows = 4;
          attrInp.style.fontFamily = 'monospace';
          attrInp.placeholder = 'string id PK\nstring userId FK\ndecimal total\ndate createdAt';

          this.currentCreateCallback = () => {
            const eName = nameInp.value.trim().toUpperCase().replace(/\s+/g, '_');
            if (!eName) return Utils.showToast('Entity name is required', 'error');

            const formatted = attrInp.value.split('\n').map(s => s.trim()).filter(Boolean).map(a => `        ${a}`).join('\n');
            const stmt = `    ${eName} {\n${formatted || '        string id PK'}\n    }`;
            MultiDiagramVisualizer.updateCodeLine((curCode) => `${curCode.trimEnd()}\n${stmt}`);
            Utils.showToast(`Added Entity: ${eName}`, 'success');
          };
        } else if (cat === 'mindmap') {
          title.textContent = 'Add Mindmap Topic';
          btnSave.textContent = 'Add Topic';

          const textInp = addField('Topic Name', document.createElement('input'));
          textInp.className = 'form-control';
          textInp.placeholder = 'e.g. Innovation / Cloud Infrastructure';

          const shapeSel = addField('Topic Shape', document.createElement('select'));
          shapeSel.className = 'form-control';
          shapeSel.innerHTML = '<option value="rounded">Rounded (Topic)</option><option value="rectangle">Rectangle [Topic]</option><option value="circle">Circle ((Topic))</option><option value="hexagon">Hexagon {{Topic}}</option><option value="cloud">Cloud )Topic(</option>';

          this.currentCreateCallback = () => {
            const txt = textInp.value.trim();
            if (!txt) return Utils.showToast('Topic name is required', 'error');

            const shapeBrackets = { 'rounded': ['(', ')'], 'rectangle': ['[', ']'], 'circle': ['((', '))'], 'hexagon': ['{{', '}}'], 'cloud': [')', '('] };
            const br = shapeBrackets[shapeSel.value] || ['(', ')'];
            const stmt = `    ${br[0]}${txt}${br[1]}`;
            MultiDiagramVisualizer.updateCodeLine((curCode) => `${curCode.trimEnd()}\n${stmt}`);
            Utils.showToast(`Added Topic: ${txt}`, 'success');
          };
        } else if (cat === 'gantt') {
          title.textContent = 'Add Gantt Task';
          btnSave.textContent = 'Add Task';

          const secInp = addField('Section Name', document.createElement('input'));
          secInp.className = 'form-control';
          secInp.placeholder = 'e.g. Sprint Execution';
          secInp.value = 'Sprint Tasks';

          const nameInp = addField('Task Name', document.createElement('input'));
          nameInp.className = 'form-control';
          nameInp.placeholder = 'e.g. API Security Audit';

          const stSel = addField('Task Status', document.createElement('select'));
          stSel.className = 'form-control';
          stSel.innerHTML = '<option value="active">Active (In Progress)</option><option value="done">Done (Completed)</option><option value="crit">Critical (Red)</option><option value="milestone">Milestone (Diamond)</option>';

          const durInp = addField('Duration (Days)', document.createElement('input'));
          durInp.className = 'form-control';
          durInp.type = 'number';
          durInp.value = '5';

          this.currentCreateCallback = () => {
            const sec = secInp.value.trim() || 'Sprint Tasks';
            const name = nameInp.value.trim();
            if (!name) return Utils.showToast('Task name is required', 'error');

            const st = stSel.value;
            const dur = durInp.value || '5';
            const stmt = `    ${name.padEnd(20, ' ')} :${st}, ${dur}d`;

            MultiDiagramVisualizer.updateCodeLine((curCode) => {
              if (curCode.includes(`section ${sec}`)) {
                const lines = curCode.split('\n');
                const idx = lines.findIndex(l => l.trim().toLowerCase() === `section ${sec}`.toLowerCase());
                lines.splice(idx + 1, 0, stmt);
                return lines.join('\n');
              } else {
                return `${curCode.trimEnd()}\n  section ${sec}\n${stmt}`;
              }
            });
            Utils.showToast(`Added Task: ${name}`, 'success');
          };
        } else if (cat === 'pie') {
          title.textContent = 'Add Pie Slice';
          btnSave.textContent = 'Add Slice';

          const lblInp = addField('Category Label', document.createElement('input'));
          lblInp.className = 'form-control';
          lblInp.placeholder = 'e.g. Serverless Functions';

          const valInp = addField('Numeric Value', document.createElement('input'));
          valInp.className = 'form-control';
          valInp.type = 'number';
          valInp.value = '25';

          this.currentCreateCallback = () => {
            const lbl = lblInp.value.trim();
            const val = valInp.value || '10';
            if (!lbl) return Utils.showToast('Category label is required', 'error');

            const stmt = `  "${lbl}" : ${val}`;
            MultiDiagramVisualizer.updateCodeLine((curCode) => `${curCode.trimEnd()}\n${stmt}`);
            Utils.showToast(`Added Slice: ${lbl}`, 'success');
          };
        } else if (cat === 'c4') {
          title.textContent = 'Add C4 Architecture System / Component';
          btnSave.textContent = 'Add System';

          const kindSel = addField('Element Type', document.createElement('select'));
          kindSel.className = 'form-control';
          kindSel.innerHTML = '<option value="Person">Person (User / Actor)</option><option value="System">System (Software System)</option><option value="SystemDb">SystemDb (Database / Storage)</option><option value="Container">Container (Microservice / API)</option><option value="System_Ext">System_Ext (External System)</option>';

          const aliasInp = addField('Alias ID', document.createElement('input'));
          aliasInp.className = 'form-control';
          aliasInp.placeholder = 'e.g. auth_service';

          const labelInp = addField('Display Label', document.createElement('input'));
          labelInp.className = 'form-control';
          labelInp.placeholder = 'e.g. Authentication Service';

          const techInp = addField('Technology (Optional)', document.createElement('input'));
          techInp.className = 'form-control';
          techInp.placeholder = 'e.g. Node.js / OAuth2';

          const descInp = addField('Description (Optional)', document.createElement('input'));
          descInp.className = 'form-control';
          descInp.placeholder = 'e.g. Handles JWT sessions and MFA';

          this.currentCreateCallback = () => {
            const alias = aliasInp.value.trim().replace(/\s+/g, '_');
            const label = labelInp.value.trim();
            if (!alias || !label) return Utils.showToast('Alias and Label are required', 'error');

            const tech = techInp.value.trim();
            const desc = descInp.value.trim();
            const kind = kindSel.value;

            let stmt = `    ${kind}(${alias}, "${label}"`;
            if (tech && desc) stmt += `, "${tech}", "${desc}")`;
            else if (desc) stmt += `, "${desc}")`;
            else stmt += `)`;

            MultiDiagramVisualizer.updateCodeLine((curCode) => `${curCode.trimEnd()}\n${stmt}`);
            Utils.showToast(`Added C4 Element: ${label}`, 'success');
          };
        } else {
          title.textContent = 'Add Item';
          btnSave.textContent = 'Add Item';

          const itemInp = addField('Item Name / Statement', document.createElement('input'));
          itemInp.className = 'form-control';
          itemInp.placeholder = 'e.g. New Item Entry';

          this.currentCreateCallback = () => {
            const txt = itemInp.value.trim();
            if (txt) {
              MultiDiagramVisualizer.updateCodeLine((curCode) => `${curCode.trimEnd()}\n    ${txt}`);
              Utils.showToast(`Added item`, 'success');
            }
          };
        }

        modal.classList.add('open');
        const firstInp = body.querySelector('input, select');
        if (firstInp) firstInp.focus();
      }

      saveNodeFromModal() {
        if (this.currentCreateCallback) {
          this.currentCreateCallback();
        }
        this.closeModal('node-modal');
        this.renderAll();
        this.recordHistory();
      }

      openLinkDialog(edge, defaultSource, defaultTarget) {
        const cat = this.getDiagramCategory();
        const modal = document.getElementById('link-modal');
        const title = document.getElementById('link-modal-title');
        const body = modal.querySelector('.modal-body');
        const btnSave = document.getElementById('link-modal-create');

        body.innerHTML = '';
        this.currentLinkCallback = null;

        const addField = (lblText, inputEl) => {
          const grp = document.createElement('div');
          grp.className = 'form-group';
          const lbl = document.createElement('label');
          lbl.textContent = lblText;
          grp.appendChild(lbl);
          grp.appendChild(inputEl);
          body.appendChild(grp);
          return inputEl;
        };

        const code = this.codeEditor.value;

        if (cat === 'flowchart') {
          title.textContent = 'Add Connection Link';
          btnSave.textContent = 'Create Link';

          const srcSel = addField('Source Node', document.createElement('select'));
          srcSel.className = 'form-control';
          const tgtSel = addField('Target Node', document.createElement('select'));
          tgtSel.className = 'form-control';

          this.graph.nodes.forEach(n => {
            if (n.id === 'visual_chart_bounds') return;
            const o1 = document.createElement('option'); o1.value = n.id; o1.textContent = `${n.id} (${n.text || n.id})`;
            const o2 = document.createElement('option'); o2.value = n.id; o2.textContent = `${n.id} (${n.text || n.id})`;
            srcSel.appendChild(o1);
            tgtSel.appendChild(o2);
          });
          if (tgtSel.options.length > 1) tgtSel.selectedIndex = 1;

          const typeSel = addField('Arrowhead Style', document.createElement('select'));
          typeSel.className = 'form-control';
          typeSel.innerHTML = '<option value="-->">Solid Arrow (--&gt;)</option><option value="==>">Thick Arrow (==&gt;)</option><option value="-.->">Dotted Arrow (-.-&gt;)</option><option value="---">Open Line (---)</option>';

          const labelInp = addField('Edge Label (Optional)', document.createElement('input'));
          labelInp.className = 'form-control';
          labelInp.placeholder = 'e.g. Yes / Verified';

          this.currentLinkCallback = () => {
            const s = srcSel.value;
            const t = tgtSel.value;
            const tp = typeSel.value;
            const lbl = labelInp.value.trim();
            if (!s || !t) return Utils.showToast('Source and Target required', 'error');

            this.graph.addEdge({
              id: `e_${s}_${t}_${Date.now()}`,
              source: s,
              target: t,
              type: tp,
              label: lbl,
              color: '#616161',
              width: '2',
              curve: 'basis'
            });
            this.updateMermaidCode();
          };
        } else if (cat === 'sequence') {
          title.textContent = 'Add Sequence Message';
          btnSave.textContent = 'Add Message';

          const pMatches = Array.from(code.matchAll(/(?:participant|actor)\s+([A-Za-z0-9_]+)(?:\s+as\s+([A-Za-z0-9_\s]+))?/gi));
          const participants = pMatches.map(m => m[1]);

          const srcSel = addField('From (Sender)', document.createElement('select'));
          srcSel.className = 'form-control';
          const tgtSel = addField('To (Receiver)', document.createElement('select'));
          tgtSel.className = 'form-control';

          participants.forEach(p => {
            const o1 = document.createElement('option'); o1.value = p; o1.textContent = p;
            const o2 = document.createElement('option'); o2.value = p; o2.textContent = p;
            srcSel.appendChild(o1);
            tgtSel.appendChild(o2);
          });
          if (tgtSel.options.length > 1) tgtSel.selectedIndex = 1;

          const arrowSel = addField('Message Arrow Style', document.createElement('select'));
          arrowSel.className = 'form-control';
          arrowSel.innerHTML = '<option value="->>">Solid Synchronous (-&gt;&gt;)</option><option value="-->>">Dashed Return (--&gt;&gt;)</option><option value="->">Open Async (-&gt;)</option><option value="-->">Dashed Open (--&gt;)</option>';

          const msgInp = addField('Message Label', document.createElement('input'));
          msgInp.className = 'form-control';
          msgInp.placeholder = 'e.g. Process Order / Return Token';

          this.currentLinkCallback = () => {
            const s = srcSel.value || 'Client';
            const t = tgtSel.value || 'Server';
            const arr = arrowSel.value;
            const msg = msgInp.value.trim() || 'Request';

            const stmt = `    ${s}${arr}${t}: ${msg}`;
            MultiDiagramVisualizer.updateCodeLine((curCode) => `${curCode.trimEnd()}\n${stmt}`);
            Utils.showToast(`Added Message: ${s} -> ${t}`, 'success');
          };
        } else if (cat === 'class') {
          title.textContent = 'Add Class Relationship';
          btnSave.textContent = 'Add Relationship';

          const cMatches = Array.from(code.matchAll(/class\s+([A-Za-z0-9_]+)/gi));
          const classes = Array.from(new Set(cMatches.map(m => m[1])));

          const srcSel = addField('Super / Source Class', document.createElement('select'));
          srcSel.className = 'form-control';
          const tgtSel = addField('Sub / Target Class', document.createElement('select'));
          tgtSel.className = 'form-control';

          classes.forEach(c => {
            const o1 = document.createElement('option'); o1.value = c; o1.textContent = c;
            const o2 = document.createElement('option'); o2.value = c; o2.textContent = c;
            srcSel.appendChild(o1);
            tgtSel.appendChild(o2);
          });
          if (tgtSel.options.length > 1) tgtSel.selectedIndex = 1;

          const typeSel = addField('Relationship Type', document.createElement('select'));
          typeSel.className = 'form-control';
          typeSel.innerHTML = '<option value="<|--">Inheritance / Generalization (&lt;|--)</option><option value="*--">Composition (*--)</option><option value="o--">Aggregation (o--)</option><option value="-->">Association (--&gt;)</option><option value="..|>">Realization (..|&gt;)</option>';

          this.currentLinkCallback = () => {
            const s = srcSel.value;
            const t = tgtSel.value;
            const tp = typeSel.value;
            if (!s || !t) return Utils.showToast('Select both classes', 'error');

            const stmt = `    ${s} ${tp} ${t}`;
            MultiDiagramVisualizer.updateCodeLine((curCode) => {
              const lines = curCode.split('\n');
              const idx = lines.findIndex(l => l.trim().toLowerCase().startsWith('classdiagram'));
              lines.splice(idx !== -1 ? idx + 1 : 0, 0, stmt);
              return lines.join('\n');
            });
            Utils.showToast(`Added Relation: ${s} ${tp} ${t}`, 'success');
          };
        } else if (cat === 'state') {
          title.textContent = 'Add State Transition';
          btnSave.textContent = 'Add Transition';

          const extractAllStates = (c) => {
            const list = new Set(['[*]']);
            (c || '').split('\n').forEach(l => {
              const trimmed = l.trim();
              if (!trimmed || trimmed.startsWith('%%') || trimmed.startsWith('stateDiagram')) return;
              const sm = trimmed.match(/^state\s+([A-Za-z0-9_]+)/i);
              if (sm && sm[1] !== '<<choice>>' && sm[1] !== '<<fork>>' && sm[1] !== '<<join>>') list.add(sm[1]);
              const cm = trimmed.match(/^([A-Za-z0-9_]+)\s*:/);
              if (cm && !trimmed.includes('-->')) list.add(cm[1]);
              const asM = trimmed.match(/^state\s+"[^"]+"\s+as\s+([A-Za-z0-9_]+)/i);
              if (asM) list.add(asM[1]);
              const tm = trimmed.match(/^(\[\*\]|[A-Za-z0-9_]+)\s*-->\s*(\[\*\]|[A-Za-z0-9_]+)/);
              if (tm) {
                if (tm[1] !== '[*]') list.add(tm[1]);
                if (tm[2] !== '[*]') list.add(tm[2]);
              }
            });
            return Array.from(list);
          };

          const states = extractAllStates(code);

          const srcSel = addField('From State', document.createElement('select'));
          srcSel.className = 'form-control';
          const tgtSel = addField('To State', document.createElement('select'));
          tgtSel.className = 'form-control';

          states.forEach(s => {
            const o1 = document.createElement('option'); o1.value = s; o1.textContent = s === '[*]' ? '[*] (Start State)' : s;
            const o2 = document.createElement('option'); o2.value = s; o2.textContent = s === '[*]' ? '[*] (End State)' : s;
            srcSel.appendChild(o1);
            tgtSel.appendChild(o2);
          });
          if (tgtSel.options.length > 1) tgtSel.selectedIndex = 1;

          const condInp = addField('Transition Condition / Label (Optional)', document.createElement('input'));
          condInp.className = 'form-control';
          condInp.placeholder = 'e.g. timeout / battery < 20%';

          this.currentLinkCallback = () => {
            const s = srcSel.value;
            const t = tgtSel.value;
            const cond = condInp.value.trim();
            if (!s || !t) return Utils.showToast('Select both states', 'error');

            const stmt = cond ? `    ${s} --> ${t} : ${cond}` : `    ${s} --> ${t}`;
            MultiDiagramVisualizer.updateCodeLine((curCode) => `${curCode.trimEnd()}\n${stmt}`);
            Utils.showToast(`Added Transition: ${s} -> ${t}`, 'success');
          };
        } else if (cat === 'er') {
          title.textContent = 'Add ER Relationship';
          btnSave.textContent = 'Add Relationship';

          const eMatches = Array.from(code.matchAll(/([A-Za-z0-9_]+)\s*\{/g));
          const entities = Array.from(new Set(eMatches.map(m => m[1])));

          const srcSel = addField('Entity 1', document.createElement('select'));
          srcSel.className = 'form-control';
          const tgtSel = addField('Entity 2', document.createElement('select'));
          tgtSel.className = 'form-control';

          entities.forEach(e => {
            const o1 = document.createElement('option'); o1.value = e; o1.textContent = e;
            const o2 = document.createElement('option'); o2.value = e; o2.textContent = e;
            srcSel.appendChild(o1);
            tgtSel.appendChild(o2);
          });
          if (tgtSel.options.length > 1) tgtSel.selectedIndex = 1;

          const cardSel = addField('Cardinality', document.createElement('select'));
          cardSel.className = 'form-control';
          cardSel.innerHTML = '<option value="||--o{">One to Zero-or-More (||--o{)</option><option value="||--|{">One to One-or-More (||--|{)</option><option value="||--||">One to One (||--||)</option><option value="}|--|{">Many to Many (}|--|{)</option><option value="}|--o{">Many to Zero-or-More (}|--o{)</option>';

          const verbInp = addField('Relationship Verb / Label', document.createElement('input'));
          verbInp.className = 'form-control';
          verbInp.placeholder = 'e.g. contains / logs / places';

          this.currentLinkCallback = () => {
            const s = srcSel.value;
            const t = tgtSel.value;
            const card = cardSel.value;
            const verb = verbInp.value.trim() || 'relates';
            if (!s || !t) return Utils.showToast('Select both entities', 'error');

            const stmt = `    ${s} ${card} ${t} : ${verb.includes(' ') ? `"${verb}"` : verb}`;
            MultiDiagramVisualizer.updateCodeLine((curCode) => {
              const lines = curCode.split('\n');
              const idx = lines.findIndex(l => l.trim().toLowerCase().startsWith('erdiagram'));
              lines.splice(idx !== -1 ? idx + 1 : 0, 0, stmt);
              return lines.join('\n');
            });
            Utils.showToast(`Added ER Relation: ${s} -> ${t}`, 'success');
          };
        } else if (cat === 'c4') {
          title.textContent = 'Add C4 Relationship';
          btnSave.textContent = 'Add Relation';

          const sMatches = Array.from(code.matchAll(/(?:Person|System|Container|Component|SystemDb)[A-Za-z0-9_]*\s*\(\s*([A-Za-z0-9_]+)/g));
          const elements = Array.from(new Set(sMatches.map(m => m[1])));

          const srcSel = addField('From Element', document.createElement('select'));
          srcSel.className = 'form-control';
          const tgtSel = addField('To Element', document.createElement('select'));
          tgtSel.className = 'form-control';

          elements.forEach(e => {
            const o1 = document.createElement('option'); o1.value = e; o1.textContent = e;
            const o2 = document.createElement('option'); o2.value = e; o2.textContent = e;
            srcSel.appendChild(o1);
            tgtSel.appendChild(o2);
          });
          if (tgtSel.options.length > 1) tgtSel.selectedIndex = 1;

          const actInp = addField('Action / Call Label', document.createElement('input'));
          actInp.className = 'form-control';
          actInp.placeholder = 'e.g. Uses / Queries data';

          const techInp = addField('Protocol / Tech (Optional)', document.createElement('input'));
          techInp.className = 'form-control';
          techInp.placeholder = 'e.g. HTTPS / REST / gRPC';

          this.currentLinkCallback = () => {
            const s = srcSel.value;
            const t = tgtSel.value;
            const act = actInp.value.trim() || 'Uses';
            const tech = techInp.value.trim();
            if (!s || !t) return Utils.showToast('Select source and target', 'error');

            const stmt = tech ? `    Rel(${s}, ${t}, "${act}", "${tech}")` : `    Rel(${s}, ${t}, "${act}")`;
            MultiDiagramVisualizer.updateCodeLine((curCode) => `${curCode.trimEnd()}\n${stmt}`);
            Utils.showToast(`Added C4 Relation: ${s} -> ${t}`, 'success');
          };
        } else {
          title.textContent = 'Add Connection Link';
          btnSave.textContent = 'Create Link';
        }

        modal.classList.add('open');
        const firstInp = body.querySelector('input, select');
        if (firstInp) firstInp.focus();
      }

      saveLinkFromModal() {
        if (this.currentLinkCallback) {
          this.currentLinkCallback();
        }
        this.closeModal('link-modal');
        this.renderAll();
        this.recordHistory();
      }

      deleteSelected() {
        if (this.selectedNodeIds.size === 0 && !this.selectedEdgeId) return;

        const count = this.selectedNodeIds.size + (this.selectedEdgeId ? 1 : 0);
        const msg = this.selectedNodeIds.size > 0
          ? `Delete ${this.selectedNodeIds.size} node(s) and connected links?`
          : 'Delete selected link?';

        this.showConfirm(msg, () => {
          this.selectedNodeIds.forEach(id => this.graph.deleteNode(id));
          if (this.selectedEdgeId) {
            this.graph.deleteEdge(this.selectedEdgeId);
            this.selectedEdgeId = null;
          }
          this.selectedNodeIds.clear();
          this.renderAll();
          this.recordHistory();
          Utils.showToast(`Deleted ${count} item(s)`, 'info');
        });
      }

      confirmNew() {
        this.showConfirm('Clear diagram and start a new project?', () => {
          this.graph.nodes = [];
          this.graph.edges = [];
          this.graph.customRawCode = null;
          this.selectedNodeIds.clear();
          this.selectedEdgeId = null;
          this.renderAll();
          this.recordHistory();
          Utils.showToast('New project created', 'info');
        });
      }

      showConfirm(msg, onYes) {
        const modal = document.getElementById('confirm-modal');
        const msgEl = document.getElementById('confirm-message');
        const btnYes = document.getElementById('confirm-yes');
        const btnNo = document.getElementById('confirm-no');

        msgEl.textContent = msg;
        modal.classList.add('open');

        const cleanup = () => {
          modal.classList.remove('open');
          btnYes.onclick = null;
          btnNo.onclick = null;
        };

        btnYes.onclick = () => {
          cleanup();
          onYes();
        };
        btnNo.onclick = () => {
          cleanup();
        };
      }

      openRulesDialog() {
        this.renderRulesList();
        document.getElementById('rules-modal').classList.add('open');
      }

      addRuleFromModal() {
        const typeSelect = document.getElementById('rm-type');
        const patInput = document.getElementById('rm-pattern');

        const pattern = patInput.value.trim();
        if (!pattern || !pattern.includes('->')) {
          Utils.showToast('Pattern must be in format: Source->Target', 'error');
          return;
        }

        this.graph.rules.push({
          id: Utils.uid('rule'),
          type: typeSelect.value,
          pattern
        });

        patInput.value = '';
        this.renderRulesList();
        this.recordHistory();
      }

      deleteRule(id) {
        this.graph.rules = this.graph.rules.filter(r => r.id !== id);
        this.renderRulesList();
        this.recordHistory();
      }

      renderRulesList() {
        const quickList = document.getElementById('rules-quick-list');
        const fullList = document.getElementById('rules-full-list');
        quickList.innerHTML = '';
        fullList.innerHTML = '';

        if (this.graph.rules.length === 0) {
          quickList.innerHTML = '<span style="color:var(--text-muted);font-size:11px;">No rules set</span>';
          fullList.innerHTML = '<span style="color:var(--text-muted);font-size:11px;">No rules set</span>';
          return;
        }

        this.graph.rules.forEach(rule => {
          const chip = document.createElement('div');
          chip.className = `rule-chip ${rule.type}`;
          chip.innerHTML = `
            <span>${rule.type === 'allowed' ? '✔' : '✖'} ${rule.pattern}</span>
            <button class="rule-del-btn" title="Delete Rule">✕</button>
          `;

          chip.querySelector('.rule-del-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteRule(rule.id);
          });

          quickList.appendChild(chip.cloneNode(true));
          fullList.appendChild(chip);

          quickList.lastElementChild.querySelector('.rule-del-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteRule(rule.id);
          });
        });
      }

      toggleSearchBox(force) {
        const box = document.getElementById('search-box');
        const isOpen = force !== undefined ? force : !box.classList.contains('open');
        if (isOpen) {
          box.classList.add('open');
          const inp = document.getElementById('search-input');
          inp.focus();
          inp.select();
        } else {
          box.classList.remove('open');
          this.searchResults = [];
        }
      }

      handleSearchInput(query) {
        query = query.trim().toLowerCase();
        this.searchResults = [];
        this.searchIdx = 0;

        if (!query) {
          document.getElementById('search-results-count').textContent = '0/0';
          return;
        }

        this.graph.nodes.forEach(n => {
          if (n.id.toLowerCase().includes(query) || (n.text && n.text.toLowerCase().includes(query))) {
            this.searchResults.push(n.id);
          }
        });

        document.getElementById('search-results-count').textContent = this.searchResults.length > 0
          ? `1/${this.searchResults.length}`
          : '0/0';

        if (this.searchResults.length > 0) {
          this.focusNode(this.searchResults[0]);
        }
      }

      navigateSearch(dir) {
        if (this.searchResults.length === 0) return;
        this.searchIdx = (this.searchIdx + dir + this.searchResults.length) % this.searchResults.length;
        document.getElementById('search-results-count').textContent = `${this.searchIdx + 1}/${this.searchResults.length}`;
        this.focusNode(this.searchResults[this.searchIdx]);
      }

      focusNode(nodeId) {
        const node = this.graph.getNode(nodeId);
        if (!node) return;

        this.selectedNodeIds.clear();
        this.selectedNodeIds.add(node.id);
        this.selectedEdgeId = null;

        const rect = this.svg.getBoundingClientRect();
        const nw = node.width || 140;
        const nh = node.height || 50;
        this.panX = rect.width / 2 - (node.x + nw / 2) * this.zoom;
        this.panY = rect.height / 2 - (node.y + nh / 2) * this.zoom;

        this.renderAll();
      }

      runAutoLayout(direction) {
        this.recordHistory();
        this.graph.layoutDirection = direction;
        AutoLayoutEngine.layout(this.graph, direction);
        this.renderAll();
        this.recordHistory();
        this.zoomToFit();
        Utils.showToast(`Auto-layout ${direction} applied (Press Ctrl+Z or Undo to revert)`, 'info');
      }

      handleFileOpen(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
          const content = ev.target?.result;
          if (file.name.endsWith('.json')) {
            try {
              const proj = JSON.parse(content);
              this.graph.fromProject(proj);
              if (proj.theme) this.themeMgr.setTheme(proj.theme);
              if (this.typeSelect && proj.diagramType) this.typeSelect.value = proj.diagramType;
              this.renderAll();
              this.recordHistory();
              this.zoomToFit();
              Utils.showToast('Project loaded', 'success');
            } catch (err) {
              Utils.showToast('Failed to parse JSON: ' + err.message, 'error');
            }
          } else {
            this.codeEditor.value = content;
            this.applyCodeToGraph();
            this.zoomToFit();
          }
        };
        reader.readAsText(file);
        e.target.value = '';
      }

      closeModal(id) {
        document.getElementById(id)?.classList.remove('open');
      }

      closeAllModals() {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
      }

      updateStatusBar() {
        const typeItem = DIAGRAM_TEMPLATES.find(t => t.id === this.graph.diagramType);
        document.getElementById('sb-type').textContent = `Type: ${typeItem ? typeItem.name : 'Flowchart'}`;
        const activeNodes = this.graph.nodes.filter(n => n.id !== 'visual_chart_bounds');
        document.getElementById('sb-nodes').textContent = `Nodes: ${activeNodes.length}`;
        document.getElementById('sb-edges').textContent = `Links: ${this.graph.edges.length}`;
      }
    }

    window.addEventListener('DOMContentLoaded', () => {
      const app = new AppController();
      app.init();
      window.app = app;
    });