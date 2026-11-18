const fs = require('fs');
const file = 'd:/Web/nexerp/frontend/src/pages/Settings.jsx';
let content = fs.readFileSync(file, 'utf8');

// Replace minmax(320px, 1fr) and minmax(350px, 1fr) with minmax(260px, 1fr)
content = content.replace(/minmax\(320px/g, 'minmax(260px');
content = content.replace(/minmax\(350px/g, 'minmax(260px');

fs.writeFileSync(file, content);
console.log('Fixed Settings grid sizes');
