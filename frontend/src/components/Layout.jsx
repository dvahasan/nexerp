import { useAppContext } from '../context/AppContext';
import Icon from './Icon';
import Toast from './Toast';
import AiChat from './AiChat';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { api } from '../api';

export default function Layout({ children }) {
  const { user, company, logout, lang, setLang, theme, setTheme, t, isAR, lastSync, syncing, loginWithToken } = useAppContext();
  const navigate  = useNavigate();
  const { pathname } = useLocation();

  const [aiOpen, setAiOpen] = useState(false);
  const [aiPulsed, setAiPulsed] = useState(() => !localStorage.getItem('nexinv_ai_seen'));

  const openAi = () => {
    setAiOpen(o => !o);
    if (aiPulsed) { setAiPulsed(false); localStorage.setItem('nexinv_ai_seen', '1'); }
  };

  // Listen for open-ai-chat events fired by child pages (e.g. Dashboard)
  useEffect(() => {
    const handler = () => { setAiOpen(true); setAiPulsed(false); localStorage.setItem('nexinv_ai_seen', '1'); };
    window.addEventListener('open-ai-chat', handler);
    return () => window.removeEventListener('open-ai-chat', handler);
  }, []);

  // Desktop: collapsed = icon-only rail
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('nexinv_sidebar') === 'collapsed';
  });
  // Mobile: drawer open/closed
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('nexinv_sidebar', collapsed ? 'collapsed' : 'expanded');
  }, [collapsed]);

  const toggleLang  = () => setLang(lang === 'en' ? 'ar' : 'en');
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const warehouseItems = [
    { path: '/inventory', icon: 'inventory', label: t.inventory },
  ];
  if (user?.perms?.canTx) {
    warehouseItems.push({ path: '/transactions', icon: 'transactions', label: t.transactions });
  }
  warehouseItems.push({ path: '/files', icon: 'copy', label: isAR ? 'الملفات' : 'Files' });

  const navSections = [
    {
      title: isAR ? 'عام' : 'Overview',
      items: [
        { path: '/dashboard', icon: 'dashboard', label: t.dashboard },
      ]
    },
    {
      title: isAR ? 'المستودع' : 'Warehouse',
      items: warehouseItems
    }
  ];

  // Owner always has every privilege — use role as an unconditional shortcut
  const isOwner       = user?.role === 'owner';
  const canManageUsers   = isOwner || user?.perms?.canManageUsers;
  const canManageCompany = isOwner || user?.perms?.canManageCompany;

  // Build administration section dynamically based on permissions
  const adminItems = [];
  if (canManageUsers) {
    adminItems.push({ path: '/users', icon: 'users', label: t.users });
  }
  if (isOwner || user?.perms?.canManagePermissions) {
    adminItems.push({ path: '/permissions', icon: 'lock', label: isAR ? 'الصلاحيات' : 'Permissions' });
  }
  if (canManageCompany) {
    adminItems.push(
      { path: '/profile', icon: 'company', label: isAR ? 'ملف الشركة' : 'Company Profile' },
    );
  }
  adminItems.push(
    { path: '/settings',  icon: 'settings', label: t.settings },
    { path: '/myprofile', icon: 'user',      label: isAR ? 'حسابي' : 'My Profile' },
  );

  navSections.push({
    title: isAR
      ? (canManageUsers || canManageCompany ? 'الإدارة' : 'حسابي')
      : (canManageUsers || canManageCompany ? 'Administration' : 'Account'),
    items: adminItems,
  });

  const primaryColor = company?.primaryColor || '#3b82f6';

  const handleNavClick = () => setDrawerOpen(false);

  /* ── Sidebar content (shared between desktop & mobile drawer) ─────────── */
  const SidebarContent = ({ mobile = false }) => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="h-16 flex items-center justify-center border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
        {(!collapsed || mobile) ? (
          <div className="flex items-center gap-3">
            {company?.logo ? (
              <img src={company.logo} alt="Company Logo" loading="lazy" className="w-8 h-8 rounded-lg object-contain" />
            ) : (
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Icon name="inventory" className="text-white" size={18} />
              </div>
            )}
            <span className="font-bold text-lg tracking-tight text-slate-800 dark:text-white truncate max-w-[140px]">
              {company?.name || 'NexINV'}
            </span>
          </div>
        ) : (
          company?.logo ? (
            <img src={company.logo} alt="Company Logo" loading="lazy" className="w-8 h-8 rounded-lg object-contain" />
          ) : (
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Icon name="inventory" className="text-white" size={18} />
            </div>
          )
        )}
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 slim-scroll">
        <div className={`space-y-6 ${collapsed && !mobile ? 'px-2' : 'px-3'}`}>
          {navSections.map((section, idx) => (
            <div key={idx}>
              {(!collapsed || mobile) && (
                <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 ml-1">
                  {section.title}
                </h3>
              )}
              {collapsed && !mobile && idx > 0 && (
                <div className="w-6 h-px bg-slate-200 dark:bg-slate-700 mx-auto mb-4" />
              )}
              <ul className="space-y-1">
                {section.items.map(item => {
                  const active = pathname === item.path;
                  return (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        onClick={handleNavClick}
                        title={collapsed && !mobile ? item.label : undefined}
                        className={`flex items-center rounded-xl font-medium transition-colors
                          ${collapsed && !mobile ? 'justify-center w-10 h-10 mx-auto' : 'gap-3 px-3 py-2.5'}
                          ${active
                            ? 'text-white shadow-md'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        style={active ? { backgroundColor: 'var(--color-primary)' } : {}}
                      >
                        <Icon
                          name={item.icon}
                          size={20}
                          className={active ? 'text-white' : ''}
                          style={active ? {} : { color: 'var(--color-primary)' }}
                        />
                        {(!collapsed || mobile) && (
                          <span className="text-sm">{item.label}</span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      {/* Bottom controls */}
      <div className={`border-t border-slate-100 dark:border-slate-700 shrink-0
        ${collapsed && !mobile ? 'p-2 flex flex-col items-center gap-2' : 'p-3 space-y-2'}`}>

        {collapsed && !mobile ? (
          /* Icon-only bottom controls */
          <>
            <button onClick={toggleTheme} title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
              className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center">
              <Icon name={theme === 'dark' ? 'light' : 'dark'} size={18} />
            </button>
            <button onClick={toggleLang} title="Toggle language"
              className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center text-[10px] font-black">
              {lang.toUpperCase()}
            </button>
            <button onClick={() => { logout(); navigate('/'); }} title={t.logout}
              className="w-10 h-10 rounded-xl text-red-500 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors flex items-center justify-center">
              <Icon name="logout" size={18} />
            </button>
          </>
        ) : (
          /* Full bottom controls */
          <>
            <div className="flex gap-2">
              <button onClick={toggleTheme}
                className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-2 text-xs font-semibold">
                <Icon name={theme === 'dark' ? 'light' : 'dark'} size={16} />
                {theme === 'dark' ? (isAR ? 'فاتح' : 'Light') : (isAR ? 'داكن' : 'Dark')}
              </button>
              <button onClick={toggleLang}
                className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-2 text-xs font-bold uppercase">
                <Icon name="translate" size={16} />
                {lang === 'en' ? 'AR' : 'EN'}
              </button>
            </div>
            {user?.isEnterprise && (
              <button onClick={async () => {
                try {
                  const res = await api.exitEnterpriseCompany();
                  await loginWithToken(res.token);
                } catch (e) { alert(e.message); }
              }}
                className="w-full py-2 mb-2 text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors flex items-center justify-center gap-2">
                <Icon name="company" size={16} />
                {isAR ? 'مساحات العمل' : 'Workspaces'}
              </button>
            )}
            <button onClick={() => { logout(); navigate('/'); }}
              className="w-full py-2 text-sm font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2">
              <Icon name="logout" size={16} />
              {t.logout}
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div
      className="flex h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300"
      style={{ '--color-primary': primaryColor }}
    >
      {/* ── Desktop Sidebar ───────────────────────────────────────────────── */}
      <aside
        className={`hidden md:flex flex-col flex-shrink-0 bg-white dark:bg-slate-800 border-r border-slate-100 dark:border-slate-700
          transition-[width] duration-300 ease-in-out overflow-hidden
          ${collapsed ? 'w-[60px]' : 'w-60'}`}
      >
        <SidebarContent />
      </aside>

      {/* ── Mobile Drawer ─────────────────────────────────────────────────── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 ${isAR ? 'right-0' : 'left-0'} z-50 w-64 bg-white dark:bg-slate-800
          shadow-2xl transform transition-transform duration-300 ease-in-out md:hidden flex flex-col
          ${drawerOpen ? 'translate-x-0' : isAR ? 'translate-x-full' : '-translate-x-full'}`}
      >
        <SidebarContent mobile />
      </aside>

      {/* ── Main ──────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 z-10 flex items-center px-4 justify-between shrink-0">
          <div className="flex items-center gap-2">
            {/* Desktop: collapse/expand toggle */}
            <button
              onClick={() => setCollapsed(c => !c)}
              className="hidden md:flex p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <Icon name="menu" size={20} />
            </button>
            {/* Mobile: open drawer */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="md:hidden p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <Icon name="menu" size={20} />
            </button>
            {/* Breadcrumb page name */}
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 hidden sm:block">
              {navSections.flatMap(s => s.items).find(n => n.path === pathname)?.label || ''}
            </span>
          </div>

          {/* Right side user info */}
          <div className="flex items-center gap-3">
            {/* Live sync indicator */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
              {syncing ? (
                <div className="w-3.5 h-3.5 border-2 border-slate-300 dark:border-slate-600 border-t-blue-500 rounded-full animate-spin" />
              ) : (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
              )}
              <span className="hidden lg:block">
                {syncing ? (isAR ? 'جارٍ المزامنة...' : 'Syncing...') :
                  lastSync ? (isAR ? 'مباشر' : 'Live') : ''}
              </span>
            </div>
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-slate-800 dark:text-white leading-tight">{user?.name}</div>
              <div className="text-xs text-slate-400 dark:text-slate-500 capitalize">{user?.role}</div>
            </div>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-sm flex-shrink-0"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              {user?.name?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>

      <Toast />

      {/* ── Floating AI button ───────────────────────────────────────────── */}
      <button
        onClick={() => setAiOpen(!aiOpen)}
        title={isAR ? 'مساعد الذكاء الاصطناعي' : 'AI Assistant'}
        className={`fixed bottom-6 ${isAR ? 'left-6' : 'right-6'} z-40 w-14 h-14 rounded-2xl shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95
          ${aiOpen
            ? (theme === 'light' ? 'bg-slate-800 text-slate-300 shadow-none scale-95' : 'bg-slate-200 text-slate-600 shadow-none scale-95')
            : (theme === 'light' ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/30' : 'bg-white text-slate-900 hover:bg-slate-100 shadow-black/10')
          }`}
      >
        <Icon name={aiOpen ? "close" : "ai"} size={24} />
        {/* One-time pulse ring for new users */}
        {aiPulsed && !aiOpen && (
          <span className="absolute inset-0 rounded-2xl animate-ping bg-blue-500/30 pointer-events-none" />
        )}
      </button>

      <AiChat open={aiOpen} onClose={() => setAiOpen(false)} />
    </div>
  );
}
