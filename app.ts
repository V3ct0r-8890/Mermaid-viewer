/**
 * Mermaid Visual Editor & Offline Viewer
 * TypeScript Source Definition
 */

export interface NodeModel {
  id: string;
  text: string;
  shape: 'rectangle' | 'rounded' | 'circle' | 'diamond' | 'hexagon' | 'parallelogram';
  x: number;
  y: number;
  width?: number;
  height?: number;
  fillColor: string;
  borderColor: string;
  fontColor: string;
}

export interface EdgeModel {
  id: string;
  source: string;
  target: string;
  label?: string;
  type: '-->' | '--->' | '==>' | '-.->' | '<-->' | '<==>';
}

export interface ConnectionRule {
  id: string;
  type: 'allowed' | 'blocked';
  pattern: string; // e.g. "A->B" or "Client->API"
}

export interface GraphProject {
  version: string;
  theme: 'light' | 'dark';
  layout: 'TD' | 'LR';
  nodes: NodeModel[];
  edges: EdgeModel[];
  rules?: ConnectionRule[];
  settings: {
    gridSnap?: boolean;
    gridSize?: number;
  };
}

export class ThemeManager {
  currentTheme: 'light' | 'dark' = 'light';

  constructor() {
    const saved = localStorage.getItem('mermaid_editor_theme') as 'light' | 'dark';
    this.setTheme(saved || 'light');
  }

  setTheme(theme: 'light' | 'dark') {
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('mermaid_editor_theme', theme);
  }

  toggle() {
    this.setTheme(this.currentTheme === 'light' ? 'dark' : 'light');
  }
}

export class HistoryManager {
  undoStack: string[] = [];
  redoStack: string[] = [];
  maxDepth = 100;
  isPerforming = false;

  record(state: GraphProject) {
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

  undo(): GraphProject | null {
    if (this.undoStack.length <= 1) return null;
    this.isPerforming = true;
    const current = this.undoStack.pop()!;
    this.redoStack.push(current);
    const prevJson = this.undoStack[this.undoStack.length - 1];
    this.isPerforming = false;
    this.updateButtons();
    return JSON.parse(prevJson);
  }

  redo(): GraphProject | null {
    if (this.redoStack.length === 0) return null;
    this.isPerforming = true;
    const nextJson = this.redoStack.pop()!;
    this.undoStack.push(nextJson);
    this.isPerforming = false;
    this.updateButtons();
    return JSON.parse(nextJson);
  }

  updateButtons() {
    const btnUndo = document.getElementById('btn-undo') as HTMLButtonElement;
    const btnRedo = document.getElementById('btn-redo') as HTMLButtonElement;
    if (btnUndo) btnUndo.disabled = this.undoStack.length <= 1;
    if (btnRedo) btnRedo.disabled = this.redoStack.length === 0;
  }
}

export class GraphModel {
  nodes: NodeModel[] = [];
  edges: EdgeModel[] = [];
  rules: ConnectionRule[] = [
    { id: 'r1', type: 'blocked', pattern: 'Database->Client' }
  ];
  layoutDirection: 'TD' | 'LR' = 'TD';
  gridSnap = true;
  gridSize = 20;

  getNode(id: string): NodeModel | undefined {
    return this.nodes.find(n => n.id === id);
  }

  getEdge(id: string): EdgeModel | undefined {
    return this.edges.find(e => e.id === id);
  }

  addNode(node: NodeModel) {
    if (!node.width) node.width = 140;
    if (!node.height) node.height = 50;
    this.nodes.push(node);
  }

  updateNode(id: string, updates: Partial<NodeModel>) {
    const n = this.getNode(id);
    if (n) {
      Object.assign(n, updates);
    }
  }

  deleteNode(id: string) {
    this.nodes = this.nodes.filter(n => n.id !== id);
    this.edges = this.edges.filter(e => e.source !== id && e.target !== id);
  }

  addEdge(edge: EdgeModel) {
    const existing = this.edges.find(e => e.source === edge.source && e.target === edge.target && e.type === edge.type && e.label === edge.label);
    if (!existing) {
      this.edges.push(edge);
    }
  }

  deleteEdge(id: string) {
    this.edges = this.edges.filter(e => e.id !== id);
  }

  toProject(theme: 'light' | 'dark'): GraphProject {
    return {
      version: '2.0',
      theme,
      layout: this.layoutDirection,
      nodes: JSON.parse(JSON.stringify(this.nodes)),
      edges: JSON.parse(JSON.stringify(this.edges)),
      rules: JSON.parse(JSON.stringify(this.rules)),
      settings: {
        gridSnap: this.gridSnap,
        gridSize: this.gridSize
      }
    };
  }

  fromProject(proj: GraphProject) {
    this.layoutDirection = proj.layout || 'TD';
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

export class ValidationEngine {
  static validateConnection(sourceId: string, targetId: string, rules: ConnectionRule[]): { allowed: boolean; reason?: string } {
    if (sourceId === targetId) {
      return { allowed: true };
    }
    for (const rule of rules) {
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
