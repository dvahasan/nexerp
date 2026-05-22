import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import Icon from '../components/Icon';
import UserModal from './UserModal';
import Confirm from '../components/Confirm';

const ROLE_META = {
  admin:     { bg: 'bg-purple-100 dark:bg-purple-500/20', text: 'text-purple-700 dark:text-purple-400', dot: 'bg-purple-500' },
  manager:   { bg: 'bg-blue-100 dark:bg-blue-500/20',    text: 'text-blue-700 dark:text-blue-400',    dot: 'bg-blue-500'   },
  warehouse: { bg: 'bg-emerald-100 dark:bg-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
  viewer:    { bg: 'bg-slate-100 dark:bg-slate-700',     text: 'text-slate-600 dark:text-slate-400',  dot: 'bg-slate-400'  },
};

const AVATAR_COLORS = [
  'from-blue-500 to-indigo-600',
  'from-violet-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-cyan-500 to-sky-600',
];

const PERM_LABELS = {
  canAdd:         { icon: 'add',      label: 'Add Items'      },
  canEdit:        { icon: 'edit',     label: 'Edit Items'     },
  canDelete:      { icon: 'delete',   label: 'Delete'         },
  canTx:          { icon: 'swap',     label: 'Transactions'   },
  canManageUsers: { icon: 'users',    label: 'Manage Users'   },
};

export default function Users() {
  const { users, txs, loading, t, isAR, user: me, removeUser } = useAppContext();

  const [userModal,    setUserModal]    = useState(false);
  const [editTarget,   setEditTarget]   = useState(null);
  const [confirmOpen,  setConfirmOpen]  = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);
  const [search,       setSearch]       = useState('');

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="w-8 h-8 border-4 border-slate-200 dark:border-slate-700 border-t-blue-500 rounded-full animate-spin" />
    </div>
  );

  const filtered = users.filter(u =>
    !search ||
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const openAdd  = ()  => { setEditTarget(null); setUserModal(true); };
  const openEdit = (u) => { setEditTarget(u);    setUserModal(true); };

  const confirmDelete = (u, e) => {
    e.stopPropagation();
    setDeleteTarget(u);
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await removeUser(deleteTarget._id); setConfirmOpen(false); }
    catch { /* toast handled */ }
    finally { setDeleting(false); }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
            {t.users}
            <span className="ml-2 text-base font-normal text-slate-400">({filtered.length})</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {isAR ? 'إدارة مستخدمي الشركة وصلاحياتهم' : 'Manage company members and their access'}
          </p>
        </div>
        <div className="flex gap-2">
          {me?.perms?.canManageUsers && (
            <button
              onClick={openAdd}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 border border-blue-500"
            >
              <Icon name="add" size={18} /> {t.addUser}
            </button>
          )}
        </div>
      </div>

      {/* ── Search ──────────────────────────────────────────────────────── */}
      <div className="relative max-w-sm">
        <Icon name="search" size={16} className="absolute top-1/2 -translate-y-1/2 left-3 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={isAR ? 'ابحث باسم أو يوزرنيم...' : 'Search by name or username...'}
          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm"
        />
      </div>

      {/* ── Stats strip ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(ROLE_META).map(([role, meta]) => {
          const count = users.filter(u => u.role === role).length;
          return (
            <div key={role} className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 flex items-center gap-3">
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${meta.dot}`} />
              <div>
                <div className="text-lg font-black text-slate-800 dark:text-white leading-tight">{count}</div>
                <div className="text-xs font-medium text-slate-400 capitalize">{role}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Cards grid ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((u, idx) => {
          const uTxCount = txs.filter(tx => tx.userName === u.name).length;
          const rc       = ROLE_META[u.role] || ROLE_META.viewer;
          const isMe     = me?._id === u._id;
          const gradient = AVATAR_COLORS[idx % AVATAR_COLORS.length];
          const perms    = u.perms || u.permissions || {};
          const activePerms = Object.entries(PERM_LABELS).filter(([k]) => perms[k]);

          return (
            <div
              key={u._id}
              onClick={() => openEdit(u)}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 hover:shadow-md hover:-translate-y-0.5 transition-[transform,box-shadow] duration-200 cursor-pointer group flex flex-col gap-4"
            >
              {/* Avatar + Name */}
              <div className="flex items-start gap-3">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-black text-lg flex-shrink-0 shadow-sm`}>
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-800 dark:text-white text-sm leading-tight">
                      {u.name}
                    </h3>
                    {isMe && (
                      <span className="text-[10px] bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full font-bold flex-shrink-0">
                        {isAR ? 'أنت' : 'You'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">@{u.username}</p>
                  {u.email && (
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{u.email}</p>
                  )}
                </div>
                {/* Status dot */}
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${u.active ? 'bg-emerald-500' : 'bg-red-400'}`}
                  title={u.active ? 'Active' : 'Inactive'} />
              </div>

              {/* Role + Tx count */}
              <div className="flex items-center justify-between">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold capitalize ${rc.bg} ${rc.text}`}>
                  {u.role}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  {uTxCount} {isAR ? 'حركة' : 'txs'}
                </span>
              </div>

              {/* Permission pills */}
              {activePerms.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {activePerms.slice(0, 3).map(([k, meta]) => (
                    <span key={k} className="flex items-center gap-1 px-2 py-0.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600 rounded-lg text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      <Icon name={meta.icon} size={10} />
                      {isAR ? k : meta.label}
                    </span>
                  ))}
                  {activePerms.length > 3 && (
                    <span className="px-2 py-0.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600 rounded-lg text-[10px] font-semibold text-slate-400">
                      +{activePerms.length - 3}
                    </span>
                  )}
                </div>
              )}

              {/* Edit / Delete footer */}
              {me?.perms?.canManageUsers && !isMe && (
                <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-700/50 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={e => { e.stopPropagation(); openEdit(u); }}
                    className="flex-1 py-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <Icon name="edit" size={13} /> {t.edit}
                  </button>
                  <button
                    onClick={e => confirmDelete(u, e)}
                    className="flex-1 py-1.5 text-xs font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <Icon name="delete" size={13} /> {t.delete}
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full py-16 text-center text-slate-400 dark:text-slate-500">
            <Icon name="users" size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">{isAR ? 'لا يوجد مستخدمون مطابقون' : 'No users match your search'}</p>
          </div>
        )}
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      <UserModal
        open={userModal}
        onClose={() => { setUserModal(false); setEditTarget(null); }}
        editUser={editTarget}
      />
      <Confirm
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        loading={deleting}
        message={isAR
          ? `هل تريد حذف "${deleteTarget?.name}"؟ لا يمكن التراجع.`
          : `Delete "${deleteTarget?.name}"? This cannot be undone.`}
      />
    </div>
  );
}
