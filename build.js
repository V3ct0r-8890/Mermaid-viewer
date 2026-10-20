// Standalone Single-File Bundler for Mermaid Viewer
const fs = require('fs');
const path = require('path');

function bundle(outputFile = 'dist/index.html') {
  const html = fs.readFileSync('index.html', 'utf8');
  const css = fs.readFileSync('css/styles.css', 'utf8');

  const diagramFiles = fs.existsSync('js/diagrams')
    ? fs.readdirSync('js/diagrams').filter(f => f.endsWith('.js')).map(f => 'js/diagrams/' + f)
    : [];

  const jsFiles = [
    'js/templates.js',
    'js/utils.js',
    'js/model.js',
    'js/layout.js',
    'js/generator.js',
    'js/visualizer.js',
    ...diagramFiles,
    'js/parser.js',
    'js/highlighter.js',
    'js/export.js',
    'js/app.js'
  ];

  const jsBundle = jsFiles.map(f => fs.readFileSync(f, 'utf8')).join('\n\n');

  let singleHtml = html
    .replace(/<link rel="stylesheet" href="css\/styles\.css">/, () => '<style>\n' + css + '\n</style>')
    .replace(/<script src="js\/[^"]+"><\/script>\n?/g, '');

  singleHtml = singleHtml.replace('<\/body>', () => '  <script>\n' + jsBundle + '\n  <\/script>\n<\/body>');

  const outDir = path.dirname(outputFile);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(outputFile, singleHtml);
  for (const f of ['sw.js', 'manifest.webmanifest']) fs.copyFileSync(f, path.join(outDir, f));
  fs.cpSync('icons', path.join(outDir, 'icons'), { recursive: true });
  console.log(`Successfully bundled into standalone single-file: ${outputFile} (${(singleHtml.length / 1024).toFixed(1)} KB)`);
}

bundle(process.argv[2] || 'dist/index.html');
