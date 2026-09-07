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