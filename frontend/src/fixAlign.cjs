const fs = require('fs');
const file = 'd:/Web/nexerp/frontend/src/pages/Settings.jsx';
let content = fs.readFileSync(file, 'utf8');

// Replace standard auto-fit wrapper with alignItems: 'start'
content = content.replace(
  /<div style=\{\{ display: 'grid', gridTemplateColumns: 'repeat\(auto-fit, minmax\(260px, 1fr\)\)', gap: 16 \}\}>/g,
  "<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, alignItems: 'start' }}>"
);

content = content.replace(
  /<div style=\{\{ display: 'grid', gridTemplateColumns: 'repeat\(auto-fit, minmax\(260px, 1fr\)\)', gap: 30 \}\}>/g,
  "<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 30, alignItems: 'start' }}>"
);

fs.writeFileSync(file, content);
console.log('Fixed vertical stretching on all Settings tabs');
