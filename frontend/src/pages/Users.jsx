import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { api } from '../api';
import Icon from '../components/Icon';
import UserModal from './UserModal';
import Confirm from '../components/Confirm';
import Skeleton from '../components/Skeleton';
import InfiniteScrollTrigger from '../components/InfiniteScrollTrigger';
import LazyScroll from '../components/LazyScroll';

const LIMIT = 12;

const ROLE_META = {
  enterprise_owner: { bg: 'bg-indigo-100 dark:bg-indigo-500/20', text: 'text-indigo-700 dark:text-indigo-400', dot: 'bg-indigo-500', iconColor: 'bg-indigo-500' },
  owner:     { bg: 'bg-amber-100 dark:bg-amber-500/20',   text: 'text-amber-700 dark:text-amber-400',   dot: 'bg-amber-500', iconColor: 'bg-amber-500'   },
  admin:     { bg: 'bg-purple-100 dark:bg-purple-500/20', text: 'text-purple-700 dark:text-purple-400', dot: 'bg-purple-500', iconColor: 'bg-purple-500'  },
  manager:   { bg: 'bg-blue-100 dark:bg-blue-500/20',    text: 'text-blue-700 dark:text-blue-400',    dot: 'bg-blue-500', iconColor: 'bg-blue-500'    },
  warehouse: { bg: 'bg-emerald-100 dark:bg-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500', iconColor: 'bg-emerald-500' },
  viewer:    { bg: 'bg-slate-100 dark:bg-slate-700',     text: 'text-slate-600 dark:text-slate-400',  dot: 'bg-slate-400', iconColor: 'bg-slate-500'   },
};

const PERM_LABELS = {
  canAdd:         { icon: 'add',      label: 'Add Items'      },
  canEdit:        { icon: 'edit',     label: 'Edit Items'     },
  canDelete:      { icon: 'delete',   label: 'Delete'         },
  canTx:          { icon: 'swap',     label: 'Transactions'   },
  canManageUsers: { icon: 'users',    label: 'Manage Users'   },
};

export default function Users() {
  const { loading: ctxLoading, t, isAR, user: me, removeUser } = useAppContext();

  // Server-side paginated state
  const [users,    setUsers]    = useState([]);
  const [total,    setTotal]    = useState(0);
  const [hasMore,  setHasMore]  = useState(false);
  const [page,     setPage]     = useState(1);
  const [fetching, setFetching] = useState(true);
  // Role counts fetched separately (full list needed for stats strip)
  const [roleCounts, setRoleCounts] = useState({});
  // Version bump forces re-fetch even when page === 1
  const [version, setVersion] = useState(0);

  const [search, setSearch] = useState('');
  const [roleFilters, setRoleFilters] = useState([]);

  const [userModal,    setUserModal]    = useState(false);
  const [editTarget,   setEditTarget]   = useState(null);
  const [confirmOpen,  setConfirmOpen]  = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  // Main paginated fetch
  useEffect(() => {
    let cancelled = false;
    setFetching(true);
    const params = { page, limit: LIMIT };
    if (search) params.search = search;
    if (roleFilters.length > 0) params.roles = roleFilters.join(',');

    api.getUsersPaged(params)
      .then(res => {
        if (!cancelled) {
          const newUsers = res.users || [];
          if (page === 1) setUsers(newUsers);
          else            setUsers(prev => [...prev, ...newUsers]);
          setTotal(res.total || 0);
          setHasMore(page < (res.pages || 1));
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setFetching(false); });
    return () => { cancelled = true; };
  }, [page, search, roleFilters, version]);

  // Reset to page 1 when search or filter changes
  useEffect(() => { setPage(1); }, [search, roleFilters]);

  // Fetch role counts (full unfiltered list) — runs once on mount and after mutations
  useEffect(() => {
    api.getUsers()
      .then(all => {
        const counts = {};
        Object.keys(ROLE_META).forEach(r => { counts[r] = 0; });
        (Array.isArray(all) ? all : []).forEach(u => {
          const effectiveRole = u.isEnterprise ? 'enterprise_owner' : u.role;
          if (counts[effectiveRole] !== undefined) counts[effectiveRole]++;
        });
        setRoleCounts(counts);
      })
      .catch(() => {});
  }, [version]);

  const refresh = () => { setPage(1); setVersion(v => v + 1); };

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
    try {
      await removeUser(deleteTarget._id);
      setUsers(prev => prev.filter(u => u._id !== deleteTarget._id));
      setTotal(prev => prev - 1);
      setConfirmOpen(false);
      // Refresh counts
      setVersion(v => v + 1);
    }
    catch { /* toast handled */ }
    finally { setDeleting(false); }
  };

  if (ctxLoading) return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-48 mb-2" shape="text" />
          <Skeleton className="h-4 w-64" shape="text" />
        </div>
        <Skeleton className="h-10 w-32" shape="rect" />
      </div>
      <Skeleton className="h-10 w-64" shape="rect" />
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 flex items-center gap-3">
            <Skeleton className="w-2.5 h-2.5 shrink-0" shape="circle" />
            <div className="flex-1">
              <Skeleton className="h-5 w-8 mb-1" shape="text" />
              <Skeleton className="h-3 w-16" shape="text" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <Skeleton className="w-12 h-12 shrink-0" shape="rect" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-24 mb-2" shape="text" />
                <Skeleton className="h-3 w-20 mb-1" shape="text" />
                <Skeleton className="h-3 w-32" shape="text" />
              </div>
              <Skeleton className="w-2.5 h-2.5 shrink-0 mt-1" shape="circle" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-16" shape="rect" />
              <Skeleton className="h-4 w-12" shape="text" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
            {t.users}
            <span className="ml-2 text-base font-normal text-slate-400">({total})</span>
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

      {/* ── Search ── */}
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

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        {Object.entries(ROLE_META).map(([role, meta]) => (
          <button 
            key={role} 
            onClick={() => setRoleFilters(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role])}
            className={`border rounded-xl px-4 py-3 flex items-center gap-3 transition-colors text-left ${
              roleFilters.includes(role) 
                ? 'border-blue-500 shadow-md ' + meta.bg 
                : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${meta.dot}`} />
            <div>
              <div className="text-lg font-black text-slate-800 dark:text-white leading-tight">
                {roleCounts[role] ?? '—'}
              </div>
              <div className="text-xs font-medium text-slate-400 capitalize">{role.replace('_', ' ')}</div>
            </div>
          </button>
        ))}
      </div>

      {/* ── Cards grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* Initial loading skeleton */}
        {fetching && users.length === 0 && (
          Array.from({ length: LIMIT }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <Skeleton className="w-12 h-12 shrink-0" shape="rect" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-4 w-24 mb-2" shape="text" />
                  <Skeleton className="h-3 w-20 mb-1" shape="text" />
                  <Skeleton className="h-3 w-32" shape="text" />
                </div>
                <Skeleton className="w-2.5 h-2.5 shrink-0 mt-1" shape="circle" />
              </div>
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-16" shape="rect" />
                <Skeleton className="h-4 w-12" shape="text" />
              </div>
            </div>
          ))
        )}

        {/* Empty state */}
        {!fetching && users.length === 0 && (
          <div className="col-span-full py-16 text-center text-slate-400 dark:text-slate-500">
            <Icon name="users" size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">{isAR ? 'لا يوجد مستخدمون مطابقون' : 'No users match your search'}</p>
          </div>
        )}

        {users.map((u, idx) => {
          const effectiveRole = u.isEnterprise ? 'enterprise_owner' : u.role;
          const rc       = ROLE_META[effectiveRole] || ROLE_META.viewer;
          const isMe     = me?._id === u._id;
          const perms    = u.perms || u.permissions || {};
          const activePerms = Object.entries(PERM_LABELS).filter(([k]) => perms[k]);

          return (
            <div key={u._id} className="animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out fill-mode-both">
            <div
              onClick={() => openEdit(u)}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 hover:shadow-md hover:-translate-y-0.5 transition-[transform,box-shadow] duration-200 cursor-pointer group flex flex-col gap-4"
            >
              {/* Avatar + Name */}
              <div className="flex items-start gap-3">
                <div className={`w-12 h-12 rounded-2xl ${rc.iconColor} flex items-center justify-center text-white font-black text-lg flex-shrink-0 shadow-sm`}>
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

              {/* Role + Status */}
              <div className="flex items-center justify-between">
                <span className={`text-[9px] px-2 py-0.5 rounded-lg font-bold capitalize ${rc.bg} ${rc.text}`}>
                  {effectiveRole.replace('_', ' ')}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">{isAR ? 'انضم' : 'Joined'} {new Date(u.createdAt).toLocaleDateString()}</span>
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

              {/* Edit / Delete footer — owner accounts are immutable */}
              {me?.perms?.canManageUsers && !isMe && u.role !== 'owner' && !u.isEnterprise && (
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
            </div>
          );
        })}
      </div>

      {/* Infinite scroll trigger */}
      <InfiniteScrollTrigger
        hasMore={hasMore && !fetching}
        onVisible={() => setPage(p => p + 1)}
      />

      {/* Fetching-more spinner */}
      {fetching && users.length > 0 && (
        <div className="py-6 flex justify-center">
          <div className="w-6 h-6 border-2 border-slate-200 dark:border-slate-700 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}

      {/* ── Modals ── */}
      <UserModal
        open={userModal}
        onClose={() => { setUserModal(false); setEditTarget(null); }}
        editUser={editTarget}
        onSaved={refresh}
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
