import { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { useAppContext } from '../context/AppContext';
import { T } from '../theme';
import Icon from '../components/Icon';

const ROLES = ['admin', 'manager', 'warehouse', 'viewer'];

const roleDefaults = {
  admin:     { canAdd: true,  canEdit: true,  canDelete: true,  canTxIn: true,  canTxOut: true,  canManageUsers: true,  canManageCompany: true  },
  manager:   { canAdd: true,  canEdit: true,  canDelete: false, canTxIn: true,  canTxOut: true,  canManageUsers: false, canManageCompany: false },
  warehouse: { canAdd: false, canEdit: false, canDelete: false, canTxIn: true,  canTxOut: true,  canManageUsers: false, canManageCompany: false },
  viewer:    { canAdd: false, canEdit: false, canDelete: false, canTxIn: false, canTxOut: false, canManageUsers: false, canManageCompany: false },
};

const roleColors = {
  admin:     '#8b5cf6', manager:   '#3b82f6',
  warehouse: '#10b981', viewer:    '#64748b',
};

const defaultForm = {
  name: '', username: '', email: '', password: '',
  role: 'warehouse', active: true,
  perms: { ...roleDefaults.warehouse },
};

export default function UserModal({ open, onClose, editUser = null, onSaved }) {
  const { saveUser, t: tr, isAR, theme, company } = useAppContext();
  const t = T[theme] || T.light;
  const primary = company?.primaryColor || '#3b82f6';

  const [form,    setForm]    = useState(defaultForm);
  const [saving,  setSaving]  = useState(false);
  const [focused, setFocused] = useState('');

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
      const payload = { ...rest, permissions: perms };
      if (!payload.password) delete payload.password;
      await saveUser(payload, editUser?._id);
      onClose();
      onSaved?.();
    } catch { /* toast shown */ }
    finally { setSaving(false); }
  };

  const inp = (name, extra = {}) => ({
    width: '100%', height: 34, padding: '0 10px', borderRadius: 4,
    border: `1px solid ${focused === name ? primary : t.border}`,
    backgroundColor: t.canvas, color: t.fg, fontSize: 13,
    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
    boxShadow: focused === name ? `0 0 0 1px ${primary}` : 'none',
    transition: 'border-color 120ms, box-shadow 120ms',
    ...extra,
  });

  const lbl = (text) => (
    <label style={{
      display: 'block', fontFamily: 'ui-monospace, monospace',
      fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
      letterSpacing: '0.08em', color: t.fgSubtle, marginBottom: 5,
    }}>
      {text}
    </label>
  );

  const permLabels = {
    canAdd:           tr.canAdd,
    canEdit:          tr.canEdit,
    canDelete:        tr.canDelete,
    canTxIn:          isAR ? '↓ تسجيل وارد (Stock In)'  : '↓ Stock In',
    canTxOut:         isAR ? '↑ تسجيل صادر (Stock Out)' : '↑ Stock Out',
    canManageUsers:   tr.canManageUsers,
    canManageCompany: isAR ? 'ملف الشركة' : 'Company Profile',
  };

  // ── Owner view (read-only) ──
  if (editUser?.role === 'owner') {
    return (
      <Modal open={open} onClose={onClose} title={isAR ? 'حساب المالك' : 'Owner Account'}>
        <div style={{ textAlign: 'center', padding: '24px 16px' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 4, margin: '0 auto 16px',
            backgroundColor: '#f59e0b18', border: '1px solid #f59e0b44',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28,
          }}>
            👑
          </div>
          <div style={{ fontSize: 18, fontWeight: 900, color: t.fg, marginBottom: 4 }}>
            {editUser.name}
          </div>
          <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: t.fgMuted, marginBottom: 16 }}>
            @{editUser.username}
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 14px',
            backgroundColor: '#f59e0b18', border: '1px solid #f59e0b44', borderRadius: 3,
            fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.06em', color: '#f59e0b',
            marginBottom: 16,
          }}>
            👑 {isAR ? 'مالك الشركة' : 'Company Owner'}
          </div>
          <p style={{ fontSize: 12, color: t.fgMuted, lineHeight: 1.6, maxWidth: 300, margin: '0 auto 24px' }}>
            {isAR
              ? 'هذا الحساب هو مسجّل الشركة ويمتلك جميع الصلاحيات بشكل دائم. لا يمكن تعديله أو حذفه.'
              : 'This account registered the company and permanently holds all permissions. It cannot be edited or deleted.'}
          </p>
          <button
            onClick={onClose}
            style={{
              height: 32, padding: '0 20px', borderRadius: 4,
              backgroundColor: 'transparent', color: t.fgMuted,
              border: `1px solid ${t.border}`, cursor: 'pointer', fontSize: 13, fontWeight: 500,
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = t.sunken}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            {isAR ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title={editUser ? tr.editUser : tr.addUser} wide>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Name / Username */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            {lbl(`${isAR ? 'الاسم الكامل' : 'Full Name'} *`)}
            <input required value={form.name} onChange={e => set('name', e.target.value)}
              style={inp('name')} onFocus={() => setFocused('name')} onBlur={() => setFocused('')} />
          </div>
          <div>
            {lbl(`${tr.username} *`)}
            <input required value={form.username}
              onChange={e => set('username', e.target.value.toLowerCase().replace(/\s/g, ''))}
              style={inp('username', { fontFamily: 'ui-monospace, monospace' })}
              onFocus={() => setFocused('username')} onBlur={() => setFocused('')} />
          </div>
        </div>

        {/* Email / Password */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            {lbl(tr.email)}
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
              style={inp('email')} onFocus={() => setFocused('email')} onBlur={() => setFocused('')} />
          </div>
          <div>
            {lbl(`${tr.password}${editUser ? (isAR ? ' (اتركه فارغاً)' : ' (leave blank)') : ' *'}`)}
            <input type="password" required={!editUser} value={form.password}
              onChange={e => set('password', e.target.value)} autoComplete="new-password"
              style={inp('pass')} onFocus={() => setFocused('pass')} onBlur={() => setFocused('')} />
          </div>
        </div>

        {/* Role selector */}
        <div>
          {lbl(tr.role)}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {ROLES.map(r => {
              const rc = roleColors[r] || primary;
              const active = form.role === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => applyRoleDefaults(r)}
                  style={{
                    height: 32, borderRadius: 4, fontSize: 11, fontWeight: 700,
                    fontFamily: 'ui-monospace, monospace', textTransform: 'uppercase',
                    letterSpacing: '0.04em', cursor: 'pointer',
                    border: active ? `1px solid ${rc}` : `1px solid ${t.border}`,
                    backgroundColor: active ? rc + '18' : t.canvas,
                    color: active ? rc : t.fgMuted,
                    transition: 'all 120ms',
                  }}
                >
                  {r}
                </button>
              );
            })}
          </div>
        </div>

        {/* Permissions grid */}
        <div>
          {lbl(tr.permissions)}
          <div style={{
            backgroundColor: t.sunken, border: `1px solid ${t.border}`,
            borderRadius: 4, padding: '14px 14px',
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
          }}>
            {Object.entries(permLabels).map(([key, label]) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                {/* Toggle switch */}
                <div
                  onClick={() => setPerm(key, !form.perms[key])}
                  style={{
                    position: 'relative', width: 36, height: 20, borderRadius: 10, flexShrink: 0,
                    backgroundColor: form.perms[key] ? primary : t.border,
                    transition: 'background 120ms', cursor: 'pointer',
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 3, left: form.perms[key] ? 19 : 3,
                    width: 14, height: 14, borderRadius: '50%',
                    backgroundColor: '#fff', transition: 'left 120ms',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </div>
                <span style={{ fontSize: 12, color: form.perms[key] ? t.fg : t.fgMuted, fontWeight: form.perms[key] ? 600 : 400 }}>
                  {label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Active toggle */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <div
            onClick={() => set('active', !form.active)}
            style={{
              position: 'relative', width: 36, height: 20, borderRadius: 10, flexShrink: 0,
              backgroundColor: form.active ? '#16774A' : t.border,
              transition: 'background 120ms', cursor: 'pointer',
            }}
          >
            <div style={{
              position: 'absolute', top: 3, left: form.active ? 19 : 3,
              width: 14, height: 14, borderRadius: '50%',
              backgroundColor: '#fff', transition: 'left 120ms',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </div>
          <span style={{ fontSize: 13, color: t.fg, fontWeight: 600 }}>
            {isAR ? 'حساب نشط' : 'Account Active'}
          </span>
        </label>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8, borderTop: `1px solid ${t.border}`, marginTop: 4 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              height: 32, padding: '0 14px', borderRadius: 4,
              backgroundColor: 'transparent', color: t.fgMuted,
              border: `1px solid ${t.border}`, cursor: 'pointer',
              fontSize: 13, fontWeight: 500, transition: 'background 120ms',
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = t.sunken}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            {tr.cancel}
          </button>
          <button
            type="submit"
            disabled={saving}
            style={{
              height: 32, padding: '0 16px', borderRadius: 4,
              backgroundColor: primary, color: '#fff', border: 'none',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 600,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              opacity: saving ? 0.65 : 1, transition: 'opacity 120ms',
            }}
          >
            {saving && (
              <div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 600ms linear infinite' }} />
            )}
            {tr.save}
          </button>
        </div>
      </form>
    </Modal>
  );
}
