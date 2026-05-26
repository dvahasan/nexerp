import { useState, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { T } from '../theme';
import Icon from '../components/Icon';
import LazyScroll from '../components/LazyScroll';

const MODULES = [
  { key: 'canAdd',           icon: 'add',          labelEN: 'Add Items',    labelAR: 'إضافة أصناف',      desc: 'Create new items'        },
  { key: 'canEdit',          icon: 'edit',         labelEN: 'Edit Items',   labelAR: 'تعديل الأصناف',    desc: 'Modify existing items'   },
  { key: 'canDelete',        icon: 'delete',       labelEN: 'Delete',       labelAR: 'الحذف',             desc: 'Delete items & records'  },
  { key: 'canTxIn',          icon: 'transactions', labelEN: 'Stock In',     labelAR: 'وارد (IN)',         desc: 'Record incoming stock'   },
  { key: 'canTxOut',         icon: 'transactions', labelEN: 'Stock Out',    labelAR: 'صادر (OUT)',        desc: 'Record outgoing stock'   },
  { key: 'canManageUsers',   icon: 'users',        labelEN: 'Manage Users', labelAR: 'إدارة المستخدمين', desc: 'Add, edit, delete users' },
  { key: 'canManageCompany', icon: 'company',      labelEN: 'Company',      labelAR: 'ملف الشركة',       desc: 'Edit company profile'    },
];

const ROLE_COLORS = {
  owner: '#f59e0b', admin: '#8b5cf6', manager: '#3b82f6',
  warehouse: '#10b981', viewer: '#64748b',
};

export default function Permissions() {
  const { users, saveUser, showToast, t: tr, isAR, user: me, loading, theme, company } = useAppContext();
  const t = T[theme] || T.light;
  const primary = company?.primaryColor || '#3b82f6';

  const [perms, setPerms] = useState(() => {
    const map = {};
    users.forEach(u => { map[u._id] = { ...(u.permissions || {}) }; });
    return map;
  });
  const [saving, setSaving] = useState({});
  const [search, setSearch] = useState('');
  const [focused, setFocused] = useState(false);

  // Sync horizontal scroll: body drives, header follows.
  // overflowX:'hidden' on the header lets us set scrollLeft
  // programmatically without showing a scrollbar there.
  const headRef = useRef(null);
  const bodyRef = useRef(null);
  const onBodyScroll = () => {
    if (headRef.current && bodyRef.current)
      headRef.current.scrollLeft = bodyRef.current.scrollLeft;
  };

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className="animate-in fade-in duration-500">
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{ height: 56, backgroundColor: t.elev, border: `1px solid ${t.border}`, borderRadius: 4 }} className="animate-pulse" />
      ))}
    </div>
  );

  const canManagePermissions = me?.role === 'owner' || me?.perms?.canManagePermissions;

  if (!canManagePermissions) {
    return (
      <div style={{
        padding: '48px 20px', textAlign: 'center',
        fontFamily: 'ui-monospace, monospace', fontSize: 11,
        textTransform: 'uppercase', letterSpacing: '0.08em', color: t.fgSubtle,
      }}>
        {isAR ? 'ليس لديك صلاحية للوصول إلى هذه الصفحة' : 'You do not have permission to view this page'}
      </div>
    );
  }

  const filtered = users.filter(u =>
    !search ||
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (uid, key) => {
    setPerms(prev => ({ ...prev, [uid]: { ...prev[uid], [key]: !prev[uid]?.[key] } }));
  };

  const saveRow = async (u) => {
    setSaving(s => ({ ...s, [u._id]: true }));
    try {
      await saveUser({ permissions: perms[u._id] }, u._id, { silent: true });
      showToast(isAR ? `تم حفظ صلاحيات ${u.name}` : `Permissions saved for ${u.name}`);
    } catch { /* toast shown */ }
    finally { setSaving(s => ({ ...s, [u._id]: false })); }
  };

  const hasDiff = (u) => {
    const orig = u.permissions || {};
    const cur  = perms[u._id]  || {};
    return MODULES.some(m => !!orig[m.key] !== !!cur[m.key]);
  };

  // Toggle switch component
  const Switch = ({ checked, onChange, disabled }) => (
    <div
      onClick={disabled ? undefined : onChange}
      style={{
        position: 'relative', width: 36, height: 20, borderRadius: 10, flexShrink: 0,
        backgroundColor: checked ? primary : t.border,
        transition: 'background 120ms',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <div style={{
        position: 'absolute', top: 3, left: checked ? 19 : 3,
        width: 14, height: 14, borderRadius: '50%',
        backgroundColor: '#fff', transition: 'left 120ms',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </div>
  );

  return (
    <div className="animate-in fade-in duration-300" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div>
        <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.fgSubtle }}>
          {isAR ? 'الصلاحيات' : 'Permissions'}
        </span>
        <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, color: t.fgSubtle, marginTop: 4 }}>
          {isAR ? 'تحكم في ما يمكن لكل مستخدم القيام به داخل النظام' : 'Control what each team member can do in the system'}
        </div>
      </div>

      {/* Legend */}
      <div style={{ backgroundColor: t.elev, border: `1px solid ${t.border}`, borderRadius: 4, padding: '14px 16px' }}>
        <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.fgSubtle, marginBottom: 12 }}>
          {isAR ? 'الوحدات' : 'Modules'}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {MODULES.map(m => (
            <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 4, backgroundColor: t.sunken,
                border: `1px solid ${t.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: t.fgMuted,
              }}>
                <Icon name={m.icon} size={13} />
              </div>
              <div>
                <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: t.fg }}>
                  {isAR ? m.labelAR : m.labelEN}
                </div>
                <div style={{ fontSize: 10, color: t.fgSubtle }}>{m.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', maxWidth: 300 }}>
        <Icon name="search" size={14} style={{ position: 'absolute', top: '50%', left: 10, transform: 'translateY(-50%)', color: t.fgSubtle, pointerEvents: 'none' }} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={isAR ? 'ابحث عن مستخدم...' : 'Search user...'}
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

      {/* Permissions matrix ─────────────────────────────────────────────
          Two-part layout so horizontal scroll is contained to the card:

          • headRef  – sticky, overflowX:'hidden', sits OUTSIDE the
                       overflow-x:auto wrapper so its scroll container
                       ancestor is the outer overflow-auto layout div
                       (= starts right below the navbar).  We shift it
                       up with -top-4 md:-top-6 to cancel the layout
                       padding and pin it flush to the navbar.
                       overflowX:'hidden' clips the 800 px grid without
                       triggering page-wide horizontal scroll; scrollLeft
                       is set programmatically to track the body.

          • bodyRef  – overflow-x:auto; only THIS div scrolls sideways.
                       onScroll drives headRef.scrollLeft in sync.
      ────────────────────────────────────────────────────────────────── */}
      <div style={{ backgroundColor: t.elev, border: `1px solid ${t.border}`, borderRadius: 4 }}>

        {/* ── Sticky header ── */}
        <div
          ref={headRef}
          className="-top-4 md:-top-6"
          style={{ position: 'sticky', zIndex: 10, overflowX: 'hidden' }}
        >
          <div style={{
            minWidth: 800,
            display: 'grid',
            gridTemplateColumns: `1fr ${MODULES.map(() => '76px').join(' ')} 90px`,
            backgroundColor: t.sunken,
            borderBottom: `1px solid ${t.border}`,
          }}>
            <div style={{ padding: '10px 16px', fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.fgSubtle }}>
              {isAR ? 'المستخدم' : 'User'}
            </div>
            {MODULES.map(m => (
              <div key={m.key} style={{ padding: '10px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <Icon name={m.icon} size={13} style={{ color: t.fgSubtle }} />
                <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: t.fgSubtle, textAlign: 'center', lineHeight: 1.2 }}>
                  {isAR ? m.labelAR.split(' ')[0] : m.labelEN.split(' ')[0]}
                </span>
              </div>
            ))}
            <div style={{ padding: '10px 6px', fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.fgSubtle, textAlign: 'center' }}>
              {isAR ? 'حفظ' : 'Save'}
            </div>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div ref={bodyRef} onScroll={onBodyScroll} style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 800 }}>
          <div>
          {filtered.map((u) => {
            const isOwner  = u.role === 'owner';
            const isMe     = me?._id === u._id;
            const diff     = hasDiff(u);
            const isSaving = saving[u._id];
            const rc       = ROLE_COLORS[u.role] || '#64748b';
            const rowPerms = isOwner
              ? Object.fromEntries(MODULES.map(m => [m.key, true]))
              : (perms[u._id] || {});

            return (
              <LazyScroll key={u._id} alwaysRender rootMargin="200px">
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `1fr ${MODULES.map(() => '76px').join(' ')} 90px`,
                    alignItems: 'center',
                    borderBottom: `1px solid ${t.border}`,
                    backgroundColor: isOwner
                      ? '#f59e0b08'
                      : diff ? primary + '06' : 'transparent',
                    transition: 'background 120ms',
                  }}
                  onMouseEnter={e => { if (!isOwner && !diff) e.currentTarget.style.backgroundColor = t.sunken; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = isOwner ? '#f59e0b08' : diff ? primary + '06' : 'transparent'; }}
                >
                  {/* User info */}
                  <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 4, flexShrink: 0,
                      backgroundColor: rc + '18', border: `1px solid ${rc}44`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'ui-monospace, monospace', fontSize: 13, fontWeight: 800, color: rc,
                    }}>
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: 13, color: t.fg, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {u.name}
                        </span>
                        {isMe && (
                          <span style={{
                            fontFamily: 'ui-monospace, monospace', fontSize: 8, fontWeight: 700,
                            textTransform: 'uppercase', color: primary,
                            backgroundColor: primary + '14', border: `1px solid ${primary}44`,
                            borderRadius: 3, padding: '1px 5px',
                          }}>
                            {isAR ? 'أنت' : 'You'}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                        <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, color: t.fgSubtle }}>@{u.username}</span>
                        <span style={{
                          fontFamily: 'ui-monospace, monospace', fontSize: 8, fontWeight: 700,
                          textTransform: 'uppercase', letterSpacing: '0.04em',
                          color: rc, backgroundColor: rc + '14', border: `1px solid ${rc}44`,
                          borderRadius: 3, padding: '1px 5px',
                        }}>
                          {isOwner && '👑 '}{u.role}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Permission toggles */}
                  {MODULES.map(m => {
                    const enabled   = !!rowPerms[m.key];
                    const canChange = !isMe && !isOwner && canManagePermissions;
                    return (
                      <div key={m.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 6px' }}>
                        <Switch
                          checked={enabled}
                          onChange={() => toggle(u._id, m.key)}
                          disabled={!canChange}
                        />
                      </div>
                    );
                  })}

                  {/* Save */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 8px' }}>
                    {isOwner ? (
                      <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, color: '#f59e0b', fontWeight: 700 }}>
                        🔒 {isAR ? 'محمي' : 'Protected'}
                      </span>
                    ) : isMe ? (
                      <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: t.fgSubtle }}>—</span>
                    ) : (
                      <button
                        onClick={() => saveRow(u)}
                        disabled={isSaving || !diff}
                        style={{
                          height: 28, padding: '0 10px', borderRadius: 4,
                          fontSize: 11, fontWeight: 700, cursor: diff ? 'pointer' : 'default',
                          fontFamily: 'ui-monospace, monospace', textTransform: 'uppercase',
                          letterSpacing: '0.04em', border: 'none',
                          backgroundColor: diff ? primary : t.sunken,
                          color: diff ? '#fff' : t.fgSubtle,
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          opacity: isSaving ? 0.65 : 1, transition: 'all 120ms',
                        }}
                      >
                        {isSaving
                          ? <div style={{ width: 11, height: 11, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 600ms linear infinite' }} />
                          : <Icon name="save" size={11} />
                        }
                        {isSaving ? '...' : (isAR ? 'حفظ' : 'Save')}
                      </button>
                    )}
                  </div>
                </div>
              </LazyScroll>
            );
          })}

          {filtered.length === 0 && (
            <div style={{
              padding: '40px 0', textAlign: 'center',
              fontFamily: 'ui-monospace, monospace', fontSize: 11,
              textTransform: 'uppercase', letterSpacing: '0.08em', color: t.fgSubtle,
            }}>
              {isAR ? 'لا يوجد مستخدمون' : 'No users found'}
            </div>
          )}
          </div>{/* /rows */}
        </div>{/* /minWidth-800 */}
        </div>{/* /bodyRef overflow-x:auto */}
      </div>{/* /card */}

      <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, color: t.fgSubtle, textAlign: 'center' }}>
        {isAR
          ? 'ملاحظة: الأذونات المخصصة تتجاوز الأذونات الافتراضية للدور. التغييرات تسري فور الحفظ.'
          : 'Note: Custom permissions override the default role permissions. Changes take effect immediately after saving.'}
      </p>
    </div>
  );
}
