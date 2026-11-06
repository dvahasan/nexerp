import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { T } from '../theme';
import { api } from '../api';
import Icon from '../components/Icon';

export const URGENCY = {
  critical: { color: '#ef4444', rank: 0, en: 'Critical', ar: 'حرج' },
  high:     { color: '#f59e0b', rank: 1, en: 'High',     ar: 'مرتفع' },
  normal:   { color: '#10b981', rank: 2, en: 'Normal',   ar: 'عادي' },
};

export default function ReorderSuggestions() {
  const { isAR, theme, company } = useAppContext();
  const t = T[theme] || T.light;
  const primary  = company?.primaryColor || '#3b82f6';
  const currency = company?.baseCurrency || 'USD';

  const [data,     setData]     = useState({ count: 0, totalEstimatedCost: 0, suggestions: [] });
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.getReorderSuggestions()
      .then(res => {
        if (cancelled) return;
        setData({
          count: res?.count || 0,
          totalEstimatedCost: res?.totalEstimatedCost || 0,
          suggestions: Array.isArray(res?.suggestions) ? res.suggestions : [],
        });
      })
      .catch(() => { if (!cancelled) setData({ count: 0, totalEstimatedCost: 0, suggestions: [] }); })
      .finally(() => { if (!cancelled) setFetching(false); });
    return () => { cancelled = true; };
  }, []);

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
  const panel = { backgroundColor: t.elev, border: `1px solid ${t.border}`, borderRadius: 4 };

  const suggestions = [...(data.suggestions || [])].sort(
    (a, b) => (URGENCY[a.urgency]?.rank ?? 3) - (URGENCY[b.urgency]?.rank ?? 3) || (a.qty - b.qty)
  );

  return (
    <div className="animate-in fade-in duration-300" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <span style={{ ...monoLabel, fontSize: 11 }}>
            {isAR ? 'اقتراحات إعادة الطلب' : 'Reorder Suggestions'}
          </span>
          <span style={{ marginInlineStart: 8, fontFamily: 'ui-monospace, monospace', fontSize: 11, color: t.fgSubtle }}>
            ({data.count})
          </span>
        </div>
        <Link to="/inventory" style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 600, color: primary, textDecoration: 'none' }}>
          {isAR ? 'إلى المخزون ←' : 'Go to inventory →'}
        </Link>
      </div>

      {/* ── Summary strip ── */}
      {!fetching && data.count > 0 && (
        <div style={{ ...panel, padding: '14px 18px', display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center' }}>
          <div>
            <div style={monoLabel}>{isAR ? 'أصناف تحتاج إعادة طلب' : 'Items to reorder'}</div>
            <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 22, fontWeight: 800, color: t.fg, marginTop: 4 }}>
              {data.count}
            </div>
          </div>
          <div>
            <div style={monoLabel}>{isAR ? 'التكلفة التقديرية الإجمالية' : 'Total estimated cost'}</div>
            <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 22, fontWeight: 800, color: primary, marginTop: 4 }} dir="ltr">
              {data.totalEstimatedCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              <span style={{ fontSize: 11, color: t.fgSubtle, marginInlineStart: 4 }}>{currency}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 14, marginInlineStart: 'auto' }}>
            {Object.entries(URGENCY).map(([key, u]) => {
              const n = suggestions.filter(s => s.urgency === key).length;
              return (
                <span key={key} style={{ ...monoLabel, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: u.color, display: 'inline-block' }} />
                  {isAR ? u.ar : u.en} {n}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Table / states ── */}
      <div style={{ ...panel, overflow: 'hidden' }}>
        {fetching ? (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%', margin: '0 auto',
              border: `2px solid ${t.border}`, borderTopColor: primary,
              animation: 'spin 600ms linear infinite',
            }} />
          </div>
        ) : suggestions.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '56px 0', gap: 10 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 8,
              backgroundColor: '#10b98118', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="check" size={24} style={{ color: '#10b981' }} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: t.fg }}>
              {isAR ? 'المخزون في وضع جيد' : 'All stocked up'}
            </div>
            <div style={{ fontSize: 12, color: t.fgSubtle, maxWidth: 360, textAlign: 'center', lineHeight: 1.6 }}>
              {isAR
                ? 'لا توجد أصناف وصلت إلى نقطة إعادة الطلب. تظهر الاقتراحات هنا عند انخفاض الكمية عن نقطة إعادة الطلب المحددة للصنف.'
                : 'No items are at or below their reorder point. Suggestions appear here once an item drops to its configured reorder point.'}
            </div>
          </div>
        ) : (
          <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 320px)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
              <thead>
                <tr>
                  <th style={th('center')}>#</th>
                  <th style={th()}>{isAR ? 'الأولوية' : 'Urgency'}</th>
                  <th style={th()}>{isAR ? 'الصنف' : 'Item'}</th>
                  <th style={th('right')}>{isAR ? 'الكمية' : 'Qty'}</th>
                  <th style={th('right')}>{isAR ? 'نقطة إعادة الطلب' : 'Reorder Point'}</th>
                  <th style={th('right')}>{isAR ? 'الكمية المقترحة' : 'Suggested Qty'}</th>
                  <th style={th('right')}>{isAR ? 'التكلفة التقديرية' : 'Est. Cost'}</th>
                  <th style={th()}>{isAR ? 'المستودع' : 'Warehouse'}</th>
                </tr>
              </thead>
              <tbody>
                {suggestions.map((s, idx) => {
                  const u = URGENCY[s.urgency] || URGENCY.normal;
                  return (
                    <tr
                      key={s.itemId || idx}
                      style={{ borderBottom: `1px solid ${t.border}`, transition: 'background 120ms' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = t.sunken}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontFamily: 'ui-monospace, monospace', fontSize: 10, color: t.fgSubtle }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: u.color, flexShrink: 0 }} />
                          <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, fontWeight: 700, color: u.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {isAR ? u.ar : u.en}
                          </span>
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <Link to={`/item/${s.itemId}`} style={{ textDecoration: 'none' }}>
                          <div style={{ fontWeight: 600, color: t.fg, fontSize: 13 }}>
                            {isAR ? (s.name || s.nameEn || '—') : (s.nameEn || s.name || '—')}
                          </div>
                          {s.sku && (
                            <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, color: t.fgSubtle }}>
                              {s.sku}
                            </div>
                          )}
                        </Link>
                      </td>
                      <td style={{
                        padding: '10px 14px', textAlign: 'right',
                        fontFamily: 'ui-monospace, monospace', fontSize: 13, fontWeight: 800,
                        color: s.qty <= 0 ? t.neg : t.fg,
                      }} dir="ltr">
                        {s.qty}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 12, color: t.fgMuted }} dir="ltr">
                        {s.reorderPoint}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 13, fontWeight: 800, color: primary }} dir="ltr">
                        +{s.suggestedQty}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 12, color: t.fg, whiteSpace: 'nowrap' }} dir="ltr">
                        {(s.estimatedCost || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        <span style={{ fontSize: 9, color: t.fgSubtle, marginInlineStart: 3 }}>{currency}</span>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 11, color: t.fgMuted, fontFamily: 'ui-monospace, monospace' }}>
                        {s.warehouse?.name || s.warehouse?.code || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
