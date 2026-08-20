Mermaid Visual Editor & Offline Viewer - Final Specification v2.0
1. Project Goal

Create a fully offline web application delivered as:

index.html


that supports:

Visual Mermaid diagram editing
Mermaid code editing
Drag & Drop node manipulation
Connection creation wizard
Undo / Redo
Export capabilities
Light & Dark themes
No backend
No internet dependency
2. Deployment Requirements
Package
Single HTML file


Contains:

HTML
CSS
JavaScript (generated from TypeScript)
Embedded Mermaid Runtime


No:

CDN
Node.js runtime
NPM deployment
Server
Database


Must run by:

file:///index.html


in Chrome, Edge, Firefox.

3. Architecture
Source of Truth

Use internal graph model.

GraphModel


NOT Mermaid text.

Architecture:

GraphModel
     |
     +--> Mermaid Generator
     |
     +--> Visual Canvas
     |
     +--> Export Engine


This preserves:

Node positions
Colors
Undo history
Custom metadata
4. UI Layout
+--------------------------------------------------------------+
| Toolbar                                                      |
+--------------------------------------------------------------+
|                                                              |
| Node Panel | Diagram Canvas | Mermaid Code Editor           |
|            |                |                               |
|            |                |                               |
|            |                |                               |
|                                                              |
+--------------------------------------------------------------+
| Status Bar                                                   |
+--------------------------------------------------------------+


Resizable panels.

5. Themes
Default Theme

Light Theme.

Background  #FFFFFF
Canvas      #FAFAFA
Text        #212121
Node        #E3F2FD
Selection   #90CAF9
Link        #616161

Dark Theme

User selectable.

Background  #1E1E1E
Canvas      #252526
Text        #D4D4D4
Node        #2D4A66
Selection   #4FC3F7
Link        #BBBBBB


Saved in:

localStorage

6. Toolbar Features

Toolbar buttons:

New

Open

Save

Export Mermaid

Export JSON

Export SVG

Export PNG

Undo

Redo

Add Node

Add Link

Auto Layout

Theme Toggle

Fit Screen

7. Node Model
Structure
interface Node {
    id: string;
    text: string;
    shape: string;
    x: number;
    y: number;
    fillColor: string;
    borderColor: string;
    fontColor: string;
}

Supported Shapes
Rectangle

Rounded Rectangle

Circle

Diamond

Hexagon

Parallelogram

Node Creation Dialog

User input:

Node ID

Display Text

Shape

Fill Color

Border Color

Font Color

Node Editing

Editable:

Display Text

Shape

Colors


Node ID immutable.

Node Delete

When deleting:

Delete node?

[Yes]
[No]


Remove:

Node
Related links
8. Drag & Drop

Support:

Move node

Grid snapping

Multi-select

Selection box

Grid

Default:

20px


Configurable.

9. Edge Model
interface Edge {
    id: string;
    source: string;
    target: string;
    label?: string;
    type: string;
}

10. Link Types

Supported:

-->

--->
==>

-.->

<-->

<==>

11. Connection Wizard
User Requirement

Before creating connection:

User must choose target first.

Dialog:

Source Node

Target Node

Label

Arrow Type


Then:

[Create]

Drag Connect

Workflow:

Drag from node handle
     ↓
Hover target
     ↓
Release
     ↓
Connection Dialog
     ↓
Confirm


No automatic connection creation.

12. Connection Rules Engine

Optional validation layer.

Example:

{
  "allowed": [
    "Client->API",
    "API->Database"
  ],
  "blocked": [
    "Database->Client"
  ]
}


If invalid:

Connection not allowed

13. Mermaid Editor

Right-side code editor.

Features

Syntax highlighting.

Highlight:

flowchart keyword

Node IDs

Arrow syntax

Labels

Comments

Supported Mermaid Types

Initial release:

Flowchart TD

Flowchart LR


Only.

Not supported:

Sequence Diagram

Class Diagram

State Diagram

Git Graph

ER Diagram

14. Synchronization
Visual → Mermaid

Node moved:

Graph updated
Mermaid regenerated

Mermaid → Visual

User edits code:

Parse Mermaid
Validate
Rebuild graph
Refresh canvas

15. Mermaid Validation

Errors displayed:

Line 8:

Invalid edge syntax


Rendering prevented until fixed.

16. Undo / Redo
Tracked Actions
Create Node

Delete Node

Edit Node

Move Node

Create Link

Delete Link

Edit Link

Mermaid Edit

Auto Layout

Keyboard
Ctrl+Z

Ctrl+Y

Ctrl+Shift+Z

17. Zoom & Navigation
Zoom
Ctrl + Mouse Wheel


Commands:

Zoom In

Zoom Out

Fit Screen

100%

18. Minimap

Bottom-right corner.

Shows:

Full graph
Current viewport


For large diagrams.

19. Search

Shortcut:

Ctrl+F


Search:

Node ID

Node Text

Edge Label


Jump to result.

20. Auto Layout

Supported:

Top Down (TD)

Left Right (LR)


Layout adjusts:

Node positions

Spacing

Overlap avoidance

21. Save Format

Extension:

.graph.json


Structure:

{
  "version": "2.0",
  "theme": "light",
  "layout": "TD",
  "nodes": [],
  "edges": [],
  "settings": {}
}

22. Export Features
Export Mermaid
diagram.mmd

Export JSON
project.graph.json

Export SVG
diagram.svg

Export PNG
diagram.png


Generated from SVG.

23. Keyboard Shortcuts
Ctrl+N     New Project

Ctrl+O     Open

Ctrl+S     Save

Ctrl+F     Search

Ctrl+A     Select All

Delete      Delete Selection

Ctrl+Z     Undo

Ctrl+Y     Redo

Ctrl+Shift+Z Redo

Ctrl+0     Actual Size

Ctrl++     Zoom In

Ctrl+-     Zoom Out

24. Internal Classes

Recommended TypeScript modules:

ThemeManager

StorageManager

HistoryManager

GraphModel

NodeModel

EdgeModel

MermaidGenerator

MermaidParser

CanvasRenderer

SyntaxHighlighter

SelectionManager

ZoomManager

MinimapRenderer

ExportManager

AutoLayoutEngine

ValidationEngine

25. Embedded Mermaid Runtime (B2)

Because you selected B2, the final implementation should:

Embed Mermaid runtime source directly
inside index.html


instead of loading:

https://cdn.jsdelivr.net/...```

This ensures:

✅ Fully offline  
✅ Real Mermaid rendering  
✅ Native Mermaid syntax support

at the cost of:

❌ Large HTML file size (several MB)

---

# 26. Performance Target

Target Capacity:

| Metric | Target |
|----------|----------|
| Nodes | 500+ |
| Edges | 1000+ |
| Undo Levels | 100 |
| Zoom | 25%-400% |
| Render Refresh | <100ms |

---

# Final Accepted Scope

✅ Single HTML  
✅ Offline only  
✅ Embedded Mermaid runtime  
✅ Light theme default  
✅ Dark theme support  
✅ Drag & drop nodes  
✅ Visual node editor  
✅ Mermaid code editor  
✅ Syntax highlighting  
✅ Connection wizard  
✅ User selects target before final connection creation  
✅ Undo / Redo  
✅ Search  
✅ Auto Layout  
✅ Minimap  
✅ Export PNG/SVG/JSON/Mermaid  
✅ Save & Load projects  
✅ Flowchart TD/LR support initially  

This specification is detailed enough to be used directly as a development backlog or to feed into an AI coding agent for implementation.
