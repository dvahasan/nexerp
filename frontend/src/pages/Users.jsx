import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { MdAdd, MdEdit, MdDelete, MdCheck, MdClose } from 'react-icons/md';

export default function Users() {
  const { users, txs, loading, t, isAR, user } = useAppContext();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-10 h-10 border-4 border-slate-300 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  const roleColors = {
    admin: { bg: 'bg-purple-100 dark:bg-purple-500/20', text: 'text-purple-700 dark:text-purple-400' },
    manager: { bg: 'bg-blue-100 dark:bg-blue-500/20', text: 'text-blue-700 dark:text-blue-400' },
    warehouse: { bg: 'bg-green-100 dark:bg-green-500/20', text: 'text-green-700 dark:text-green-400' },
    viewer: { bg: 'bg-slate-100 dark:bg-slate-500/20', text: 'text-slate-700 dark:text-slate-400' },
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">{isAR ? 'المستخدمين' : 'Users'} ({users.length})</h1>
        {user?.perms?.canManageUsers && (
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/30">
            <MdAdd size={20} /> {isAR ? 'إضافة مستخدم' : 'Add User'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {users.map(u => {
          const uTxs = txs.filter(tx => tx.userName === u.name).length;
          
          return (
            <div key={u._id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-inner">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-white truncate">{u.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">@{u.username}</p>
                  </div>
                </div>
                <div className={`w-2.5 h-2.5 rounded-full ${u.active ? 'bg-green-500' : 'bg-red-500'} shadow-sm`}></div>
              </div>

              {u.email && <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 truncate text-center">✉️ {u.email}</p>}

              <div className="flex items-center justify-between mt-auto">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${roleColors[u.role]?.bg || roleColors.viewer.bg} ${roleColors[u.role]?.text || roleColors.viewer.text}`}>
                  {u.role}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  {uTxs} {isAR ? 'حركة' : 'txs'}
                </span>
              </div>
              
              {user?.perms?.canManageUsers && user?._id !== u._id && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50 flex justify-between gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button className="flex-1 py-1.5 text-xs font-bold text-slate-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors flex justify-center items-center gap-1">
                     <MdEdit size={16} /> Edit
                   </button>
                   <button className="flex-1 py-1.5 text-xs font-bold text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors flex justify-center items-center gap-1">
                     <MdDelete size={16} /> Delete
                   </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
