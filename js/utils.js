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