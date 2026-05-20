import { useAppContext } from '../context/AppContext';
import Icon from './Icon';
import Toast from './Toast';
import { useState, useEffect } from 'react';

export default function Layout({ children }) {
  const { user, company, logout, lang, setLang, theme, setTheme, t, isAR } = useAppContext();

  // Desktop: collapsed = icon-only rail
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('nexerp_sidebar') === 'collapsed';
  });
  // Mobile: drawer open/closed
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('nexerp_sidebar', collapsed ? 'collapsed' : 'expanded');
  }, [collapsed]);

  const toggleLang  = () => setLang(lang === 'en' ? 'ar' : 'en');
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const navSections = [
    {
      title: isAR ? 'عام' : 'Overview',
      items: [
        { id: 'dash',    icon: 'dashboard', label: t.dashboard },
        { id: 'profile', icon: 'company',   label: isAR ? 'ملف الشركة' : 'Company Profile' },
      ]
    },
    {
      title: isAR ? 'المستودع' : 'Warehouse',
      items: [
        { id: 'inv', icon: 'inventory',    label: t.inventory },
        { id: 'tx',  icon: 'transactions', label: t.transactions },
      ]
    }
  ];

  if (user?.perms?.canManageUsers) {
    navSections.push({
      title: isAR ? 'الإدارة' : 'Administration',
      items: [
        { id: 'users',       icon: 'users',    label: t.users },
        { id: 'permissions', icon: 'lock',     label: isAR ? 'الصلاحيات' : 'Permissions' },
        { id: 'settings',    icon: 'settings', label: t.settings },
      ]
    });
  } else {
    navSections.push({
      title: isAR ? 'حسابي' : 'Account',
      items: [
        { id: 'settings',    icon: 'settings', label: t.settings },
      ]
    });
  }

  const primaryColor = company?.primaryColor || '#3b82f6';
  const currentHash  = window.location.hash.replace('#', '') || 'dash';

  const handleNavClick = () => {
    setDrawerOpen(false); // always close mobile drawer on nav
  };

  /* ── Sidebar content (shared between desktop & mobile drawer) ─────────── */
  const SidebarContent = ({ mobile = false }) => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className={`h-16 flex items-center shrink-0 border-b border-slate-100 dark:border-slate-700
        ${collapsed && !mobile ? 'justify-center px-0' : 'justify-between px-4'}`}>
        <div className={`flex items-center gap-3 min-w-0 ${collapsed && !mobile ? '' : ''}`}>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm flex-shrink-0"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Icon name="inventory" size={18} />
          </div>
          {(!collapsed || mobile) && (
            <span className="font-bold text-base text-slate-800 dark:text-white truncate">
              {company?.name || 'NexERP'}
            </span>
          )}
        </div>
        {mobile && (
          <button onClick={() => setDrawerOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white">
            <Icon name="close" size={22} />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
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
                  const active = currentHash === item.id;
                  return (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
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
                      </a>
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
            <button onClick={logout} title={t.logout}
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
            <button onClick={logout}
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
              {navSections.flatMap(s => s.items).find(n => n.id === currentHash)?.label || ''}
            </span>
          </div>

          {/* Right side user info */}
          <div className="flex items-center gap-3">
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
    </div>
  );
}
