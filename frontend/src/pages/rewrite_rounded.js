const fs = require('fs');
const path = require('path');

const files = [
  'd:/Web/nexerp/frontend/src/pages/Landing.jsx',
  'd:/Web/nexerp/frontend/src/pages/DemoSelect.jsx'
];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf-8');
  
  // Decrease border radius for a sharper, more system-like look
  content = content.replace(/rounded-3xl/g, 'rounded-xl');
  content = content.replace(/rounded-2xl/g, 'rounded-lg');
  content = content.replace(/rounded-xl/g, 'rounded');
  content = content.replace(/rounded-lg/g, 'rounded');
  
  fs.writeFileSync(f, content, 'utf-8');
});

console.log('Done');
