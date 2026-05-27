import { useState, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { T } from '../theme';
import Icon from '../components/Icon';
import LazyScroll from '../components/LazyScroll';

const CURRENCIES = [
  { code: 'USD', symbol: '$',   name: 'US Dollar'       },
  { code: 'EUR', symbol: '€',   name: 'Euro'            },
  { code: 'GBP', symbol: '£',   name: 'British Pound'   },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham'      },
  { code: 'SAR', symbol: '﷼',   name: 'Saudi Riyal'     },
  { code: 'EGP', symbol: 'E£',  name: 'Egyptian Pound'  },
  { code: 'KWD', symbol: 'KD',  name: 'Kuwaiti Dinar'   },
  { code: 'QAR', symbol: 'QR',  name: 'Qatari Riyal'    },
  { code: 'BHD', symbol: 'BD',  name: 'Bahraini Dinar'  },
  { code: 'OMR', symbol: 'OMR', name: 'Omani Rial'      },
  { code: 'JOD', symbol: 'JD',  name: 'Jordanian Dinar' },
  { code: 'TRY', symbol: '₺',   name: 'Turkish Lira'    },
  { code: 'INR', symbol: '₹',   name: 'Indian Rupee'    },
  { code: 'JPY', symbol: '¥',   name: 'Japanese Yen'    },
];

const INDUSTRIES = [
  'Retail', 'Wholesale & Distribution', 'Manufacturing', 'Logistics & Warehousing', 
  'Healthcare & Pharmaceuticals', 'Food & Beverage', 'Hospitality', 'Construction', 
  'Engineering', 'Technology & Software', 'Telecommunications', 'Education',
  'Real Estate', 'Automotive', 'Aviation & Aerospace', 'Fashion & Apparel', 
  'Agriculture & Farming', 'Energy & Mining', 'Financial Services', 
  'Media & Entertainment', 'Government & Public Sector', 'Other',
];

const COLOR_PRESETS = [
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899',
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#06b6d4', '#0ea5e9', '#64748b',
];

export default function CompanyProfile() {
  const { company, users, items, stats, doUpdateCompany, uploadCompanyLogo, isAR, user: me, theme, showToast } = useAppContext();
  const t = T[theme] || T.light;
  const primary = company?.primaryColor || '#3b82f6';

  const isAdmin = me?.role === 'owner' || !!me?.perms?.canManageCompany;

  const [form, setForm] = useState({
    name:         company?.name         || '',
    description:  company?.description  || '',
    industry:     company?.industry     || '',
    baseCurrency: company?.baseCurrency || 'USD',
    primaryColor: company?.primaryColor || '#3b82f6',
  });
  const [saving,   setSaving]   = useState(false);
  const [copied,   setCopied]   = useState(false);
  const [focused,  setFocused]  = useState('');
  const colorRef = useRef(null);

  const handleSave = async () => {
    setSaving(true);
    try { await doUpdateCompany(form); }
    catch { /* toast handled */ }
    finally { setSaving(false); }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(company?.code || '').then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const createdDate = company?.createdAt
    ? new Date(company.createdAt).toLocaleDateString(isAR ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  const activeUsers = users.filter(u => u.active !== false).length;
  const totalValue  = stats?.totalValue || 0;
  const currency    = CURRENCIES.find(c => c.code === company?.baseCurrency) || CURRENCIES[0];

  // helpers
  const label = (text) => (
    <label style={{
      display: 'block', fontFamily: 'ui-monospace, monospace',
      fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
      letterSpacing: '0.08em', color: t.fgSubtle, marginBottom: 6,
    }}>{text}</label>
  );

  const fieldInput = (name, extra = {}) => ({
    width: '100%', height: 36, padding: '0 10px', borderRadius: 4,
    border: `1px solid ${focused === name ? primary : t.border}`,
    backgroundColor: t.canvas, color: t.fg, fontSize: 13,
    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
    boxShadow: focused === name ? `0 0 0 1px ${primary}` : 'none',
    transition: 'border-color 120ms, box-shadow 120ms',
    ...extra,
  });

  const panel = { backgroundColor: t.elev, border: `1px solid ${t.border}`, borderRadius: 4 };

  // stat card data
  const statCards = [
    { icon: 'users',      label: isAR ? 'الأعضاء النشطون'   : 'Active Members',     value: activeUsers,                             color: '#3b82f6' },
    { icon: 'inventory',  label: isAR ? 'أصناف المخزون'      : 'Inventory Items',    value: items.length,                            color: '#10b981' },
    { icon: 'swap',       label: isAR ? 'إجمالي الحركات'     : 'Total Transactions', value: stats?.totalTransactions ?? '—',         color: '#8b5cf6' },
    { icon: 'trending_up',label: isAR ? 'قيمة المخزون'       : 'Stock Value',        value: `${currency.symbol}${totalValue.toLocaleString()}`, color: '#f59e0b' },
  ];

  return (
    <div className="tour-company-page animate-in fade-in duration-300" style={{ maxWidth: 900, display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Hero banner ── */}
      <div style={{
        position: 'relative', borderRadius: 4, overflow: 'hidden',
        background: `linear-gradient(135deg, ${primary} 0%, ${primary}cc 100%)`,
      }}>
        {/* Dot pattern overlay */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.08,
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }} />

        <div style={{ position: 'relative', padding: '28px 28px 0', display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 20 }}>
          {/* Logo */}
          <div style={{
            width: 72, height: 72, borderRadius: 4,
            backgroundColor: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 900, fontSize: 28, flexShrink: 0, overflow: 'hidden',
          }}>
            {company?.logo ? (
              <img src={company.logo} alt="Logo" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#fff' }} />
            ) : (
              company?.name?.charAt(0)?.toUpperCase() || 'N'
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: '#fff', margin: 0, lineHeight: 1.2 }}>
              {company?.name || 'Your Company'}
            </h1>
            {company?.industry && (
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 4, fontFamily: 'ui-monospace, monospace', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {company.industry}
              </p>
            )}
            {company?.description && (
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 6, lineHeight: 1.5, maxWidth: 480 }}>
                {company.description}
              </p>
            )}
          </div>

          {/* Company code pill */}
          <button
            onClick={copyCode}
            title={copied ? 'Copied!' : 'Click to copy'}
            style={{
              flexShrink: 0, backgroundColor: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)', borderRadius: 4,
              padding: '10px 18px', textAlign: 'center', cursor: 'pointer',
              transition: 'background 120ms',
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.25)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)'}
          >
            <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
              {isAR ? 'رمز الشركة' : 'Company Code'}
            </div>
            <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '0.08em' }}>
              {company?.code || '—'}
            </div>
            <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 9, color: 'rgba(255,255,255,0.5)', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <Icon name="copy" size={9} />
              {copied ? (isAR ? 'تم النسخ!' : 'Copied!') : (isAR ? 'انقر للنسخ' : 'Click to copy')}
            </div>
          </button>
        </div>

        {/* Footer strip */}
        <div style={{
          marginTop: 16, padding: '8px 28px',
          backgroundColor: 'rgba(0,0,0,0.1)', borderTop: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Icon name="calendar" size={11} style={{ color: 'rgba(255,255,255,0.5)' }} />
          <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {isAR ? 'تأسست في' : 'Founded'} {createdDate}
          </span>
          <span style={{ margin: '0 6px', color: 'rgba(255,255,255,0.2)' }}>·</span>
          <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            NexINV SaaS
          </span>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
        {statCards.map((card, i) => (
          <div key={i} style={{ ...panel, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 4, flexShrink: 0,
              backgroundColor: card.color + '18',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: card.color,
            }}>
              <Icon name={card.icon} size={20} />
            </div>
            <div>
              <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 20, fontWeight: 900, color: t.fg, lineHeight: 1 }}>
                {card.value}
              </div>
              <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: t.fgSubtle, marginTop: 4 }}>
                {card.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Edit form (admin) ── */}
      {isAdmin && (
        <div style={{ ...panel, padding: 24 }}>
          <div style={{ marginBottom: 20, paddingBottom: 14, borderBottom: `1px solid ${t.border}` }}>
            <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.fg }}>
              {isAR ? 'إعدادات الشركة' : 'Company Settings'}
            </span>
            <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, color: t.fgSubtle, marginTop: 4 }}>
              {isAR ? 'هذه الإعدادات تؤثر على كل مستخدمي الشركة' : 'These settings affect all company members'}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 14 }}>
            {/* Company name — full width */}
            <div style={{ gridColumn: '1 / -1' }}>
              {label(isAR ? 'اسم الشركة' : 'Company Name')}
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                style={fieldInput('cname')}
                placeholder={isAR ? 'اسم شركتك' : 'Your company name'}
                onFocus={() => setFocused('cname')}
                onBlur={() => setFocused('')}
              />
            </div>

            {/* Description — full width */}
            <div style={{ gridColumn: '1 / -1' }}>
              {label(isAR ? 'وصف الشركة' : 'Description')}
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
                placeholder={isAR ? 'وصف مختصر عن نشاط شركتك...' : 'A brief description of your company...'}
                style={{
                  ...fieldInput('desc', { height: 'auto', padding: '8px 10px', resize: 'vertical' }),
                }}
                onFocus={() => setFocused('desc')}
                onBlur={() => setFocused('')}
              />
            </div>

            {/* Industry */}
            <div>
              {label(isAR ? 'القطاع' : 'Industry')}
              <select
                value={form.industry}
                onChange={e => {
                  const newInd = e.target.value;
                  setForm(f => ({ ...f, industry: newInd }));
                  // Smart Auto-Toggle Logic
                  const projectIndustries = ['Construction', 'Engineering', 'Real Estate', 'Technology & Software', 'Aviation & Aerospace'];
                  if (projectIndustries.includes(newInd) && !company?.features?.projects) {
                    doUpdateCompany({ features: { ...company?.features, projects: true } });
                    showToast(isAR 
                      ? `تم تفعيل وحدة المشاريع تلقائياً بناءً على قطاع ${newInd}. يمكنك تعطيلها من الإعدادات.` 
                      : `Projects module auto-enabled for ${newInd} industry. You can disable it in Settings.`, 'success');
                  }
                }}
                style={fieldInput('industry')}
                onFocus={() => setFocused('industry')}
                onBlur={() => setFocused('')}
              >
                <option value="">{isAR ? 'اختر القطاع...' : 'Select industry...'}</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>

            {/* Currency */}
            <div>
              {label(isAR ? 'العملة' : 'Base Currency')}
              <select
                value={form.baseCurrency}
                onChange={e => setForm(f => ({ ...f, baseCurrency: e.target.value }))}
                style={fieldInput('currency')}
                onFocus={() => setFocused('currency')}
                onBlur={() => setFocused('')}
              >
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</option>
                ))}
              </select>
            </div>

            {/* Logo upload */}
            <div>
              {label(isAR ? 'شعار الشركة' : 'Company Logo')}
              <label onClick={e => { if (me?.isDemo) { e.preventDefault(); showToast(isAR ? 'رفع الملفات غير متاح في وضع التجربة' : 'File uploads are disabled in Demo Mode', 'error'); } }} style={{
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: 36, borderRadius: 4, border: `1px dashed ${t.border}`,
                backgroundColor: t.canvas, color: t.fgMuted, fontSize: 12,
                transition: 'border-color 120ms, color 120ms', gap: 6,
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = primary; e.currentTarget.style.color = primary; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.fgMuted; }}
              >
                <input type="file" style={{ display: 'none' }} accept="image/*"
                  onChange={async e => {
                    if (me?.isDemo) {
                      alert(isAR ? 'رفع الملفات غير متاح في وضع التجربة' : 'Action disabled in Demo Mode');
                      return;
                    }
                    if (e.target.files?.[0]) {
                      setSaving(true);
                      try { await uploadCompanyLogo(e.target.files[0]); }
                      finally { setSaving(false); }
                    }
                  }}
                />
                <Icon name="upload" size={14} />
                {isAR ? 'اختر صورة...' : 'Upload new logo...'}
              </label>
            </div>

            {/* Brand color — full width */}
            <div style={{ gridColumn: '1 / -1' }}>
              {label(isAR ? 'لون العلامة التجارية' : 'Brand Color')}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                {COLOR_PRESETS.map(c => (
                  <button
                    key={c}
                    onClick={() => setForm(f => ({ ...f, primaryColor: c }))}
                    style={{
                      width: 28, height: 28, borderRadius: 4, cursor: 'pointer',
                      backgroundColor: c, border: 'none',
                      outline: form.primaryColor === c ? `2px solid ${c}` : 'none',
                      outlineOffset: 2,
                      transform: form.primaryColor === c ? 'scale(1.15)' : 'scale(1)',
                      transition: 'transform 120ms',
                    }}
                    title={c}
                  />
                ))}

                {/* Custom color picker */}
                <button
                  onClick={() => colorRef.current?.click()}
                  style={{
                    width: 28, height: 28, borderRadius: 4,
                    border: `1px dashed ${t.border}`, cursor: 'pointer',
                    backgroundColor: 'transparent', position: 'relative', overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: t.fgSubtle, transition: 'border-color 120ms',
                  }}
                  title="Custom color"
                  onMouseEnter={e => e.currentTarget.style.borderColor = primary}
                  onMouseLeave={e => e.currentTarget.style.borderColor = t.border}
                >
                  <input
                    ref={colorRef}
                    type="color"
                    value={form.primaryColor}
                    onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                  />
                  <Icon name="add" size={12} style={{ pointerEvents: 'none' }} />
                </button>

                {/* Preview swatch */}
                <div style={{ width: 28, height: 28, borderRadius: 4, backgroundColor: form.primaryColor, border: `1px solid ${t.border}` }} />
                <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: t.fgMuted }}>{form.primaryColor}</span>
              </div>
            </div>
          </div>

          {/* Save */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 16, marginTop: 16, borderTop: `1px solid ${t.border}` }}>
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
      )}

      {/* ── Company info (read-only for non-admins) ── */}
      {!isAdmin && (
        <div style={{ ...panel, padding: 24 }}>
          <span style={{ display: 'block', marginBottom: 16, fontFamily: 'ui-monospace, monospace', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.fg }}>
            {isAR ? 'معلومات الشركة' : 'Company Information'}
          </span>
          <dl style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: isAR ? 'الاسم'    : 'Name',     value: company?.name },
              { label: isAR ? 'القطاع'   : 'Industry', value: company?.industry || '—' },
              { label: isAR ? 'الوصف'    : 'About',    value: company?.description || '—' },
              { label: isAR ? 'العملة'   : 'Currency', value: `${currency.symbol} ${currency.code} — ${currency.name}` },
              { label: isAR ? 'تأسست في' : 'Founded',  value: createdDate },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <dt style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: t.fgSubtle, width: 80, flexShrink: 0, paddingTop: 1 }}>
                  {row.label}
                </dt>
                <dd style={{ fontSize: 13, color: t.fgMuted, flex: 1 }}>{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {/* ── Team members ── */}
      <div style={{ ...panel, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingBottom: 14, borderBottom: `1px solid ${t.border}` }}>
          <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.fg }}>
            {isAR ? 'فريق العمل' : 'Team Members'}
          </span>
          <span style={{
            fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 700,
            color: t.fgSubtle, backgroundColor: t.sunken,
            border: `1px solid ${t.border}`, borderRadius: 3, padding: '2px 8px',
          }}>
            {users.length}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {users.map((u, i) => {
            const palette = ['#3b82f6','#6366f1','#10b981','#f59e0b','#ef4444','#06b6d4'];
            const avatarColor = palette[i % palette.length];
            return (
              <LazyScroll key={u._id} alwaysRender rootMargin="150px">
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '8px 10px', borderRadius: 4, transition: 'background 120ms', cursor: 'default',
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = t.sunken}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 34, height: 34, borderRadius: 4, flexShrink: 0,
                    backgroundColor: avatarColor + '22', border: `1px solid ${avatarColor}44`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'ui-monospace, monospace', fontSize: 12, fontWeight: 800, color: avatarColor,
                  }}>
                    {u.name.charAt(0).toUpperCase()}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: t.fg, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.name}
                    </div>
                    <div style={{ fontSize: 11, color: t.fgSubtle, fontFamily: 'ui-monospace, monospace' }}>
                      @{u.username}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {/* Online dot */}
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%',
                      backgroundColor: u.active !== false ? '#16774A' : t.neg,
                    }} />
                    {/* Role badge */}
                    <span style={{
                      fontFamily: 'ui-monospace, monospace', fontSize: 9, fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      color: t.fgSubtle, backgroundColor: t.sunken,
                      border: `1px solid ${t.border}`, borderRadius: 3,
                      padding: '2px 6px',
                    }}>
                      {u.role}
                    </span>
                  </div>
                </div>
              </LazyScroll>
            );
          })}
          {users.length === 0 && (
            <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: t.fgSubtle, textAlign: 'center', padding: '24px 0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {isAR ? 'لا يوجد أعضاء' : 'No members yet'}
            </p>
          )}
        </div>
      </div>

    </div>
  );
}
