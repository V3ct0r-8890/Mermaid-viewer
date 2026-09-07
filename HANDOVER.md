# Mermaid Viewer & Visual Editor — Project Handover & Developer Guide

## 1. Project Overview & Architecture

**Mermaid Viewer & Visual Editor** is an interactive, browser-based visual design and editing environment for Mermaid diagrams. It offers bidirectional synchronization between graphical drag-and-drop / property-based editing and standard Mermaid text-based syntax.

### Dual-Architecture Engine:
1. **Flowchart Canvas (`js/model.js`, `js/layout.js`, `js/generator.js`)**:
   - Handles standard Flowcharts (`flowchart TD`, `flowchart LR`).
   - Features node dragging, auto-grid snapping, SVG edge curves (Bezier, Linear, Step), bidirectional arrowheads, and real-time syntax generation.
2. **Extensible Multi-Diagram Visualizer (`js/visualizer.js`, `js/diagrams/*.js`)**:
   - A modular registry architecture (`MultiDiagramVisualizer.register(...)`) supporting 14+ specialized diagram types with dynamic parsing, interactive node selection, live color swatches, and inline inspector editing.

---

## 2. Supported Diagram Types (16 Suites)

Every diagram type that has links exposes the same three link controls in the Inspector — **From**, **To**, and **Connector / Line Routing** (Curved / Straight / Orthogonal Step) — plus colour and thickness. Diagrams marked *no link concept* have no relationship syntax in Mermaid, so only their node properties are editable.

| Category | Diagram Type | Key Visual Features | Inspector Capabilities |
|---|---|---|---|
| **Flowcharts** | `flowchart TD`, `flowchart LR` | Node dragging, shapes, curves, labels | From/To reconnect, connector routing, bidirectional arrows, colors |
| **Sequence** | `sequenceDiagram` | Actors/participants, lifelines, alt/else frames | From/To change, connector routing, sync/async/return/bidirectional messages |
| **Class (UML)** | `classDiagram` | 3-compartment cards, inheritance `<|--`, composition `*--` | Super/Sub class reconnect, connector routing, UML relationship types |
| **State (v2)** | `stateDiagram-v2` | Composite containers, choices, orthogonal stepped links | From/To state selector, connector routing, transition badges, styles |
| **Entity Relationship** | `erDiagram` | Crow's foot cardinality, PK/FK attributes, tables | Entity 1/2 reconnect, connector routing, cardinality types (1:1, 1:N, N:N) |
| **Gantt Roadmap** | `gantt` | Sections, tasks, milestones, Today marker, dependencies | Section changer, auto date/duration calculation, task ID *(no link concept)* |
| **Mindmap** | `mindmap` | Radial hierarchy, subtopic branches, pastel themes | Branch re-parenting (From/To), connector routing, link colors |
| **C4 Context** | `C4Context` | System, container, person badges, technology tags | From/To element change, connector routing, `Rel`/`BiRel`/`Rel_Back` |
| **Timeline** | `timeline` | Chronological era containers and multi-item events | Era/Event customization, font/badge colors *(no link concept)* |
| **Quadrant Priority** | `quadrantChart` | 4 quadrants, x/y axes, priority item coordinates | Coordinate tweaking, point fill/border colors, labels *(no link concept)* |
| **Git Version Graph**| `gitGraph` | Branch lifelines, commit nodes, merge tags | Commit + merge connectors (merge branch is editable), connector routing, commit fill/border |
| **Sankey Flow** | `sankey-beta` | Weighted multi-tier flow bands | Source/Target nodes, connector routing, weight inputs, band colors |
| **Treemap** | `treemap-beta` | Proportional nested tiles | Category weights, background fills, text styles *(no link concept)* |
| **Pie Chart** | `pie` | SVG pie slices and legend | Slices value input, custom palette *(no link concept)* |
| **User Journey** | `journey` | Task sections and actor satisfaction scores | Score adjustments, section reassignments *(no link concept)* |

---

## 3. Key Accomplishments & Recent Additions

### Universal Link & Node Wizards (`+ Object` / `+ Link`):
- Context-aware modal forms adapted to the active diagram type.
- Creating nodes in Flowchart or State diagrams allows configuring **Connect From (Predecessor)** and **Connect To (Successor)** in a single step.

### Link Inspector with "From / To" Reconfiguration & Bi-directional Styles:
- When any connection or relationship is selected in **Flowchart**, **Sequence**, **Class**, **State**, **ER**, **C4 Context**, **Sankey**, **Mindmap** or **GitGraph**, the Inspector provides:
  - **From (Source)** and **To (Target)** entity/node dropdowns.
  - **Connector / Line Routing**: Curved (Bezier), Straight, or Orthogonal Step.
  - **Bi-directional arrowheads** (`<-->`, `<==>`, `<-.->`, `<->`, `<->>`, `}|--|{`, `o{--o{`, `BiRel`).

### Shared Connector Routing Engine (`Utils.buildConnectorPath`, `js/utils.js`):
- One routing implementation drives every diagram, so "Straight" or "Orthogonal Step" means the same thing everywhere.
- `Utils.normalizeConnector` accepts the Flowchart's native Mermaid values (`basis` / `linear` / `step`) and the Mindmap's legacy `bezier` value, so previously saved diagrams keep working.
- `Utils.connectorEndDirection` keeps hand-drawn arrowheads aligned with the final leg of whichever route is active.
- Each diagram keeps its own hand-tuned default (C4 and Sankey default to curved, State to stepped, Sequence to straight); a link is only re-routed once the user picks a different style.
- Sequence messages are the one special case: both ends share a `y`, so curved bows the line and stepped lifts it into a bracket.

### Pastel Fill Convention:
- **Node fills are pastel; node borders, link lines and text stay at full strength.** `Utils.PASTEL_FILLS`, `Utils.INK_COLORS` and `Utils.toPastel(hex, isDark)` are the single source of truth, and the Inspector's colour swatch rows pick the right palette automatically (fill fields get pastels, everything else gets ink colours).
- `Utils.toPastel` tints toward white in light mode and toward the dark canvas in dark mode, so per-item palettes (Sankey bands, GitGraph branches, Timeline eras, Journey scores, Quadrant points) keep their hue while their fills soften.

### Gantt Roadmap Enhancements:
- **Task ID Auto-Extraction**: Automatically extracts ID when typing `t1: Task Name` or declaration `:status, t1, ...`.
- **Section Changer in Inspector**: Move tasks between sections directly from the Properties panel.
- **Real-Time Bidirectional Date & Duration Auto-Calculation**:
  - Start Date + Duration -> calculates End Date.
  - End Date + Start Date -> calculates Duration.
- **Dependency Resolution (`after <id>`)**: Multi-pass scheduler calculates start dates sequentially after predecessor completion.
- **Automatic Chronological Sorting**: Automatically orders tasks in each section by earliest Start Date and Task ID.

---

## 4. Codebase Structure & Landmarks

```
Mermaid-viewer/
├── HANDOVER.md                 # Project handover & developer guide
├── index.html                  # Main development entrypoint (modular)
├── build.js                    # Bundler: compiles all JS/CSS into standalone dist/index.html
├── test.js                     # Automated regression test suite (16 diagram templates)
├── dist/
│   └── index.html              # Standalone zero-dependency distribution bundle
├── css/
│   └── styles.css              # All layout, variables, themes, panels & modal styles
└── js/
    ├── app.js                  # AppController, Inspector panel, Wizards, Code sync
    ├── model.js                # GraphModel & ValidationEngine (Nodes & Edges) for Flowcharts
    ├── layout.js                # Auto-layout (TD/LR grid placement) for Flowcharts
    ├── generator.js            # Mermaid syntax generation from the Flowchart graph model
    ├── visualizer.js           # MultiDiagramVisualizer registry & base interactive visualizer
    ├── parser.js                # Mermaid text -> GraphModel parser
    ├── highlighter.js          # Mermaid code editor syntax highlighting
    ├── export.js                # PNG/SVG/JSON/MMD export
    ├── templates.js            # Default templates for all 16 diagram types
    ├── utils.js                # Helper functions (colors, snapping, UIDs, toasts, ThemeManager, HistoryManager)
    └── diagrams/               # Specialized diagram visualizers
        ├── classdiagram.js     # UML Class cards & relationship renderers
        ├── statediagram.js     # State v2 containers, choices & stepped transitions
        ├── sequence.js         # Sequence actors, lifelines & message arrows
        ├── erdiagram.js        # ER entities, attributes & crow's foot links
        ├── gantt.js            # Gantt timeline, sections, dependencies & today marker
        ├── mindmap.js          # Mindmap nodes, branches & color propagation
        ├── c4context.js        # C4 software architecture context visualizer
        ├── timeline.js         # Timeline milestones & eras
        ├── quadrant.js         # Priority quadrant chart
        ├── gitgraph.js         # Git branches & commit nodes
        ├── sankey.js           # Sankey flow bandwidth visualizer
        ├── treemap.js          # Treemap proportional hierarchy
        ├── pie.js              # Pie chart renderer
        └── journey.js          # User journey steps & satisfaction curves
```

---

## 5. Development Workflow & Commands

### Running Automated Regression Tests:
```bash
node test.js
```
*Validates that all 16 diagram templates parse cleanly, generate non-empty SVG nodes and connections, and preserve core Mermaid compatibility.*

### Compiling the Standalone Production Bundle:
```bash
node build.js
```
*Inlines all stylesheets, diagram modules, and scripts into a single, self-contained `dist/index.html` file.*

---

## 6. How to Extend or Add New Features

1. **Adding a New Property to an Object/Link Inspector**:
   - Locate the target visualizer in `js/diagrams/<name>.js`.
   - Update `AppController.instance.selectVisualObject({ fields: [...], onSave: (vals) => ... })`.
   - Update `updateCodeLine` callback to reflect the changes back to Mermaid syntax.
2. **Adding a New Diagram Type**:
   - Create `js/diagrams/<newtype>.js` and register it with `MultiDiagramVisualizer.register('<newtype>', function(...) { ... })`.
   - Add template to `js/templates.js`.
   - Add entry in `test.js` to include in regression suite.
   - Run `node test.js && node build.js`.
