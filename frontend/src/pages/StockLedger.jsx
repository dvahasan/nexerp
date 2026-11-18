import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { T } from '../theme';
import { api } from '../api';
import Icon from '../components/Icon';
import InfiniteScrollTrigger from '../components/InfiniteScrollTrigger';

const LIMIT = 25;

// Shared badge palette for ledger entry types
const typeBadge = (type, theme, t) => {
  if (type === 'IN') return {
    backgroundColor: theme === 'dark' ? '#0c1f12' : '#f0fdf4',
    color: '#16774A',
    border: `1px solid ${theme === 'dark' ? '#1a4228' : '#bbf7d0'}`,
    label: '↓ IN',
  };
  if (type === 'OUT') return {
    backgroundColor: theme === 'dark' ? '#2b1818' : '#fef2f2',
    color: t.neg,
    border: `1px solid ${theme === 'dark' ? '#5c1e1e' : '#fca5a5'}`,
    label: '↑ OUT',
  };
  // CANCEL (reversal)
  return {
    backgroundColor: theme === 'dark' ? '#2a2108' : '#fffbeb',
    color: theme === 'dark' ? '#fbbf24' : '#b45309',
    border: `1px solid ${theme === 'dark' ? '#574a16' : '#fde68a'}`,
    label: '⟲ CANCEL',
  };
};

export default function StockLedger() {
  const { isAR, user, items, theme, company, showToast } = useAppContext();
  const t = T[theme] || T.light;
  const primary = company?.primaryColor || '#3b82f6';

  const isAdmin = user?.role === 'owner' || user?.role === 'admin';

  // ── Filters ────────────────────────────────────────────────────────────────
  const [itemF, setItemF] = useState('');
  const [typeF, setTypeF] = useState('all');
  const [fromF, setFromF] = useState('');
  const [toF,   setToF]   = useState('');
  const [page,  setPage]  = useState(1);
  const [focused, setFocused] = useState('');

  const [data,     setData]     = useState({ entries: [], total: 0, pages: 1 });
  const [fetching, setFetching] = useState(true);

  // ── Integrity check (admin/owner only, on demand) ──────────────────────────
  const [integrity,        setIntegrity]        = useState(null); // { checkedItems, consistent, mismatches }
  const [integrityLoading, setIntegrityLoading] = useState(false);
  const [integrityError,   setIntegrityError]   = useState('');

  useEffect(() => { setPage(1); }, [itemF, typeF, fromF, toF]);

  useEffect(() => {
    let cancelled = false;
    setFetching(true);
    const params = { page, limit: LIMIT };
    if (itemF)           params.item = itemF;
    if (typeF !== 'all') params.type = typeF;
    if (fromF)           params.from = fromF;
    if (toF)             params.to   = toF;
    api.getLedger(params)
      .then(res => {
        if (cancelled) return;
        const entries = res?.entries || [];
        const normalized = { entries, total: res?.total || 0, pages: res?.pages || 1 };
        if (page === 1) setData(normalized);
        else setData(prev => ({ ...normalized, entries: [...(prev.entries || []), ...entries] }));
      })
      .catch(() => { if (!cancelled && page === 1) setData({ entries: [], total: 0, pages: 1 }); })
      .finally(() => { if (!cancelled) setFetching(false); });
    return () => { cancelled = true; };
  }, [page, itemF, typeF, fromF, toF]);

  const runIntegrityCheck = () => {
    setIntegrityLoading(true);
    setIntegrityError('');
    api.getLedgerIntegrity()
      .then(res => {
        if (res && Array.isArray(res.mismatches)) setIntegrity(res);
        else setIntegrity({ checkedItems: 0, consistent: true, mismatches: [] });
      })
      .catch(e => { setIntegrity(null); setIntegrityError(e.message || 'Failed'); })
      .finally(() => setIntegrityLoading(false));
  };

  const copyInvoice = (no) => {
    try { navigator.clipboard?.writeText(no); } catch { /* ignore */ }
    showToast?.(isAR ? `تم نسخ رقم الفاتورة ${no}` : `Invoice ${no} copied`, 'success');
  };

  // ── Style helpers ───────────────────────────────────────────────────────────
  const fSelect = (name) => ({
    height: 36, padding: '0 10px', borderRadius: 4,
    border: `1px solid ${focused === name ? primary : t.border}`,
    backgroundColor: t.canvas, color: t.fg,
    fontSize: 13, outline: 'none', cursor: 'pointer',
    fontFamily: 'inherit', boxSizing: 'border-box',
    boxShadow: focused === name ? `0 0 0 1px ${primary}` : 'none',
    transition: 'border-color 120ms, box-shadow 120ms',
  });
  const fDate = (name) => ({
    height: 36, padding: '0 10px', borderRadius: 4,
    border: `1px solid ${focused === name ? primary : t.border}`,
    backgroundColor: t.canvas, color: t.fg,
    fontSize: 13, outline: 'none', fontFamily: 'inherit',
    boxSizing: 'border-box',
    boxShadow: focused === name ? `0 0 0 1px ${primary}` : 'none',
    transition: 'border-color 120ms, box-shadow 120ms',
  });
  const monoLabel = {
    fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.08em', color: t.fgSubtle,
  };
  const th = (align = 'left') => ({
    padding: '10px 14px', textAlign: align,
    fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.08em', color: t.fgSubtle,
    whiteSpace: 'nowrap', borderBottom: `1px solid ${t.border}`,
    backgroundColor: t.sunken, position: 'sticky', top: 0, zIndex: 10,
  });

  const entries = data.entries || [];
  const pos = '#16774A';

  return (
    <div className="animate-in fade-in duration-300" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <span style={{ ...monoLabel, fontSize: 11 }}>
            {isAR ? 'سجل المخزون' : 'Stock Ledger'}
          </span>
          <span style={{ marginInlineStart: 8, fontFamily: 'ui-monospace, monospace', fontSize: 11, color: t.fgSubtle }}>
            ({data.total ?? 0})
          </span>
        </div>
        {isAdmin && (
          <button
            onClick={runIntegrityCheck}
            disabled={integrityLoading}
            style={{
              height: 32, padding: '0 14px', borderRadius: 4,
              backgroundColor: 'transparent', color: t.fgMuted,
              border: `1px solid ${t.border}`, cursor: integrityLoading ? 'wait' : 'pointer',
              fontSize: 13, fontWeight: 500,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              opacity: integrityLoading ? 0.6 : 1, transition: 'background 120ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = t.sunken; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            {integrityLoading
              ? <div style={{ width: 13, height: 13, borderRadius: '50%', border: `2px solid ${t.border}`, borderTopColor: primary, animation: 'spin 600ms linear infinite' }} />
              : <Icon name="check" size={14} />}
            {isAR ? 'فحص تطابق المخزون' : 'Run integrity check'}
          </button>
        )}
      </div>

      {/* ── Integrity report (admin/owner, after Run check) ── */}
      {isAdmin && (integrity || integrityError) && (
        <div style={{ backgroundColor: t.elev, border: `1px solid ${t.border}`, borderRadius: 4, overflow: 'hidden' }}>
          {integrityError ? (
            <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: t.neg }}>
              <Icon name="error" size={14} />
              {isAR ? `تعذر تشغيل الفحص: ${integrityError}` : `Integrity check failed: ${integrityError}`}
            </div>
          ) : integrity.consistent ? (
            <div style={{
              padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8,
              backgroundColor: theme === 'dark' ? '#0c1f12' : '#f0fdf4',
              color: '#16774A', fontSize: 13, fontWeight: 600,
            }}>
              <Icon name="check" size={15} />
              {isAR
                ? `كل الأصناف متطابقة — تم فحص ${integrity.checkedItems} صنف، لا يوجد انحراف.`
                : `All clear — ${integrity.checkedItems} items checked, ledger matches stock everywhere.`}
            </div>
          ) : (
            <>
              <div style={{
                padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8,
                borderBottom: `1px solid ${t.border}`,
                backgroundColor: theme === 'dark' ? '#2b1818' : '#fef2f2',
                color: t.neg, fontSize: 13, fontWeight: 700,
              }}>
                <Icon name="warning" size={15} />
                {isAR
                  ? `${integrity.mismatches.length} صنف غير متطابق من أصل ${integrity.checkedItems}`
                  : `${integrity.mismatches.length} of ${integrity.checkedItems} items have ledger drift`}
              </div>
              <div style={{ overflow: 'auto', maxHeight: 260 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
                  <thead>
                    <tr>
                      <th style={th()}>{isAR ? 'الصنف' : 'Item'}</th>
                      <th style={th()}>SKU</th>
                      <th style={th('right')}>{isAR ? 'الكمية الحالية' : 'Current Qty'}</th>
                      <th style={th('right')}>{isAR ? 'مجموع السجل' : 'Ledger Sum'}</th>
                      <th style={th('right')}>{isAR ? 'الانحراف' : 'Drift'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {integrity.mismatches.map(m => (
                      <tr key={m.itemId} style={{ borderBottom: `1px solid ${t.border}` }}>
                        <td style={{ padding: '8px 14px', fontSize: 13, fontWeight: 600, color: t.fg }}>
                          {isAR ? (m.name || m.nameEn || '—') : (m.nameEn || m.name || '—')}
                        </td>
                        <td style={{ padding: '8px 14px', fontFamily: 'ui-monospace, monospace', fontSize: 11, color: t.fgMuted }}>
                          {m.sku || '—'}
                        </td>
                        <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 12, color: t.fg }} dir="ltr">
                          {m.currentQty}
                        </td>
                        <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 12, color: t.fg }} dir="ltr">
                          {m.ledgerSum}
                        </td>
                        <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 12, fontWeight: 800, color: t.neg }} dir="ltr">
                          {m.drift > 0 ? `+${m.drift}` : m.drift}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Filters ── */}
      <div style={{
        backgroundColor: t.elev, border: `1px solid ${t.border}`,
        borderRadius: 4, padding: '12px 14px',
        display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end',
      }}>
        {/* Item */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 180 }}>
          <label style={{ ...monoLabel, fontSize: 9 }}>{isAR ? 'الصنف' : 'Item'}</label>
          <select value={itemF} onChange={e => setItemF(e.target.value)}
            style={{ ...fSelect('itemF'), width: '100%' }}
            onFocus={() => setFocused('itemF')} onBlur={() => setFocused('')}>
            <option value="">{isAR ? 'جميع الأصناف' : 'All Items'}</option>
            {(items || []).map(i => (
              <option key={i._id} value={i._id}>
                {isAR ? (i.name || i.nameEn) : (i.nameEn || i.name)}{i.sku ? ` (${i.sku})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Type */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <label style={{ ...monoLabel, fontSize: 9 }}>{isAR ? 'النوع' : 'Type'}</label>
          <select value={typeF} onChange={e => setTypeF(e.target.value)}
            style={fSelect('typeF')} onFocus={() => setFocused('typeF')} onBlur={() => setFocused('')}>
            <option value="all">{isAR ? 'جميع الحركات' : 'All Types'}</option>
            <option value="IN">↓ {isAR ? 'وارد' : 'IN'}</option>
            <option value="OUT">↑ {isAR ? 'صادر' : 'OUT'}</option>
            <option value="CANCEL">⟲ {isAR ? 'إلغاء' : 'CANCEL'}</option>
          </select>
        </div>

        {/* From */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <label style={{ ...monoLabel, fontSize: 9 }}>{isAR ? 'من' : 'From'}</label>
          <input type="date" value={fromF} onChange={e => setFromF(e.target.value)}
            style={fDate('fromF')} onFocus={() => setFocused('fromF')} onBlur={() => setFocused('')} />
        </div>

        {/* To */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <label style={{ ...monoLabel, fontSize: 9 }}>{isAR ? 'إلى' : 'To'}</label>
          <input type="date" value={toF} onChange={e => setToF(e.target.value)}
            style={fDate('toF')} onFocus={() => setFocused('toF')} onBlur={() => setFocused('')} />
        </div>
      </div>

      {/* ── Ledger table ── */}
      <div style={{ backgroundColor: t.elev, border: `1px solid ${t.border}`, borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 260px)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr>
                <th style={th('center')}>#</th>
                <th style={th()}>{isAR ? 'التاريخ' : 'Date'}</th>
                <th style={th()}>{isAR ? 'الصنف' : 'Item'}</th>
                <th style={th()}>{isAR ? 'النوع' : 'Type'}</th>
                <th style={th('right')}>{isAR ? 'التغيير' : 'Change'}</th>
                <th style={th('center')}>{isAR ? 'الرصيد' : 'Balance'}</th>
                <th style={th()}>{isAR ? 'المستودع' : 'Warehouse'}</th>
                <th style={th()}>{isAR ? 'المستخدم' : 'User'}</th>
                <th style={th()}>{isAR ? 'الفاتورة' : 'Invoice'}</th>
              </tr>
            </thead>
            <tbody>
              {fetching && page === 1 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '48px 0', textAlign: 'center' }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', margin: '0 auto',
                      border: `2px solid ${t.border}`, borderTopColor: primary,
                      animation: 'spin 600ms linear infinite',
                    }} />
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{
                    padding: '48px 0', textAlign: 'center',
                    fontFamily: 'ui-monospace, monospace', fontSize: 11,
                    textTransform: 'uppercase', letterSpacing: '0.08em', color: t.fgSubtle,
                  }}>
                    {isAR ? 'لا توجد حركات في السجل' : 'No ledger movements found'}
                  </td>
                </tr>
              ) : (
                entries.map((en, idx) => {
                  const badge = typeBadge(en.type, theme, t);
                  const invoiceNo = en.transactionId?.invoiceNo;
                  return (
                    <tr
                      key={en._id || idx}
                      style={{ borderBottom: `1px solid ${t.border}`, transition: 'background 120ms' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = t.sunken}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontFamily: 'ui-monospace, monospace', fontSize: 10, color: t.fgSubtle }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'ui-monospace, monospace', fontSize: 11, color: t.fgMuted, whiteSpace: 'nowrap' }}>
                        {new Date(en.createdAt || en.date).toLocaleDateString(isAR ? 'ar-EG' : 'en-US', {
                          year: 'numeric', month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: t.fg, fontSize: 13 }}>
                        <div>{isAR ? (en.itemId?.name || '—') : (en.itemId?.nameEn || en.itemId?.name || '—')}</div>
                        {en.itemId?.sku && (
                          <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 400, color: t.fgSubtle }}>
                            {en.itemId.sku}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '3px 8px', borderRadius: 3, fontSize: 11, fontWeight: 700,
                          fontFamily: 'ui-monospace, monospace', textTransform: 'uppercase',
                          backgroundColor: badge.backgroundColor, color: badge.color, border: badge.border,
                        }} dir="ltr">
                          {badge.label}
                        </span>
                      </td>
                      <td style={{
                        padding: '10px 14px', textAlign: 'right',
                        fontFamily: 'ui-monospace, monospace', fontSize: 13, fontWeight: 800,
                        color: en.qtyChange > 0 ? pos : en.qtyChange < 0 ? t.neg : t.fgMuted,
                      }} dir="ltr">
                        {en.qtyChange > 0 ? `+${en.qtyChange}` : en.qtyChange}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontFamily: 'ui-monospace, monospace', fontSize: 11, color: t.fgMuted, whiteSpace: 'nowrap' }} dir="ltr">
                        {en.qtyBefore} → <span style={{ color: t.fg, fontWeight: 700 }}>{en.qtyAfter}</span>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 11, color: t.fgMuted, fontFamily: 'ui-monospace, monospace' }}>
                        {en.warehouseId?.name || en.warehouseId?.code || '—'}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 11, color: t.fgMuted, fontFamily: 'ui-monospace, monospace' }}>
                        {en.userId?.name || '—'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {invoiceNo ? (
                          <button
                            onClick={() => copyInvoice(invoiceNo)}
                            title={isAR ? 'انقر للنسخ' : 'Click to copy'}
                            style={{
                              background: 'transparent', border: `1px solid ${t.border}`,
                              borderRadius: 3, padding: '2px 8px', cursor: 'pointer',
                              fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 600,
                              color: primary, transition: 'background 120ms',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = `${primary}14`; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                          >
                            {invoiceNo}
                          </button>
                        ) : (
                          <span style={{ fontSize: 11, color: t.fgSubtle }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <InfiniteScrollTrigger
          hasMore={data.total ? (page * LIMIT < data.total) : false}
          onVisible={() => setPage(p => p + 1)}
        />
      </div>
    </div>
  );
}
