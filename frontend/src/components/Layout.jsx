import { useAppContext } from '../context/AppContext';
import { MdDashboard, MdInventory, MdListAlt, MdPeople, MdSettings, MdMenu, MdClose, MdDarkMode, MdLightMode, MdTranslate } from 'react-icons/md';
import { useState } from 'react';

export default function Layout({ children }) {
  const { user, company, logout, lang, setLang, theme, setTheme, t, isAR } = useAppContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleLang = () => setLang(lang === 'en' ? 'ar' : 'en');
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const navItems = [
    { id: 'dash', icon: MdDashboard, label: t.dashboard },
    { id: 'inv', icon: MdInventory, label: t.inventory },
    { id: 'tx', icon: MdListAlt, label: t.transactions },
  ];
  if (user?.perms?.canManageUsers) navItems.push({ id: 'users', icon: MdPeople, label: "Users" }); // Add to translation
  navItems.push({ id: 'settings', icon: MdSettings, label: t.settings });

  // Inject company primary color
  const primaryColor = company?.primaryColor || '#3b82f6';
  
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300" style={{ '--color-primary': primaryColor }}>
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 ${isAR ? 'right-0' : 'left-0'} z-50 w-64 bg-white dark:bg-slate-800 shadow-2xl transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : isAR ? 'translate-x-full' : '-translate-x-full'} md:translate-x-0 md:static flex flex-col`}>
        <div className="h-16 flex items-center justify-between px-4 border-b dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: 'var(--color-primary)' }}>
              <MdInventory />
            </div>
            <span className="font-bold text-lg text-slate-800 dark:text-white truncate">{company?.name || 'NexERP'}</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white">
            <MdClose size={24} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {navItems.map(item => (
              <li key={item.id}>
                <a href={`#${item.id}`} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white transition-colors">
                  <item.icon size={20} style={{ color: 'var(--color-primary)' }} />
                  <span className="font-medium">{item.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <button onClick={toggleTheme} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
              {theme === 'dark' ? <MdLightMode size={20} /> : <MdDarkMode size={20} />}
            </button>
            <button onClick={toggleLang} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center gap-2">
              <MdTranslate size={20} />
              <span className="text-xs font-bold uppercase">{lang}</span>
            </button>
          </div>
          <button onClick={logout} className="w-full py-2 text-center text-sm font-medium text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors">
            {t.logout}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white dark:bg-slate-800 shadow-sm z-10 flex items-center px-4 justify-between md:justify-end">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white">
            <MdMenu size={24} />
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
    </div>
  );
}
