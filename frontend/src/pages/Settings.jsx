import { useState, useEffect } from 'react';
import { useAppContext, CURRENCIES } from '../context/AppContext';
import { ICON_PACKS } from '../components/Icon';
import Icon from '../components/Icon';
import { T } from '../theme';
import { api } from '../api';

import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

export default function Settings() {
  const {
    lang, setLang, t: tr, isAR, company, user,
    doUpdateCompany, theme, setTheme, doUpdateProfile,
  } = useAppContext();
  const tok = T[theme] || T.light;
  const primary = company?.primaryColor || '#3b82f6';

  const [activeTab,    setActiveTab]    = useState('general');
  const [localLang,    setLocalLang]    = useState(lang);
  const [companyName,  setCompanyName]  = useState(company?.name           || '');
  const [companyCode,  setCompanyCode]  = useState(company?.code           || '');
  const [currency,     setCurrency]     = useState(company?.baseCurrency   || 'USD');
  const [primaryColor, setPrimaryColor] = useState(company?.primaryColor   || '#3b82f6');
  const [iconPack,     setIconPack]     = useState(company?.activeIconPack || 'material');
  const [liveSync,     setLiveSync]     = useState(company?.liveSync       ?? true);
  const [fastRefresh,  setFastRefresh]  = useState(company?.fastRefresh    ?? true);
  const [projectsEnabled, setProjectsEnabled] = useState(company?.features?.projects ?? false);
  const [reasonsEnabled, setReasonsEnabled] = useState(company?.features?.reasons ?? false);
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState(company?.googleMapsApiKey || '');
  
  // Print Settings
  const [headerText, setHeaderText] = useState(company?.printSettings?.headerText || '');
  const [footerText, setFooterText] = useState(company?.printSettings?.footerText || '');
  const [paperSize, setPaperSize] = useState(company?.printSettings?.paperSize || 'A4');
  
  const [apiKeys, setApiKeys] = useState(company?.apiKeys || []);
  
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
          liveSync, fastRefresh,
          features: {
            projects: projectsEnabled,
            reasons: reasonsEnabled
          },
          googleMapsApiKey,
          apiKeys,
          printSettings: { headerText, footerText, paperSize }
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

  const panel = { backgroundColor: tok.elev, border: `1px solid ${tok.border}`, borderRadius: 4, padding: 24, marginTop: 16 };

  const tabs = [
    { id: 'general', label: isAR ? 'عام' : 'General', icon: 'settings' },
    { id: 'modules', label: isAR ? 'الوحدات والمزامنة' : 'Modules & Sync', icon: 'inventory' },
    { id: 'print', label: isAR ? 'الطباعة' : 'Printing', icon: 'document' },
    { id: 'integrations', label: isAR ? 'الربط البرمجي' : 'Integrations', icon: 'company' },
  ];

  return (
    <div className="tour-settings-page animate-in fade-in duration-300" style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Page title & Save button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: tok.fgSubtle }}>
          {tr.settings}
        </span>
        <button
          onClick={saveAll}
          disabled={saving}
          style={{
            height: 36, padding: '0 20px', borderRadius: 4,
            backgroundColor: primary, color: '#fff', border: 'none',
            fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 8,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)', opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? (
            <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 1s linear infinite' }} />
          ) : <Icon name="check" size={16} />}
          {isAR ? 'حفظ الإعدادات' : 'Save Settings'}
        </button>
      </div>

      {/* ── Tabs ── */}
      {user?.perms?.canManageUsers && (
        <>
          <div className="md:hidden" style={{ fontSize: 10, color: tok.fgMuted, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
            <Icon name="history" size={10} />
            {isAR ? 'مرر أفقياً لرؤية المزيد من التبويبات' : 'Swipe horizontally for more tabs'}
          </div>
          <div className="hide-scrollbar" style={{ display: 'flex', gap: 8, borderBottom: `1px solid ${tok.border}`, paddingBottom: 0, overflowX: 'auto', whiteSpace: 'nowrap' }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                height: 40, padding: '0 16px', background: 'transparent',
                border: 'none', borderBottom: activeTab === t.id ? `2px solid ${primary}` : '2px solid transparent',
                color: activeTab === t.id ? primary : tok.fgMuted,
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 8,
                transition: 'all 120ms'
              }}
            >
              <Icon name={t.icon} size={15} />
              {t.label}
            </button>
          ))}
        </div>
        </>
      )}

      {/* ── Tab Content ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>

        {/* --- GENERAL TAB --- */}
        {(activeTab === 'general' || !user?.perms?.canManageUsers) && (
          <>
          <div style={{ display: 'grid', gridTemplateColumns: user?.perms?.canManageUsers ? 'repeat(auto-fit, minmax(260px, 1fr))' : '1fr', gap: 16, alignItems: 'start' }}>
            {/* Personal settings */}
            <div style={{ ...panel, marginTop: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, paddingBottom: 14, borderBottom: `1px solid ${tok.border}` }}>
                <Icon name="user" size={16} style={{ color: primary }} />
                <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: tok.fg }}>
                  {tr.personalSettings}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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

                <div>
                  {label(isAR ? 'مظهر الواجهة' : 'Interface Theme')}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
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

                {user?.perms?.canManageUsers && cloudUsage && (
                  <div style={{ marginTop: 8, padding: 12, borderRadius: 4, backgroundColor: tok.sunken, border: `1px solid ${tok.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: tok.fg }}>{isAR ? 'مساحة التخزين السحابية' : 'Cloud Storage'}</span>
                      <span style={{ fontSize: 11, color: tok.fgSubtle }}>{cloudUsage.storage?.used || 0} / {cloudUsage.storage?.limit || 1} MB</span>
                    </div>
                    <div style={{ height: 6, backgroundColor: tok.canvas, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${storPct}%`, backgroundColor: storPct > 90 ? tok.neg : primary, transition: 'width 300ms' }} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Company Settings */}
            {user?.perms?.canManageUsers && (
              <div style={{ ...panel, marginTop: 0 }}>
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

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
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
                          <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                        ))}
                      </select>
                    </div>
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
            )}
          </div>
          
          {/* Icon Pack Selector (Moved outside auto-fit grid) */}
          {user?.perms?.canManageUsers && (
            <div style={{ backgroundColor: tok.elev, border: `1px solid ${tok.border}`, borderRadius: 4, padding: 24, marginTop: 16 }}>
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
                            key={name} name={name} pack={pack.key} size={16}
                            style={{ color: active ? primary : tok.fgSubtle }}
                          />
                        ))}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: active ? primary : tok.fg }}>
                        {pack.label}
                      </div>
                      <div style={{ fontSize: 10, color: tok.fgMuted, marginTop: 2 }}>
                        {pack.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          </>
        )}

        {/* --- MODULES & SYNC TAB --- */}
        {activeTab === 'modules' && user?.perms?.canManageUsers && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, alignItems: 'start' }}>
            {/* 
            <div style={{ ...panel, marginTop: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, paddingBottom: 14, borderBottom: `1px solid ${tok.border}` }}>
                <Icon name="history" size={16} style={{ color: primary }} />
                <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: tok.fg }}>
                  {isAR ? 'الأداء والمزامنة' : 'Performance & Sync'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: tok.fg }}>
                  <input type="checkbox" checked={liveSync} onChange={e => setLiveSync(e.target.checked)} style={{ width: 16, height: 16, accentColor: primary, cursor: 'pointer' }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{isAR ? 'المزامنة الحية (Live Sync)' : 'Live Sync (WebSockets)'}</div>
                    <div style={{ fontSize: 11, color: tok.fgMuted }}>{isAR ? 'تحديث البيانات فوراً عند تغييرها من مستخدمين آخرين' : 'Instantly update data when changed by other users'}</div>
                  </div>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: tok.fg }}>
                  <input type="checkbox" checked={fastRefresh} onChange={e => setFastRefresh(e.target.checked)} style={{ width: 16, height: 16, accentColor: primary, cursor: 'pointer' }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{isAR ? 'التحديث التلقائي (Fast Refresh)' : 'Fast Refresh (Polling)'}</div>
                    <div style={{ fontSize: 11, color: tok.fgMuted }}>{isAR ? 'جلب أحدث البيانات كل 30 ثانية في الخلفية' : 'Fetch latest data every 30 seconds in the background'}</div>
                  </div>
                </label>
              </div>
            </div>
            */}

            <div style={{ ...panel, marginTop: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, paddingBottom: 14, borderBottom: `1px solid ${tok.border}` }}>
                <Icon name="boxes" size={16} style={{ color: primary }} />
                <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: tok.fg }}>
                  {isAR ? 'الوحدات الإضافية' : 'Modular Features'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: tok.fg }}>
                  <input type="checkbox" checked={projectsEnabled} onChange={e => setProjectsEnabled(e.target.checked)} style={{ width: 16, height: 16, accentColor: primary, cursor: 'pointer' }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{isAR ? 'المشاريع (Projects)' : 'Projects Module'}</div>
                    <div style={{ fontSize: 11, color: tok.fgMuted }}>{isAR ? 'تفعيل إدارة المشاريع وربطها بحركات الإخراج' : 'Enable tracking outbound stock to specific projects'}</div>
                  </div>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: tok.fg }}>
                  <input type="checkbox" checked={reasonsEnabled} onChange={e => setReasonsEnabled(e.target.checked)} style={{ width: 16, height: 16, accentColor: primary, cursor: 'pointer' }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{isAR ? 'أسباب الحركات (Reasons)' : 'Reasons Module'}</div>
                    <div style={{ fontSize: 11, color: tok.fgMuted }}>{isAR ? 'طلب توضيح سبب الحركة للمخزون' : 'Enable specifying predefined reasons for in/out transactions'}</div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* --- PRINT TAB --- */}
        {activeTab === 'print' && user?.perms?.canManageUsers && (
          <div style={{ ...panel, marginTop: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, paddingBottom: 14, borderBottom: `1px solid ${tok.border}` }}>
              <Icon name="document" size={16} style={{ color: primary }} />
              <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: tok.fg }}>
                {isAR ? 'إعدادات الطباعة' : 'Print Settings'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 30, alignItems: 'start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  {label(isAR ? 'حجم الورق' : 'Paper Size')}
                  <select value={paperSize} onChange={e => setPaperSize(e.target.value)} style={{ ...fieldInput('paper'), maxWidth: 300 }}>
                    {['A3', 'A4', 'A5', 'B4', 'B5', 'Letter', 'Legal', 'Executive', 'Tabloid'].map(sz => (
                      <option key={sz} value={sz}>{sz}</option>
                    ))}
                  </select>
                </div>

                <div>
                  {label(isAR ? 'رأس الصفحة (Header)' : 'Document Header')}
                  <div style={{ backgroundColor: '#fff', color: '#000' }}>
                    <ReactQuill theme="snow" value={headerText} onChange={setHeaderText} />
                  </div>
                </div>
                
                <div>
                  {label(isAR ? 'تذييل الصفحة (Footer)' : 'Document Footer')}
                  <div style={{ backgroundColor: '#fff', color: '#000' }}>
                    <ReactQuill theme="snow" value={footerText} onChange={setFooterText} />
                  </div>
                </div>
              </div>

              {/* LIVE PREVIEW PAPER */}
              {(() => {
                const paperMap = { A3: [297,420], A4: [210,297], A5: [148,210], B4: [250,353], B5: [176,250], Letter: [216,279], Legal: [216,356], Executive: [184,267], Tabloid: [279,432] };
                const [pw, ph] = paperMap[paperSize] || paperMap['A4'];
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                      <Icon name="eye" size={14} style={{ color: tok.fgMuted }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: tok.fg }}>{isAR ? 'معاينة حية' : 'Live Preview'} - {paperSize}</span>
                    </div>
                    <div style={{
                      width: pw * 1.3,
                      height: ph * 1.3,
                      backgroundColor: '#fff',
                      color: '#000',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                      borderRadius: 4,
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '24px',
                      border: `1px solid ${tok.border}`,
                      overflow: 'hidden',
                      position: 'relative',
                      transition: 'all 0.3s ease'
                    }}>
                      <div className="ql-editor" style={{ padding: 0, minHeight: 'auto', marginBottom: 10, borderBottom: '1px solid #eaeaea', paddingBottom: 10 }} dangerouslySetInnerHTML={{ __html: headerText || `<span style="color:#aaa;">${isAR ? 'بدون رأس صفحة' : 'No Header'}</span>` }} />
                      
                      <div style={{ flex: 1, backgroundColor: '#f9fafb', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', border: '1px dashed #e5e7eb', fontSize: 12, fontFamily: 'ui-monospace, monospace' }}>
                        {isAR ? '[محتوى المستند هنا]' : '[Document Content Here]'}
                      </div>

                      <div className="ql-editor" style={{ padding: 0, minHeight: 'auto', marginTop: 10, borderTop: '1px solid #eaeaea', paddingTop: 10 }} dangerouslySetInnerHTML={{ __html: footerText || `<span style="color:#aaa;">${isAR ? 'بدون تذييل صفحة' : 'No Footer'}</span>` }} />
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* --- INTEGRATIONS TAB --- */}
        {activeTab === 'integrations' && user?.perms?.canManageUsers && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, alignItems: 'start' }}>
            {/* Google Maps */}
            <div style={{ ...panel, marginTop: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, paddingBottom: 14, borderBottom: `1px solid ${tok.border}` }}>
                <Icon name="location" size={16} style={{ color: primary }} />
                <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: tok.fg }}>
                  {isAR ? 'إعدادات الخرائط' : 'Maps Integration'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  {label(isAR ? 'Google Maps API Key' : 'Google Maps API Key')}
                  <input
                    value={googleMapsApiKey}
                    onChange={e => setGoogleMapsApiKey(e.target.value)}
                    placeholder={isAR ? 'أدخل مفتاح Google Maps API' : 'Enter Google Maps API Key'}
                    style={fieldInput('gmaps')}
                    onFocus={() => setFocused('gmaps')}
                    onBlur={() => setFocused('')}
                  />
                </div>
                <div style={{ fontSize: 11, color: tok.fgMuted }}>
                  {isAR ? 'تلميح: يمكنك الحصول على مفتاح API من خلال' : 'Hint: You can get an API key from'}{' '}
                  <a href="https://developers.google.com/maps/documentation/embed/get-api-key" target="_blank" rel="noreferrer" style={{ color: primary, textDecoration: 'none' }}>Google Cloud Console</a>.
                </div>
              </div>
            </div>

            {/* APIs */}
            <div style={{ ...panel, marginTop: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, paddingBottom: 14, borderBottom: `1px solid ${tok.border}` }}>
                <Icon name="code" size={16} style={{ color: primary }} />
                <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: tok.fg }}>
                  {isAR ? 'إعدادات الربط' : 'API Settings'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {apiKeys.map((key, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input readOnly value={key} style={{ ...fieldInput('api'+idx), fontFamily: 'ui-monospace, monospace', flex: 1 }} />
                    <button type="button" onClick={() => setApiKeys(apiKeys.filter((_, i) => i !== idx))} style={{ color: tok.neg, background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}>
                      <Icon name="delete" size={16} />
                    </button>
                  </div>
                ))}
                {apiKeys.length === 0 && (
                  <div style={{ fontSize: 12, color: tok.fgMuted, backgroundColor: tok.canvas, padding: 12, borderRadius: 4, border: `1px dashed ${tok.border}` }}>
                    {isAR ? 'لا توجد مفاتيح API. أنشئ مفتاحاً جديداً.' : 'No API keys yet. Generate a new key.'}
                  </div>
                )}
                <div>
                  <button type="button" onClick={() => {
                    const newKey = 'nex_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                    setApiKeys([...apiKeys, newKey]);
                  }} style={{ height: 32, padding: '0 14px', borderRadius: 4, backgroundColor: 'transparent', border: `1px solid ${primary}`, color: primary, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                    {isAR ? '+ توليد مفتاح جديد' : '+ Generate New Key'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
