import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import Icon from '../components/Icon';

const MODULES = [
  { key: 'canAdd',         icon: 'add',         labelEN: 'Add Items',    labelAR: 'إضافة أصناف',     desc: 'Create new inventory items' },
  { key: 'canEdit',        icon: 'edit',         labelEN: 'Edit Items',   labelAR: 'تعديل الأصناف',   desc: 'Modify existing items'       },
  { key: 'canDelete',      icon: 'delete',       labelEN: 'Delete',       labelAR: 'الحذف',           desc: 'Delete items & records'      },
  { key: 'canTx',          icon: 'swap',         labelEN: 'Transactions', labelAR: 'الحركات',          desc: 'Record stock movements'      },
  { key: 'canManageUsers', icon: 'users',        labelEN: 'Manage Users', labelAR: 'إدارة المستخدمين', desc: 'Add, edit, delete users'     },
];

const ROLE_BADGE = {
  admin:     'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400',
  manager:   'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400',
  warehouse: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
  viewer:    'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400',
};

export default function Permissions() {
  const { users, saveUser, showToast, t, isAR, user: me, loading } = useAppContext();

  // local copy of permissions so we can batch-save
  const [perms, setPerms]   = useState(() => {
    const map = {};
    users.forEach(u => { map[u._id] = { ...(u.permissions || {}) }; });
    return map;
  });
  const [saving, setSaving] = useState({});
  const [search, setSearch] = useState('');

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="w-8 h-8 border-4 border-slate-200 dark:border-slate-700 border-t-blue-500 rounded-full animate-spin" />
    </div>
  );

  const filtered = users.filter(u =>
    !search ||
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (uid, key) => {
    setPerms(prev => ({
      ...prev,
      [uid]: { ...prev[uid], [key]: !prev[uid]?.[key] },
    }));
  };

  const saveRow = async (u) => {
    setSaving(s => ({ ...s, [u._id]: true }));
    try {
      await saveUser({ permissions: perms[u._id] }, u._id);
      showToast(isAR ? `تم حفظ صلاحيات ${u.name}` : `Permissions saved for ${u.name}`);
    } catch { /* toast shown by context */ }
    finally { setSaving(s => ({ ...s, [u._id]: false })); }
  };

  const hasDiff = (u) => {
    const orig = u.permissions || {};
    const cur  = perms[u._id]  || {};
    return MODULES.some(m => !!orig[m.key] !== !!cur[m.key]);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
          {isAR ? 'الصلاحيات' : 'Permissions'}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {isAR
            ? 'تحكم في ما يمكن لكل مستخدم القيام به داخل النظام'
            : 'Control what each team member can do in the system'}
        </p>
      </div>

      {/* ── Legend ──────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          {isAR ? 'الوحدات' : 'Modules'}
        </p>
        <div className="flex flex-wrap gap-3">
          {MODULES.map(m => (
            <div key={m.key} className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <div className="w-7 h-7 rounded-lg bg-slate-50 dark:bg-slate-700 flex items-center justify-center">
                <Icon name={m.icon} size={14} className="text-slate-500" />
              </div>
              <div>
                <div className="font-semibold text-slate-700 dark:text-slate-300">{isAR ? m.labelAR : m.labelEN}</div>
                <div className="text-slate-400">{m.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Search ──────────────────────────────────────────────────────── */}
      <div className="relative max-w-sm">
        <Icon name="search" size={16} className="absolute top-1/2 -translate-y-1/2 left-3 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={isAR ? 'ابحث عن مستخدم...' : 'Search user...'}
          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm"
        />
      </div>

      {/* ── Permission Matrix ────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl overflow-hidden">
        {/* Table header */}
        <div className="grid border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50"
          style={{ gridTemplateColumns: '1fr ' + MODULES.map(() => '80px').join(' ') + ' 100px' }}>
          <div className="px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">
            {isAR ? 'المستخدم' : 'User'}
          </div>
          {MODULES.map(m => (
            <div key={m.key} className="py-3 text-center flex flex-col items-center gap-1">
              <Icon name={m.icon} size={14} className="text-slate-400" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-tight text-center">
                {isAR ? m.labelAR.split(' ')[0] : m.labelEN.split(' ')[0]}
              </span>
            </div>
          ))}
          <div className="px-3 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">
            {isAR ? 'حفظ' : 'Save'}
          </div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
          {filtered.map((u) => {
            const isMe   = me?._id === u._id;
            const diff   = hasDiff(u);
            const isSaving = saving[u._id];
            const rowPerms = perms[u._id] || {};

            return (
              <div
                key={u._id}
                className={`grid items-center transition-colors ${diff ? 'bg-blue-50/50 dark:bg-blue-500/5' : 'hover:bg-slate-50 dark:hover:bg-slate-700/20'}`}
                style={{ gridTemplateColumns: '1fr ' + MODULES.map(() => '80px').join(' ') + ' 100px' }}
              >
                {/* User info */}
                <div className="px-5 py-4 flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-slate-800 dark:text-white truncate">{u.name}</span>
                      {isMe && <span className="text-[9px] bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full font-bold flex-shrink-0">{isAR ? 'أنت' : 'You'}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400 font-mono">@{u.username}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold capitalize ${ROLE_BADGE[u.role] || ROLE_BADGE.viewer}`}>
                        {u.role}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Permission toggles */}
                {MODULES.map(m => {
                  const enabled = !!rowPerms[m.key];
                  const canChange = !isMe && me?.perms?.canManageUsers;
                  return (
                    <div key={m.key} className="flex items-center justify-center py-4">
                      <button
                        disabled={!canChange}
                        onClick={() => toggle(u._id, m.key)}
                        title={isAR ? m.labelAR : m.labelEN}
                        className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0
                          ${enabled ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-600'}
                          ${!canChange ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-90'}`}
                      >
                        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform
                          ${enabled ? 'translate-x-5' : 'translate-x-1'}`}
                        />
                      </button>
                    </div>
                  );
                })}

                {/* Save button */}
                <div className="px-3 flex items-center justify-center py-4">
                  {isMe ? (
                    <span className="text-xs text-slate-300 dark:text-slate-600 font-medium">—</span>
                  ) : (
                    <button
                      onClick={() => saveRow(u)}
                      disabled={isSaving || !diff}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5
                        ${diff
                          ? 'bg-blue-600 hover:bg-blue-500 text-white border border-blue-500'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-default'
                        }`}
                    >
                      {isSaving ? (
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Icon name="save" size={12} />
                      )}
                      {isSaving ? '...' : (isAR ? 'حفظ' : 'Save')}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-sm">
              {isAR ? 'لا يوجد مستخدمون' : 'No users found'}
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
        {isAR
          ? 'ملاحظة: الأذونات المخصصة تتجاوز الأذونات الافتراضية للدور.'
          : 'Note: Custom permissions override the default role permissions. Changes take effect immediately after saving.'}
      </p>
    </div>
  );
}
