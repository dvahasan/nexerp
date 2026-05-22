import { useState, useEffect } from 'react';
import { api } from '../api';
import { useAppContext } from '../context/AppContext';
import Icon from '../components/Icon';
import Skeleton from '../components/Skeleton';
import InfiniteScrollTrigger from '../components/InfiniteScrollTrigger';
import GlobalAnalytics from '../components/GlobalAnalytics';

export default function EnterpriseDashboard() {
  const { user, loginWithToken, isAR, logout, toggleLang } = useAppContext();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState('portfolio');
  const LIMIT = 9;

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getEnterpriseCompanies();
        setCompanies(data);
      } catch (e) {
        console.error("Failed to load enterprise companies", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const assumeCompany = async (companyId) => {
    try {
      const res = await api.assumeEnterpriseCompany(companyId);
      await loginWithToken(res.token);
    } catch (e) {
      alert(e.message);
    }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8" shape="rect" />
            <Skeleton className="h-6 w-48" shape="text" />
          </div>
        </header>
        <main className="flex-1 max-w-6xl w-full mx-auto p-6 lg:p-8 animate-in fade-in duration-500">
          <div className="mb-10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <Skeleton className="h-8 w-48 mb-2" shape="text" />
              <Skeleton className="h-4 w-64" shape="text" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex gap-4">
                    <Skeleton className="w-12 h-12 shrink-0" shape="rect" />
                    <div>
                      <Skeleton className="h-5 w-32 mb-2" shape="text" />
                      <Skeleton className="h-4 w-20" shape="text" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-12 w-full" shape="rect" />
                  <Skeleton className="h-12 w-full" shape="rect" />
                  <Skeleton className="h-12 w-full" shape="rect" />
                  <Skeleton className="h-12 w-full" shape="rect" />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      {/* Top Navbar */}
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Icon name="company" className="text-white" size={18} />
          </div>
          <span className="font-black text-xl tracking-tight text-slate-800 dark:text-white">NexINV Enterprise</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"
          >
            <Icon name="add" size={18} />
            {isAR ? 'إضافة شركة' : 'New Company'}
          </button>
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-2" />
          <button onClick={toggleLang} className="text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors font-bold text-sm">
            {isAR ? 'EN' : 'عربي'}
          </button>
          <button onClick={logout} className="text-slate-500 hover:text-red-500 transition-colors" title={isAR ? 'تسجيل الخروج' : 'Logout'}>
            <Icon name="logout" size={20} />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden h-[calc(100vh-64px)]">
        {/* Sidebar */}
        <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-2 shrink-0 hidden md:flex">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{isAR ? 'القائمة الرئيسية' : 'Main Menu'}</div>
          <button 
            onClick={() => setActiveTab('portfolio')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'portfolio' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white'}`}
          >
            <Icon name="company" size={20} />
            {isAR ? 'المحفظة' : 'Portfolio'}
          </button>
          <button 
            onClick={() => setActiveTab('analytics')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'analytics' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white'}`}
          >
            <Icon name="trending_up" size={20} />
            {isAR ? 'التحليلات الشاملة' : 'Global Analytics'}
          </button>
        </aside>

        <main className="flex-1 overflow-y-auto p-6 lg:p-10 animate-in fade-in duration-500">
          {activeTab === 'portfolio' ? (
            <div className="max-w-6xl mx-auto w-full">
              <div className="mb-10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                    {isAR ? 'مساحات العمل' : 'Workspaces'}
                  </h1>
                  <p className="text-slate-500 mt-2">
                    {isAR ? `مرحباً بك يا ${user?.name}. اختر شركة للدخول.` : `Welcome back, ${user?.name}. Select a company to enter.`}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {companies.slice(0, page * LIMIT).map(c => (
          <button
            key={c._id}
            onClick={() => assumeCompany(c._id)}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 flex flex-col hover:shadow-xl hover:border-blue-500 dark:hover:border-blue-500 transition-all text-left group"
          >
            {/* Header: Logo, Name, Code, Alerts */}
            <div className="flex items-start justify-between w-full mb-3">
              <div className="flex items-center gap-3">
                {c.logo ? (
                   <img src={c.logo} alt="logo" loading="lazy" className="w-10 h-10 rounded-xl object-contain bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-black text-lg">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white leading-tight group-hover:text-blue-500 transition-colors">
                    {c.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-mono text-slate-400">{c.code}</span>
                    {c.industry && <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-md">{c.industry}</span>}
                  </div>
                </div>
              </div>
              {c.stats?.alerts > 0 && (
                <div className="flex items-center gap-1 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 px-2 py-1 rounded-lg text-xs font-bold" title="Inventory Alerts">
                  <Icon name="warning" size={14} />
                  <span>{c.stats.alerts}</span>
                </div>
              )}
            </div>
            
            {/* Description */}
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 h-8">
              {c.description || (isAR ? 'لا يوجد وصف للشركة' : 'No description provided')}
            </p>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-2 mb-4 w-full">
              <div className="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/50">
                <div className="text-[10px] text-slate-400 mb-0.5">{isAR ? 'قيمة المخزون' : 'Stock Value'}</div>
                <div className="font-bold text-slate-700 dark:text-slate-200 text-sm">{c.stats?.stockValue?.toLocaleString()} {c.baseCurrency}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{c.stats?.itemsCount || 0} {isAR ? 'أصناف' : 'Items'}</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/50">
                <div className="text-[10px] text-slate-400 mb-0.5">{isAR ? 'الحركات' : 'Transactions'}</div>
                <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200 text-sm">
                  <span className="text-emerald-500 flex items-center"><Icon name="arrow_up" size={12}/>{c.stats?.txIn || 0}</span>
                  <span className="text-rose-500 flex items-center"><Icon name="arrow_down" size={12}/>{c.stats?.txOut || 0}</span>
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/50">
                <div className="text-[10px] text-slate-400 mb-0.5">{isAR ? 'الموظفين' : 'Employees'}</div>
                <div className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                  {c.stats?.employees || 0}
                </div>
                <div className="text-[10px] text-emerald-500 mt-0.5">{c.stats?.activeMembers || 0} {isAR ? 'نشط' : 'Active'}</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/50 flex flex-col justify-center">
                <div className="text-[10px] text-slate-400 mb-0.5">{isAR ? 'الملفات' : 'Files'}</div>
                <div className="font-bold text-slate-700 dark:text-slate-200 text-sm">{c.stats?.filesCount || 0}</div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-700 w-full flex items-center justify-between text-blue-500 font-semibold text-sm">
              <span>{isAR ? 'دخول مساحة العمل' : 'Enter Workspace'}</span>
              <Icon name="back" className="rotate-180 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        ))}
      </div>
      
      {/* Infinite Scroll */}
      <InfiniteScrollTrigger 
        hasMore={page * LIMIT < companies.length} 
        onVisible={() => setPage(p => p + 1)} 
      />

      {companies.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-900/50">
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Icon name="company" size={36} className="text-blue-500" />
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">{isAR ? 'لا توجد شركات' : 'No companies yet'}</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm mx-auto">{isAR ? 'ابدأ بإضافة أول شركة لك للبدء في إدارتها.' : "Get started by adding your first company to manage."}</p>
              <button 
                onClick={() => setShowModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-2xl text-sm font-bold shadow-lg shadow-blue-500/30 transition-all hover:scale-105"
              >
                {isAR ? '+ إضافة شركة جديدة' : '+ Create New Company'}
              </button>
            </div>
          )}
          </div>
          ) : (
            <GlobalAnalytics companies={companies} isAR={isAR} />
          )}
        </main>
      </div>

      {/* Create Company Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-800 dark:text-white">{isAR ? 'شركة جديدة' : 'New Company'}</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
                <Icon name="close" size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateCompany} className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{isAR ? 'اسم الشركة' : 'Company Name'}</label>
                <input
                  type="text" required autoFocus
                  value={newCompanyName} onChange={e => setNewCompanyName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white transition-colors"
                  placeholder={isAR ? 'أدخل اسم الشركة...' : 'Enter company name...'}
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-colors">
                  {isAR ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" disabled={creating || !newCompanyName.trim()} className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2">
                  {creating && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
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
