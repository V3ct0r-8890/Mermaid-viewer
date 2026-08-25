const fs = require('fs');

function createMockElement(tag) {
  return {
    tagName: tag,
    attributes: {},
    style: {},
    children: [],
    setAttribute(k, v) { this.attributes[k] = v; },
    getAttribute(k) { return this.attributes[k]; },
    appendChild(c) { this.children.push(c); },
    insertBefore(c, ref) { this.children.push(c); },
    addEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; }
  };
}

global.document = {
  createElementNS: (ns, tag) => createMockElement(tag),
  createElement: (tag) => createMockElement(tag)
};

const diagramFiles = fs.readdirSync('js/diagrams').filter(f => f.endsWith('.js')).map(f => 'js/diagrams/' + f);

const fullCode = [
  'js/utils.js',
  'js/model.js',
  'js/layout.js',
  'js/templates.js',
  'js/visualizer.js',
  ...diagramFiles,
  'js/parser.js'
].map(f => fs.readFileSync(f, 'utf8')).join('\n;\n');

const fn = new Function(fullCode + '; return { DIAGRAM_TEMPLATES, MultiDiagramVisualizer, MermaidParser, GraphModel };');
const { DIAGRAM_TEMPLATES, MultiDiagramVisualizer, MermaidParser, GraphModel } = fn();

console.log(`\n=== RUNNING AUTOMATED REGRESSION TEST SUITE (${DIAGRAM_TEMPLATES.length} TEMPLATES) ===\n`);

let passedCount = 0;
let failedCount = 0;

DIAGRAM_TEMPLATES.forEach((tpl, idx) => {
  const testName = `[${idx + 1}/${DIAGRAM_TEMPLATES.length}] ${tpl.name} (${tpl.badge || tpl.id})`;
  try {
    const parseRes = MermaidParser.parse(tpl.code, new GraphModel());
    if (parseRes.error) {
      throw new Error(`Parse Error: ${parseRes.error}`);
    }

    const nodesLayer = createMockElement('g');
    const edgesLayer = createMockElement('g');

    MultiDiagramVisualizer.render(tpl.id, tpl.code, nodesLayer, edgesLayer, false);

    const isVisualSpecial = MultiDiagramVisualizer.renderers.has(tpl.id.toLowerCase());
    const nodeCount = isVisualSpecial ? nodesLayer.children.length : parseRes.graph.nodes.length;
    const edgeCount = isVisualSpecial ? edgesLayer.children.length : parseRes.graph.edges.length;

    if (nodeCount === 0) {
      throw new Error(`Zero nodes rendered`);
    }

    console.log(`  ✓ PASS: ${testName} -> ${nodeCount} nodes, ${edgeCount} connections`);
    passedCount++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${testName} -> ${err.message}`);
    failedCount++;
  }
});

console.log(`\n=== TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED ===\n`);

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log('All 15 diagram suites passed regression testing successfully!\n');
  process.exit(0);
}
