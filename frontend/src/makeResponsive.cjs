const fs = require('fs');
const path = require('path');

const dir = 'd:/Web/nexerp/frontend/src/pages';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Replace strict 1fr 1fr
  content = content.replace(/gridTemplateColumns:\s*(?:'|")1fr 1fr(?:'|")/g, "gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))'");
  content = content.replace(/gridTemplateColumns:\s*(?:'|")1fr 2fr(?:'|")/g, "gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))'");
  content = content.replace(/gridTemplateColumns:\s*(?:'|")2fr 1fr(?:'|")/g, "gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))'");
  
  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log('Updated ' + file);
  }
});
