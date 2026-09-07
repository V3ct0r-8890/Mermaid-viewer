// --- UTILITIES ---
    const Utils = {
      uid(prefix = 'id') {
        return prefix + '_' + Math.random().toString(36).substring(2, 9);
      },
      clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
      },
      snap(val, size = 20) {
        return Math.round(val / size) * size;
      },
      escapeHtml(str) {
        return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      },
      showToast(msg, type = 'info') {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = msg;
        toast.className = 'show ' + type;
        setTimeout(() => {
          toast.className = '';
        }, 2800);
      },
      // --- CONNECTOR ROUTING ENGINE ---
      // Shared by every diagram type so a link's routing style means the same thing
      // everywhere. Values match the native Flowchart's existing edge.curve values
      // ('basis'/'linear'/'step') via normalizeConnector below, so old saved diagrams
      // and the Flowchart edge form keep working unchanged.
      CONNECTOR_OPTIONS: [
        { value: 'curve', label: 'Curved (Bezier)' },
        { value: 'straight', label: 'Straight Line' },
        { value: 'step', label: 'Orthogonal Step (90° Corners)' }
      ],
      normalizeConnector(style, fallback = 'curve') {
        const s = String(style || '').toLowerCase().trim();
        if (s === 'curve' || s === 'basis' || s === 'bezier' || s === 'curved') return 'curve';
        if (s === 'straight' || s === 'linear' || s === 'line') return 'straight';
        if (s === 'step' || s === 'orthogonal' || s === 'ortho') return 'step';
        return fallback;
      },
      // Builds the SVG path `d` for a connector between two points.
      // opts: { orientation: 'auto'|'h'|'v', curvature (0-1), minCurve, srcDir, tgtDir }
      // srcDir/tgtDir ('top'|'bottom'|'left'|'right') take priority when supplied — they
      // let a diagram that knows which side of a node it left from keep the connector
      // leaving perpendicular to that side.
      buildConnectorPath(x1, y1, x2, y2, style, opts = {}) {
        const mode = Utils.normalizeConnector(style, 'curve');
        const dx = x2 - x1;
        const dy = y2 - y1;

        if (mode === 'straight') {
          return `M ${x1} ${y1} L ${x2} ${y2}`;
        }

        const srcDir = opts.srcDir;
        const tgtDir = opts.tgtDir;
        let orientation = opts.orientation || 'auto';
        if (orientation === 'auto') {
          if (srcDir === 'left' || srcDir === 'right') orientation = 'h';
          else if (srcDir === 'top' || srcDir === 'bottom') orientation = 'v';
          else orientation = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v';
        }

        if (mode === 'step') {
          if (orientation === 'h') {
            const midX = x1 + dx / 2;
            return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
          }
          const midY = y1 + dy / 2;
          return `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`;
        }

        // Curved (cubic bezier). Control points push out along the leaving/entering
        // direction so the curve meets each endpoint cleanly.
        const curvature = opts.curvature ?? 0.45;
        const minCurve = opts.minCurve ?? 30;
        const span = Math.sqrt(dx * dx + dy * dy);
        const k = Math.max(minCurve, Math.min(opts.maxCurve ?? 140, span * curvature));

        let cx1 = x1, cy1 = y1, cx2 = x2, cy2 = y2;
        if (srcDir === 'bottom') cy1 = y1 + k;
        else if (srcDir === 'top') cy1 = y1 - k;
        else if (srcDir === 'right') cx1 = x1 + k;
        else if (srcDir === 'left') cx1 = x1 - k;
        else if (orientation === 'h') cx1 = x1 + Math.sign(dx || 1) * k;
        else cy1 = y1 + Math.sign(dy || 1) * k;

        if (tgtDir === 'top') cy2 = y2 - k;
        else if (tgtDir === 'bottom') cy2 = y2 + k;
        else if (tgtDir === 'left') cx2 = x2 - k;
        else if (tgtDir === 'right') cx2 = x2 + k;
        else if (orientation === 'h') cx2 = x2 - Math.sign(dx || 1) * k;
        else cy2 = y2 - Math.sign(dy || 1) * k;

        return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
      },
      // Direction (unit vector) a connector arrives at its endpoint with, so arrowheads
      // stay aligned with whichever routing style is active.
      connectorEndDirection(x1, y1, x2, y2, style, opts = {}) {
        const mode = Utils.normalizeConnector(style, 'curve');
        const dx = x2 - x1;
        const dy = y2 - y1;
        if (mode === 'step') {
          let orientation = opts.orientation || 'auto';
          if (orientation === 'auto') orientation = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v';
          // The final leg of a step path is always perpendicular to the split axis.
          if (orientation === 'h') return { x: Math.sign(dx) || 1, y: 0 };
          return { x: 0, y: Math.sign(dy) || 1 };
        }
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        return { x: dx / len, y: dy / len };
      },

      // --- PASTEL FILL PALETTE ---
      // House rule: node FILLS are pastel; node borders, link lines and text stay at
      // full strength so shapes read clearly against the soft fill.
      PASTEL_FILLS: ['#E3F2FD', '#E8F5E9', '#FFF3E0', '#F3E5F5', '#FFEBEE', '#E0F7FA', '#FFF9C4', '#FCE4EC', '#EDE7F6', '#E0F2F1'],
      PASTEL_FILLS_DARK: ['#1E3A5F', '#1B4D3E', '#4A3B18', '#3E244D', '#4D1E36', '#12414A', '#4A431A', '#4A2036', '#2E2A4D', '#173F3A'],
      // Full-strength companions, used for borders/lines next to the pastel fill above.
      INK_COLORS: ['#1976D2', '#388E3C', '#F57C00', '#7B1FA2', '#D32F2F', '#0097A7', '#F9A825', '#C2185B', '#5E35B1', '#00796B'],
      pastelFill(index, isDark = false) {
        const list = isDark ? Utils.PASTEL_FILLS_DARK : Utils.PASTEL_FILLS;
        return list[Math.abs(index | 0) % list.length];
      },
      inkColor(index) {
        return Utils.INK_COLORS[Math.abs(index | 0) % Utils.INK_COLORS.length];
      },
      // Softens any full-strength color into a pastel tint suitable for a node fill,
      // keeping its hue. In dark mode it blends toward the dark canvas instead of white
      // so fills stay readable rather than glaring.
      toPastel(hex, isDark = false, amount = null) {
        const raw = String(hex || '').trim().replace(/^#/, '');
        let full = raw;
        if (/^[0-9A-Fa-f]{3}$/.test(raw)) {
          full = raw.split('').map(c => c + c).join('');
        }
        if (!/^[0-9A-Fa-f]{6}$/.test(full)) return hex;

        const r = parseInt(full.slice(0, 2), 16);
        const g = parseInt(full.slice(2, 4), 16);
        const b = parseInt(full.slice(4, 6), 16);
        const mix = amount ?? (isDark ? 0.68 : 0.78);
        const base = isDark ? 28 : 255;
        const blend = (c) => Math.round(c + (base - c) * mix);
        return '#' + [blend(r), blend(g), blend(b)]
          .map(v => Utils.clamp(v, 0, 255).toString(16).padStart(2, '0'))
          .join('')
          .toUpperCase();
      },

      // Axis-aligned rect overlap test. Rects are {x, y, width, height} (x,y = top-left).
      rectsOverlap(a, b, padding = 0) {
        return (
          a.x - padding < b.x + b.width + padding &&
          a.x + a.width + padding > b.x - padding &&
          a.y - padding < b.y + b.height + padding &&
          a.y + a.height + padding > b.y - padding
        );
      },
      // Finds the nearest point (to the desired center cx,cy) whose w x h label rect
      // clears every obstacle rect. Searches expanding rings around the desired point;
      // falls back to the original point (best effort) if the search budget runs out.
      findClearLabelPosition(cx, cy, w, h, obstacles, opts = {}) {
        const padding = opts.padding ?? 3;
        const maxRings = opts.maxRings ?? 6;
        const anglesPerRing = opts.anglesPerRing ?? 8;
        const step = opts.step ?? (Math.max(w, h) * 0.6 + padding);

        const rectAt = (x, y) => ({ x: x - w / 2, y: y - h / 2, width: w, height: h });
        const isClear = (x, y) => {
          const rect = rectAt(x, y);
          return !obstacles.some(o => Utils.rectsOverlap(rect, o, padding));
        };

        if (isClear(cx, cy)) return { x: cx, y: cy };

        for (let ring = 1; ring <= maxRings; ring++) {
          const radius = step * ring;
          const angleOffset = (ring % 2) * (Math.PI / anglesPerRing);
          for (let i = 0; i < anglesPerRing; i++) {
            const angle = (i / anglesPerRing) * Math.PI * 2 + angleOffset;
            const x = cx + Math.cos(angle) * radius;
            const y = cy + Math.sin(angle) * radius;
            if (isClear(x, y)) return { x, y };
          }
        }
        return { x: cx, y: cy };
      }
    };

    // --- THEME MANAGER ---
    class ThemeManager {
      constructor() {
        this.currentTheme = localStorage.getItem('mermaid_editor_theme') || 'light';
        this.setTheme(this.currentTheme);
      }

      setTheme(theme) {
        this.currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('mermaid_editor_theme', theme);
      }

      toggle() {
        this.setTheme(this.currentTheme === 'light' ? 'dark' : 'light');
      }
    }

    // --- HISTORY MANAGER ---
    class HistoryManager {
      constructor() {
        this.undoStack = [];
        this.redoStack = [];
        this.maxDepth = 100;
        this.isPerforming = false;
      }

      record(state) {
        if (this.isPerforming) return;
        const serialized = JSON.stringify(state);
        if (this.undoStack.length > 0 && this.undoStack[this.undoStack.length - 1] === serialized) {
          return;
        }
        this.undoStack.push(serialized);
        if (this.undoStack.length > this.maxDepth) {
          this.undoStack.shift();
        }
        this.redoStack = [];
        this.updateButtons();
      }

      undo() {
        if (this.undoStack.length <= 1) return null;
        this.isPerforming = true;
        const current = this.undoStack.pop();
        this.redoStack.push(current);
        const prevJson = this.undoStack[this.undoStack.length - 1];
        this.isPerforming = false;
        this.updateButtons();
        return JSON.parse(prevJson);
      }

      redo() {
        if (this.redoStack.length === 0) return null;
        this.isPerforming = true;
        const nextJson = this.redoStack.pop();
        this.undoStack.push(nextJson);
        this.isPerforming = false;
        this.updateButtons();
        return JSON.parse(nextJson);
      }

      updateButtons() {
        const btnUndo = document.getElementById('btn-undo');
        const btnRedo = document.getElementById('btn-redo');
        if (btnUndo) btnUndo.disabled = this.undoStack.length <= 1;
        if (btnRedo) btnRedo.disabled = this.redoStack.length === 0;
      }
    }