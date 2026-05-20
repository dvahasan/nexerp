import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import Icon from '../components/Icon';

export default function UserProfile() {
  const { user, doUpdateProfile, isAR } = useAppContext();

  const [form, setForm] = useState({
    name: user?.name || '',
    username: user?.username || '',
    email: user?.email || '',
    password: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await doUpdateProfile(form);
      setForm(f => ({ ...f, password: '' })); // clear password after save
    } catch {
      // toast is handled in AppContext
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 md:p-8 flex items-center gap-6 border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-3xl shadow-lg flex-shrink-0 relative z-10">
          {user?.name?.charAt(0)?.toUpperCase()}
        </div>
        
        <div className="flex-1 min-w-0 relative z-10">
          <h1 className="text-2xl font-black text-slate-800 dark:text-white truncate">
            {user?.name}
          </h1>
          <div className="text-sm font-mono text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
            <Icon name="user" size={14} /> @{user?.username}
          </div>
          <div className="mt-2 inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-300">
            {user?.role}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 md:p-8">
        <h2 className="text-base font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
          <Icon name="settings" size={18} className="text-blue-500" />
          {isAR ? 'إعدادات الحساب' : 'Account Settings'}
        </h2>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                {isAR ? 'الاسم بالكامل' : 'Full Name'}
              </label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                {isAR ? 'اسم المستخدم' : 'Username'}
              </label>
              <input
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              {isAR ? 'البريد الإلكتروني' : 'Email Address'}
            </label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="admin@company.com"
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              {isAR ? 'كلمة المرور الجديدة' : 'New Password'}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder={isAR ? 'اتركه فارغاً للاحتفاظ بكلمة المرور الحالية' : 'Leave blank to keep current password'}
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
            >
              {saving
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {isAR ? 'جارٍ الحفظ...' : 'Saving...'}</>
                : <><Icon name="save" size={16} /> {isAR ? 'حفظ التغييرات' : 'Save Changes'}</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
