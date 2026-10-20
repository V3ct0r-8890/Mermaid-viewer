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

const fn = new Function(fullCode + '; return { DIAGRAM_TEMPLATES, MultiDiagramVisualizer, MermaidParser, GraphModel, ValidationEngine };');
const { DIAGRAM_TEMPLATES, MultiDiagramVisualizer, MermaidParser, GraphModel, ValidationEngine } = fn();

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


console.log('=== STATE PERSISTENCE / VALIDATION TESTS ===\n');
const assert = require('assert');
const V = MultiDiagramVisualizer;
function check(name, f) {
  try { f(); console.log(`  ✓ PASS: ${name}`); passedCount++; }
  catch (err) { console.error(`  ✗ FAIL: ${name} -> ${err.message}`); failedCount++; }
}

check('layout directives parse into position/size maps', () => {
  V.resetState('classDiagram\n  class A\n%% @pos: A = 120,-40\n%% @size: A = 200,90');
  assert.deepStrictEqual(V.nodePositions.get('A'), { x: 120, y: -40 });
  assert.deepStrictEqual(V.nodeSizes.get('A'), { width: 200, height: 90 });
});

check('resetState clears state from a previous diagram', () => {
  V.customColors.set('Old', '#fff');
  V.nodePositions.set('Old', { x: 1, y: 2 });
  V.nodeSizes.set('Old', { width: 1, height: 2 });
  V.resetState('pie\n  "A" : 1');
  assert.strictEqual(V.customColors.size, 0);
  assert.strictEqual(V.nodePositions.size, 0);
  assert.strictEqual(V.nodeSizes.size, 0);
});

check('render restores layout from saved code without clobbering live drags', () => {
  V.resetState('');
  V.nodePositions.set('A', { x: 5, y: 5 });
  V.render('classdiagram', 'classDiagram\n  class A\n%% @pos: A = 120,40', createMockElement('g'), createMockElement('g'), false);
  assert.deepStrictEqual(V.nodePositions.get('A'), { x: 5, y: 5 });
  V.resetState('classDiagram\n  class A\n%% @pos: A = 120,40');
  assert.deepStrictEqual(V.nodePositions.get('A'), { x: 120, y: 40 });
});

check('validateProject accepts a real project and rejects malformed ones', () => {
  const g = new GraphModel();
  g.nodes = [{ id: 'a' }, { id: 'b' }];
  g.edges = [{ id: 'e', source: 'a', target: 'b' }];
  assert.strictEqual(GraphModel.validateProject(g.toProject('light')), null);
  assert.ok(GraphModel.validateProject(null));
  assert.ok(GraphModel.validateProject({ nodes: 'x' }));
  assert.ok(GraphModel.validateProject({ nodes: [{ id: 'a' }], edges: [{ source: 'a', target: 'zzz' }] }));
  assert.ok(GraphModel.validateProject({ rules: [{ pattern: 5, type: 'allowed' }] }));
});

check('ValidationEngine ignores rules without ->', () => {
  const r = ValidationEngine.validateConnection('a', 'b', [{ pattern: 'garbage', type: 'blocked' }, { pattern: 'a -> b', type: 'blocked' }]);
  assert.strictEqual(r.allowed, false);
  assert.strictEqual(ValidationEngine.validateConnection('a', 'b', [{ pattern: 'garbage', type: 'blocked' }]).allowed, true);
});

console.log(`\n=== TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED ===\n`);

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log(`All ${DIAGRAM_TEMPLATES.length} diagram suites passed regression testing successfully!\n`);
  process.exit(0);
}
