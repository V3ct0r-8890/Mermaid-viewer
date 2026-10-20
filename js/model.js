// --- GRAPH MODEL ---
    class GraphModel {
      constructor() {
        this.diagramType = 'flowchart_td';
        this.customRawCode = null;
        this.nodes = [];
        this.edges = [];
        this.rules = [
          { id: 'r1', type: 'blocked', pattern: 'Database->Client' }
        ];
        this.layoutDirection = 'TD';
        this.curveStyle = 'basis';
        this.gridSnap = true;
        this.gridSize = 20;
      }

      getNode(id) {
        return this.nodes.find(n => n.id === id);
      }

      getEdge(id) {
        return this.edges.find(e => e.id === id);
      }

      addNode(node) {
        if (!node.width) node.width = 140;
        if (!node.height) node.height = 50;
        this.nodes.push(node);
      }

      updateNode(id, updates) {
        const n = this.getNode(id);
        if (n) {
          Object.assign(n, updates);
        }
      }

      deleteNode(id) {
        this.nodes = this.nodes.filter(n => n.id !== id);
        this.edges = this.edges.filter(e => e.source !== id && e.target !== id);
      }

      addEdge(edge) {
        const existing = this.edges.find(e => e.source === edge.source && e.target === edge.target && e.type === edge.type && e.label === edge.label);
        if (!existing) {
          this.edges.push(edge);
        }
      }

      deleteEdge(id) {
        this.edges = this.edges.filter(e => e.id !== id);
      }

      toProject(theme) {
        return {
          version: '2.0',
          theme,
          diagramType: this.diagramType,
          customRawCode: this.customRawCode,
          layout: this.layoutDirection,
          curveStyle: this.curveStyle,
          nodes: JSON.parse(JSON.stringify(this.nodes)),
          edges: JSON.parse(JSON.stringify(this.edges)),
          rules: JSON.parse(JSON.stringify(this.rules)),
          settings: {
            gridSnap: this.gridSnap,
            gridSize: this.gridSize
          }
        };
      }

      static validateProject(proj) {
        if (!proj || typeof proj !== 'object' || Array.isArray(proj)) return 'Project file must be a JSON object';
        for (const k of ['nodes', 'edges', 'rules']) {
          if (proj[k] !== undefined && !Array.isArray(proj[k])) return `"${k}" must be an array`;
        }
        if (proj.diagramType !== undefined && typeof proj.diagramType !== 'string') return '"diagramType" must be a string';
        if (proj.customRawCode != null && typeof proj.customRawCode !== 'string') return '"customRawCode" must be a string';
        for (const n of proj.nodes || []) {
          if (!n || typeof n !== 'object' || typeof n.id !== 'string') return 'Every node needs a string "id"';
        }
        const ids = new Set((proj.nodes || []).map(n => n.id));
        for (const e of proj.edges || []) {
          if (!e || typeof e !== 'object' || typeof e.source !== 'string' || typeof e.target !== 'string') return 'Every edge needs string "source" and "target"';
          if (!ids.has(e.source) || !ids.has(e.target)) return 'An edge references a node that does not exist';
        }
        for (const r of proj.rules || []) {
          if (!r || typeof r.pattern !== 'string' || (r.type !== 'allowed' && r.type !== 'blocked')) return 'Every rule needs a string "pattern" and type "allowed" or "blocked"';
        }
        return null;
      }

      fromProject(proj) {
        this.diagramType = proj.diagramType || 'flowchart_td';
        this.customRawCode = proj.customRawCode || null;
        this.layoutDirection = proj.layout || 'TD';
        this.curveStyle = proj.curveStyle || 'basis';
        this.nodes = proj.nodes || [];
        this.edges = proj.edges || [];
        this.rules = proj.rules || [];
        if (proj.settings) {
          this.gridSnap = proj.settings.gridSnap !== false;
          this.gridSize = proj.settings.gridSize || 20;
        }
        this.nodes.forEach(n => {
          if (!n.width) n.width = 140;
          if (!n.height) n.height = 50;
        });
      }
    }

    // --- CONNECTION RULES VALIDATOR ---
    class ValidationEngine {
      static validateConnection(sourceId, targetId, rules) {
        if (sourceId === targetId) {
          return { allowed: true };
        }
        for (const rule of rules) {
          if (typeof rule.pattern !== 'string' || !rule.pattern.includes('->')) continue;
          const [sPat, tPat] = rule.pattern.split('->').map(s => s.trim());
          const matchSource = (sPat === '*' || sPat.toLowerCase() === sourceId.toLowerCase());
          const matchTarget = (tPat === '*' || tPat.toLowerCase() === targetId.toLowerCase());
          if (matchSource && matchTarget) {
            if (rule.type === 'blocked') {
              return { allowed: false, reason: `Connection blocked by rule: ${rule.pattern}` };
            }
          }
        }
        return { allowed: true };
      }
    }