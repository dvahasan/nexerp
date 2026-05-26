import { useState, useEffect } from 'react';
import { api } from '../api';
import { useAppContext } from '../context/AppContext';
import Icon from '../components/Icon';
import Skeleton from '../components/Skeleton';
import InfiniteScrollTrigger from '../components/InfiniteScrollTrigger';
import GlobalAnalytics from '../components/GlobalAnalytics';

// ── Same design tokens as Layout.jsx ─────────────────────────────────────────
const T = {
  light: {
    canvas:    '#FAFAF7',
    elev:      '#FFFFFF',
    sunken:    '#F4F3EE',
    border:    '#E5E4DE',
    fg:        '#0A0A0A',
    fgMuted:   '#525252',
    fgSubtle:  '#9A9A9A',
    neg:       '#B91C1C',
    negTint:   '#FBEAEA',
  },
  dark: {
    canvas:    '#0E0F11',
    elev:      '#16181B',
    sunken:    '#1C1F23',
    border:    '#2A2D32',
    fg:        '#F1F0EB',
    fgMuted:   '#9CA0A6',
    fgSubtle:  '#5E626A',
    neg:       '#F26F6F',
    negTint:   '#2B1818',
  },
};

const NAV = (isAR) => [
  { id: 'portfolio', icon: 'company',      label: isAR ? 'المحفظة'         : 'Portfolio'       },
  { id: 'analytics', icon: 'trending_up',  label: isAR ? 'التحليلات الشاملة' : 'Global Analytics' },
];

function iconBtn(tok) {
  return {
    background: 'transparent', border: 'none', borderRadius: 4,
    cursor: 'pointer', color: tok.fgMuted,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 6, transition: 'background 120ms ease-out',
  };
}

export default function EnterpriseDashboard() {
  const { user, loginWithToken, isAR, logout, lang, setLang, theme, setTheme } = useAppContext();
  const toggleLang = () => setLang(lang === 'en' ? 'ar' : 'en');

  const [companies,      setCompanies]      = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [showModal,      setShowModal]      = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [creating,       setCreating]       = useState(false);
  const [page,           setPage]           = useState(1);
  const [activeTab,      setActiveTab]      = useState('portfolio');
  const [drawerOpen,     setDrawerOpen]     = useState(false);
  const [collapsed,      setCollapsed]      = useState(() => localStorage.getItem('nexinv_enterprise_sidebar') === 'collapsed');
  const [clock,          setClock]          = useState('');
  const LIMIT = 9;

  useEffect(() => {
    localStorage.setItem('nexinv_enterprise_sidebar', collapsed ? 'collapsed' : 'expanded');
  }, [collapsed]);

  const tok = T[theme] || T.light;

  // Clock for status bar
  useEffect(() => {
    const fmt = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setClock(fmt());
    const id = setInterval(() => setClock(fmt()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    api.getEnterpriseCompanies()
      .then(setCompanies)
      .catch(e => console.error('Failed to load enterprise companies', e))
      .finally(() => setLoading(false));
  }, []);

  const assumeCompany = async (companyId) => {
    try {
      const res = await api.assumeEnterpriseCompany(companyId);
      await loginWithToken(res.token);
    } catch (e) { alert(e.message); }
  };

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    if (!newCompanyName.trim()) return;
    setCreating(true);
    try {
      const company = await api.createEnterpriseCompany({ name: newCompanyName });
      setCompanies(prev => [company, ...prev]);
      setShowModal(false);
      setNewCompanyName('');
    } catch (err) {
      alert(err.message || 'Failed to create company');
    } finally {
      setCreating(false);
    }
  };

  // ── Sidebar nav (shared desktop + mobile drawer) ──────────────────────────
  const SidebarContent = ({ mobile = false }) => {
    const wide = !collapsed || mobile;
    return (
      <div className="flex flex-col h-full overflow-hidden">

        {/* Brand */}
        <div className="h-12 flex items-center flex-shrink-0 border-b"
          style={{ borderColor: tok.border, padding: wide ? '0 16px' : '0 14px', gap: wide ? 10 : 0, justifyContent: wide ? 'flex-start' : 'center' }}>
          <div className="w-6 h-6 flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#3b82f6', borderRadius: 4 }}>
            <Icon name="company" size={13} style={{ color: '#fff' }} />
          </div>
          {wide && <span className="text-[13px] font-semibold" style={{ color: tok.fg }}>NexINV</span>}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2">
          {wide && (
            <div className="px-4 pt-2 pb-1">
              <span style={{
                fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.08em', color: tok.fgSubtle,
              }}>
                {isAR ? 'القائمة الرئيسية' : 'Main Menu'}
              </span>
            </div>
          )}
          <ul className="space-y-px mt-1">
            {NAV(isAR).map(item => {
              const active = activeTab === item.id;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => { setActiveTab(item.id); setDrawerOpen(false); }}
                    title={!wide ? item.label : undefined}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center',
                      gap: wide ? 10 : 0,
                      justifyContent: wide ? 'flex-start' : 'center',
                      padding: wide ? '7px 16px' : '8px 0',
                      fontSize: 13, fontWeight: active ? 500 : 400,
                      color: active ? '#3b82f6' : tok.fgMuted,
                      backgroundColor: active ? tok.sunken : 'transparent',
                      borderInlineEnd: active ? '2px solid #3b82f6' : '2px solid transparent',
                      border: 'none', cursor: 'pointer', textAlign: 'start',
                      transition: 'background 120ms ease-out, color 120ms ease-out',
                    }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor = tok.sunken; }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <Icon name={item.icon} size={15} style={{ color: active ? '#3b82f6' : tok.fgSubtle, flexShrink: 0 }} />
                    {wide && <span>{item.label}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom controls */}
        <div className="flex-shrink-0 border-t" style={{ borderColor: tok.border }}>
          {!wide ? (
            /* Collapsed — icon column */
            <div className="flex flex-col items-center gap-1 p-2">
              {[
                { onClick: () => setTheme(theme === 'dark' ? 'light' : 'dark'), icon: theme === 'dark' ? 'light' : 'dark', title: theme === 'dark' ? 'Light' : 'Dark' },
                { onClick: toggleLang, icon: 'translate', title: lang === 'en' ? 'AR' : 'EN' },
                { onClick: logout, icon: 'logout', title: isAR ? 'تسجيل الخروج' : 'Logout', danger: true },
              ].map((btn, i) => (
                <button key={i} onClick={btn.onClick} title={btn.title}
                  style={{
                    width: 34, height: 34, borderRadius: 4,
                    border: `1px solid ${tok.border}`, background: 'transparent',
                    color: btn.danger ? tok.neg : tok.fgMuted,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'background 120ms ease-out',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = btn.danger ? tok.negTint : tok.sunken; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <Icon name={btn.icon} size={14} />
                </button>
              ))}
            </div>
          ) : (
            /* Expanded */
            <div className="p-3 space-y-1.5">
              {/* User row */}
              <div className="flex items-center gap-2.5 px-1 py-1">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-semibold flex-shrink-0"
                  style={{ backgroundColor: '#3b82f6' }}>
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-medium truncate leading-tight" style={{ color: tok.fg }}>{user?.name}</div>
                  <div className="text-[10px] leading-tight" style={{ color: tok.fgSubtle, fontFamily: 'ui-monospace, monospace', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Enterprise
                  </div>
                </div>
              </div>

              {/* Theme + lang */}
              <div className="flex gap-1.5">
                {[
                  { onClick: () => setTheme(theme === 'dark' ? 'light' : 'dark'), icon: theme === 'dark' ? 'light' : 'dark', label: theme === 'dark' ? (isAR ? 'فاتح' : 'Light') : (isAR ? 'داكن' : 'Dark') },
                  { onClick: toggleLang, icon: 'translate', label: lang === 'en' ? 'AR' : 'EN' },
                ].map((btn, i) => (
                  <button key={i} onClick={btn.onClick}
                    style={{
                      flex: 1, height: 28, borderRadius: 4,
                      border: `1px solid ${tok.border}`, background: 'transparent',
                      color: tok.fgMuted, display: 'inline-flex', alignItems: 'center',
                      justifyContent: 'center', gap: 5, cursor: 'pointer',
                      fontSize: 11, fontWeight: 500, transition: 'background 120ms ease-out',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = tok.sunken; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <Icon name={btn.icon} size={12} />
                    {btn.label}
                  </button>
                ))}
              </div>

              {/* Logout */}
              <button onClick={logout}
                style={{
                  width: '100%', height: 28, borderRadius: 4,
                  border: `1px solid ${tok.border}`, background: 'transparent',
                  color: tok.neg, display: 'inline-flex', alignItems: 'center',
                  justifyContent: 'center', gap: 6, cursor: 'pointer',
                  fontSize: 11, fontWeight: 500, transition: 'background 120ms ease-out',
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = tok.negTint; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <Icon name="logout" size={12} />
                {isAR ? 'تسجيل الخروج' : 'Logout'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: tok.canvas }}>
      <div className="h-12 border-b flex items-center px-4 gap-3 flex-shrink-0"
        style={{ backgroundColor: tok.elev, borderColor: tok.border }}>
        <Skeleton className="w-6 h-6" shape="rect" />
        <Skeleton className="h-5 w-32" shape="text" />
      </div>
      <div className="flex flex-1 min-h-0">
        <div className="hidden md:block w-60 border-r flex-shrink-0"
          style={{ backgroundColor: tok.elev, borderColor: tok.border }} />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
              <div><Skeleton className="h-7 w-40 mb-2" shape="text" /><Skeleton className="h-4 w-56" shape="text" /></div>
              <Skeleton className="h-8 w-32" shape="rect" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="p-5 rounded flex flex-col gap-3"
                  style={{ backgroundColor: tok.elev, border: `1px solid ${tok.border}` }}>
                  <div className="flex gap-3 items-center">
                    <Skeleton className="w-10 h-10" shape="rect" />
                    <div><Skeleton className="h-4 w-28 mb-1" shape="text" /><Skeleton className="h-3 w-16" shape="text" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[1,2,3,4].map(j => <Skeleton key={j} className="h-12 w-full" shape="rect" />)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
      <div className="h-6 border-t flex-shrink-0" style={{ backgroundColor: tok.elev, borderColor: tok.border }} />
    </div>
  );

  // ── Main render ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: tok.canvas }}>

      {/* ══ TOP BAR ══════════════════════════════════════════════════════════ */}
      <header className="h-12 flex items-center gap-2 flex-shrink-0 z-10"
        style={{ backgroundColor: tok.elev, borderBottom: `1px solid ${tok.border}`, padding: '0 12px' }}>

        {/* Sidebar toggle — collapses on desktop, opens drawer on mobile */}
        <button
          onClick={() => window.innerWidth >= 768 ? setCollapsed(c => !c) : setDrawerOpen(true)}
          style={iconBtn(tok)}
          title={collapsed ? (isAR ? 'توسيع' : 'Expand') : (isAR ? 'طي' : 'Collapse')}
        >
          <Icon name="menu" size={15} />
        </button>

        {/* Brand mark */}
        <div className="hidden md:flex items-center gap-2">
          <div className="w-6 h-6 flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#3b82f6', borderRadius: 4 }}>
            <Icon name="company" size={13} style={{ color: '#fff' }} />
          </div>
          <span className="text-[13px] font-semibold" style={{ color: tok.fg }}>NexINV</span>
        </div>

        {/* Page title */}
        <span className="text-[13px] font-semibold md:ms-4" style={{ color: tok.fg }}>
          {NAV(isAR).find(n => n.id === activeTab)?.label || ''}
        </span>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* New Company button */}
        <button
          onClick={() => setShowModal(true)}
          className="px-2 sm:px-3"
          style={{
            height: 28, borderRadius: 4,
            backgroundColor: '#3b82f6', color: '#fff',
            border: 'none', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 12, fontWeight: 500,
            transition: 'background 120ms ease-out',
          }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#2563eb'; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#3b82f6'; }}
        >
          <Icon name="add" size={13} />
          <span className="hidden sm:inline">{isAR ? 'شركة جديدة' : 'New Company'}</span>
        </button>

        {/* Theme toggle */}
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} style={iconBtn(tok)} title="Toggle theme">
          <Icon name={theme === 'dark' ? 'light' : 'dark'} size={14} />
        </button>

        {/* Language switcher */}
        <div style={{
          display: 'inline-flex', height: 26, border: `1px solid ${tok.border}`,
          borderRadius: 4, overflow: 'hidden',
          fontFamily: 'ui-monospace, monospace', fontSize: 11,
        }}>
          {['EN', 'AR'].map(L => (
            <button key={L} onClick={() => lang !== L.toLowerCase() && toggleLang()}
              style={{
                padding: '0 10px', display: 'inline-flex', alignItems: 'center',
                cursor: 'pointer', border: 'none',
                backgroundColor: lang === L.toLowerCase() ? '#3b82f6' : 'transparent',
                color:           lang === L.toLowerCase() ? '#fff' : tok.fgSubtle,
                transition: 'background 120ms ease-out, color 120ms ease-out',
              }}>
              {L}
            </button>
          ))}
        </div>

        <span style={{ width: 1, height: 14, backgroundColor: tok.border, margin: '0 4px' }} />

        {/* User */}
        <div className="flex items-center gap-2">
          <span className="hidden sm:block text-[12px] font-medium" style={{ color: tok.fg }}>{user?.name}</span>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-semibold"
            style={{ backgroundColor: '#3b82f6' }}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      {/* ══ MIDDLE ROW ═══════════════════════════════════════════════════════ */}
      <div className="flex flex-1 min-h-0">

        {/* Desktop sidebar */}
        <aside className="hidden md:flex flex-col flex-shrink-0"
          style={{
            width: collapsed ? 56 : 240,
            backgroundColor: tok.elev,
            borderInlineEnd: `1px solid ${tok.border}`,
            transition: 'width 120ms ease-out',
            overflow: 'hidden',
          }}>
          <SidebarContent />
        </aside>

        {/* Mobile drawer backdrop */}
        {drawerOpen && (
          <div
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 40 }}
            onClick={() => setDrawerOpen(false)}
          />
        )}

        {/* Mobile drawer */}
        <aside className="fixed inset-y-0 z-50 flex flex-col md:hidden"
          style={{
            width: 240, backgroundColor: tok.elev,
            borderInlineEnd: `1px solid ${tok.border}`,
            insetInlineStart: 0,
            transform: drawerOpen ? 'translateX(0)' : isAR ? 'translateX(100%)' : 'translateX(-100%)',
            transition: 'transform 120ms ease-out',
          }}>
          <SidebarContent mobile />
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="max-w-6xl mx-auto animate-in fade-in duration-300">

            {activeTab === 'portfolio' ? (

              /* ── Portfolio tab ── */
              <div>
                {/* Page header */}
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight" style={{ color: tok.fg }}>
                      {isAR ? 'مساحات العمل' : 'Workspaces'}
                      <span className="ms-2 text-base font-normal" style={{ color: tok.fgSubtle }}>
                        ({companies.length})
                      </span>
                    </h1>
                    <p className="text-sm mt-0.5" style={{ color: tok.fgMuted }}>
                      {isAR
                        ? `مرحباً يا ${user?.name}. اختر شركة للدخول.`
                        : `Welcome back, ${user?.name}. Select a workspace to enter.`}
                    </p>
                  </div>
                </div>

                {/* Empty state */}
                {companies.length === 0 && (
                  <div className="py-20 text-center rounded" style={{ border: `2px dashed ${tok.border}`, backgroundColor: tok.sunken }}>
                    <div className="w-14 h-14 rounded flex items-center justify-center mx-auto mb-4"
                      style={{ backgroundColor: tok.sunken, border: `1px solid ${tok.border}` }}>
                      <Icon name="company" size={28} style={{ color: tok.fgSubtle }} />
                    </div>
                    <h3 className="text-lg font-bold mb-1" style={{ color: tok.fg }}>
                      {isAR ? 'لا توجد شركات' : 'No companies yet'}
                    </h3>
                    <p className="text-sm mb-6 max-w-xs mx-auto" style={{ color: tok.fgMuted }}>
                      {isAR ? 'ابدأ بإضافة أول شركة لك.' : 'Get started by adding your first company.'}
                    </p>
                    <button onClick={() => setShowModal(true)}
                      style={{
                        height: 32, padding: '0 16px', borderRadius: 4,
                        backgroundColor: '#3b82f6', color: '#fff', border: 'none',
                        cursor: 'pointer', fontSize: 13, fontWeight: 500,
                      }}>
                      {isAR ? '+ شركة جديدة' : '+ New Company'}
                    </button>
                  </div>
                )}

                {/* Company grid */}
                <div className="tour-companies-grid grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {companies.slice(0, page * LIMIT).map(c => (
                    <CompanyCard
                      key={c._id}
                      company={c}
                      isAR={isAR}
                      tok={tok}
                      onEnter={() => assumeCompany(c._id)}
                    />
                  ))}
                </div>

                <InfiniteScrollTrigger
                  hasMore={page * LIMIT < companies.length}
                  onVisible={() => setPage(p => p + 1)}
                />
              </div>

            ) : (
              /* ── Analytics tab ── */
              <GlobalAnalytics companies={companies} isAR={isAR} tok={tok} theme={theme} />
            )}
          </div>
        </main>
      </div>

      {/* ══ STATUS BAR ═══════════════════════════════════════════════════════ */}
      <div className="h-6 flex-shrink-0 flex items-center overflow-hidden"
        style={{
          backgroundColor: tok.elev, borderTop: `1px solid ${tok.border}`,
          padding: '0 14px', gap: 16,
          fontFamily: 'ui-monospace, monospace', fontSize: 10,
          color: tok.fgSubtle, textTransform: 'uppercase', letterSpacing: '0.06em',
          direction: 'ltr',
        }}>
        <span>● ENTERPRISE MODE</span>
        <span>{companies.length} {isAR ? 'WORKSPACES' : 'WORKSPACES'}</span>
        {clock && <span className="hidden sm:inline">{clock}</span>}
        <span style={{ marginInlineStart: 'auto' }}>NexINV v2.0</span>
      </div>

      {/* ══ CREATE COMPANY MODAL ═════════════════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="w-full max-w-sm rounded animate-in zoom-in-95 duration-150"
            style={{ backgroundColor: tok.elev, border: `1px solid ${tok.border}` }}>

            {/* Modal header */}
            <div className="flex items-center justify-between px-4 py-3 border-b"
              style={{ borderColor: tok.border }}>
              <span className="text-[14px] font-semibold" style={{ color: tok.fg }}>
                {isAR ? 'شركة جديدة' : 'New Company'}
              </span>
              <button onClick={() => setShowModal(false)} style={iconBtn(tok)}>
                <Icon name="close" size={14} />
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={handleCreateCompany} className="p-4 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5"
                  style={{ color: tok.fgSubtle, fontFamily: 'ui-monospace, monospace' }}>
                  {isAR ? 'اسم الشركة' : 'Company Name'}
                </label>
                <input
                  type="text" required autoFocus
                  value={newCompanyName}
                  onChange={e => setNewCompanyName(e.target.value)}
                  placeholder={isAR ? 'أدخل اسم الشركة...' : 'Enter company name...'}
                  style={{
                    width: '100%', height: 34,
                    padding: '0 10px', borderRadius: 4,
                    border: `1px solid ${tok.border}`,
                    backgroundColor: tok.canvas,
                    color: tok.fg, fontSize: 13,
                    outline: 'none', fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 1px #3b82f6'; }}
                  onBlur={e => { e.target.style.borderColor = tok.border; e.target.style.boxShadow = 'none'; }}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowModal(false)}
                  style={{
                    flex: 1, height: 32, borderRadius: 4,
                    border: `1px solid ${tok.border}`, background: 'transparent',
                    color: tok.fgMuted, cursor: 'pointer', fontSize: 13, fontWeight: 500,
                    transition: 'background 120ms ease-out',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = tok.sunken; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
                  {isAR ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" disabled={creating || !newCompanyName.trim()}
                  style={{
                    flex: 1, height: 32, borderRadius: 4, border: 'none',
                    backgroundColor: creating || !newCompanyName.trim() ? tok.border : '#3b82f6',
                    color: creating || !newCompanyName.trim() ? tok.fgSubtle : '#fff',
                    cursor: creating || !newCompanyName.trim() ? 'not-allowed' : 'pointer',
                    fontSize: 13, fontWeight: 500,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    transition: 'background 120ms ease-out',
                  }}>
                  {creating && <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 600ms linear infinite' }} />}
                  {isAR ? 'إنشاء' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Company card ─────────────────────────────────────────────────────────────
function CompanyCard({ company: c, isAR, tok, onEnter }) {
  const [hover, setHover] = useState(false);

  return (
    <button
      onClick={onEnter}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: tok.elev,
        border: `1px solid ${hover ? '#3b82f6' : tok.border}`,
        borderRadius: 4,
        padding: 16,
        display: 'flex', flexDirection: 'column', gap: 12,
        cursor: 'pointer', textAlign: 'start', width: '100%',
        transition: 'border-color 120ms ease-out, box-shadow 120ms ease-out',
        boxShadow: hover ? '0 2px 8px rgba(59,130,246,0.12)' : 'none',
      }}
    >
      {/* Header: logo + name + alert */}
      <div className="flex items-start justify-between w-full gap-2">
        <div className="flex items-center gap-3 min-w-0">
          {c.logo ? (
            <img src={c.logo} alt="logo" loading="lazy"
              className="w-9 h-9 object-contain flex-shrink-0"
              style={{ borderRadius: 4, border: `1px solid ${tok.border}`, backgroundColor: tok.canvas }} />
          ) : (
            <div className="w-9 h-9 flex items-center justify-center font-black text-base flex-shrink-0"
              style={{ backgroundColor: hover ? '#eff6ff' : tok.sunken, borderRadius: 4, color: '#3b82f6', border: `1px solid ${tok.border}` }}>
              {c.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-[13px] font-semibold leading-tight truncate"
              style={{ color: hover ? '#3b82f6' : tok.fg, transition: 'color 120ms ease-out' }}>
              {c.name}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: tok.fgSubtle }}>{c.code}</span>
              {c.industry && (
                <span className="text-[10px] px-1.5 py-px rounded"
                  style={{ backgroundColor: tok.sunken, color: tok.fgMuted, border: `1px solid ${tok.border}` }}>
                  {c.industry}
                </span>
              )}
            </div>
          </div>
        </div>
        {c.stats?.alerts > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 rounded flex-shrink-0"
            style={{ backgroundColor: '#FBEAEA', color: '#B91C1C', fontSize: 11, fontWeight: 600, border: '1px solid #f5c6c6' }}>
            <Icon name="warning" size={12} />
            <span>{c.stats.alerts}</span>
          </div>
        )}
      </div>

      {/* Description */}
      {c.description && (
        <p className="text-[12px] line-clamp-1" style={{ color: tok.fgMuted }}>{c.description}</p>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-1.5 w-full">
        {[
          {
            label: isAR ? 'قيمة المخزون' : 'Stock Value',
            value: `${c.stats?.stockValue?.toLocaleString() || 0} ${c.baseCurrency || ''}`,
            sub:   `${c.stats?.itemsCount || 0} ${isAR ? 'أصناف' : 'items'}`,
          },
          {
            label: isAR ? 'الحركات' : 'Transactions',
            value: (
              <span className="flex items-center gap-2">
                <span style={{ color: '#16774A', display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Icon name="arrow_up" size={11} />{c.stats?.txIn || 0}
                </span>
                <span style={{ color: '#B91C1C', display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Icon name="arrow_down" size={11} />{c.stats?.txOut || 0}
                </span>
              </span>
            ),
          },
          {
            label: isAR ? 'الموظفين' : 'Team',
            value: c.stats?.employees || 0,
            sub:   `${c.stats?.activeMembers || 0} ${isAR ? 'نشط' : 'active'}`,
          },
          {
            label: isAR ? 'الملفات' : 'Files',
            value: c.stats?.filesCount || 0,
          },
        ].map((stat, i) => (
          <div key={i} className="p-2.5 rounded"
            style={{ backgroundColor: tok.canvas, border: `1px solid ${tok.border}` }}>
            <div className="text-[10px] mb-1" style={{ color: tok.fgSubtle, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'ui-monospace, monospace' }}>
              {stat.label}
            </div>
            <div className="text-[13px] font-semibold" style={{ color: tok.fg, fontFamily: 'ui-monospace, monospace' }}>
              {stat.value}
            </div>
            {stat.sub && (
              <div className="text-[10px] mt-0.5" style={{ color: tok.fgSubtle }}>{stat.sub}</div>
            )}
          </div>
        ))}
      </div>

      {/* Footer CTA */}
      <div className="flex items-center justify-between pt-2.5 border-t"
        style={{ borderColor: tok.border }}>
        <span className="text-[12px] font-medium" style={{ color: hover ? '#3b82f6' : tok.fgMuted, transition: 'color 120ms ease-out' }}>
          {isAR ? 'دخول مساحة العمل' : 'Enter Workspace'}
        </span>
        <Icon name="back" size={14} className="rotate-180"
          style={{ color: hover ? '#3b82f6' : tok.fgSubtle, transform: `rotate(180deg) translateX(${hover ? '-3px' : '0'})`, transition: 'transform 120ms ease-out, color 120ms ease-out' }} />
      </div>
    </button>
  );
}
