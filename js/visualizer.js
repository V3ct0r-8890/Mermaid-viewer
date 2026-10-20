// --- MODULAR MULTI-DIAGRAM VISUAL SUITE REGISTRY ---
class MultiDiagramVisualizer {
  static customColors = new Map();
  static nodePositions = new Map();
  static nodeSizes = new Map();
  static renderers = new Map();

  static register(type, rendererFn) {
    if (type && typeof rendererFn === 'function') {
      MultiDiagramVisualizer.renderers.set(String(type).toLowerCase(), rendererFn);
    }
  }

  static getColor(key, fallback) {
    if (!key) return fallback;
    const cleanKey = String(key).replace(/^["']|["']$/g, '').trim();
    return MultiDiagramVisualizer.customColors.get(cleanKey) || fallback;
  }

  static setColor(key, color) {
    if (key && color) {
      const cleanKey = String(key).replace(/^["']|["']$/g, '').trim();
      MultiDiagramVisualizer.customColors.set(cleanKey, color);
    }
  }

  static getPosition(key, defaultX, defaultY) {
    if (!key) return { x: defaultX, y: defaultY };
    const cleanKey = String(key).replace(/^["']|["']$/g, '').trim();
    if (MultiDiagramVisualizer.nodePositions.has(cleanKey)) {
      return MultiDiagramVisualizer.nodePositions.get(cleanKey);
    }
    return { x: defaultX, y: defaultY };
  }

  static setPosition(key, x, y) {
    if (key) {
      const cleanKey = String(key).replace(/^["']|["']$/g, '').trim();
      MultiDiagramVisualizer.nodePositions.set(cleanKey, { x, y });
    }
  }

  // Node size overrides, mirroring getPosition/setPosition. Diagrams size their nodes
  // from their content by default; this lets the Inspector override either dimension
  // (the Flowchart canvas has always had this — these give every other diagram the
  // same control). An override of 0/blank falls back to the computed default.
  static getSize(key, defaultW, defaultH) {
    if (!key) return { width: defaultW, height: defaultH };
    const cleanKey = String(key).replace(/^["']|["']$/g, '').trim();
    const stored = MultiDiagramVisualizer.nodeSizes.get(cleanKey);
    if (!stored) return { width: defaultW, height: defaultH };
    return {
      width: stored.width > 0 ? stored.width : defaultW,
      height: stored.height > 0 ? stored.height : defaultH
    };
  }

  static setSize(key, width, height) {
    if (!key) return;
    const cleanKey = String(key).replace(/^["']|["']$/g, '').trim();
    const w = parseFloat(width);
    const h = parseFloat(height);
    MultiDiagramVisualizer.nodeSizes.set(cleanKey, {
      width: isNaN(w) ? 0 : w,
      height: isNaN(h) ? 0 : h
    });
    MultiDiagramVisualizer.syncLayoutToCode();
  }

  static parseColorDirectives(code) {
    if (!code) return;
    const matches = code.matchAll(/%%\s*@color:\s*([^=\n]+?)\s*=\s*(#[A-Fa-f0-9]{3,8})/g);
    for (const m of matches) {
      const key = m[1].trim();
      const color = m[2].trim();
      MultiDiagramVisualizer.customColors.set(key, color);
    }
  }

  static parseLayoutDirectives(code, overwrite = false) {
    if (!code) return;
    const num = '(-?\\d+(?:\\.\\d+)?)';
    const posRe = new RegExp('^%%\\s*@pos:\\s*([^=\\n]+?)\\s*=\\s*' + num + '\\s*,\\s*' + num + '\\s*$', 'gm');
    const sizeRe = new RegExp('^%%\\s*@size:\\s*([^=\\n]+?)\\s*=\\s*' + num + '\\s*,\\s*' + num + '\\s*$', 'gm');
    for (const m of code.matchAll(posRe)) {
      const key = m[1].trim();
      if (overwrite || !MultiDiagramVisualizer.nodePositions.has(key)) {
        MultiDiagramVisualizer.nodePositions.set(key, { x: parseFloat(m[2]), y: parseFloat(m[3]) });
      }
    }
    for (const m of code.matchAll(sizeRe)) {
      const key = m[1].trim();
      if (overwrite || !MultiDiagramVisualizer.nodeSizes.has(key)) {
        MultiDiagramVisualizer.nodeSizes.set(key, { width: parseFloat(m[2]), height: parseFloat(m[3]) });
      }
    }
  }

  // Positions, sizes and colours are keyed by label, so they only make sense for the
  // diagram they were set in. Call this whenever a different diagram (or a different
  // snapshot of one) becomes current; the code's directives are then the source of truth.
  static resetState(code) {
    MultiDiagramVisualizer.customColors.clear();
    MultiDiagramVisualizer.nodePositions.clear();
    MultiDiagramVisualizer.nodeSizes.clear();
    MultiDiagramVisualizer.parseColorDirectives(code);
    MultiDiagramVisualizer.parseLayoutDirectives(code, true);
  }

  static syncLayoutToCode() {
    const app = (typeof AppController !== 'undefined' && AppController.instance) ? AppController.instance : null;
    if (!app || !app.codeEditor) return;
    const lines = [];
    [...MultiDiagramVisualizer.nodePositions.keys()].sort().forEach(k => {
      const p = MultiDiagramVisualizer.nodePositions.get(k);
      lines.push(`%% @pos: ${k} = ${p.x},${p.y}`);
    });
    [...MultiDiagramVisualizer.nodeSizes.keys()].sort().forEach(k => {
      const z = MultiDiagramVisualizer.nodeSizes.get(k);
      if (z.width > 0 || z.height > 0) lines.push(`%% @size: ${k} = ${z.width},${z.height}`);
    });
    const stripped = app.codeEditor.value.replace(/^%%\s*@(?:pos|size):[^\n]*(?:\n|$)/gm, '').trimEnd();
    const code = lines.length ? stripped + '\n' + lines.join('\n') : stripped;
    if (code === app.codeEditor.value) return;
    app.codeEditor.value = code;
    app.graph.customRawCode = code;
    if (app.codeHighlight) {
      app.codeHighlight.innerHTML = SyntaxHighlighter.highlight(code);
    }
  }

  static syncColorToCode(key, color) {
    const app = (typeof AppController !== 'undefined' && AppController.instance) ? AppController.instance : null;
    if (!app || !app.codeEditor) return;
    const cleanKey = String(key).replace(/^["']|["']$/g, '').trim();
    let curCode = app.codeEditor.value;
    const colorDir = `%% @color: ${cleanKey} = ${color}`;
    const escapedKey = cleanKey.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const reg = new RegExp(`^%%\\s*@color:\\s*${escapedKey}\\s*=[^\n]*$`, 'm');

    if (reg.test(curCode)) {
      curCode = curCode.replace(reg, colorDir);
    } else {
      curCode = curCode.trimEnd() + '\n' + colorDir;
    }

    app.codeEditor.value = curCode;
    app.graph.customRawCode = curCode;
    if (app.codeHighlight) {
      app.codeHighlight.innerHTML = SyntaxHighlighter.highlight(curCode);
    }
  }

  static updateCodeLine(pattern, replacement) {
    const app = (typeof AppController !== 'undefined' && AppController.instance) ? AppController.instance : null;
    if (!app || !app.codeEditor) return;
    let curCode = app.codeEditor.value;
    let newCode;
    if (typeof pattern === 'function') {
      newCode = pattern(curCode);
    } else {
      newCode = curCode.replace(pattern, replacement);
    }

    app.codeEditor.value = newCode;
    app.graph.customRawCode = newCode;
    if (app.codeHighlight) {
      app.codeHighlight.innerHTML = SyntaxHighlighter.highlight(newCode);
    }
    app.renderAll();
  }

  static makeDraggable(element, alias, getPos, setPos, onDragEnd) {
    element.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      e.stopPropagation();

      const app = (typeof AppController !== 'undefined' && AppController.instance) ? AppController.instance : null;
      const zoom = app ? app.zoom : 1;
      const startMouseX = e.clientX;
      const startMouseY = e.clientY;
      const initPos = getPos();
      const startX = initPos.x;
      const startY = initPos.y;
      let hasDragged = false;

      const onMouseMove = (moveEvent) => {
        const dx = (moveEvent.clientX - startMouseX) / zoom;
        const dy = (moveEvent.clientY - startMouseY) / zoom;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          hasDragged = true;
          const newX = Math.round(startX + dx);
          const newY = Math.round(startY + dy);
          setPos(newX, newY);
          if (app) app.renderAll();
        }
      };

      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        if (hasDragged) {
          MultiDiagramVisualizer.syncLayoutToCode();
          if (onDragEnd) onDragEnd();
          if (app) app.recordHistory();
        }
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });
  }

  static render(type, code, nodesLayer, edgesLayer, isDark = false) {
    nodesLayer.innerHTML = '';
    edgesLayer.innerHTML = '';
    MultiDiagramVisualizer.parseColorDirectives(code);
    MultiDiagramVisualizer.parseLayoutDirectives(code, false);

    const normType = String(type || '').toLowerCase();
    const renderer = MultiDiagramVisualizer.renderers.get(normType);

    if (renderer) {
      return renderer(code, nodesLayer, edgesLayer, isDark);
    }

    // Default fallback: generic message card
    const primaryText = isDark ? '#FFFFFF' : '#212121';
    const textColor = isDark ? '#E0E0E0' : '#424242';
    const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
    const cardBorder = isDark ? '#424242' : '#E0E0E0';
    const primaryBorder = isDark ? '#1976D2' : '#0288D1';

    const card = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    card.setAttribute('x', '60');
    card.setAttribute('y', '60');
    card.setAttribute('width', '520');
    card.setAttribute('height', '180');
    card.setAttribute('rx', '10');
    card.setAttribute('fill', cardBg);
    card.setAttribute('stroke', primaryBorder);
    card.setAttribute('stroke-width', '2');
    nodesLayer.appendChild(card);

    const titleEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    titleEl.setAttribute('x', '90');
    titleEl.setAttribute('y', '110');
    titleEl.setAttribute('fill', primaryText);
    titleEl.setAttribute('font-size', '16px');
    titleEl.setAttribute('font-weight', 'bold');
    titleEl.textContent = `${type.toUpperCase()} Diagram`;
    nodesLayer.appendChild(titleEl);

    const descEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    descEl.setAttribute('x', '90');
    descEl.setAttribute('y', '150');
    descEl.setAttribute('fill', textColor);
    descEl.setAttribute('font-size', '13px');
    descEl.textContent = 'Diagram rendered. Use the properties panel to edit nodes, edges, or styling.';
    nodesLayer.appendChild(descEl);
  }
}
