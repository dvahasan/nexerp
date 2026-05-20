import { useState, useEffect } from 'react';
import { useAppContext, CURRENCIES } from '../context/AppContext';
import { ICON_PACKS } from '../components/Icon';
import Icon from '../components/Icon';
import { api } from '../api';

export default function Settings() {
  const { lang, setLang, t, isAR, company, setCompany, user, doUpdateCompany, theme, setTheme } = useAppContext();

  const [localLang,   setLocalLang]   = useState(lang);
  const [companyName, setCompanyName] = useState(company?.name           || '');
  const [companyCode, setCompanyCode] = useState(company?.code           || '');
  const [currency,    setCurrency]    = useState(company?.baseCurrency   || 'USD');
  const [primaryColor,setPrimaryColor]= useState(company?.primaryColor   || '#3b82f6');
  const [iconPack,    setIconPack]    = useState(company?.activeIconPack || 'material');
  const [saving,      setSaving]      = useState(false);
  const [cloudUsage,  setCloudUsage]  = useState(null);

  useEffect(() => {
    if (user?.perms?.canManageUsers) {
      api.getCloudinaryUsage()
         .then(d => setCloudUsage(d))
         .catch(e => console.warn('Cloudinary usage unavailable', e));
    }
  }, [user]);

  // Keep preview color in sync with CSS var
  useEffect(() => {
    document.documentElement.style.setProperty('--color-primary', primaryColor);
  }, [primaryColor]);

  const saveAll = async () => {
    setSaving(true);
    try {
      // Personal: save preferred language
      if (user?._id) {
        await api.updateUser(user._id, { preferredLanguage: localLang });
        setLang(localLang);
      }

      // Company-wide (admin only)
      if (user?.perms?.canManageUsers) {
        await doUpdateCompany({
          name: companyName,
          code: companyCode,
          baseCurrency:   currency,
          primaryColor,
          activeIconPack: iconPack,
          theme,
        });
      }
    } catch {
      // toast shown by context
    } finally {
      setSaving(false);
    }
  };

  const storPct = cloudUsage
    ? Math.min(100, Math.round((cloudUsage.storage?.used || 0) / (cloudUsage.storage?.limit || 1) * 100))
    : 0;

  const inputCls = "w-full bg-white dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm";
  const labelCls = "block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2";

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">{t.settings}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ── Personal Settings ─────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 space-y-5">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Icon name="user" size={20} style={{ color: 'var(--color-primary)' }} />
            {t.personalSettings}
          </h2>

          <div>
            <label className={labelCls}>{t.language}</label>
            <select value={localLang} onChange={e => setLocalLang(e.target.value)} className={inputCls}>
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>{isAR ? 'مظهر الواجهة' : 'Interface Theme'}</label>
            <div className="grid grid-cols-2 gap-2">
              {['light', 'dark'].map(th => (
                <button
                  key={th}
                  type="button"
                  onClick={() => setTheme(th)}
                  className={`py-2.5 rounded-xl text-sm font-semibold capitalize transition-all border-2 flex items-center justify-center gap-2 ${
                    theme === th
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                      : 'border-transparent bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <Icon name={th === 'dark' ? 'dark' : 'light'} size={18} />
                  {th === 'dark' ? (isAR ? 'داكن' : 'Dark') : (isAR ? 'فاتح' : 'Light')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Company Settings (Admin) ──────────────────────────────────── */}
        {user?.perms?.canManageUsers && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 space-y-5">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Icon name="company" size={20} style={{ color: 'var(--color-primary)' }} />
              {t.companySettings}
            </h2>

            <div>
              <label className={labelCls}>{isAR ? 'اسم الشركة' : 'Company Name'}</label>
              <input value={companyName} onChange={e => setCompanyName(e.target.value)} className={inputCls} />
            </div>

            <div>
              <label className={labelCls}>{isAR ? 'رمز الشركة' : 'Company Code'}</label>
              <input
                value={companyCode}
                onChange={e => setCompanyCode(e.target.value.toUpperCase())}
                className={`${inputCls} uppercase font-mono tracking-widest`}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>{t.baseCurrency}</label>
                <select value={currency} onChange={e => setCurrency(e.target.value)} className={inputCls}>
                  {CURRENCIES.map(c => (
                    <option key={c.code} value={c.code}>{c.code} ({c.symbol}) — {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>{t.primaryColor}</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={e => setPrimaryColor(e.target.value)}
                    className="w-12 h-12 rounded-xl cursor-pointer bg-transparent border-0 p-0"
                  />
                  <span className="text-sm font-mono text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 flex-1 text-center">
                    {primaryColor}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Icon Pack Selector (Admin) ────────────────────────────────────── */}
      {user?.perms?.canManageUsers && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-5 flex items-center gap-2">
            <Icon name="theme" size={20} style={{ color: 'var(--color-primary)' }} />
            {t.iconPack}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ICON_PACKS.map(pack => {
              const active = iconPack === pack.key;
              return (
                <button
                  key={pack.key}
                  type="button"
                  onClick={() => setIconPack(pack.key)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    active
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50 dark:bg-slate-900'
                  }`}
                >
                  {/* Icon preview row */}
                  <div className="flex items-center gap-2 mb-3">
                    {['dashboard', 'inventory', 'settings', 'add'].map(name => (
                      <Icon
                        key={name}
                        name={name}
                        size={20}
                        className={active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}
                      />
                    ))}
                  </div>
                  <div className={`text-sm font-bold ${active ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>
                    {pack.label}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{pack.desc}</div>
                  {active && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-semibold">
                      <Icon name="check" size={14} /> {isAR ? 'محدد' : 'Selected'}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Save Button ───────────────────────────────────────────────────── */}
      <div className="flex justify-end">
        <button
          onClick={saveAll}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/30 flex items-center gap-2 disabled:opacity-70"
        >
          {saving
            ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <Icon name="save" size={20} />
          }
          {isAR ? 'حفظ التغييرات' : 'Save Changes'}
        </button>
      </div>

      {/* ── Cloudinary Storage ───────────────────────────────────────────── */}
      {user?.perms?.canManageUsers && cloudUsage && (
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-sm border border-slate-700 p-6 text-white relative overflow-hidden">
          <div className="absolute top-[-50%] right-[-10%] w-[40%] h-[150%] bg-blue-500/10 blur-[60px] rotate-12" />
          <h2 className="text-lg font-bold mb-5 flex items-center gap-2 relative z-10">
            <Icon name="upload" size={22} className="text-blue-400" />
            {t.cloudStorage}
          </h2>
          <div className="space-y-4 relative z-10">
            <div>
              <div className="flex justify-between text-sm mb-2 text-slate-300">
                <span>{isAR ? 'مساحة التخزين' : 'Storage'}</span>
                <span className="font-mono font-bold">{storPct}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-700/50 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    storPct > 80 ? 'bg-red-500' : storPct > 60 ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${storPct}%` }}
                />
              </div>
            </div>
            {cloudUsage.resources && (
              <p className="text-xs text-slate-400">
                {isAR ? 'عدد الملفات:' : 'Files:'} {cloudUsage.resources}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
