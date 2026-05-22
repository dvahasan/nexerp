import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import Icon from '../components/Icon';
import Skeleton from '../components/Skeleton';
import LazyScroll from '../components/LazyScroll';

export default function Dashboard() {
  const { stats, loading, t, isAR, lang, company, user } = useAppContext();

  if (loading || !stats) {
    return (
      <div className="flex-1 animate-in fade-in duration-500">
        <div className="mb-8">
          <Skeleton className="h-8 w-48 mb-2" shape="text" />
          <Skeleton className="h-4 w-64" shape="text" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
              <div className="flex justify-between items-start mb-6">
                <Skeleton className="h-4 w-24" shape="text" />
                <Skeleton className="w-12 h-12" shape="rect" />
              </div>
              <Skeleton className="h-8 w-32 mb-2" shape="text" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 h-96">
            <Skeleton className="h-full w-full" shape="rect" />
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 h-96">
            <Skeleton className="h-full w-full" shape="rect" />
          </div>
        </div>
      </div>
    );
  }

  /* ── Greeting ─────────────────────────────────────────────────────────── */
  const hour = new Date().getHours();
  const greeting = isAR
    ? (hour < 12 ? 'صباح الخير' : hour < 18 ? 'مساء الخير' : 'مساء النور')
    : (hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening');

  /* ── Stat cards ────────────────────────────────────────────────────────── */
  const totalValue = (stats.valAgg || stats.totalValue || 0).toLocaleString();
  const currency   = company?.baseCurrency || 'USD';

  const cards = [
    {
      label:   isAR ? 'إجمالي الأصناف' : 'Total Items',
      value:   (stats.totalItems || 0).toLocaleString(),
      icon:    'inventory',
      accent:  'border-blue-500',
      iconBg:  'bg-blue-50 dark:bg-blue-500/10',
      iconCls: 'text-blue-500',
    },
    {
      label:   isAR ? 'قيمة المخزون' : 'Stock Value',
      value:   `${totalValue}`,
      sub:     currency,
      icon:    'money',
      accent:  'border-emerald-500',
      iconBg:  'bg-emerald-50 dark:bg-emerald-500/10',
      iconCls: 'text-emerald-500',
    },
    {
      label:   isAR ? 'مخزون منخفض' : 'Low Stock',
      value:   (stats.lowStock || 0).toLocaleString(),
      icon:    'warning',
      accent:  'border-amber-500',
      iconBg:  'bg-amber-50 dark:bg-amber-500/10',
      iconCls: 'text-amber-500',
      alert:   (stats.lowStock || 0) > 0,
      filter:  'low',
    },
    {
      label:   isAR ? 'نفذت الكمية' : 'Out of Stock',
      value:   (stats.outOfStock || 0).toLocaleString(),
      icon:    'error',
      accent:  'border-red-500',
      iconBg:  'bg-red-50 dark:bg-red-500/10',
      iconCls: 'text-red-500',
      alert:   (stats.outOfStock || 0) > 0,
      filter:  'out',
    },
  ];

  if (user?.perms?.canTx) {
    cards.splice(2, 0, {
      label:   isAR ? 'حركات اليوم' : "Today's Moves",
      value:   (stats.todayTx || 0).toLocaleString(),
      icon:    'swap',
      accent:  'border-violet-500',
      iconBg:  'bg-violet-50 dark:bg-violet-500/10',
      iconCls: 'text-violet-500',
    });
  }

  /* ── Stock health bar ─────────────────────────────────────────────────── */
  const total = stats.totalItems || 1;
  const okPct  = Math.round(((total - (stats.lowStock||0) - (stats.outOfStock||0)) / total) * 100);
  const lowPct = Math.round(((stats.lowStock  || 0) / total) * 100);
  const outPct = 100 - okPct - lowPct;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-slate-400 dark:text-slate-500 mb-0.5">
            {greeting}, <span className="text-slate-600 dark:text-slate-300 font-semibold">{user?.name || user?.username}</span>
          </p>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
            {t.dashboard}
          </h1>
        </div>
        <div className="text-xs font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg">
          {new Date().toLocaleDateString(isAR ? 'ar-EG' : 'en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
        </div>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((c, i) => {
          const Tag = c.filter ? Link : 'div';
          const linkProps = c.filter ? {
            to: '/inventory',
            onClick: () => sessionStorage.setItem('nexinv_inv_filter', c.filter),
          } : {};
          return (
            <Tag
              key={i}
              {...linkProps}
              className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 flex flex-col gap-3 border-l-4 ${c.accent} transition-all
                ${c.filter ? 'hover:shadow-lg hover:-translate-y-0.5 cursor-pointer group' : 'hover:shadow-md'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-tight">
                  {c.label}
                </span>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${c.iconBg} ${c.filter ? 'group-hover:scale-110 transition-transform' : ''}`}>
                  <Icon name={c.icon} size={16} className={c.iconCls} />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-2xl font-black tracking-tight ${c.alert ? c.iconCls : 'text-slate-800 dark:text-white'}`}>
                  {c.value}
                </span>
                {c.sub && (
                  <span className="text-xs font-semibold text-slate-400">{c.sub}</span>
                )}
              </div>
              {c.filter && (
                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 group-hover:text-blue-500 transition-colors flex items-center gap-1">
                  {isAR ? 'عرض الأصناف ←' : 'View items →'}
                </span>
              )}
            </Tag>
          );
        })}
      </div>

      {/* ── Stock health strip ───────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {isAR ? 'صحة المخزون' : 'Stock Health'}
          </span>
          <div className="flex items-center gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />{isAR ? 'متوفر' : 'OK'} {okPct}%</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />{isAR ? 'منخفض' : 'Low'} {lowPct}%</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />{isAR ? 'نفد' : 'Out'} {outPct}%</span>
          </div>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden flex">
          <div className="h-full bg-emerald-500 transition-[width] duration-700" style={{ width: `${okPct}%` }} />
          <div className="h-full bg-amber-400 transition-[width] duration-700" style={{ width: `${lowPct}%` }} />
          <div className="h-full bg-red-500 transition-[width] duration-700" style={{ width: `${outPct}%` }} />
        </div>
      </div>

      {/* ── Bottom grid: Recent Transactions + AI panel ──────────────────── */}
      <LazyScroll className={`grid grid-cols-1 ${user?.perms?.canTx ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-6`} minHeight="400px">

        {/* Recent Transactions */}
        {user?.perms?.canTx && (
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
              {isAR ? 'آخر الحركات' : 'Recent Transactions'}
            </h2>
            <Link to="/transactions" className="text-xs font-semibold text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              {isAR ? 'عرض الكل' : 'View all'} →
            </Link>
          </div>

          {stats.recentTx?.length > 0 ? (
            <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {stats.recentTx.map((tx, i) => (
                <div key={tx._id || i} className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  {/* Type badge */}
                  <span className={`w-14 text-center text-xs font-bold px-2 py-1 rounded-lg flex-shrink-0 ${
                    tx.type === 'IN'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                  }`}>
                    {tx.type === 'IN' ? '↓ IN' : '↑ OUT'}
                  </span>
                  {/* Item name */}
                  <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                    {isAR ? (tx.itemId?.name || '—') : (tx.itemId?.nameEn || tx.itemId?.name || '—')}
                  </span>
                  {/* Qty */}
                  <span className="text-sm font-black text-slate-800 dark:text-white w-10 text-right flex-shrink-0">
                    {tx.qty}
                  </span>
                  {/* Date */}
                  <span className="text-xs text-slate-400 dark:text-slate-500 w-24 text-right flex-shrink-0 hidden sm:block">
                    {new Date(tx.date).toLocaleDateString(isAR ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500">
              <Icon name="swap" size={36} className="mb-3 opacity-30" />
              <p className="text-sm font-medium">{isAR ? 'لا توجد حركات بعد' : 'No transactions yet'}</p>
            </div>
          )}
        </div>
        )}

        {/* Side panel */}
        <div className="flex flex-col gap-4">

          {/* Quick links */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
            <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
              {isAR ? 'روابط سريعة' : 'Quick Links'}
            </h2>
            <div className="space-y-1">
              {[
                { icon: 'inventory',     label: isAR ? 'المخزون'    : 'Inventory',    to: '/inventory', show: true },
                { icon: 'transactions',  label: isAR ? 'الحركات'    : 'Transactions', to: '/transactions', show: user?.perms?.canTx },
                { icon: 'users',         label: isAR ? 'المستخدمون' : 'Users',        to: '/users', show: user?.role === 'owner' || user?.perms?.canManageUsers },
                { icon: 'settings',      label: isAR ? 'الإعدادات'  : 'Settings',     to: '/settings', show: true },
              ].filter(i => i.show).map(item => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white transition-colors group"
                >
                  <Icon name={item.icon} size={17} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* AI panel */}
          <div className="bg-slate-900 dark:bg-slate-950 rounded-2xl border border-slate-700 p-5 text-white flex-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/30">
                <Icon name="ai" size={14} className="text-white" />
              </div>
              <h2 className="text-sm font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                {isAR ? 'مساعد الذكاء الاصطناعي' : 'AI Assistant'}
              </h2>
            </div>
            {/* Live insight based on real stats */}
            <div className="space-y-2 mb-4">
              {(stats.outOfStock || 0) > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 text-xs text-red-300 flex items-start gap-2">
                  <Icon name="error" size={13} className="text-red-400 mt-0.5 flex-shrink-0" />
                  {isAR ? `${stats.outOfStock} صنف نفدت كميته` : `${stats.outOfStock} item${stats.outOfStock > 1 ? 's' : ''} out of stock`}
                </div>
              )}
              {(stats.lowStock || 0) > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 text-xs text-amber-300 flex items-start gap-2">
                  <Icon name="warning" size={13} className="text-amber-400 mt-0.5 flex-shrink-0" />
                  {isAR ? `${stats.lowStock} صنف منخفض المخزون` : `${stats.lowStock} item${stats.lowStock > 1 ? 's' : ''} running low`}
                </div>
              )}
              {(stats.outOfStock || 0) === 0 && (stats.lowStock || 0) === 0 && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2 text-xs text-emerald-300 flex items-start gap-2">
                  <Icon name="check" size={13} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                  {isAR ? 'المخزون في وضع ممتاز' : 'All stock levels are healthy'}
                </div>
              )}
              <p className="text-[11px] text-slate-500 leading-relaxed px-1">
                {isAR
                  ? 'اسأل عن مخزونك، الحركات، أو احصل على توصيات ذكية.'
                  : 'Ask about inventory, transactions, or get smart recommendations.'}
              </p>
            </div>
            <button
              onClick={() => window.dispatchEvent(new Event('open-ai-chat'))}
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl text-xs font-bold transition-all border border-blue-500/50 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
            >
              <Icon name="chat" size={14} className="text-white" />
              {isAR ? 'ابدأ محادثة AI' : 'Chat with AI →'}
            </button>
          </div>

        </div>
      </LazyScroll>
    </div>
  );
}
