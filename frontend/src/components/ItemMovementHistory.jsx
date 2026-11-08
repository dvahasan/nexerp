import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { T } from '../theme';
import { api } from '../api';
import Icon from './Icon';

/**
 * ItemMovementHistory — self-contained collapsible ledger section for one item.
 * Fetches GET /api/ledger/item/:itemId on mount so the integrity chip is
 * visible even while collapsed. Fails soft (empty state) in demo mode or on
 * any API error.
 */
export default function ItemMovementHistory({ itemId }) {
  const { isAR, theme, company } = useAppContext();
  const t = T[theme] || T.light;
  const primary = company?.primaryColor || '#3b82f6';

  const [open,      setOpen]      = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [entries,   setEntries]   = useState([]);
  const [integrity, setIntegrity] = useState(null); // { ledgerSum, currentQty, consistent }

  useEffect(() => {
    if (!itemId) return;
    let cancelled = false;
    setLoading(true);
    api.getItemLedger(itemId)
      .then(res => {
        if (cancelled) return;
        setEntries(Array.isArray(res?.entries) ? res.entries : []);
        setIntegrity(res?.integrity && typeof res.integrity.consistent === 'boolean' ? res.integrity : null);
      })
      .catch(() => { if (!cancelled) { setEntries([]); setIntegrity(null); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [itemId]);

  const pos = '#16774A';
  const badge = (type) => {
    if (type === 'IN') return {
      backgroundColor: theme === 'dark' ? '#0c1f12' : '#f0fdf4', color: pos,
      border: `1px solid ${theme === 'dark' ? '#1a4228' : '#bbf7d0'}`, label: '↓ IN',
    };
    if (type === 'OUT') return {
      backgroundColor: theme === 'dark' ? '#2b1818' : '#fef2f2', color: t.neg,
      border: `1px solid ${theme === 'dark' ? '#5c1e1e' : '#fca5a5'}`, label: '↑ OUT',
    };
    return {
      backgroundColor: theme === 'dark' ? '#2a2108' : '#fffbeb',
      color: theme === 'dark' ? '#fbbf24' : '#b45309',
      border: `1px solid ${theme === 'dark' ? '#574a16' : '#fde68a'}`, label: '⟲ CANCEL',
    };
  };

  const th = (align = 'left') => ({
    padding: '8px 12px', textAlign: align,
    fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.08em', color: t.fgSubtle,
    whiteSpace: 'nowrap', borderBottom: `1px solid ${t.border}`,
    backgroundColor: t.sunken, position: 'sticky', top: 0, zIndex: 5,
  });

  return (
    <div style={{ marginTop: 16, backgroundColor: t.elev, border: `1px solid ${t.border}`, borderRadius: 4, overflow: 'hidden' }}>

      {/* ── Header (always visible) ── */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', background: 'none', border: 'none',
          cursor: 'pointer', textAlign: 'start', transition: 'background 120ms',
        }}
        onMouseEnter={e => { e.currentTarget.style.backgroundColor = t.sunken; }}
        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        <Icon name="table" size={15} style={{ color: t.fgSubtle, flexShrink: 0 }} />
        <span style={{
          fontFamily: 'ui-monospace, monospace', fontSize: 11, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.08em', color: t.fgSubtle,
        }}>
          {isAR ? 'سجل الحركات' : 'Movement History'}
        </span>
        {!loading && (
          <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: t.fgSubtle }}>
            ({entries.length})
          </span>
        )}

        {/* Integrity chip */}
        {!loading && integrity && (
          integrity.consistent ? (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '2px 8px', borderRadius: 3,
              fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.04em',
              backgroundColor: theme === 'dark' ? '#0c1f12' : '#f0fdf4',
              color: pos, border: `1px solid ${theme === 'dark' ? '#1a4228' : '#bbf7d0'}`,
            }}>
              <Icon name="check" size={11} />
              {isAR ? 'متطابق' : 'Consistent'}
            </span>
          ) : (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '2px 8px', borderRadius: 3,
              fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 700,
              backgroundColor: theme === 'dark' ? '#2b1818' : '#fef2f2',
              color: t.neg, border: `1px solid ${theme === 'dark' ? '#5c1e1e' : '#fca5a5'}`,
            }} dir="ltr" title={isAR ? 'مجموع السجل لا يطابق الكمية الحالية' : 'Ledger sum does not match current quantity'}>
              <Icon name="warning" size={11} />
              Σ {integrity.ledgerSum} ≠ {integrity.currentQty}
            </span>
          )
        )}

        <span style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center' }}>
          {loading
            ? <div style={{ width: 13, height: 13, borderRadius: '50%', border: `2px solid ${t.border}`, borderTopColor: primary, animation: 'spin 600ms linear infinite' }} />
            : <Icon name={open ? 'collapse' : 'expand'} size={15} style={{ color: t.fgSubtle }} />}
        </span>
      </button>

      {/* ── Body (collapsible) ── */}
      {open && !loading && (
        entries.length === 0 ? (
          <div style={{
            padding: '28px 0', textAlign: 'center', borderTop: `1px solid ${t.border}`,
            fontFamily: 'ui-monospace, monospace', fontSize: 11,
            textTransform: 'uppercase', letterSpacing: '0.08em', color: t.fgSubtle,
          }}>
            {isAR ? 'لا توجد حركات لهذا الصنف بعد' : 'No movements for this item yet'}
          </div>
        ) : (
          <div style={{ overflow: 'auto', maxHeight: 340, borderTop: `1px solid ${t.border}` }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
              <thead>
                <tr>
                  <th style={th()}>{isAR ? 'التاريخ' : 'Date'}</th>
                  <th style={th()}>{isAR ? 'النوع' : 'Type'}</th>
                  <th style={th('right')}>{isAR ? 'التغيير' : 'Change'}</th>
                  <th style={th('center')}>{isAR ? 'الرصيد' : 'Balance'}</th>
                  <th style={th()}>{isAR ? 'المستودع' : 'Warehouse'}</th>
                  <th style={th()}>{isAR ? 'المستخدم' : 'User'}</th>
                  <th style={th()}>{isAR ? 'الفاتورة' : 'Invoice'}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((en, idx) => {
                  const b = badge(en.type);
                  return (
                    <tr key={en._id || idx} style={{ borderBottom: `1px solid ${t.border}` }}>
                      <td style={{ padding: '8px 12px', fontFamily: 'ui-monospace, monospace', fontSize: 11, color: t.fgMuted, whiteSpace: 'nowrap' }}>
                        {new Date(en.createdAt || en.date).toLocaleDateString(isAR ? 'ar-EG' : 'en-US', {
                          year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{
                          display: 'inline-flex', padding: '2px 7px', borderRadius: 3,
                          fontSize: 10, fontWeight: 700, fontFamily: 'ui-monospace, monospace',
                          backgroundColor: b.backgroundColor, color: b.color, border: b.border,
                        }} dir="ltr">
                          {b.label}
                        </span>
                      </td>
                      <td style={{
                        padding: '8px 12px', textAlign: 'right',
                        fontFamily: 'ui-monospace, monospace', fontSize: 12, fontWeight: 800,
                        color: en.qtyChange > 0 ? pos : en.qtyChange < 0 ? t.neg : t.fgMuted,
                      }} dir="ltr">
                        {en.qtyChange > 0 ? `+${en.qtyChange}` : en.qtyChange}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', fontFamily: 'ui-monospace, monospace', fontSize: 11, color: t.fgMuted, whiteSpace: 'nowrap' }} dir="ltr">
                        {en.qtyBefore} → <span style={{ color: t.fg, fontWeight: 700 }}>{en.qtyAfter}</span>
                      </td>
                      <td style={{ padding: '8px 12px', fontSize: 11, color: t.fgMuted, fontFamily: 'ui-monospace, monospace' }}>
                        {en.warehouseId?.name || en.warehouseId?.code || '—'}
                      </td>
                      <td style={{ padding: '8px 12px', fontSize: 11, color: t.fgMuted, fontFamily: 'ui-monospace, monospace' }}>
                        {en.userId?.name || '—'}
                      </td>
                      <td style={{ padding: '8px 12px', fontFamily: 'ui-monospace, monospace', fontSize: 10, color: primary }}>
                        {en.transactionId?.invoiceNo || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
