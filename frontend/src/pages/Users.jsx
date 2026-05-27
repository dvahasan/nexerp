import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { T } from '../theme';
import { api } from '../api';
import Icon from '../components/Icon';
import UserModal from './UserModal';
import Confirm from '../components/Confirm';
import InfiniteScrollTrigger from '../components/InfiniteScrollTrigger';
import LazyScroll from '../components/LazyScroll';

const LIMIT = 12;

const ROLE_COLORS = {
  owner:     '#f59e0b',
  admin:     '#8b5cf6',
  manager:   '#3b82f6',
  warehouse: '#10b981',
  viewer:    '#64748b',
};

const PERM_LABELS = {
  canAdd:         { icon: 'add',    label: 'Add Items'    },
  canEdit:        { icon: 'edit',   label: 'Edit Items'   },
  canDelete:      { icon: 'delete', label: 'Delete'       },
  canTx:          { icon: 'swap',   label: 'Transactions' },
  canManageUsers: { icon: 'users',  label: 'Manage Users' },
};

export default function Users() {
  const { loading: ctxLoading, t: tr, isAR, user: me, removeUser, theme, company } = useAppContext();
  const t = T[theme] || T.light;
  const primary = company?.primaryColor || '#3b82f6';

  const [users,    setUsers]    = useState([]);
  const [total,    setTotal]    = useState(0);
  const [hasMore,  setHasMore]  = useState(false);
  const [page,     setPage]     = useState(1);
  const [fetching, setFetching] = useState(true);

  const [roleCounts,       setRoleCounts]       = useState({});
  const [enterpriseOwners, setEnterpriseOwners] = useState([]);

  const [roleFilter, setRoleFilter] = useState(null);
  const [search,     setSearch]     = useState('');
  const [focused,    setFocused]    = useState(false);

  const [userModal,    setUserModal]    = useState(false);
  const [editTarget,   setEditTarget]   = useState(null);
  const [confirmOpen,  setConfirmOpen]  = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);
  const [version,      setVersion]      = useState(0);

  useEffect(() => {
    let cancelled = false;
    setFetching(true);
    const params = { page, limit: LIMIT };
    if (search)     params.search = search;
    if (roleFilter) params.role   = roleFilter;

    api.getUsersPaged(params)
      .then(res => {
        if (cancelled) return;
        const newUsers = res.users || [];
        if (page === 1) setUsers(newUsers);
        else            setUsers(prev => [...prev, ...newUsers]);
        setTotal(res.total || 0);
        setHasMore(page < (res.pages || 1));
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setFetching(false); });
    return () => { cancelled = true; };
  }, [page, search, roleFilter, version]);

  useEffect(() => { setPage(1); }, [search, roleFilter]);

  useEffect(() => {
    api.getUsers()
      .then(all => {
        const list = Array.isArray(all) ? all : [];
        setEnterpriseOwners(list.filter(u => u.isEnterprise));
        const regular = list.filter(u => !u.isEnterprise);
        const counts  = Object.fromEntries(Object.keys(ROLE_COLORS).map(r => [r, 0]));
        regular.forEach(u => { if (counts[u.role] !== undefined) counts[u.role]++; });
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
      setVersion(v => v + 1);
    } catch { /* toast handled */ }
    finally { setDeleting(false); }
  };

  const showEntOwners = !roleFilter || roleFilter === 'owner';

  if (ctxLoading) {
    return (
      <div className="animate-in fade-in duration-500" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ width: 180, height: 20, borderRadius: 3, backgroundColor: t.border }} className="animate-pulse" />
          <div style={{ width: 90, height: 32, borderRadius: 4, backgroundColor: t.border }} className="animate-pulse" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ backgroundColor: t.elev, border: `1px solid ${t.border}`, borderRadius: 4, padding: 16 }}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 4, backgroundColor: t.border, flexShrink: 0 }} className="animate-pulse" />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ height: 14, width: '70%', borderRadius: 3, backgroundColor: t.border }} className="animate-pulse" />
                  <div style={{ height: 11, width: '50%', borderRadius: 3, backgroundColor: t.border }} className="animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="tour-users-page animate-in fade-in duration-300" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.fgSubtle }}>
            {tr.users}
          </span>
          <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: t.fgSubtle }}>({total})</span>
          {roleFilter && (
            <button
              onClick={() => setRoleFilter(null)}
              style={{
                fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 700,
                color: primary, background: 'none', border: 'none', cursor: 'pointer',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}
            >
              × {isAR ? 'إلغاء الفلتر' : 'clear filter'}
            </button>
          )}
        </div>
        {me?.perms?.canManageUsers && (
          <button
            onClick={openAdd}
            style={{
              height: 32, padding: '0 14px', borderRadius: 4,
              backgroundColor: primary, color: '#fff', border: 'none',
              cursor: 'pointer', fontSize: 13, fontWeight: 600,
              display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'opacity 120ms',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <Icon name="add" size={16} /> {tr.addUser}
          </button>
        )}
      </div>

      {/* ── Search ── */}
      <div style={{ position: 'relative', maxWidth: 320 }}>
        <Icon name="search" size={14} style={{
          position: 'absolute', top: '50%', left: 10, transform: 'translateY(-50%)',
          color: t.fgSubtle, pointerEvents: 'none',
        }} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={isAR ? 'ابحث باسم أو يوزرنيم...' : 'Search by name or username...'}
          style={{
            width: '100%', height: 34, padding: '0 10px 0 30px', borderRadius: 4,
            border: `1px solid ${focused ? primary : t.border}`,
            backgroundColor: t.canvas, color: t.fg, fontSize: 13,
            outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
            boxShadow: focused ? `0 0 0 1px ${primary}` : 'none',
            transition: 'border-color 120ms, box-shadow 120ms',
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </div>

      {/* ── Role stats strip ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {Object.entries(ROLE_COLORS).map(([role, color]) => {
          const active = roleFilter === role;
          return (
            <button
              key={role}
              onClick={() => setRoleFilter(prev => prev === role ? null : role)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 14px', borderRadius: 4, cursor: 'pointer',
                border: active ? `1px solid ${color}` : `1px solid ${t.border}`,
                backgroundColor: active ? color + '14' : t.elev,
                transition: 'all 120ms',
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
              <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 18, fontWeight: 900, color: active ? color : t.fg, lineHeight: 1 }}>
                {roleCounts[role] ?? '—'}
              </span>
              <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: active ? color : t.fgSubtle }}>
                {role}
              </span>
              {active && <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 9, color: t.fgSubtle }}>✕</span>}
            </button>
          );
        })}
      </div>

      {/* ── Cards grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>

        {/* Enterprise owner cards */}
        {showEntOwners && enterpriseOwners.map(eo => (
          <LazyScroll key={`ent-${eo._id}`} alwaysRender rootMargin="200px">
            <div style={{
              backgroundColor: '#f59e0b0a', border: `1px solid #f59e0b44`,
              borderRadius: 4, padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 4, flexShrink: 0,
                  backgroundColor: '#f59e0b18', border: '1px solid #f59e0b44',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'ui-monospace, monospace', fontSize: 18, fontWeight: 900, color: '#f59e0b',
                }}>
                  {eo.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: t.fg }}>{eo.name}</span>
                    <span style={{
                      fontFamily: 'ui-monospace, monospace', fontSize: 8, fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      color: '#f59e0b', backgroundColor: '#f59e0b18',
                      border: '1px solid #f59e0b44', borderRadius: 3, padding: '2px 5px',
                    }}>
                      {isAR ? 'مالك المنظومة' : 'Enterprise'}
                    </span>
                  </div>
                  <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, color: t.fgSubtle, marginTop: 3 }}>
                    @{eo.username}
                  </div>
                  {eo.email && <div style={{ fontSize: 11, color: t.fgMuted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{eo.email}</div>}
                </div>
                <span style={{ fontSize: 16, flexShrink: 0 }}>👑</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: `1px solid #f59e0b22` }}>
                <span style={{
                  fontFamily: 'ui-monospace, monospace', fontSize: 9, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  color: '#f59e0b', backgroundColor: '#f59e0b18',
                  border: '1px solid #f59e0b44', borderRadius: 3, padding: '3px 8px',
                }}>
                  👑 {isAR ? 'مالك' : 'OWNER'}
                </span>
                <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 9, color: t.fgSubtle, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {isAR ? 'مشرف المنظومة' : 'Enterprise Owner'}
                </span>
              </div>
            </div>
          </LazyScroll>
        ))}

        {/* Loading skeleton */}
        {fetching && users.length === 0 && (
          Array.from({ length: LIMIT }).map((_, i) => (
            <div key={i} style={{ backgroundColor: t.elev, border: `1px solid ${t.border}`, borderRadius: 4, padding: 16 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 4, backgroundColor: t.border, flexShrink: 0 }} className="animate-pulse" />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ height: 14, width: '70%', borderRadius: 3, backgroundColor: t.border }} className="animate-pulse" />
                  <div style={{ height: 11, width: '50%', borderRadius: 3, backgroundColor: t.border }} className="animate-pulse" />
                </div>
              </div>
            </div>
          ))
        )}

        {/* Empty state */}
        {!fetching && users.length === 0 && enterpriseOwners.length === 0 && (
          <div style={{
            gridColumn: '1 / -1', padding: '48px 0', textAlign: 'center',
            fontFamily: 'ui-monospace, monospace', fontSize: 11,
            textTransform: 'uppercase', letterSpacing: '0.08em', color: t.fgSubtle,
          }}>
            {isAR ? 'لا يوجد مستخدمون مطابقون' : 'No users match your search'}
          </div>
        )}

        {/* Regular user cards */}
        {users.map(u => {
          const rc          = ROLE_COLORS[u.role] || '#64748b';
          const isMe        = me?._id === u._id;
          const perms       = u.perms || u.permissions || {};
          const activePerms = Object.entries(PERM_LABELS).filter(([k]) => perms[k]);

          return (
            <LazyScroll key={u._id} alwaysRender rootMargin="200px">
              <div
                onClick={() => openEdit(u)}
                style={{
                  backgroundColor: t.elev, border: `1px solid ${t.border}`,
                  borderRadius: 4, padding: 16, cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', gap: 12,
                  transition: 'border-color 120ms, box-shadow 120ms',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = primary;
                  e.currentTarget.style.boxShadow = `0 0 0 1px ${primary}`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = t.border;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Avatar + info */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 4, flexShrink: 0,
                    backgroundColor: rc + '18', border: `1px solid ${rc}44`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'ui-monospace, monospace', fontSize: 18, fontWeight: 900, color: rc,
                  }}>
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: t.fg, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.name}
                      </span>
                      {isMe && (
                        <span style={{
                          fontFamily: 'ui-monospace, monospace', fontSize: 8, fontWeight: 700,
                          textTransform: 'uppercase', letterSpacing: '0.06em',
                          color: primary, backgroundColor: primary + '14',
                          border: `1px solid ${primary}44`, borderRadius: 3, padding: '2px 5px',
                        }}>
                          {isAR ? 'أنت' : 'You'}
                        </span>
                      )}
                    </div>
                    <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, color: t.fgSubtle, marginTop: 3 }}>
                      @{u.username}
                    </div>
                    {u.email && (
                      <div style={{ fontSize: 11, color: t.fgMuted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.email}
                      </div>
                    )}
                  </div>
                  {/* Active dot */}
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 6,
                    backgroundColor: u.active !== false ? '#16774A' : t.neg,
                  }} title={u.active !== false ? 'Active' : 'Inactive'} />
                </div>

                {/* Role + status */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  paddingTop: 10, borderTop: `1px solid ${t.border}`,
                }}>
                  <span style={{
                    fontFamily: 'ui-monospace, monospace', fontSize: 9, fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    color: rc, backgroundColor: rc + '14',
                    border: `1px solid ${rc}44`, borderRadius: 3, padding: '3px 8px',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    {u.role === 'owner' && '👑 '}
                    {u.role}
                  </span>
                  <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: t.fgSubtle }}>
                    {u.active !== false ? (isAR ? 'نشط' : 'ACTIVE') : (isAR ? 'معطّل' : 'INACTIVE')}
                  </span>
                </div>

                {/* Permission pills */}
                {activePerms.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {activePerms.slice(0, 3).map(([k, meta]) => (
                      <span key={k} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                        padding: '2px 6px', borderRadius: 3,
                        fontFamily: 'ui-monospace, monospace', fontSize: 9, fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                        color: t.fgSubtle, backgroundColor: t.sunken, border: `1px solid ${t.border}`,
                      }}>
                        <Icon name={meta.icon} size={9} />
                        {meta.label.split(' ')[0]}
                      </span>
                    ))}
                    {activePerms.length > 3 && (
                      <span style={{
                        padding: '2px 6px', borderRadius: 3,
                        fontFamily: 'ui-monospace, monospace', fontSize: 9, fontWeight: 700,
                        color: t.fgSubtle, backgroundColor: t.sunken, border: `1px solid ${t.border}`,
                      }}>
                        +{activePerms.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Edit / Delete (hover actions) */}
                {me?.perms?.canManageUsers && !isMe && u.role !== 'owner' && (
                  <div
                    style={{
                      display: 'flex', gap: 6, paddingTop: 10,
                      borderTop: `1px solid ${t.border}`,
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      onClick={e => { e.stopPropagation(); openEdit(u); }}
                      style={{
                        flex: 1, height: 28, borderRadius: 4, fontSize: 11, fontWeight: 700,
                        fontFamily: 'ui-monospace, monospace', textTransform: 'uppercase', letterSpacing: '0.04em',
                        border: `1px solid ${t.border}`, backgroundColor: 'transparent',
                        color: t.fgMuted, cursor: 'pointer', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', gap: 4, transition: 'all 120ms',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = primary; e.currentTarget.style.color = primary; e.currentTarget.style.backgroundColor = primary + '10'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.fgMuted; e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <Icon name="edit" size={11} /> {tr.edit}
                    </button>
                    <button
                      onClick={e => confirmDelete(u, e)}
                      style={{
                        flex: 1, height: 28, borderRadius: 4, fontSize: 11, fontWeight: 700,
                        fontFamily: 'ui-monospace, monospace', textTransform: 'uppercase', letterSpacing: '0.04em',
                        border: `1px solid ${t.border}`, backgroundColor: 'transparent',
                        color: t.fgMuted, cursor: 'pointer', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', gap: 4, transition: 'all 120ms',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = t.neg; e.currentTarget.style.color = t.neg; e.currentTarget.style.backgroundColor = t.negTint; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.fgMuted; e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <Icon name="delete" size={11} /> {tr.delete}
                    </button>
                  </div>
                )}
              </div>
            </LazyScroll>
          );
        })}
      </div>

      {/* Infinite scroll */}
      <InfiniteScrollTrigger hasMore={hasMore && !fetching} onVisible={() => setPage(p => p + 1)} />

      {/* Loading more */}
      {fetching && users.length > 0 && (
        <div style={{ padding: '20px 0', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${t.border}`, borderTopColor: primary, animation: 'spin 600ms linear infinite' }} />
        </div>
      )}

      {/* Modals */}
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
