const fs = require('fs');

const path = 'd:/Web/nexerp/frontend/src/pages/Warehouses.jsx';
let content = fs.readFileSync(path, 'utf8');

// The detail panel starts right after:
//         </div>
//
//         {/* ── Detail panel ── */}
//         {selected && (

const startMarker = '{/* ── Detail panel ── */}';
const startIndex = content.indexOf(startMarker);
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

const renderFunc = `
  const renderDetailPanel = () => {
    if (!selected) return null;
    return (
      ${detailPanelJSX.replace(/^\{selected && \(/, '').replace(/\)\}\s*$/, '')}
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

// Now replace the original detail panel block
newContent = newContent.substring(0, newContent.indexOf(startMarker)) + 
  `{/* ── Detail panel (Desktop) ── */}
        <div className="hidden md:block">
          {renderDetailPanel()}
        </div>\n\n        ` + 
  newContent.substring(endIndex);

// Now we need to inject the mobile render inside the list loop.
// The list loop is:
// warehouses.map(wh => (
//   <div key={wh._id} ...>
//      ...
//      {/* Dimensions */}
//      ...
//   </div>
// ))

// We can replace the closing `</div>\n            ))` of the map with:
//        {/* Mobile Detail Panel */}
//        <div className="md:hidden">
//          {selected?._id === wh._id && renderDetailPanel()}
//        </div>
//      </div>
//    ))

newContent = newContent.replace(
  /\s*\}\)\}\n\s*<\/div>/, // This matches the end of the map: `))}` then `</div>`
  `\n                <div className="md:hidden mt-2">\n                  {selected?._id === wh._id && renderDetailPanel()}\n                </div>\n              </div>\n            ))\n          )}\n        </div>`
);
// Wait, the map structure is:
//            ) : (
//             warehouses.map(wh => (
//               <div
//                 key={wh._id}
//                 ...
//               >
//                  ...
//               </div>
//             ))
//           )}
//         </div>

// Let's do a precise replacement for the end of the warehouse card:
newContent = newContent.replace(
  /(\s*)<\/div>\n(\s*)\)\)\n(\s*)\)\}\n(\s*)<\/div>/,
  `$1  <div className="md:hidden" style={{ marginTop: 12 }}>\n$1    {selected?._id === wh._id && renderDetailPanel()}\n$1  </div>\n$1</div>\n$2))\n$3)}\n$4</div>`
);

// Also change gridTemplateColumns to ensure it's responsive.
newContent = newContent.replace(
  /gridTemplateColumns:\s*selected \? 'repeat\(auto-fit, minmax\(300px, 1fr\)\)' : '1fr'/,
  "gridTemplateColumns: selected ? 'repeat(auto-fit, minmax(300px, 1fr))' : '1fr'"
);


fs.writeFileSync(path, newContent);
console.log('Successfully refactored Warehouses.jsx');
