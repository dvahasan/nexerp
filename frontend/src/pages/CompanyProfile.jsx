import { useState, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import Icon from '../components/Icon';

const CURRENCIES = [
  { code: 'USD', symbol: '$',  name: 'US Dollar'       },
  { code: 'EUR', symbol: '€',  name: 'Euro'            },
  { code: 'GBP', symbol: '£',  name: 'British Pound'   },
  { code: 'AED', symbol: 'د.إ',name: 'UAE Dirham'      },
  { code: 'SAR', symbol: '﷼',  name: 'Saudi Riyal'     },
  { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound'  },
  { code: 'KWD', symbol: 'KD', name: 'Kuwaiti Dinar'   },
  { code: 'QAR', symbol: 'QR', name: 'Qatari Riyal'    },
  { code: 'BHD', symbol: 'BD', name: 'Bahraini Dinar'  },
  { code: 'OMR', symbol: 'OMR',name: 'Omani Rial'      },
  { code: 'JOD', symbol: 'JD', name: 'Jordanian Dinar' },
  { code: 'TRY', symbol: '₺',  name: 'Turkish Lira'    },
  { code: 'INR', symbol: '₹',  name: 'Indian Rupee'    },
  { code: 'JPY', symbol: '¥',  name: 'Japanese Yen'    },
];

const INDUSTRIES = [
  'Retail', 'Manufacturing', 'Logistics & Warehousing', 'Healthcare',
  'Food & Beverage', 'Construction', 'Technology', 'Education',
  'Real Estate', 'Automotive', 'Fashion & Apparel', 'Other',
];

const COLOR_PRESETS = [
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899',
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#06b6d4', '#0ea5e9', '#64748b',
];

function StatCard({ icon, label, value, sub, accent = 'blue' }) {
  const colors = {
    blue:    'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    violet:  'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400',
    amber:   'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
  };
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[accent]}`}>
        <Icon name={icon} size={22} />
      </div>
      <div>
        <div className="text-2xl font-black text-slate-800 dark:text-white leading-tight">{value}</div>
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">{label}</div>
        {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

export default function CompanyProfile() {
  const { company, users, items, txs, stats, doUpdateCompany, uploadCompanyLogo, showToast, isAR, user: me } = useAppContext();

  const isAdmin = me?.role === 'admin' || me?.perms?.canManageUsers;

  const [form, setForm] = useState({
    name:           company?.name          || '',
    description:    company?.description   || '',
    industry:       company?.industry      || '',
    baseCurrency:   company?.baseCurrency  || 'USD',
    primaryColor:   company?.primaryColor  || '#3b82f6',
  });
  const [saving, setSaving]   = useState(false);
  const [copied, setCopied]   = useState(false);
  const colorRef = useRef(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      await doUpdateCompany(form);
    } catch { /* toast handled */ }
    finally { setSaving(false); }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(company?.code || '').then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const createdDate = company?.createdAt
    ? new Date(company.createdAt).toLocaleDateString(isAR ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  const activeUsers = users.filter(u => u.active !== false).length;
  const totalValue  = stats?.totalValue || 0;
  const currency    = CURRENCIES.find(c => c.code === company?.baseCurrency) || CURRENCIES[0];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl">

      {/* ── Hero Banner ─────────────────────────────────────────────────────── */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${company?.primaryColor || '#3b82f6'} 0%, ${company?.primaryColor || '#3b82f6'}cc 100%)` }}
      >
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 50%, white 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

        <div className="relative px-8 py-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Company avatar / logo */}
          <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white font-black text-3xl flex-shrink-0 shadow-lg overflow-hidden">
            {company?.logo ? (
              <img src={company.logo} alt="Logo" className="w-full h-full object-contain bg-white" />
            ) : (
              company?.name?.charAt(0)?.toUpperCase() || 'N'
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-black text-white tracking-tight leading-tight">
              {company?.name || 'Your Company'}
            </h1>
            {company?.industry && (
              <p className="text-white/75 text-sm font-medium mt-1">{company.industry}</p>
            )}
            {company?.description && (
              <p className="text-white/65 text-sm mt-2 leading-relaxed max-w-lg">{company.description}</p>
            )}
          </div>

          {/* Company Code pill */}
          <button
            onClick={copyCode}
            title={copied ? 'Copied!' : 'Click to copy'}
            className="flex-shrink-0 bg-white/15 hover:bg-white/25 border border-white/30 rounded-xl px-5 py-3 text-center transition-colors group"
          >
            <div className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1">
              {isAR ? 'رمز الشركة' : 'Company Code'}
            </div>
            <div className="text-2xl font-black text-white font-mono tracking-wider">
              {company?.code || '—'}
            </div>
            <div className="text-[10px] text-white/50 mt-1 flex items-center justify-center gap-1">
              <Icon name="copy" size={10} />
              {copied ? (isAR ? 'تم النسخ!' : 'Copied!') : (isAR ? 'انقر للنسخ' : 'Click to copy')}
            </div>
          </button>
        </div>

        {/* Founded date ribbon */}
        <div className="bg-black/10 px-8 py-2.5 flex items-center gap-2 border-t border-white/10">
          <Icon name="calendar" size={13} className="text-white/60" />
          <span className="text-xs text-white/60 font-medium">
            {isAR ? 'تأسست في' : 'Founded'} {createdDate}
          </span>
          <span className="mx-2 text-white/20">·</span>
          <Icon name="dashboard" size={13} className="text-white/60" />
          <span className="text-xs text-white/60 font-medium">
            NexINV SaaS
          </span>
        </div>
      </div>

      {/* ── Stats Grid ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="users"     label={isAR ? 'الأعضاء النشطون' : 'Active Members'} value={activeUsers}    accent="blue"    />
        <StatCard icon="inventory" label={isAR ? 'أصناف المخزون'   : 'Inventory Items'} value={items.length}  accent="emerald" />
        <StatCard icon="swap"      label={isAR ? 'إجمالي الحركات'  : 'Total Transactions'} value={txs.length} accent="violet"  />
        <StatCard
          icon="trending_up"
          label={isAR ? 'قيمة المخزون' : 'Stock Value'}
          value={`${currency.symbol}${totalValue.toLocaleString()}`}
          accent="amber"
        />
      </div>

      {/* ── Edit Form (Admin only) ───────────────────────────────────────────── */}
      {isAdmin && (
        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-white">
              {isAR ? 'إعدادات الشركة' : 'Company Settings'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAR ? 'هذه الإعدادات تؤثر على كل مستخدمي الشركة' : 'These settings affect all company members'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Company Name */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                {isAR ? 'اسم الشركة' : 'Company Name'}
              </label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                placeholder={isAR ? 'اسم شركتك' : 'Your company name'}
              />
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                {isAR ? 'وصف الشركة' : 'Description'}
              </label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors resize-none"
                placeholder={isAR ? 'وصف مختصر عن نشاط شركتك...' : 'A brief description of your company...'}
              />
            </div>

            {/* Industry */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                {isAR ? 'القطاع' : 'Industry'}
              </label>
              <select
                value={form.industry}
                onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                <option value="">{isAR ? 'اختر القطاع...' : 'Select industry...'}</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>

            {/* Currency */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                {isAR ? 'العملة' : 'Base Currency'}
              </label>
              <select
                value={form.baseCurrency}
                onChange={e => setForm(f => ({ ...f, baseCurrency: e.target.value }))}
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</option>
                ))}
              </select>
            </div>

            {/* Logo Upload */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                {isAR ? 'شعار الشركة' : 'Company Logo'}
              </label>
              <label className="cursor-pointer flex items-center justify-center w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 border-dashed hover:border-blue-500 rounded-xl px-4 py-2.5 text-sm text-slate-600 dark:text-slate-400 transition-colors h-[42px]">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async e => {
                    if (e.target.files?.[0]) {
                      setSaving(true);
                      try {
                        await uploadCompanyLogo(e.target.files[0]);
                      } finally { setSaving(false); }
                    }
                  }}
                />
                <Icon name="upload" size={16} className="mr-2" />
                {isAR ? 'اختر صورة...' : 'Upload new logo...'}
              </label>
            </div>
          </div>

          {/* Brand Color */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              {isAR ? 'لون العلامة التجارية' : 'Brand Color'}
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {COLOR_PRESETS.map(c => (
                <button
                  key={c}
                  onClick={() => setForm(f => ({ ...f, primaryColor: c }))}
                  className={`w-8 h-8 rounded-lg transition-transform hover:scale-110 flex-shrink-0 ${form.primaryColor === c ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-800 ring-slate-400 scale-110' : ''}`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
              {/* Custom color picker */}
              <button
                onClick={() => colorRef.current?.click()}
                className="w-8 h-8 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center hover:border-blue-400 transition-colors flex-shrink-0 overflow-hidden relative"
                title="Custom color"
              >
                <input
                  ref={colorRef}
                  type="color"
                  value={form.primaryColor}
                  onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Icon name="add" size={14} className="text-slate-400 pointer-events-none" />
              </button>
              <div
                className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-600 flex-shrink-0"
                style={{ backgroundColor: form.primaryColor }}
              />
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{form.primaryColor}</span>
            </div>
          </div>

          {/* Save */}
          <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-700">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 border border-blue-500"
            >
              {saving
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {isAR ? 'جارٍ الحفظ...' : 'Saving...'}</>
                : <><Icon name="save" size={16} /> {isAR ? 'حفظ التغييرات' : 'Save Changes'}</>
              }
            </button>
          </div>
        </div>
      )}

      {/* ── Company Info Card (read-only for non-admins) ─────────────────────── */}
      {!isAdmin && (
        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-6">
          <h2 className="text-base font-bold text-slate-800 dark:text-white mb-4">
            {isAR ? 'معلومات الشركة' : 'Company Information'}
          </h2>
          <dl className="space-y-3">
            {[
              { label: isAR ? 'الاسم'    : 'Name',     value: company?.name },
              { label: isAR ? 'القطاع'   : 'Industry', value: company?.industry || '—' },
              { label: isAR ? 'الوصف'    : 'About',    value: company?.description || '—' },
              { label: isAR ? 'العملة'   : 'Currency', value: `${currency.symbol} ${currency.code} — ${currency.name}` },
              { label: isAR ? 'تأسست في' : 'Founded',  value: createdDate },
            ].map(row => (
              <div key={row.label} className="flex items-start gap-3">
                <dt className="text-xs font-bold text-slate-400 uppercase tracking-wider w-24 flex-shrink-0 pt-0.5">{row.label}</dt>
                <dd className="text-sm text-slate-700 dark:text-slate-300 flex-1">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {/* ── Members summary ──────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-6">
        <h2 className="text-base font-bold text-slate-800 dark:text-white mb-4">
          {isAR ? 'فريق العمل' : 'Team Members'}
        </h2>
        <div className="space-y-3">
          {users.slice(0, 8).map((u, i) => {
            const GRADIENTS = ['from-blue-500 to-indigo-600', 'from-violet-500 to-purple-600', 'from-emerald-500 to-teal-600', 'from-rose-500 to-pink-600', 'from-amber-500 to-orange-600', 'from-cyan-500 to-sky-600'];
            return (
              <div key={u._id} className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-800 dark:text-white truncate">{u.name}</div>
                  <div className="text-xs text-slate-400 font-mono">@{u.username}</div>
                </div>
                <span className="text-[10px] font-bold capitalize px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 flex-shrink-0">
                  {u.role}
                </span>
              </div>
            );
          })}
          {users.length > 8 && (
            <p className="text-xs text-slate-400 text-center pt-1">
              +{users.length - 8} {isAR ? 'مستخدم آخر' : 'more members'}
            </p>
          )}
        </div>
      </div>

    </div>
  );
}
