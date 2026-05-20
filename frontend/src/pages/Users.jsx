import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import Icon from '../components/Icon';
import UserModal from './UserModal';
import Confirm from '../components/Confirm';

export default function Users() {
  const { users, txs, loading, t, isAR, user, removeUser } = useAppContext();

  const [userModal,    setUserModal]    = useState(false);
  const [editTarget,   setEditTarget]   = useState(null);

  const [confirmOpen,  setConfirmOpen]  = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-10 h-10 border-4 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  const roleColors = {
    admin:     { bg: 'bg-purple-100 dark:bg-purple-500/20', text: 'text-purple-700 dark:text-purple-400' },
    manager:   { bg: 'bg-blue-100 dark:bg-blue-500/20',    text: 'text-blue-700 dark:text-blue-400'    },
    warehouse: { bg: 'bg-green-100 dark:bg-green-500/20',  text: 'text-green-700 dark:text-green-400'  },
    viewer:    { bg: 'bg-slate-100 dark:bg-slate-500/20',  text: 'text-slate-700 dark:text-slate-400'  },
  };

  const openAdd  = ()   => { setEditTarget(null); setUserModal(true); };
  const openEdit = (u)  => { setEditTarget(u);    setUserModal(true); };
  const confirmDelete = (u) => { setDeleteTarget(u); setConfirmOpen(true); };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await removeUser(deleteTarget._id); setConfirmOpen(false); }
    catch { /* toast handled by context */ }
    finally { setDeleting(false); }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
          {t.users}
          <span className="ml-2 text-base font-normal text-slate-400">({users.length})</span>
        </h1>
        {user?.perms?.canManageUsers && (
          <button
            onClick={openAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 border border-blue-500"
          >
            <Icon name="add" size={20} /> {t.addUser}
          </button>
        )}
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {users.map(u => {
          const uTxs = txs.filter(tx => tx.userName === u.name).length;
          const rc   = roleColors[u.role] || roleColors.viewer;
          const isMe = user?._id === u._id;

          return (
            <div
              key={u._id}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5 hover:shadow-md hover:-translate-y-0.5 transition-[transform,box-shadow] duration-300 group"
            >
              {/* Top */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-inner select-none">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-white truncate max-w-[120px]">
                      {u.name}
                      {isMe && <span className="ml-1 text-[10px] bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full font-semibold">You</span>}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">@{u.username}</p>
                  </div>
                </div>
                <div className={`w-2.5 h-2.5 rounded-full mt-1 shadow-sm ${u.active ? 'bg-green-500' : 'bg-red-500'}`} title={u.active ? 'Active' : 'Inactive'} />
              </div>

              {u.email && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 truncate text-center">
                  <Icon name="email" size={12} className="inline mr-1" />{u.email}
                </p>
              )}

              {/* Role + Txs */}
              <div className="flex items-center justify-between mt-auto">
                <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${rc.bg} ${rc.text}`}>
                  {u.role}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  {uTxs} {isAR ? 'حركة' : 'txs'}
                </span>
              </div>

              {/* Edit / Delete — admin only, not self */}
              {user?.perms?.canManageUsers && !isMe && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50 flex justify-between gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={() => openEdit(u)}
                    className="flex-1 py-1.5 text-xs font-bold text-slate-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors flex justify-center items-center gap-1"
                  >
                    <Icon name="edit" size={14} /> {t.edit}
                  </button>
                  <button
                    onClick={() => confirmDelete(u)}
                    className="flex-1 py-1.5 text-xs font-bold text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors flex justify-center items-center gap-1"
                  >
                    <Icon name="delete" size={14} /> {t.delete}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modals */}
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
          ? `هل تريد حذف المستخدم "${deleteTarget?.name}"؟`
          : `Delete user "${deleteTarget?.name}"? This cannot be undone.`}
      />
    </div>
  );
}
