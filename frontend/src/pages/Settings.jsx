import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { api } from '../api';
import { MdSave, MdCloudUpload } from 'react-icons/md';

export default function Settings() {
  const { lang, setLang, t, isAR, company, user } = useAppContext();
  const [localLang, setLocalLang] = useState(lang);
  const [currency, setCurrency] = useState(company?.baseCurrency || "USD");
  const [primaryColor, setPrimaryColor] = useState(company?.primaryColor || "#3b82f6");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  
  const [cloudUsage, setCloudUsage] = useState(null);
  
  useEffect(() => {
    if (user?.perms?.canManageUsers) {
      api.getCloudinaryUsage()
         .then(d => setCloudUsage(d))
         .catch(e => console.error("Could not load cloudinary", e));
    }
  }, [user]);

  const saveSettings = async () => {
    setSaving(true);
    setMessage("");
    try {
      // Save language preference for the current user
      await api.updateUser(user._id, { preferredLanguage: localLang });
      setLang(localLang);
      
      // If admin, save company-wide settings
      if (user?.perms?.canManageUsers) {
        await api.updateSettings({ currency, primaryColor });
        // Normally we'd update company context here, but reloading the page or refetching 'me' works too
        window.location.reload();
      } else {
        setMessage(isAR ? "تم حفظ إعداداتك الشخصية" : "Personal settings saved");
      }
    } catch (e) {
      setMessage(e.message || "Error saving settings");
    } finally {
      setSaving(false);
    }
  };

  const storPct = cloudUsage ? Math.min(100, Math.round((cloudUsage.storage?.used || 0) / (cloudUsage.storage?.limit || 1) * 100)) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">{t.settings}</h1>

      {message && (
        <div className="bg-blue-500/10 border border-blue-500/20 text-blue-500 p-4 rounded-xl text-center font-medium">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
            👤 {isAR ? 'الإعدادات الشخصية' : 'Personal Settings'}
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">
                {isAR ? 'لغة الواجهة' : 'Interface Language'}
              </label>
              <select 
                value={localLang} onChange={e => setLocalLang(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="en">English</option>
                <option value="ar">العربية</option>
              </select>
            </div>
          </div>
        </div>

        {user?.perms?.canManageUsers && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
              🏢 {isAR ? 'إعدادات الشركة (تتطلب صلاحيات مدير)' : 'Company Settings (Admin)'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">
                  {isAR ? 'العملة الافتراضية' : 'Base Currency'}
                </label>
                <select 
                  value={currency} onChange={e => setCurrency(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="EGP">EGP (E£)</option>
                  <option value="SAR">SAR (﷼)</option>
                  <option value="AED">AED (د.إ)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">
                  {isAR ? 'اللون الأساسي (Primary Color)' : 'Primary Theme Color'}
                </label>
                <div className="flex items-center gap-4">
                  <input 
                    type="color" 
                    value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                    className="w-12 h-12 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                  />
                  <span className="text-sm font-mono text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-900 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700">{primaryColor}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end mt-8">
        <button 
          onClick={saveSettings} 
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/30 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
             <><MdSave size={20} /> {isAR ? 'حفظ التغييرات' : 'Save Changes'}</>
          )}
        </button>
      </div>

      {user?.perms?.canManageUsers && cloudUsage && (
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-sm border border-slate-700 p-6 text-white mt-10 relative overflow-hidden">
          <div className="absolute top-[-50%] right-[-10%] w-[40%] h-[150%] bg-blue-500/10 blur-[50px] rotate-12"></div>
          
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2 relative z-10">
            <MdCloudUpload className="text-blue-400" size={24} /> 
            {isAR ? 'استهلاك التخزين السحابي' : 'Cloud Storage Usage'}
          </h2>
          
          <div className="space-y-4 relative z-10">
            <div>
              <div className="flex justify-between text-sm mb-2 text-slate-300">
                <span>{isAR ? 'سعة التخزين' : 'Storage Capacity'}</span>
                <span className="font-mono">{storPct}%</span>
              </div>
              <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-1000 ${storPct > 80 ? 'bg-red-500' : storPct > 60 ? 'bg-yellow-500' : 'bg-blue-500'}`} style={{ width: `${storPct}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
