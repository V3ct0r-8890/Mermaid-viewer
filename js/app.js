// --- MAIN APPLICATION CONTROLLER ---
    class AppController {
      constructor() {
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
        this.recordHistory();
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

        const isVisualSpecial = ['sequence', 'gantt', 'pie', 'gitGraph', 'journey', 'mindmap', 'timeline', 'quadrant', 'sankey'].includes(this.graph.diagramType);

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

          let shapeEl;
          switch (node.shape) {
            case 'rounded':
              shapeEl = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
              shapeEl.setAttribute('x', '0');
              shapeEl.setAttribute('y', '0');
              shapeEl.setAttribute('width', `${w}`);
              shapeEl.setAttribute('height', `${h}`);
              shapeEl.setAttribute('rx', '14');
              shapeEl.setAttribute('ry', '14');
              break;

            case 'circle':
              shapeEl = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
              shapeEl.setAttribute('cx', `${w / 2}`);
              shapeEl.setAttribute('cy', `${h / 2}`);
              shapeEl.setAttribute('rx', `${w / 2}`);
              shapeEl.setAttribute('ry', `${h / 2}`);
              break;

            case 'diamond':
              shapeEl = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
              shapeEl.setAttribute('points', `${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}`);
              break;

            case 'hexagon':
              shapeEl = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
              shapeEl.setAttribute('points', `20,0 ${w - 20},0 ${w},${h / 2} ${w - 20},${h} 20,${h} 0,${h / 2}`);
              break;

            case 'parallelogram':
              shapeEl = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
              shapeEl.setAttribute('points', `16,0 ${w},0 ${w - 16},${h} 0,${h}`);
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

          shapeEl.setAttribute('class', 'node-shape');
          shapeEl.setAttribute('fill', node.fillColor || 'var(--node-fill)');
          shapeEl.setAttribute('stroke', node.borderColor || 'var(--node-border)');
          shapeEl.setAttribute('stroke-width', '1.8');
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

          const { sx, sy, tx, ty, srcDir, tgtDir } = this.calculateEdgeEndpoints(src, tgt);

          const dx = tx - sx;
          const dy = ty - sy;
          let d = '';

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

          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', d);
          path.setAttribute('class', 'canvas-edge-path');

          const isThick = edge.type === '==>' || edge.type === '<==>';
          const isDashed = edge.type === '-.->';
          const isBi = edge.type === '<-->' || edge.type === '<==>';

          if (isThick) {
            path.style.strokeWidth = isSelected ? '4.5px' : '3.5px';
            path.setAttribute('marker-end', isSelected ? 'url(#marker-thick-selected)' : 'url(#marker-thick)');
            if (isBi) path.setAttribute('marker-start', isSelected ? 'url(#marker-start-thick-selected)' : 'url(#marker-start-thick)');
          } else {
            path.style.strokeWidth = isSelected ? '3px' : '2px';
            path.setAttribute('marker-end', isSelected ? 'url(#marker-arrow-selected)' : 'url(#marker-arrow)');
            if (isBi) path.setAttribute('marker-start', isSelected ? 'url(#marker-start-arrow-selected)' : 'url(#marker-start-arrow)');
          }

          if (isDashed) {
            path.setAttribute('stroke-dasharray', '5,4');
          }

          g.appendChild(path);

          if (edge.label) {
            const midX = (sx + tx) / 2;
            const midY = (sy + ty) / 2;

            const labelG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            labelG.setAttribute('transform', `translate(${midX}, ${midY})`);

            const labelText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            labelText.setAttribute('class', 'edge-label-text');
            labelText.textContent = edge.label;
            labelG.appendChild(labelText);

            const textWidth = edge.label.length * 6.5 + 12;
            const textHeight = 18;

            const labelBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            labelBg.setAttribute('class', 'edge-label-bg');
            labelBg.setAttribute('x', `${-textWidth / 2}`);
            labelBg.setAttribute('y', `${-textHeight / 2}`);
            labelBg.setAttribute('width', `${textWidth}`);
            labelBg.setAttribute('height', `${textHeight}`);

            labelG.insertBefore(labelBg, labelText);
            g.appendChild(labelG);
          }

          g.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectedNodeIds.clear();
            this.selectedEdgeId = edge.id;
            this.renderAll();
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

      // --- LIVE PROPERTIES EDITOR ---
      updatePropertiesPanel() {
        const propEmpty = document.getElementById('prop-empty');
        const nodeForm = document.getElementById('node-props-form');
        const edgeForm = document.getElementById('edge-props-form');

        if (this.selectedNodeIds.size === 1) {
          const nodeId = Array.from(this.selectedNodeIds)[0];
          const node = this.graph.getNode(nodeId);
          if (node) {
            propEmpty.style.display = 'none';
            edgeForm.style.display = 'none';
            nodeForm.style.display = 'block';

            document.getElementById('prop-node-id-badge').textContent = node.id;
            document.getElementById('prop-node-text').value = node.text || node.id;
            document.getElementById('prop-node-shape').value = node.shape || 'rectangle';
            document.getElementById('prop-node-w').value = String(node.width || 140);
            document.getElementById('prop-node-h').value = String(node.height || 50);
            document.getElementById('prop-node-x').value = String(node.x);
            document.getElementById('prop-node-y').value = String(node.y);
            document.getElementById('prop-node-fill').value = node.fillColor || '#E3F2FD';
            document.getElementById('prop-node-fill-val').textContent = node.fillColor || '#E3F2FD';
            document.getElementById('prop-node-border').value = node.borderColor || '#90CAF9';
            document.getElementById('prop-node-font').value = node.fontColor || '#0D47A1';
            return;
          }
        }

        if (this.selectedEdgeId) {
          const edge = this.graph.getEdge(this.selectedEdgeId);
          if (edge) {
            propEmpty.style.display = 'none';
            nodeForm.style.display = 'none';
            edgeForm.style.display = 'block';

            document.getElementById('prop-edge-label').value = edge.label || '';
            document.getElementById('prop-edge-type').value = edge.type || '-->';
            return;
          }
        }

        propEmpty.style.display = 'block';
        nodeForm.style.display = 'none';
        edgeForm.style.display = 'none';
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

        const onNodePropChange = (saveHistory = true) => {
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

          this.renderNodes();
          this.renderEdges();
          this.renderMinimap();
          if (saveHistory) {
            this.recordHistory();
          } else {
            this.updateMermaidCode();
          }
        };

        ['prop-node-text', 'prop-node-shape', 'prop-node-w', 'prop-node-h', 'prop-node-x', 'prop-node-y'].forEach(id => {
          const el = document.getElementById(id);
          if (el) {
            el.addEventListener('input', () => onNodePropChange(false));
            el.addEventListener('change', () => onNodePropChange(true));
          }
        });

        ['prop-node-fill', 'prop-node-border', 'prop-node-font'].forEach(id => {
          const el = document.getElementById(id);
          if (el) {
            el.addEventListener('input', () => onNodePropChange(false));
            el.addEventListener('change', () => onNodePropChange(true));
          }
        });

        document.querySelectorAll('#fill-swatches .color-swatch').forEach(swatch => {
          swatch.addEventListener('click', () => {
            if (this.selectedNodeIds.size !== 1) return;
            const nodeId = Array.from(this.selectedNodeIds)[0];
            const node = this.graph.getNode(nodeId);
            if (!node) return;

            const fill = swatch.getAttribute('data-fill');
            const border = swatch.getAttribute('data-border');
            const font = swatch.getAttribute('data-font');

            node.fillColor = fill;
            node.borderColor = border;
            node.fontColor = font;

            document.getElementById('prop-node-fill').value = fill;
            document.getElementById('prop-node-fill-val').textContent = fill;
            document.getElementById('prop-node-border').value = border;
            document.getElementById('prop-node-font').value = font;

            this.renderNodes();
            this.renderEdges();
            this.recordHistory();
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

        const onEdgePropChange = (saveHistory = true) => {
          if (!this.selectedEdgeId) return;
          const edge = this.graph.getEdge(this.selectedEdgeId);
          if (!edge) return;

          edge.label = document.getElementById('prop-edge-label').value.trim() || undefined;
          edge.type = document.getElementById('prop-edge-type').value;

          this.renderEdges();
          if (saveHistory) {
            this.recordHistory();
          } else {
            this.updateMermaidCode();
          }
        };

        const edgeLabelInp = document.getElementById('prop-edge-label');
        if (edgeLabelInp) {
          edgeLabelInp.addEventListener('input', () => onEdgePropChange(false));
          edgeLabelInp.addEventListener('change', () => onEdgePropChange(true));
        }

        const edgeTypeSel = document.getElementById('prop-edge-type');
        if (edgeTypeSel) {
          edgeTypeSel.addEventListener('change', () => onEdgePropChange(true));
        }

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

        let editorDebounceTimer = null;
        this.codeEditor.addEventListener('input', () => {
          this.codeHighlight.innerHTML = SyntaxHighlighter.highlight(this.codeEditor.value);
          const detected = MermaidParser.detectDiagramType(this.codeEditor.value);
          if (this.typeSelect && this.typeSelect.value !== detected) {
            this.typeSelect.value = detected;
          }
          clearTimeout(editorDebounceTimer);
          editorDebounceTimer = setTimeout(() => {
            this.applyCodeToGraph(true);
          }, 200);
        });

        this.codeEditor.addEventListener('blur', () => {
          this.applyCodeToGraph(true);
          this.recordHistory();
        });

        this.codeEditor.addEventListener('scroll', () => {
          document.getElementById('code-highlight').scrollTop = this.codeEditor.scrollTop;
          document.getElementById('code-highlight').scrollLeft = this.codeEditor.scrollLeft;
        });

        document.getElementById('btn-sync-code').addEventListener('click', () => this.applyCodeToGraph(false));

        if (this.typeSelect) {
          this.typeSelect.addEventListener('change', (e) => {
            const selectedId = e.target.value;
            const tpl = DIAGRAM_TEMPLATES.find(t => t.id === selectedId);
            if (tpl) {
              this.loadTemplate(tpl);
            }
          });
        }

        document.getElementById('btn-new').addEventListener('click', () => this.confirmNew());
        document.getElementById('btn-templates').addEventListener('click', () => this.openTemplatesDialog());
        document.getElementById('btn-open').addEventListener('click', () => document.getElementById('file-input').click());
        document.getElementById('btn-save').addEventListener('click', () => ExportManager.exportJSON(this.graph.toProject(this.themeMgr.currentTheme)));
        document.getElementById('btn-export-mmd').addEventListener('click', () => ExportManager.exportMMD(this.graph));
        document.getElementById('btn-export-json').addEventListener('click', () => ExportManager.exportJSON(this.graph.toProject(this.themeMgr.currentTheme)));
        document.getElementById('btn-export-svg').addEventListener('click', () => ExportManager.exportSVG(this.svg, this.graph, this.themeMgr.currentTheme));
        document.getElementById('btn-export-png').addEventListener('click', () => ExportManager.exportPNG(this.svg, this.graph, this.themeMgr.currentTheme));

        document.getElementById('btn-undo').addEventListener('click', () => this.handleUndo());
        document.getElementById('btn-redo').addEventListener('click', () => this.handleRedo());

        document.getElementById('btn-add-node').addEventListener('click', () => this.openNodeDialog());
        document.getElementById('btn-add-link').addEventListener('click', () => this.openLinkDialog());
        document.getElementById('btn-autolayout-td').addEventListener('click', () => this.runAutoLayout('TD'));
        document.getElementById('btn-autolayout-lr').addEventListener('click', () => this.runAutoLayout('LR'));

        document.getElementById('btn-theme').addEventListener('click', () => {
          this.themeMgr.toggle();
          this.renderAll();
        });

        document.getElementById('btn-rules').addEventListener('click', () => this.openRulesDialog());
        document.getElementById('btn-add-rule-quick').addEventListener('click', () => this.openRulesDialog());

        document.getElementById('btn-zoom-in').addEventListener('click', () => this.zoomAtCenter(1.2));
        document.getElementById('btn-zoom-out').addEventListener('click', () => this.zoomAtCenter(0.8));
        document.getElementById('btn-zoom-fit').addEventListener('click', () => this.zoomToFit());
        document.getElementById('btn-zoom-reset').addEventListener('click', () => {
          this.zoom = 1;
          this.panX = 0;
          this.panY = 0;
          this.renderAll();
        });

        document.getElementById('btn-search-toggle').addEventListener('click', () => this.toggleSearchBox());
        document.getElementById('btn-search-close').addEventListener('click', () => this.toggleSearchBox(false));
        document.getElementById('search-input').addEventListener('input', (e) => this.handleSearchInput(e.target.value));
        document.getElementById('btn-search-next').addEventListener('click', () => this.navigateSearch(1));
        document.getElementById('btn-search-prev').addEventListener('click', () => this.navigateSearch(-1));

        document.querySelectorAll('.shape-item').forEach(item => {
          item.addEventListener('click', () => {
            const shape = item.getAttribute('data-shape');
            this.createNodeAtCenter(shape);
          });
        });

        document.getElementById('file-input').addEventListener('change', (e) => this.handleFileOpen(e));

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
        this.zoomToFit();
        this.recordHistory();
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
      }

      handleCanvasMouseDown(e) {
        // Any click on background (svg, background rect, viewport, layers)
        const isBg = e.target === this.svg || e.target.id === 'canvas-grid-bg' || e.target.id === 'canvas-viewport' || e.target === this.nodesLayer || e.target === this.edgesLayer;

        if (e.button === 1 || e.spaceKey || (e.button === 0 && isBg)) {
          if (e.button === 0 && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
            this.selectedNodeIds.clear();
            this.selectedEdgeId = null;
            this.renderAll();
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
          this.panY = e.clientY - this.panY;
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
        const factor = e.deltaY < 0 ? 1.1 : 0.9;
        this.zoomAtPoint(factor, e.clientX, e.clientY);
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
        if (this.graph.nodes.length === 0) {
          this.zoom = 1;
          this.panX = 0;
          this.panY = 0;
          this.renderAll();
          return;
        }

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        this.graph.nodes.forEach(n => {
          minX = Math.min(minX, n.x);
          minY = Math.min(minY, n.y);
          maxX = Math.max(maxX, n.x + (n.width || 140));
          maxY = Math.max(maxY, n.y + (n.height || 50));
        });

        const rect = this.svg.getBoundingClientRect();
        const pad = 60;
        const graphW = maxX - minX + pad * 2;
        const graphH = maxY - minY + pad * 2;

        const fitZoom = Utils.clamp(Math.min(rect.width / graphW, rect.height / graphH), 0.25, 1.5);
        this.zoom = fitZoom;
        this.panX = (rect.width - (maxX + minX) * fitZoom) / 2;
        this.panY = (rect.height - (maxY + minY) * fitZoom) / 2;

        this.renderAll();
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
          ExportManager.exportJSON(this.graph.toProject(this.themeMgr.currentTheme));
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

      openNodeDialog(node) {
        const modal = document.getElementById('node-modal');
        const title = document.getElementById('node-modal-title');
        const idInput = document.getElementById('nm-id');
        const textInput = document.getElementById('nm-text');
        const shapeSelect = document.getElementById('nm-shape');
        const fillInput = document.getElementById('nm-fill');
        const borderInput = document.getElementById('nm-border');
        const fontInput = document.getElementById('nm-font');

        if (node) {
          title.textContent = 'Edit Node: ' + node.id;
          idInput.value = node.id;
          idInput.disabled = true;
          textInput.value = node.text || node.id;
          shapeSelect.value = node.shape || 'rectangle';
          fillInput.value = node.fillColor || '#E3F2FD';
          borderInput.value = node.borderColor || '#90CAF9';
          fontInput.value = node.fontColor || '#0D47A1';
        } else {
          title.textContent = 'Create New Node';
          let newId = 'node_' + (this.graph.nodes.length + 1);
          idInput.value = newId;
          idInput.disabled = false;
          textInput.value = 'New Step';
          shapeSelect.value = 'rectangle';
          fillInput.value = '#E3F2FD';
          borderInput.value = '#90CAF9';
          fontInput.value = '#0D47A1';
        }

        modal.classList.add('open');
        textInput.focus();
      }

      saveNodeFromModal() {
        const idInput = document.getElementById('nm-id');
        const textInput = document.getElementById('nm-text');
        const shapeSelect = document.getElementById('nm-shape');
        const fillInput = document.getElementById('nm-fill');
        const borderInput = document.getElementById('nm-border');
        const fontInput = document.getElementById('nm-font');

        const id = idInput.value.trim().replace(/\s+/g, '_');
        if (!id) {
          Utils.showToast('Node ID cannot be empty', 'error');
          return;
        }

        const existing = this.graph.getNode(id);
        if (idInput.disabled && existing) {
          existing.text = textInput.value.trim();
          existing.shape = shapeSelect.value;
          existing.fillColor = fillInput.value;
          existing.borderColor = borderInput.value;
          existing.fontColor = fontInput.value;
        } else {
          if (existing) {
            Utils.showToast(`Node ID "${id}" already exists`, 'error');
            return;
          }
          const rect = this.svg.getBoundingClientRect();
          const center = this.getCanvasPoint({ clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 });

          this.graph.addNode({
            id,
            text: textInput.value.trim() || id,
            shape: shapeSelect.value,
            x: Utils.snap(center.x - 70),
            y: Utils.snap(center.y - 25),
            width: 140,
            height: 50,
            fillColor: fillInput.value,
            borderColor: borderInput.value,
            fontColor: fontInput.value
          });
        }

        this.closeModal('node-modal');
        this.renderAll();
        this.recordHistory();
      }

      openLinkDialog(edge, defaultSource, defaultTarget) {
        if (this.graph.nodes.length < 2 && !edge) {
          Utils.showToast('Add at least 2 nodes before creating a link', 'error');
          return;
        }

        const modal = document.getElementById('link-modal');
        const srcSelect = document.getElementById('lm-source');
        const tgtSelect = document.getElementById('lm-target');
        const labelInput = document.getElementById('lm-label');
        const typeSelect = document.getElementById('lm-type');
        const ruleStatus = document.getElementById('lm-rule-status');

        srcSelect.innerHTML = '';
        tgtSelect.innerHTML = '';

        this.graph.nodes.forEach(n => {
          if (n.id === 'visual_chart_bounds') return;
          const opt1 = document.createElement('option');
          opt1.value = n.id;
          opt1.textContent = `${n.id} (${n.text || n.id})`;
          srcSelect.appendChild(opt1);

          const opt2 = document.createElement('option');
          opt2.value = n.id;
          opt2.textContent = `${n.id} (${n.text || n.id})`;
          tgtSelect.appendChild(opt2);
        });

        if (edge) {
          srcSelect.value = edge.source;
          tgtSelect.value = edge.target;
          labelInput.value = edge.label || '';
          typeSelect.value = edge.type || '-->';
          modal._editEdgeId = edge.id;
        } else {
          const availableNodes = this.graph.nodes.filter(n => n.id !== 'visual_chart_bounds');
          srcSelect.value = defaultSource || availableNodes[0]?.id;
          tgtSelect.value = defaultTarget || availableNodes[1]?.id || availableNodes[0]?.id;
          labelInput.value = '';
          typeSelect.value = '-->';
          modal._editEdgeId = null;
        }

        const checkRule = () => {
          const vRes = ValidationEngine.validateConnection(srcSelect.value, tgtSelect.value, this.graph.rules);
          if (!vRes.allowed) {
            ruleStatus.style.display = 'block';
            ruleStatus.style.background = '#FFEBEE';
            ruleStatus.style.color = '#C62828';
            ruleStatus.textContent = '⚠️ ' + vRes.reason;
          } else {
            ruleStatus.style.display = 'none';
          }
        };

        srcSelect.onchange = checkRule;
        tgtSelect.onchange = checkRule;
        checkRule();

        modal.classList.add('open');
      }

      saveLinkFromModal() {
        const modal = document.getElementById('link-modal');
        const srcSelect = document.getElementById('lm-source');
        const tgtSelect = document.getElementById('lm-target');
        const labelInput = document.getElementById('lm-label');
        const typeSelect = document.getElementById('lm-type');

        const source = srcSelect.value;
        const target = tgtSelect.value;
        const label = labelInput.value.trim() || undefined;
        const type = typeSelect.value;

        const valRes = ValidationEngine.validateConnection(source, target, this.graph.rules);
        if (!valRes.allowed) {
          Utils.showToast(valRes.reason || 'Connection not allowed by rules', 'error');
          return;
        }

        const editId = modal._editEdgeId;
        if (editId) {
          const edge = this.graph.getEdge(editId);
          if (edge) {
            edge.source = source;
            edge.target = target;
            edge.label = label;
            edge.type = type;
          }
        } else {
          this.graph.addEdge({
            id: Utils.uid('edge'),
            source,
            target,
            label,
            type
          });
        }

        this.closeModal('link-modal');
        this.renderAll();
        this.recordHistory();
        Utils.showToast('Connection created', 'success');
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