const fs = require('fs');

const pages = ['Reasons.jsx', 'Projects.jsx', 'Destinations.jsx', 'Sources.jsx'];

pages.forEach(page => {
  const file = 'd:/Web/nexerp/frontend/src/pages/' + page;
  let content = fs.readFileSync(file, 'utf8');

  // Replace header flex to wrap
  content = content.replace(
    /style=\{\{\s*display:\s*'flex',\s*justifyContent:\s*'space-between',\s*alignItems:\s*'center',\s*marginBottom:\s*20\s*\}\}/g,
    "style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}"
  );

  fs.writeFileSync(file, content);
  console.log('Fixed ' + page);
});
