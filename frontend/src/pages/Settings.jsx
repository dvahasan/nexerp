import { useState, useEffect } from 'react';
import { useAppContext, CURRENCIES } from '../context/AppContext';
import { ICON_PACKS } from '../components/Icon';
import Icon from '../components/Icon';
import { T } from '../theme';
import { api } from '../api';

export default function Settings() {
  const {
    lang, setLang, t: tr, isAR, company, user,
    doUpdateCompany, theme, setTheme, doUpdateProfile,
  } = useAppContext();
  const tok = T[theme] || T.light;
  const primary = company?.primaryColor || '#3b82f6';

  const [localLang,    setLocalLang]    = useState(lang);
  const [companyName,  setCompanyName]  = useState(company?.name           || '');
  const [companyCode,  setCompanyCode]  = useState(company?.code           || '');
  const [currency,     setCurrency]     = useState(company?.baseCurrency   || 'USD');
  const [primaryColor, setPrimaryColor] = useState(company?.primaryColor   || '#3b82f6');
  const [iconPack,     setIconPack]     = useState(company?.activeIconPack || 'material');
  const [saving,       setSaving]       = useState(false);
  const [cloudUsage,   setCloudUsage]   = useState(null);
  const [focused,      setFocused]      = useState('');

  useEffect(() => {
    if (user?.perms?.canManageUsers) {
      api.getCloudinaryUsage()
         .then(d => setCloudUsage(d))
         .catch(e => console.warn('Cloudinary usage unavailable', e));
    }
  }, [user]);

  useEffect(() => {
    document.documentElement.style.setProperty('--color-primary', primaryColor);
  }, [primaryColor]);

  const saveAll = async () => {
    setSaving(true);
    try {
      await doUpdateProfile({
        name: user?.name || '', username: user?.username || '',
        email: user?.email || '', preferredLanguage: localLang,
      });
      if (user?.perms?.canManageUsers) {
        await doUpdateCompany({
          name: companyName, code: companyCode,
          baseCurrency: currency, primaryColor, activeIconPack: iconPack, theme,
        });
      }
    } catch { /* toast shown */ }
    finally { setSaving(false); }
  };

  const storPct = cloudUsage
    ? Math.min(100, Math.round((cloudUsage.storage?.used || 0) / (cloudUsage.storage?.limit || 1) * 100))
    : 0;

  // ── helpers
  const fieldInput = (name, extra = {}) => ({
    width: '100%', height: 36, padding: '0 10px', borderRadius: 4,
    border: `1px solid ${focused === name ? primary : tok.border}`,
    backgroundColor: tok.canvas, color: tok.fg, fontSize: 13,
    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
    boxShadow: focused === name ? `0 0 0 1px ${primary}` : 'none',
    transition: 'border-color 120ms, box-shadow 120ms',
    ...extra,
  });
  const label = (text) => (
    <label style={{
      display: 'block', fontFamily: 'ui-monospace, monospace',
      fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
      letterSpacing: '0.08em', color: tok.fgSubtle, marginBottom: 6,
    }}>
      {text}
    </label>
  );

  const panel = { backgroundColor: tok.elev, border: `1px solid ${tok.border}`, borderRadius: 4, padding: 24 };

  return (
    <div className="animate-in fade-in duration-300" style={{ maxWidth: 900, display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Page title */}
      <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: tok.fgSubtle }}>
        {tr.settings}
      </span>

      {/* ── Top two columns ── */}
      <div style={{ display: 'grid', gridTemplateColumns: user?.perms?.canManageUsers ? 'repeat(auto-fit, minmax(280px, 1fr))' : '1fr', gap: 16 }}>

        {/* Personal settings */}
        <div style={panel}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, paddingBottom: 14, borderBottom: `1px solid ${tok.border}` }}>
            <Icon name="user" size={16} style={{ color: primary }} />
            <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: tok.fg }}>
              {tr.personalSettings}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Language */}
            <div>
              {label(tr.language)}
              <select
                value={localLang}
                onChange={e => { setLocalLang(e.target.value); setLang(e.target.value); }}
                style={fieldInput('lang')}
                onFocus={() => setFocused('lang')}
                onBlur={() => setFocused('')}
              >
                <option value="en">English</option>
                <option value="ar">العربية</option>
              </select>
            </div>

            {/* Theme */}
            <div>
              {label(isAR ? 'مظهر الواجهة' : 'Interface Theme')}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {['light', 'dark'].map(th => (
                  <button
                    key={th}
                    type="button"
                    onClick={() => setTheme(th)}
                    style={{
                      height: 36, borderRadius: 4, fontSize: 12, fontWeight: 700,
                      fontFamily: 'ui-monospace, monospace', textTransform: 'uppercase',
                      letterSpacing: '0.06em', cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      border: theme === th ? `1px solid ${primary}` : `1px solid ${tok.border}`,
                      backgroundColor: theme === th ? primary + '1a' : tok.canvas,
                      color: theme === th ? primary : tok.fgMuted,
                      transition: 'all 120ms',
                    }}
                  >
                    <Icon name={th === 'dark' ? 'dark' : 'light'} size={15} />
                    {th === 'dark' ? (isAR ? 'داكن' : 'Dark') : (isAR ? 'فاتح' : 'Light')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Company settings (admin only) */}
        {user?.perms?.canManageUsers && (
          <div style={panel}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, paddingBottom: 14, borderBottom: `1px solid ${tok.border}` }}>
              <Icon name="company" size={16} style={{ color: primary }} />
              <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: tok.fg }}>
                {tr.companySettings}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                {label(isAR ? 'اسم الشركة' : 'Company Name')}
                <input
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  style={fieldInput('cname')}
                  onFocus={() => setFocused('cname')}
                  onBlur={() => setFocused('')}
                />
              </div>

              <div>
                {label(isAR ? 'رمز الشركة' : 'Company Code')}
                <input
                  value={companyCode}
                  onChange={e => setCompanyCode(e.target.value.toUpperCase())}
                  style={{ ...fieldInput('ccode'), textTransform: 'uppercase', fontFamily: 'ui-monospace, monospace', letterSpacing: '0.12em' }}
                  onFocus={() => setFocused('ccode')}
                  onBlur={() => setFocused('')}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                <div>
                  {label(tr.baseCurrency)}
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    style={fieldInput('currency')}
                    onFocus={() => setFocused('currency')}
                    onBlur={() => setFocused('')}
                  >
                    {CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>{c.code} ({c.symbol}) — {c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  {label(tr.primaryColor)}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={e => setPrimaryColor(e.target.value)}
                      style={{ width: 36, height: 36, borderRadius: 4, cursor: 'pointer', border: `1px solid ${tok.border}`, padding: 2, backgroundColor: tok.canvas }}
                    />
                    <span style={{
                      flex: 1, height: 36, display: 'flex', alignItems: 'center',
                      fontFamily: 'ui-monospace, monospace', fontSize: 11, fontWeight: 700,
                      color: tok.fgMuted, textTransform: 'uppercase',
                      backgroundColor: tok.sunken, border: `1px solid ${tok.border}`,
                      borderRadius: 4, padding: '0 10px',
                    }}>
                      {primaryColor}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Icon Pack Selector (admin only) ── */}
      {user?.perms?.canManageUsers && (
        <div style={panel}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, paddingBottom: 14, borderBottom: `1px solid ${tok.border}` }}>
            <Icon name="theme" size={16} style={{ color: primary }} />
            <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: tok.fg }}>
              {tr.iconPack}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
            {ICON_PACKS.map(pack => {
              const active = iconPack === pack.key;
              return (
                <button
                  key={pack.key}
                  type="button"
                  onClick={() => setIconPack(pack.key)}
                  style={{
                    padding: '14px 12px', borderRadius: 4, textAlign: 'left', cursor: 'pointer',
                    border: active ? `1px solid ${primary}` : `1px solid ${tok.border}`,
                    backgroundColor: active ? primary + '10' : tok.canvas,
                    transition: 'all 120ms',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    {['dashboard', 'inventory', 'settings', 'add'].map(name => (
                      <Icon
                        key={name} name={name} size={17} pack={pack.key}
                        style={{ color: active ? primary : tok.fgSubtle }}
                      />
                    ))}
                  </div>
                  <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, fontWeight: 700, color: active ? primary : tok.fg, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {pack.label}
                  </div>
                  <div style={{ fontSize: 10, color: tok.fgSubtle, marginTop: 2 }}>{pack.desc}</div>
                  {active && (
                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: primary, fontWeight: 700, fontFamily: 'ui-monospace, monospace' }}>
                      <Icon name="check" size={11} /> {isAR ? 'محدد' : 'SELECTED'}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Save button ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={saveAll}
          disabled={saving}
          style={{
            height: 36, padding: '0 24px', borderRadius: 4,
            backgroundColor: primary, color: '#fff', border: 'none',
            cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700,
            fontFamily: 'ui-monospace, monospace', textTransform: 'uppercase', letterSpacing: '0.06em',
            display: 'inline-flex', alignItems: 'center', gap: 8,
            opacity: saving ? 0.65 : 1, transition: 'opacity 120ms',
          }}
          onMouseEnter={e => { if (!saving) e.currentTarget.style.opacity = '0.85'; }}
          onMouseLeave={e => e.currentTarget.style.opacity = saving ? '0.65' : '1'}
        >
          {saving
            ? <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 600ms linear infinite' }} />
            : <Icon name="save" size={16} />
          }
          {isAR ? 'حفظ التغييرات' : 'Save Changes'}
        </button>
      </div>

      {/* ── Cloud storage (admin, when available) ── */}
      {user?.perms?.canManageUsers && cloudUsage && (
        <div style={{ ...panel, backgroundColor: tok.sunken }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 14, borderBottom: `1px solid ${tok.border}` }}>
            <Icon name="upload" size={16} style={{ color: primary }} />
            <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: tok.fg }}>
              {tr.cloudStorage}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, color: tok.fgMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {isAR ? 'مساحة التخزين' : 'Storage'}
              </span>
              <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, fontWeight: 800, color: tok.fg }}>
                {storPct}%
              </span>
            </div>
            <div style={{ height: 4, backgroundColor: tok.border, borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 2, transition: 'width 1s',
                backgroundColor: storPct > 80 ? tok.neg : storPct > 60 ? '#f59e0b' : primary,
                width: `${storPct}%`,
              }} />
            </div>
            {cloudUsage.resources && (
              <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, color: tok.fgSubtle }}>
                {isAR ? 'عدد الملفات:' : 'Files:'} {cloudUsage.resources}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
