import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import Icon from '../components/Icon';
import Skeleton from '../components/Skeleton';

// ── Same design tokens as Layout.jsx ─────────────────────────────────────────
const T = {
  light: {
    canvas:   '#FAFAF7', elev:     '#FFFFFF', sunken:   '#F4F3EE',
    border:   '#E5E4DE', fg:       '#0A0A0A', fgMuted:  '#525252', fgSubtle: '#9A9A9A',
    neg:      '#B91C1C', negTint:  '#FBEAEA',
  },
  dark: {
    canvas:   '#0E0F11', elev:     '#16181B', sunken:   '#1C1F23',
    border:   '#2A2D32', fg:       '#F1F0EB', fgMuted:  '#9CA0A6', fgSubtle: '#5E626A',
    neg:      '#F26F6F', negTint:  '#2B1818',
  },
};

export default function Dashboard() {
  const { stats, loading, t, isAR, company, user, theme } = useAppContext();

  const tok         = T[theme] || T.light;
  const primaryColor = company?.primaryColor || '#3b82f6';
  const currency     = company?.baseCurrency || 'USD';

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading || !stats) {
    const skCard = {
      backgroundColor: tok.elev,
      border: `1px solid ${tok.border}`,
      borderRadius: 4,
      padding: 20,
    };
    return (
      <div className="animate-in fade-in duration-300 space-y-4">
        <div className="mb-6">
          <Skeleton className="h-6 w-40 mb-2" shape="text" />
          <Skeleton className="h-4 w-56" shape="text" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => (
            <div key={i} style={skCard}>
              <Skeleton className="h-3 w-20 mb-4" shape="text" />
              <Skeleton className="h-7 w-24" shape="text" />
            </div>
          ))}
        </div>
        <div style={{ ...skCard, height: 120 }} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2" style={{ ...skCard, height: 360 }} />
          <div style={{ ...skCard, height: 360 }} />
        </div>
      </div>
    );
  }

  // ── Greeting ────────────────────────────────────────────────────────────────
  const hour = new Date().getHours();
  const greeting = isAR
    ? (hour < 12 ? 'صباح الخير' : hour < 18 ? 'مساء الخير' : 'مساء النور')
    : (hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening');

  // ── Stat cards data ─────────────────────────────────────────────────────────
  const totalValue = (stats.valAgg || stats.totalValue || 0).toLocaleString();

  const cards = [
    {
      label:  isAR ? 'إجمالي الأصناف' : 'Total Items',
      value:  (stats.totalItems || 0).toLocaleString(),
      icon:   'inventory',
      color:  primaryColor,
    },
    {
      label:  isAR ? 'قيمة المخزون' : 'Stock Value',
      value:  totalValue,
      sub:    currency,
      icon:   'money',
      color:  '#10b981',
    },
    {
      label:  isAR ? 'مخزون منخفض' : 'Low Stock',
      value:  (stats.lowStock || 0).toLocaleString(),
      icon:   'warning',
      color:  '#f59e0b',
      alert:  (stats.lowStock || 0) > 0,
      filter: 'low',
    },
    {
      label:  isAR ? 'نفذت الكمية' : 'Out of Stock',
      value:  (stats.outOfStock || 0).toLocaleString(),
      icon:   'error',
      color:  '#ef4444',
      alert:  (stats.outOfStock || 0) > 0,
      filter: 'out',
    },
  ];

  const canTx = user?.role === 'owner' || user?.perms?.canTxIn || user?.perms?.canTxOut;
  if (canTx) {
    cards.splice(2, 0, {
      label:  isAR ? 'حركات اليوم' : "Today's Moves",
      value:  (stats.todayTx || 0).toLocaleString(),
      icon:   'swap',
      color:  '#8b5cf6',
    });
  }

  // ── Stock health ────────────────────────────────────────────────────────────
  const total  = stats.totalItems || 1;
  const okPct  = Math.round(((total - (stats.lowStock||0) - (stats.outOfStock||0)) / total) * 100);
  const lowPct = Math.round(((stats.lowStock  || 0) / total) * 100);
  const outPct = 100 - okPct - lowPct;

  // ── Shared panel style ──────────────────────────────────────────────────────
  const panel = {
    backgroundColor: tok.elev,
    border: `1px solid ${tok.border}`,
    borderRadius: 4,
  };

  const monoLabel = {
    fontFamily: 'ui-monospace, monospace',
    fontSize: 10, fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.08em',
    color: tok.fgSubtle,
  };

  return (
    <div className="space-y-3 animate-in fade-in duration-300">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
        <div>
          <p className="text-[12px] mb-0.5" style={{ color: tok.fgSubtle }}>
            {greeting},{' '}
            <span style={{ color: tok.fgMuted, fontWeight: 600 }}>
              {user?.name || user?.username}
            </span>
          </p>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: tok.fg }}>
            {t.dashboard}
          </h1>
        </div>
        <div style={{
          ...monoLabel,
          padding: '5px 10px',
          border: `1px solid ${tok.border}`,
          borderRadius: 4,
          backgroundColor: tok.sunken,
        }}>
          {new Date().toLocaleDateString(isAR ? 'ar-EG' : 'en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          })}
        </div>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {cards.map((c, i) => {
          const Tag      = c.filter ? Link : 'div';
          const linkProps = c.filter
            ? { to: '/inventory', onClick: () => sessionStorage.setItem('nexinv_inv_filter', c.filter) }
            : {};
          return (
            <Tag
              key={i}
              {...linkProps}
              style={{
                ...panel,
                borderInlineStart: `3px solid ${c.color}`,
                padding: '16px 18px',
                display: 'flex', flexDirection: 'column', gap: 10,
                textDecoration: 'none',
                transition: 'background 120ms ease-out',
                cursor: c.filter ? 'pointer' : 'default',
              }}
              onMouseEnter={e => { if (c.filter) e.currentTarget.style.backgroundColor = tok.sunken; }}
              onMouseLeave={e => { if (c.filter) e.currentTarget.style.backgroundColor = tok.elev; }}
            >
              {/* Label + icon row */}
              <div className="flex items-center justify-between gap-2">
                <span style={monoLabel}>{c.label}</span>
                <div style={{
                  width: 28, height: 28, borderRadius: 4, flexShrink: 0,
                  backgroundColor: `${c.color}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name={c.icon} size={14} style={{ color: c.color }} />
                </div>
              </div>
              {/* Value */}
              <div className="flex items-baseline gap-1.5">
                <span style={{
                  fontFamily: 'ui-monospace, monospace',
                  fontSize: 24, fontWeight: 800, lineHeight: 1,
                  color: c.alert ? c.color : tok.fg,
                }}>
                  {c.value}
                </span>
                {c.sub && (
                  <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, color: tok.fgSubtle }}>
                    {c.sub}
                  </span>
                )}
              </div>
              {/* Link hint */}
              {c.filter && (
                <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, color: tok.fgSubtle }}>
                  {isAR ? 'عرض الأصناف ←' : 'View items →'}
                </span>
              )}
            </Tag>
          );
        })}
      </div>

      {/* ── Stock health strip ──────────────────────────────────────────────── */}
      <div style={{ ...panel, padding: '14px 18px' }}>
        <div className="flex items-center justify-between mb-2.5">
          <span style={{ fontSize: 12, fontWeight: 600, color: tok.fg }}>
            {isAR ? 'صحة المخزون' : 'Stock Health'}
          </span>
          <div className="flex items-center gap-4" style={monoLabel}>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#10b981' }} />
              {isAR ? 'متوفر' : 'OK'} {okPct}%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#f59e0b' }} />
              {isAR ? 'منخفض' : 'Low'} {lowPct}%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#ef4444' }} />
              {isAR ? 'نفد' : 'Out'} {outPct}%
            </span>
          </div>
        </div>
        <div style={{
          width: '100%', height: 4, borderRadius: 2,
          backgroundColor: tok.sunken, overflow: 'hidden',
          display: 'flex',
        }}>
          <div style={{ height: '100%', backgroundColor: '#10b981', width: `${okPct}%`,  transition: 'width 700ms ease-out' }} />
          <div style={{ height: '100%', backgroundColor: '#f59e0b', width: `${lowPct}%`, transition: 'width 700ms ease-out' }} />
          <div style={{ height: '100%', backgroundColor: '#ef4444', width: `${outPct}%`, transition: 'width 700ms ease-out' }} />
        </div>
      </div>

      {/* ── KPI Row ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label:  isAR ? 'معدل الدوران' : 'Inventory Turnover',
            value:  stats.inventoryTurnover != null ? (stats.inventoryTurnover).toFixed(2) : '—',
            sub:    isAR ? 'مرة / سنة' : 'turns/yr',
            color:  primaryColor,
            icon:   'refresh',
            tip:    isAR ? 'كم مرة يتجدد المخزون سنوياً' : 'How many times inventory is sold per year',
          },
          {
            label:  isAR ? 'أيام المخزون (DSI)' : 'Days Sales of Inventory',
            value:  stats.dsi != null ? (stats.dsi).toFixed(0) : '—',
            sub:    isAR ? 'يوم' : 'days',
            color:  '#8b5cf6',
            icon:   'calendar',
            tip:    isAR ? 'عدد الأيام اللازمة لبيع المخزون الحالي' : 'Days to sell current inventory at current pace',
          },
          {
            label:  isAR ? 'معدل النفاد' : 'Stockout Rate',
            value:  stats.stockoutRate != null ? `${stats.stockoutRate}%` : '—',
            color:  stats.stockoutRate > 10 ? '#ef4444' : stats.stockoutRate > 5 ? '#f59e0b' : '#10b981',
            icon:   'error',
            tip:    isAR ? 'نسبة الأصناف التي نفدت (0 في المخزون)' : 'Percentage of items with zero stock',
          },
          {
            label:  isAR ? 'تكلفة المبيعات (30 يوم)' : 'COGS (30 days)',
            value:  stats.cogs30 != null ? stats.cogs30.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '—',
            sub:    currency,
            color:  stats.cogsTrend > 0 ? '#10b981' : stats.cogsTrend < 0 ? '#ef4444' : tok.fgMuted,
            icon:   'money',
            trend:  stats.cogsTrend,
            tip:    isAR ? 'تكلفة البضاعة المباعة خلال 30 يوم الماضية' : 'Cost of goods sold in the last 30 days',
          },
        ].map((kpi, i) => (
          <div key={i} style={{
            ...panel,
            padding: '14px 16px',
            borderTop: `3px solid ${kpi.color}`,
          }} title={kpi.tip}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <span style={monoLabel}>{kpi.label}</span>
              <div style={{ width: 24, height: 24, borderRadius: 4, backgroundColor: `${kpi.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={kpi.icon} size={12} style={{ color: kpi.color }} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 22, fontWeight: 800, color: kpi.color, lineHeight: 1 }}>
                {kpi.value}
              </span>
              {kpi.sub && <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, color: tok.fgSubtle }}>{kpi.sub}</span>}
            </div>
            {kpi.trend != null && kpi.trend !== 0 && (
              <div style={{ marginTop: 4, fontFamily: 'ui-monospace, monospace', fontSize: 10, color: kpi.trend > 0 ? '#10b981' : '#ef4444' }}>
                {kpi.trend > 0 ? '▲' : '▼'} {Math.abs(kpi.trend)}% {isAR ? 'مقارنة بالشهر السابق' : 'vs prev 30d'}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Reorder Alerts ──────────────────────────────────────────────────── */}
      {(stats.reorderAlerts || []).length > 0 && (
        <div style={{ ...panel, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: `1px solid ${tok.border}`, backgroundColor: '#f59e0b08' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="warning" size={14} style={{ color: '#f59e0b' }} />
              <span style={{ ...monoLabel, color: '#92400e' }}>
                {isAR ? 'تنبيهات إعادة الطلب' : 'Reorder Alerts'}
                {' '}({stats.reorderAlerts.length})
              </span>
            </div>
            <Link to="/inventory" style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 600, color: primaryColor, textDecoration: 'none' }}>
              {isAR ? 'عرض الكل ←' : 'View all →'}
            </Link>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '10px 16px' }}>
            {stats.reorderAlerts.map(item => (
              <div key={item._id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 10px', borderRadius: 4,
                backgroundColor: tok.sunken, border: `1px solid ${tok.border}`,
                fontSize: 12,
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: item.qty === 0 ? '#ef4444' : '#f59e0b', flexShrink: 0 }} />
                <span style={{ color: tok.fg, fontWeight: 500 }}>
                  {isAR ? item.name : (item.nameEn || item.name)}
                </span>
                <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, color: tok.fgSubtle }}>
                  {item.qty} / {item.reorderPoint}
                </span>
                {item.reorderQty > 0 && (
                  <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, color: primaryColor, fontWeight: 700 }}>
                    +{item.reorderQty}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Bottom grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

        {/* ── Recent Transactions ── */}
        {canTx && (
          <div style={{ ...panel, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 20px', borderBottom: `1px solid ${tok.border}`,
            }}>
              <span style={monoLabel}>{isAR ? 'آخر الحركات' : 'Recent Transactions'}</span>
              <Link
                to={user?.perms?.canTxIn ? '/stock-in' : '/stock-out'}
                style={{
                  fontFamily: 'ui-monospace, monospace', fontSize: 10,
                  fontWeight: 600, color: primaryColor, textDecoration: 'none',
                }}
              >
                {isAR ? 'عرض الكل ←' : 'View all →'}
              </Link>
            </div>

            {stats.recentTx?.length > 0 ? (
              <div>
                {stats.recentTx.map((tx, i) => (
                  <div
                    key={tx._id || i}
                    className="flex items-center gap-3 px-5 py-3"
                    style={{
                      borderBottom: i < stats.recentTx.length - 1 ? `1px solid ${tok.border}` : 'none',
                      transition: 'background 120ms ease-out',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = tok.sunken; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    {/* Type badge */}
                    <span style={{
                      width: 48, textAlign: 'center', flexShrink: 0,
                      fontSize: 10, fontWeight: 700, padding: '3px 6px', borderRadius: 2,
                      fontFamily: 'ui-monospace, monospace',
                      backgroundColor: tx.type === 'IN' ? '#10b98118' : '#ef444418',
                      color:           tx.type === 'IN' ? '#16774A'   : '#B91C1C',
                      border: `1px solid ${tx.type === 'IN' ? '#10b98140' : '#ef444440'}`,
                    }}>
                      {tx.type === 'IN' ? '↓ IN' : '↑ OUT'}
                    </span>

                    {/* Item name */}
                    <span className="flex-1 truncate" style={{ fontSize: 13, color: tok.fg }}>
                      {isAR ? (tx.itemId?.name || '—') : (tx.itemId?.nameEn || tx.itemId?.name || '—')}
                    </span>

                    {/* Qty */}
                    <span style={{
                      fontFamily: 'ui-monospace, monospace', fontSize: 13,
                      fontWeight: 700, color: tok.fg, flexShrink: 0,
                    }}>
                      ×{tx.qty}
                    </span>

                    {/* Date */}
                    <span className="hidden sm:block flex-shrink-0" style={{
                      fontFamily: 'ui-monospace, monospace', fontSize: 10, color: tok.fgSubtle,
                    }}>
                      {new Date(tx.date).toLocaleDateString(isAR ? 'ar-EG' : 'en-US', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16" style={{ color: tok.fgSubtle }}>
                <Icon name="swap" size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
                <p style={{ fontSize: 13 }}>{isAR ? 'لا توجد حركات بعد' : 'No transactions yet'}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Quick links ── */}
        <div style={{ ...panel, padding: '14px 16px' }}>
            <span style={{ ...monoLabel, display: 'block', marginBottom: 10 }}>
              {isAR ? 'روابط سريعة' : 'Quick Links'}
            </span>
            <div className="space-y-px">
              {[
                { icon: 'inventory',    label: isAR ? 'المخزون'    : 'Inventory',    to: '/inventory',  show: true },
                { icon: 'transactions', label: isAR ? '↓ وارد'     : '↓ Stock In',   to: '/stock-in',   show: user?.role === 'owner' || user?.perms?.canTxIn },
                { icon: 'transactions', label: isAR ? '↑ صادر'     : '↑ Stock Out',  to: '/stock-out',  show: user?.role === 'owner' || user?.perms?.canTxOut },
                { icon: 'users',        label: isAR ? 'المستخدمون' : 'Users',        to: '/users',      show: user?.role === 'owner' || user?.perms?.canManageUsers },
                { icon: 'settings',     label: isAR ? 'الإعدادات'  : 'Settings',     to: '/settings',   show: true },
              ].filter(i => i.show).map(item => (
                <Link
                  key={item.to}
                  to={item.to}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '7px 10px', borderRadius: 4,
                    fontSize: 13, fontWeight: 500,
                    color: tok.fgMuted, textDecoration: 'none',
                    transition: 'background 120ms ease-out, color 120ms ease-out',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = tok.sunken;
                    e.currentTarget.style.color = tok.fg;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = tok.fgMuted;
                  }}
                >
                  <Icon name={item.icon} size={15} style={{ color: tok.fgSubtle, flexShrink: 0 }} />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

        {/* ── AI panel ── */}
        <div style={{
          ...panel,
          padding: '16px 18px',
          borderInlineStart: `3px solid ${primaryColor}`,
        }}>
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
              <div style={{
                width: 28, height: 28, borderRadius: 4, flexShrink: 0,
                background: `linear-gradient(135deg, ${primaryColor}, #6366f1)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="ai" size={14} style={{ color: '#fff' }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: tok.fg }}>
                {isAR ? 'مساعد الذكاء الاصطناعي' : 'AI Assistant'}
              </span>
            </div>

            {/* Live insights */}
            <div className="space-y-2 mb-4">
              {(stats.outOfStock || 0) > 0 && (
                <div style={{
                  padding: '8px 10px', borderRadius: 4, fontSize: 12,
                  backgroundColor: '#ef444414', border: '1px solid #ef444430',
                  color: tok.neg, display: 'flex', alignItems: 'flex-start', gap: 6,
                }}>
                  <Icon name="error" size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                  {isAR
                    ? `${stats.outOfStock} صنف نفدت كميته`
                    : `${stats.outOfStock} item${stats.outOfStock > 1 ? 's' : ''} out of stock`}
                </div>
              )}
              {(stats.lowStock || 0) > 0 && (
                <div style={{
                  padding: '8px 10px', borderRadius: 4, fontSize: 12,
                  backgroundColor: '#f59e0b14', border: '1px solid #f59e0b30',
                  color: '#92400e', display: 'flex', alignItems: 'flex-start', gap: 6,
                }}>
                  <Icon name="warning" size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                  {isAR
                    ? `${stats.lowStock} صنف منخفض المخزون`
                    : `${stats.lowStock} item${stats.lowStock > 1 ? 's' : ''} running low`}
                </div>
              )}
              {(stats.outOfStock || 0) === 0 && (stats.lowStock || 0) === 0 && (
                <div style={{
                  padding: '8px 10px', borderRadius: 4, fontSize: 12,
                  backgroundColor: '#10b98114', border: '1px solid #10b98130',
                  color: '#065f46', display: 'flex', alignItems: 'flex-start', gap: 6,
                }}>
                  <Icon name="check" size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                  {isAR ? 'المخزون في وضع ممتاز' : 'All stock levels are healthy'}
                </div>
              )}
              <p style={{ fontSize: 11, color: tok.fgSubtle, lineHeight: 1.5, marginTop: 4 }}>
                {isAR
                  ? 'اسأل عن مخزونك، الحركات، أو احصل على توصيات ذكية.'
                  : 'Ask about inventory, transactions, or get smart recommendations.'}
              </p>
            </div>

            {/* CTA */}
            <button
              onClick={() => window.dispatchEvent(new Event('open-ai-chat'))}
              style={{
                width: '100%', height: 32, borderRadius: 4, border: 'none',
                background: `linear-gradient(135deg, ${primaryColor}, #6366f1)`,
                color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'opacity 120ms ease-out',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
            >
              <Icon name="chat" size={13} />
              {isAR ? 'ابدأ محادثة AI' : 'Chat with AI →'}
            </button>
          </div>

      </div>
    </div>
  );
}
