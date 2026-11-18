const fs = require('fs');

const path = 'd:/Web/nexerp/frontend/src/pages/Warehouses.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add isMobile state
if (!content.includes('const [isMobile')) {
  content = content.replace(
    /const \[loading,\s*setLoading\]\s*=\s*useState\(true\);/,
    `const [loading,       setLoading]       = useState(true);\n  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);\n  useEffect(() => {\n    const handleResize = () => setIsMobile(window.innerWidth < 768);\n    window.addEventListener('resize', handleResize);\n    return () => window.removeEventListener('resize', handleResize);\n  }, []);`
  );
  if (!content.includes('useEffect')) {
     content = content.replace(/import \{ useState, useCallback, useMemo \} from 'react';/, "import { useState, useCallback, useMemo, useEffect } from 'react';");
     content = content.replace(/import \{ useState, useCallback \} from 'react';/, "import { useState, useCallback, useEffect } from 'react';");
  }
}

// 2. Extract Detail Panel
const detailStart = content.indexOf('{/* ── Detail panel ── */}');
if (detailStart !== -1) {
  const detailPanelRegex = /\{\/\* ── Detail panel ── \*\/\}[\s\S]*?(?=\{\/\* ── Modals ── \*\/|\{\/\* ── Modals ── \*\/)/;
  // wait, I need a precise match.
}
