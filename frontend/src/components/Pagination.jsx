import { useAppContext } from '../context/AppContext';
import { T } from '../theme';

export default function Pagination({ page, pages, total, limit, onChange, isAR }) {
  const { theme, company } = useAppContext();
  const t = T[theme] || T.light;
  const primary = company?.primaryColor || '#3b82f6';

  if (!pages || pages <= 1) return null;

  const from = Math.min((page - 1) * limit + 1, total);
  const to   = Math.min(page * limit, total);

  // Build number list: always include first, last, and ±1 around current
  const nums = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || (i >= page - 1 && i <= page + 1)) {
      nums.push(i);
    } else if (nums[nums.length - 1] !== '…') {
      nums.push('…');
    }
  }

  const btnBase = {
    minWidth: 30, height: 28, padding: '0 6px', borderRadius: 4,
    fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
    transition: 'background 120ms', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      paddingTop: 12, marginTop: 4, borderTop: `1px solid ${t.border}`,
    }}>
      <span style={{
        fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.06em', color: t.fgSubtle,
      }}>
        {isAR ? `${from}–${to} من ${total}` : `${from}–${to} of ${total}`}
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {/* Prev */}
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          style={{
            ...btnBase,
            backgroundColor: 'transparent',
            color: page === 1 ? t.border : t.fgMuted,
            cursor: page === 1 ? 'not-allowed' : 'pointer',
          }}
          onMouseEnter={e => { if (page !== 1) e.currentTarget.style.backgroundColor = t.sunken; }}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >←</button>

        {nums.map((n, i) =>
          n === '…'
            ? <span key={`e${i}`} style={{ padding: '0 4px', color: t.fgSubtle, fontSize: 12, userSelect: 'none' }}>…</span>
            : <button
                key={n}
                onClick={() => onChange(n)}
                style={{
                  ...btnBase,
                  backgroundColor: n === page ? primary : 'transparent',
                  color: n === page ? '#fff' : t.fgMuted,
                }}
                onMouseEnter={e => { if (n !== page) e.currentTarget.style.backgroundColor = t.sunken; }}
                onMouseLeave={e => { if (n !== page) e.currentTarget.style.backgroundColor = 'transparent'; }}
              >{n}</button>
        )}

        {/* Next */}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === pages}
          style={{
            ...btnBase,
            backgroundColor: 'transparent',
            color: page === pages ? t.border : t.fgMuted,
            cursor: page === pages ? 'not-allowed' : 'pointer',
          }}
          onMouseEnter={e => { if (page !== pages) e.currentTarget.style.backgroundColor = t.sunken; }}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >→</button>
      </div>
    </div>
  );
}
