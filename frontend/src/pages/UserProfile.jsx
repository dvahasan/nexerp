import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { T } from '../theme';
import Icon from '../components/Icon';

export default function UserProfile() {
  const { user, doUpdateProfile, isAR, theme, company } = useAppContext();
  const t = T[theme] || T.light;
  const primary = company?.primaryColor || '#3b82f6';

  const [form, setForm] = useState({
    name:     user?.name     || '',
    username: user?.username || '',
    email:    user?.email    || '',
    password: '',
  });
  const [saving,  setSaving]  = useState(false);
  const [focused, setFocused] = useState('');

  const handleSave = async () => {
    setSaving(true);
    try {
      await doUpdateProfile(form);
      setForm(f => ({ ...f, password: '' }));
    } catch { /* toast handled */ }
    finally { setSaving(false); }
  };

  const fieldInput = (name, extra = {}) => ({
    width: '100%', height: 36, padding: '0 10px', borderRadius: 4,
    border: `1px solid ${focused === name ? primary : t.border}`,
    backgroundColor: t.canvas, color: t.fg, fontSize: 13,
    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
    boxShadow: focused === name ? `0 0 0 1px ${primary}` : 'none',
    transition: 'border-color 120ms, box-shadow 120ms',
    ...extra,
  });

  const label = (text) => (
    <label style={{
      display: 'block', fontFamily: 'ui-monospace, monospace',
      fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
      letterSpacing: '0.08em', color: t.fgSubtle, marginBottom: 6,
    }}>
      {text}
    </label>
  );

  // Avatar color based on role
  const avatarColors = {
    owner:     '#3b82f6', admin:   '#6366f1', manager: '#10b981',
    warehouse: '#f59e0b', viewer: '#64748b',
  };
  const avatarColor = avatarColors[user?.role] || primary;

  return (
    <div className="tour-profile-page animate-in fade-in duration-300" style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Header card ── */}
      <div style={{
        backgroundColor: t.elev, border: `1px solid ${t.border}`, borderRadius: 4,
        padding: 24, display: 'flex', alignItems: 'center', gap: 20, overflow: 'hidden', position: 'relative',
      }}>
        {/* Subtle background tint */}
        <div style={{
          position: 'absolute', top: -20, right: -20, width: 100, height: 100,
          borderRadius: '50%', backgroundColor: avatarColor + '12', pointerEvents: 'none',
        }} />

        {/* Avatar */}
        <div style={{
          width: 64, height: 64, borderRadius: 4, flexShrink: 0,
          backgroundColor: avatarColor + '18', border: `1px solid ${avatarColor}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'ui-monospace, monospace', fontSize: 24, fontWeight: 900,
          color: avatarColor, position: 'relative',
        }}>
          {user?.name?.charAt(0)?.toUpperCase()}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: t.fg, wordBreak: 'break-word' }}>
            {user?.name}
          </div>
          <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: t.fgMuted, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="user" size={12} /> @{user?.username}
          </div>
          <div style={{
            marginTop: 8, display: 'inline-flex', alignItems: 'center',
            padding: '2px 8px', borderRadius: 3,
            backgroundColor: avatarColor + '14', border: `1px solid ${avatarColor}44`,
            fontFamily: 'ui-monospace, monospace', fontSize: 9, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.08em', color: avatarColor,
          }}>
            {user?.role}
          </div>
        </div>
      </div>

      {/* ── Edit form ── */}
      <div style={{ backgroundColor: t.elev, border: `1px solid ${t.border}`, borderRadius: 4, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, paddingBottom: 14, borderBottom: `1px solid ${t.border}` }}>
          <Icon name="settings" size={15} style={{ color: primary }} />
          <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.fg }}>
            {isAR ? 'إعدادات الحساب' : 'Account Settings'}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div>
              {label(isAR ? 'الاسم بالكامل' : 'Full Name')}
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                style={fieldInput('name')}
                onFocus={() => setFocused('name')}
                onBlur={() => setFocused('')}
              />
            </div>
            <div>
              {label(isAR ? 'اسم المستخدم' : 'Username')}
              <input
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                style={{ ...fieldInput('username'), fontFamily: 'ui-monospace, monospace' }}
                onFocus={() => setFocused('username')}
                onBlur={() => setFocused('')}
              />
            </div>
          </div>

          <div>
            {label(isAR ? 'البريد الإلكتروني' : 'Email Address')}
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="user@company.com"
              style={fieldInput('email')}
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused('')}
            />
          </div>

          <div>
            {label(isAR ? 'كلمة المرور الجديدة' : 'New Password')}
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder={isAR ? 'اتركه فارغاً للاحتفاظ بكلمة المرور الحالية' : 'Leave blank to keep current password'}
              style={fieldInput('password')}
              onFocus={() => setFocused('password')}
              onBlur={() => setFocused('')}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 12, marginTop: 4, borderTop: `1px solid ${t.border}` }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                height: 34, padding: '0 20px', borderRadius: 4,
                backgroundColor: primary, color: '#fff', border: 'none',
                cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700,
                fontFamily: 'ui-monospace, monospace', textTransform: 'uppercase', letterSpacing: '0.06em',
                display: 'inline-flex', alignItems: 'center', gap: 8,
                opacity: saving ? 0.65 : 1, transition: 'opacity 120ms',
              }}
            >
              {saving
                ? <><div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 600ms linear infinite' }} /> {isAR ? 'جارٍ الحفظ...' : 'Saving...'}</>
                : <><Icon name="save" size={14} /> {isAR ? 'حفظ التغييرات' : 'Save Changes'}</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
