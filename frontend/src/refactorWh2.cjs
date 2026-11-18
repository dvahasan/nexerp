const fs = require('fs');

const path = 'd:/Web/nexerp/frontend/src/pages/Warehouses.jsx';
let content = fs.readFileSync(path, 'utf8');

// The detail panel starts right after:
//         {/* ── Detail panel ── */}
const startMarker = '{/* ── Detail panel ── */}';
const startIndex = content.indexOf(startMarker);

// And ends before:
//         {/* ── Modals ── */}
const endMarker = '{/* ── Modals ── */}';
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.log('Markers not found');
  process.exit(1);
}

const detailPanelJSX = content.substring(startIndex + startMarker.length, endIndex).trim();

// The extracted detailPanelJSX looks like:
// {selected && (
//   <div ...>
//      ...
//   </div>
// )}

let innerJSX = detailPanelJSX;
if (innerJSX.startsWith('{selected && (')) {
  innerJSX = innerJSX.substring('{selected && ('.length);
}
if (innerJSX.endsWith(')}')) {
  innerJSX = innerJSX.substring(0, innerJSX.length - 2).trim();
}

const renderFunc = `
  const renderDetailPanel = () => {
    if (!selected) return null;
    return (
      ${innerJSX}
    );
  };
`;

// Insert the function right before the return statement.
const returnIndex = content.indexOf('return (');
if (returnIndex === -1) {
  console.log('return not found');
  process.exit(1);
}

let newContent = content.substring(0, returnIndex) + renderFunc + '\n  ' + content.substring(returnIndex);

// Replace the original detail panel block
newContent = newContent.substring(0, newContent.indexOf(startMarker)) + 
  `{/* ── Detail panel (Desktop) ── */}
        <div className="hidden md:block">
          {renderDetailPanel()}
        </div>\n\n      </div>\n\n      ` + 
  newContent.substring(endIndex);

// Inject into the list loop
// The loop structure:
//             warehouses.map(wh => (
//               <div
//                 key={wh._id}
//                 ...
//               >
// ...
//               </div>
//             ))

const matchPattern = /<\/div>\s*\)\)\s*\)\}\s*<\/div>/g;
// Wait, regex might fail to find the exact end.
// Let's use simple string replace for the end of the warehouse card:
// It looks like:
//                 </div>
//               </div>
//             ))
//           )}
//         </div>

let splitPoints = newContent.split(/(<\/div>\s*\)\)\s*\)\}\s*<\/div>)/);
if (splitPoints.length >= 3) {
  let injection = `  <div className="md:hidden" style={{ marginTop: 12 }}>
                  {selected?._id === wh._id && renderDetailPanel()}
                </div>
              </div>
            ))
          )}
        </div>`;
  newContent = newContent.replace(/(<\/div>\s*\)\)\s*\)\}\s*<\/div>)/, injection);
} else {
  console.log('Injection point for map not found');
  // fallback to generic replace
  newContent = newContent.replace(
    /(\s*)<\/div>\n(\s*)\)\)\n(\s*)\)\}\n(\s*)<\/div>/,
    `$1  <div className="md:hidden" style={{ marginTop: 12 }}>\n$1    {selected?._id === wh._id && renderDetailPanel()}\n$1  </div>\n$1</div>\n$2))\n$3)}\n$4</div>`
  );
}

// Ensure layout doesn't use static grid for 1fr, since we use hidden md:block
newContent = newContent.replace(
  /gridTemplateColumns:\s*selected \? 'repeat\(auto-fit, minmax\(300px, 1fr\)\)' : '1fr'/,
  "gridTemplateColumns: selected ? '1fr 1fr' : '1fr'"
);
// Wait, if it's 1fr 1fr, on mobile the right side is display:none, so it's 1 column? No, CSS Grid with 1fr 1fr will force 2 columns, one being empty!
// So it must be: 'gridTemplateColumns: selected ? "repeat(auto-fit, minmax(300px, 1fr))" : "1fr"' OR we can use Tailwind classes: className="grid grid-cols-1 md:grid-cols-[300px_1fr]"
newContent = newContent.replace(
  /<div style=\{\{\s*display: 'grid',\s*gridTemplateColumns: selected \? 'repeat\(auto-fit, minmax\(300px, 1fr\)\)' : '1fr',\s*gap: 12\s*\}\}>/,
  `<div className={\`grid gap-3 \${selected ? 'grid-cols-1 md:grid-cols-[300px_1fr]' : 'grid-cols-1'}\`}>`
);

fs.writeFileSync(path, newContent);
console.log('Successfully refactored Warehouses.jsx');
