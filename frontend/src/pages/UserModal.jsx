import { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { useAppContext } from '../context/AppContext';

// Owner is never in this list — it cannot be assigned or changed via UI
const ROLES = ['admin', 'manager', 'warehouse', 'viewer'];

const roleDefaults = {
  admin:     { canAdd: true,  canEdit: true,  canDelete: true,  canTx: true,  canManageUsers: true,  canManageCompany: true  },
  manager:   { canAdd: true,  canEdit: true,  canDelete: false, canTx: true,  canManageUsers: false, canManageCompany: false },
  warehouse: { canAdd: false, canEdit: false, canDelete: false, canTx: true,  canManageUsers: false, canManageCompany: false },
  viewer:    { canAdd: false, canEdit: false, canDelete: false, canTx: false, canManageUsers: false, canManageCompany: false },
};

const defaultForm = {
  name: '', username: '', email: '', password: '',
  role: 'warehouse', active: true,
  perms: { ...roleDefaults.warehouse },
};

export default function UserModal({ open, onClose, editUser = null, onSaved }) {
  const { saveUser, t, isAR } = useAppContext();
  const [form,   setForm]   = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editUser) {
      setForm({
        name:     editUser.name     || '',
        username: editUser.username || '',
        email:    editUser.email    || '',
        password: '',
        role:     editUser.role     || 'warehouse',
        active:   editUser.active   ?? true,
        perms:    editUser.permissions || editUser.perms || { ...roleDefaults[editUser.role] || roleDefaults.viewer },
      });
    } else {
      setForm(defaultForm);
    }
  }, [editUser, open]);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const setPerm = (k, v) => setForm(prev => ({ ...prev, perms: { ...prev.perms, [k]: v } }));

  const applyRoleDefaults = (role) => {
    setForm(prev => ({ ...prev, role, perms: { ...roleDefaults[role] } }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { perms, ...rest } = form;
      const payload = { ...rest, permissions: perms }; // backend stores as "permissions", not "perms"
      if (!payload.password) delete payload.password;
      await saveUser(payload, editUser?._id);
      onClose();
      onSaved?.();
    } catch {
      // error toast handled by context
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full bg-white dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-colors";
  const labelCls = "block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide";

  const roleColors = {
    admin:     'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400',
    manager:   'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400',
    warehouse: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400',
    viewer:    'bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-400',
  };

  const permLabels = {
    canAdd:           t.canAdd,
    canEdit:          t.canEdit,
    canDelete:        t.canDelete,
    canTx:            t.canTx,
    canManageUsers:   t.canManageUsers,
    canManageCompany: isAR ? 'ملف الشركة' : 'Company Profile',
  };

  // Owner accounts are fully protected — show a read-only info panel instead of edit form
  if (editUser?.role === 'owner') {
    return (
      <Modal open={open} onClose={onClose} title={isAR ? 'حساب المالك' : 'Owner Account'}>
        <div className="text-center py-6 px-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-5 text-4xl shadow-lg shadow-amber-500/30">
            👑
          </div>
          <h3 className="text-xl font-black text-slate-800 dark:text-white mb-1">{editUser.name}</h3>
          <p className="text-sm font-mono text-slate-400 mb-4">@{editUser.username}</p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl text-sm font-bold mb-6">
            👑 {isAR ? 'مالك الشركة' : 'Company Owner'}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 max-w-xs mx-auto leading-relaxed">
            {isAR
              ? 'هذا الحساب هو مسجّل الشركة ويمتلك جميع الصلاحيات بشكل دائم. لا يمكن تعديله أو حذفه.'
              : 'This account registered the company and permanently holds all permissions. It cannot be edited or deleted.'}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            {isAR ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editUser ? t.editUser : t.addUser}
      wide
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name / Username */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>{isAR ? 'الاسم الكامل' : 'Full Name'} *</label>
            <input required className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>{t.username} *</label>
            <input
              required
              className={`${inputCls} font-mono`}
              value={form.username}
              onChange={e => set('username', e.target.value.toLowerCase().replace(/\s/g, ''))}
            />
          </div>
        </div>

        {/* Email / Password */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>{t.email}</label>
            <input type="email" className={inputCls} value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>
              {t.password} {editUser ? <span className="text-slate-400 font-normal normal-case ml-1">({isAR ? 'اتركه فارغاً للإبقاء' : 'leave blank to keep'})</span> : '*'}
            </label>
            <input
              type="password"
              required={!editUser}
              className={inputCls}
              value={form.password}
              onChange={e => set('password', e.target.value)}
              autoComplete="new-password"
            />
          </div>
        </div>

        {/* Role selector */}
        <div>
          <label className={labelCls}>{t.role}</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {ROLES.map(r => (
              <button
                key={r}
                type="button"
                onClick={() => applyRoleDefaults(r)}
                className={`py-2.5 px-3 rounded-xl text-sm font-bold capitalize transition-colors border-2 ${
                  form.role === r
                    ? `${roleColors[r]} border-current`
                    : 'border-transparent bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Permissions grid */}
        <div>
          <label className={labelCls}>{t.permissions}</label>
          <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(permLabels).map(([key, label]) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={form.perms[key] || false}
                    onChange={e => setPerm(key, e.target.checked)}
                  />
                  <div className={`w-5 h-5 rounded-md border-2 transition-colors flex items-center justify-center ${
                    form.perms[key]
                      ? 'bg-blue-500 border-blue-500'
                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 group-hover:border-blue-400'
                  }`}>
                    {form.perms[key] && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className={`text-sm font-medium ${
                  form.perms[key]
                    ? 'text-slate-800 dark:text-slate-200'
                    : 'text-slate-500 dark:text-slate-400'
                }`}>
                  {label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Active toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <div className="relative">
            <input type="checkbox" className="sr-only" checked={form.active} onChange={e => set('active', e.target.checked)} />
            <div className={`w-10 h-6 rounded-full transition-colors ${form.active ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.active ? 'translate-x-5' : 'translate-x-1'}`} />
            </div>
          </div>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {isAR ? 'حساب نشط' : 'Account Active'}
          </span>
        </label>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
            {t.cancel}
          </button>
          <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors border border-blue-500 flex items-center gap-2 disabled:opacity-70">
            {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {t.save}
          </button>
        </div>
      </form>
    </Modal>
  );
}
