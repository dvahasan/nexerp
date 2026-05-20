import { useState, useEffect } from 'react';
import { api } from '../api';
import { useAppContext } from '../context/AppContext';
import Icon from '../components/Icon';

export default function EnterpriseDashboard() {
  const { user, loginWithToken, isAR } = useAppContext();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

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
      // loginWithToken will reload Context with the new company and go to #dash
      await loginWithToken(res.token);
    } catch (e) {
      alert(e.message);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-10 text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-4">
          <Icon name="company" size={32} className="text-white" />
        </div>
        <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
          {isAR ? 'لوحة تحكم المؤسسة' : 'Enterprise Dashboard'}
        </h1>
        <p className="text-slate-500 mt-2">
          {isAR ? `مرحباً بك يا ${user?.name}. اختر شركة للدخول إلى مساحة العمل الخاصة بها.` : `Welcome back, ${user?.name}. Select a company to enter its workspace.`}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {companies.map(c => (
          <button
            key={c._id}
            onClick={() => assumeCompany(c._id)}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 flex flex-col items-start hover:shadow-xl hover:border-blue-500 dark:hover:border-blue-500 transition-all text-left group"
          >
            <div className="flex items-center gap-4 mb-4">
              {c.logo ? (
                 <img src={c.logo} alt="logo" className="w-12 h-12 rounded-xl object-contain bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-black text-xl">
                  {c.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-white leading-tight group-hover:text-blue-500 transition-colors">
                  {c.name}
                </h3>
                <div className="text-xs font-mono text-slate-400 mt-0.5">{c.code}</div>
              </div>
            </div>
            
            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
              {c.description || (isAR ? 'لا يوجد وصف للشركة' : 'No description provided')}
            </p>
            
            <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-700 w-full flex items-center justify-between text-blue-500 font-semibold text-sm">
              <span>{isAR ? 'دخول مساحة العمل' : 'Enter Workspace'}</span>
              <Icon name="back" className="rotate-180 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        ))}

        {companies.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
            <Icon name="company" size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <h3 className="text-lg font-bold text-slate-500">{isAR ? 'لا توجد شركات' : 'No companies found'}</h3>
            <p className="text-sm text-slate-400">{isAR ? 'أنت لا تملك أي شركات حالياً.' : "You don't own any companies yet."}</p>
          </div>
        )}
      </div>
    </div>
  );
}
