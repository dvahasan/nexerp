import { useAppContext } from '../context/AppContext';
import Icon from './Icon';
import Toast from './Toast';
import { useState } from 'react';

export default function Layout({ children }) {
  const { user, company, logout, lang, setLang, theme, setTheme, t, isAR } = useAppContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleLang  = () => setLang(lang === 'en' ? 'ar' : 'en');
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const navItems = [
    { id: 'dash',     icon: 'dashboard',    label: t.dashboard },
    { id: 'inv',      icon: 'inventory',    label: t.inventory },
    { id: 'tx',       icon: 'transactions', label: t.transactions },
  ];
  if (user?.perms?.canManageUsers) navItems.push({ id: 'users', icon: 'users', label: t.users });
  navItems.push({ id: 'settings', icon: 'settings', label: t.settings });

  const primaryColor = company?.primaryColor || '#3b82f6';
  const currentHash  = window.location.hash.replace('#', '') || 'dash';

  return (
    <div
      className="flex h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300"
      style={{ '--color-primary': primaryColor }}
    >
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 ${isAR ? 'right-0' : 'left-0'} z-50 w-64 bg-white dark:bg-slate-800
          shadow-2xl transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : isAR ? 'translate-x-full' : '-translate-x-full'}
          md:translate-x-0 md:static flex flex-col`}
      >
        {/* Brand */}
        <div className="h-16 flex items-center justify-between px-4 border-b dark:border-slate-700 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              <Icon name="inventory" size={18} />
            </div>
            <span className="font-bold text-lg text-slate-800 dark:text-white truncate">
              {company?.name || 'NexERP'}
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white p-1"
          >
            <Icon name="close" size={22} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {navItems.map(item => {
              const active = currentHash === item.id;
              return (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-colors ${
                      active
                        ? 'text-white shadow-md'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    style={active ? { backgroundColor: 'var(--color-primary)' } : {}}
                  >
                    <Icon
                      name={item.icon}
                      size={20}
                      style={active ? {} : { color: 'var(--color-primary)' }}
                    />
                    <span>{item.label}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom controls */}
        <div className="p-4 border-t dark:border-slate-700 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              <Icon name={theme === 'dark' ? 'light' : 'dark'} size={20} />
            </button>
            <button
              onClick={toggleLang}
              title="Toggle language"
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center gap-2"
            >
              <Icon name="translate" size={18} />
              <span className="text-xs font-bold uppercase">{lang}</span>
            </button>
          </div>
          <button
            onClick={logout}
            className="w-full py-2 text-center text-sm font-semibold text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
          >
            <Icon name="logout" size={18} />
            {t.logout}
          </button>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white dark:bg-slate-800 shadow-sm z-10 flex items-center px-4 justify-between md:justify-end shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white rounded-lg"
          >
            <Icon name="menu" size={24} />
          </button>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-slate-800 dark:text-white">{user?.name}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 capitalize">{user?.role}</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 border-2 border-white dark:border-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 shadow-sm">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Toast stack */}
      <Toast />
    </div>
  );
}
