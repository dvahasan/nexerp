/**
 * BarcodeLookup.jsx
 * Search any barcode/EAN/UPC/ISBN through global product databases.
 * Lookup is done server-side (backend proxy) to avoid CORS issues.
 * Users with canAdd permission can add found products directly to inventory.
 */
import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { T } from '../theme';
import Icon from '../components/Icon';
import BarcodeScanner from '../components/BarcodeScanner';
import { api } from '../api';

export default function BarcodeLookup() {
  const { theme, company, isAR, user } = useAppContext();
  const tok     = T[theme] || T.light;
  const primary = company?.primaryColor || '#3b82f6';
  const location = useLocation();
  const navigate = useNavigate();

  const [query,       setQuery]       = useState('');
  const [results,     setResults]     = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [history,     setHistory]     = useState(() => {
    try { return JSON.parse(localStorage.getItem('nexinv_bc_history') || '[]'); } catch { return []; }
  });

  const canAdd = user?.role === 'owner' || !!user?.perms?.canAdd;

  const monoLabel = {
    fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.08em', color: tok.fgSubtle,
  };
  const panel = { backgroundColor: tok.elev, border: `1px solid ${tok.border}`, borderRadius: 4 };

  // Pre-fill from ?q= set by Layout's BarcodeScanner or navbar search
  useEffect(() => {
    const q = new URLSearchParams(location.search).get('q');
    if (q) {
      setQuery(q);
      doSearch(q);
      navigate('/barcode-lookup', { replace: true });
    }
  }, []); // eslint-disable-line

  const doSearch = useCallback(async (code) => {
    const trimmed = (code ?? query).trim();
    if (!trimmed) return;
    setLoading(true);
    setError('');
    setResults(null);
    try {
      const data  = await api.lookupBarcode(trimmed);
      const found = data.results || [];
      setResults(found);
      if (found.length > 0) {
        const entry = { barcode: trimmed, name: found[0].name || trimmed, ts: Date.now() };
        setHistory(prev => {
          const next = [entry, ...prev.filter(h => h.barcode !== trimmed)].slice(0, 10);
          localStorage.setItem('nexinv_bc_history', JSON.stringify(next));
          return next;
        });
      }
    } catch (e) {
      setError(e.message || 'Lookup failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Icon name="globe" size={20} style={{ color: primary }} />
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: tok.fg }}>
            {isAR ? 'البحث بالباركود' : 'Barcode Lookup'}
          </h1>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: tok.fgMuted }}>
          {isAR
            ? 'ابحث عن أي باركود أو UPC أو EAN أو ISBN عبر قواعد بيانات المنتجات العالمية.'
            : 'Search any barcode, UPC, EAN or ISBN across global product databases.'}
        </p>
      </div>

      {/* ── Search bar ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Icon name="barcode" size={14} style={{
            position: 'absolute', top: '50%', transform: 'translateY(-50%)',
            insetInlineStart: 10, color: tok.fgSubtle, pointerEvents: 'none',
          }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') doSearch(); }}
            placeholder={isAR ? 'أدخل رقم الباركود... (EAN, UPC, ISBN)' : 'Enter barcode… (EAN, UPC, ISBN, QR)'}
            style={{
              width: '100%', height: 40, boxSizing: 'border-box',
              paddingInlineStart: 36, paddingInlineEnd: 12,
              borderRadius: 4, border: `1px solid ${tok.border}`,
              backgroundColor: tok.elev, color: tok.fg,
              fontSize: 14, fontFamily: 'ui-monospace, monospace',
              outline: 'none',
            }}
            onFocus={e => { e.target.style.borderColor = primary; e.target.style.boxShadow = `0 0 0 1px ${primary}`; }}
            onBlur={e => { e.target.style.borderColor = tok.border; e.target.style.boxShadow = 'none'; }}
          />
        </div>

        <button
          onClick={() => setScannerOpen(true)}
          title={isAR ? 'مسح بالكاميرا' : 'Scan with camera'}
          style={{
            width: 40, height: 40, borderRadius: 4, border: `1px solid ${tok.border}`,
            backgroundColor: tok.elev, color: tok.fgMuted, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 120ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = tok.sunken; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = tok.elev; }}
        >
          <Icon name="camera" size={18} />
        </button>

        <button
          onClick={() => doSearch()}
          disabled={!query.trim() || loading}
          style={{
            height: 40, padding: '0 20px', borderRadius: 4, border: 'none',
            backgroundColor: query.trim() && !loading ? primary : tok.border,
            color: query.trim() && !loading ? '#fff' : tok.fgSubtle,
            cursor: query.trim() && !loading ? 'pointer' : 'not-allowed',
            fontSize: 13, fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', gap: 8,
            transition: 'background 120ms',
          }}
        >
          {loading
            ? <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 600ms linear infinite' }} />
            : <Icon name="search" size={15} />}
          {isAR ? 'بحث' : 'Search'}
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 4, marginBottom: 16, backgroundColor: tok.negTint, border: `1px solid ${tok.neg}40`, color: tok.neg, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div style={{ ...panel, padding: 32, textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: `2px solid ${tok.border}`, borderTopColor: primary, animation: 'spin 600ms linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: tok.fgMuted, fontSize: 13, margin: '0 0 10px' }}>
            {isAR ? 'جاري البحث في قواعد البيانات العالمية...' : 'Searching global product databases…'}
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            {['Open Food Facts', 'UPC Item DB', 'Open Library', 'OpenGTIN DB'].map(s => (
              <span key={s} style={{ ...monoLabel, padding: '2px 8px', border: `1px solid ${tok.border}`, borderRadius: 3 }}>{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* ── Results ── */}
      {!loading && results !== null && (
        results.length === 0 ? (
          <div style={{ ...panel, padding: '48px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: tok.fg }}>
              {isAR ? 'لا توجد نتائج' : 'No results found'}
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: tok.fgMuted }}>
              {isAR
                ? `لم يتم العثور على معلومات للباركود "${query}" في قواعد البيانات المتاحة.`
                : `No information found for "${query}" in the available databases.`}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ ...monoLabel, display: 'block' }}>
              {isAR
                ? `${results.length} مصدر وجد معلومات عن "${query}"`
                : `${results.length} source${results.length !== 1 ? 's' : ''} found info for "${query}"`}
            </div>
            {results.map((r, idx) => (
              <ResultCard
                key={idx} result={r}
                tok={tok} primary={primary} isAR={isAR} monoLabel={monoLabel}
                canAdd={canAdd}
              />
            ))}
          </div>
        )
      )}

      {/* ── Recent search history ── */}
      {!loading && results === null && history.length > 0 && (
        <div>
          <div style={{ ...monoLabel, display: 'block', marginBottom: 10 }}>
            {isAR ? 'البحث السابق' : 'Recent searches'}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {history.map((h, i) => (
              <button
                key={i}
                onClick={() => { setQuery(h.barcode); doSearch(h.barcode); }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '5px 12px', borderRadius: 4,
                  border: `1px solid ${tok.border}`,
                  backgroundColor: tok.elev, color: tok.fgMuted,
                  cursor: 'pointer', fontSize: 12,
                  transition: 'background 120ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = tok.sunken; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = tok.elev; }}
              >
                <Icon name="barcode" size={12} style={{ color: tok.fgSubtle }} />
                <span style={{ fontFamily: 'ui-monospace,monospace' }}>{h.barcode}</span>
                {h.name && h.name !== h.barcode && (
                  <span style={{ color: tok.fgSubtle }}>— {h.name.slice(0, 24)}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && results === null && history.length === 0 && (
        <div style={{ ...panel, padding: '48px 20px', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: 8, backgroundColor: `${primary}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Icon name="barcode" size={28} style={{ color: primary }} />
          </div>
          <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: tok.fg }}>
            {isAR ? 'ابحث عن أي باركود' : 'Look up any barcode'}
          </h3>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: tok.fgMuted, maxWidth: 360, marginInline: 'auto' }}>
            {isAR
              ? 'أدخل رقم الباركود في حقل البحث أو استخدم الكاميرا لمسحه ضوئياً.'
              : 'Enter a barcode in the search field, or use your camera to scan it.'}
          </p>
          <button
            onClick={() => setScannerOpen(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              height: 36, padding: '0 18px', borderRadius: 4,
              backgroundColor: primary, color: '#fff',
              border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            }}
          >
            <Icon name="camera" size={15} />
            {isAR ? 'مسح بالكاميرا' : 'Scan with Camera'}
          </button>
        </div>
      )}

      {/* ── Camera scanner ── */}
      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={code => {
          setScannerOpen(false);
          setQuery(code);
          doSearch(code);
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ResultCard
// ─────────────────────────────────────────────────────────────────────────────
function ResultCard({ result, tok, primary, isAR, monoLabel, canAdd }) {
  const [imgErr,    setImgErr]    = useState(false);
  const [expanded,  setExpanded]  = useState(false);
  const [addOpen,      setAddOpen]      = useState(false);
  const [addDone,      setAddDone]      = useState(false);
  const [addLoading,   setAddLoading]   = useState(false);
  const [addError,     setAddError]     = useState('');
  const [photoStatus,  setPhotoStatus]  = useState('');  // '' | 'importing' | 'done' | 'failed'

  // Pre-fill the add-to-inventory form from the barcode result
  const [form, setForm] = useState({
    name:        result.name || '',
    nameEn:      result.name || '',
    barcode:     result.barcode || '',
    sku:         '',
    price:       '',
    qty:         '',
    description: [result.brand, result.category, result.quantity]
                   .filter(Boolean).join(' · '),
  });

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleAdd = async () => {
    setAddLoading(true);
    setAddError('');
    setPhotoStatus('');
    try {
      // 1 — Create the item
      const newItem = await api.addItem({
        name:        form.name    || form.nameEn,
        nameEn:      form.nameEn  || form.name,
        barcode:     form.barcode || undefined,
        sku:         form.sku     || undefined,
        price:       parseFloat(form.price) || 0,
        qty:         parseInt(form.qty, 10) || 0,
        description: form.description || undefined,
      });

      setAddDone(true);
      setAddOpen(false);

      // 2 — Import image from the barcode source (non-blocking, best-effort)
      if (result.image && newItem?._id) {
        setPhotoStatus('importing');
        api.importPhotoFromUrl(newItem._id, result.image)
          .then(() => setPhotoStatus('done'))
          .catch(() => setPhotoStatus('failed'));
      }
    } catch (e) {
      setAddError(e.message || 'Failed to add item');
    } finally {
      setAddLoading(false);
    }
  };

  const hasNutrition = result.nutrition && Object.values(result.nutrition).some(v => v);

  const inputStyle = {
    width: '100%', height: 30, padding: '0 8px', boxSizing: 'border-box',
    borderRadius: 4, border: `1px solid ${tok.border}`,
    backgroundColor: tok.canvas, color: tok.fg,
    fontSize: 12, fontFamily: 'inherit', outline: 'none',
  };

  return (
    <div style={{ backgroundColor: tok.elev, border: `1px solid ${tok.border}`, borderRadius: 4, overflow: 'hidden' }}>

      {/* Source badge */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 14px', backgroundColor: tok.sunken, borderBottom: `1px solid ${tok.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="globe" size={13} style={{ color: primary }} />
          <span style={{ ...monoLabel, color: primary }}>{result.source}</span>
        </div>
        <a
          href={result.sourceUrl} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 11, color: primary, textDecoration: 'none', fontFamily: 'ui-monospace, monospace' }}
        >
          {isAR ? 'عرض المصدر ↗' : 'View source ↗'}
        </a>
      </div>

      {/* Main content */}
      <div style={{ display: 'flex' }}>
        {/* Product image */}
        {result.image && !imgErr && (
          <div style={{
            width: 120, flexShrink: 0, backgroundColor: tok.canvas,
            borderInlineEnd: `1px solid ${tok.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8,
          }}>
            <img
              src={result.image} alt={result.name} onError={() => setImgErr(true)}
              style={{ maxWidth: '100%', maxHeight: 100, objectFit: 'contain', borderRadius: 2 }}
            />
          </div>
        )}

        {/* Info */}
        <div style={{ flex: 1, padding: '14px 16px', minWidth: 0 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: tok.fg, lineHeight: 1.3 }}>
            {result.name || <span style={{ color: tok.fgSubtle }}>{isAR ? 'اسم غير معروف' : 'Unknown name'}</span>}
          </h3>

          <div style={{ marginBottom: 10 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '2px 8px', borderRadius: 3,
              backgroundColor: `${primary}12`, border: `1px solid ${primary}30`,
              ...monoLabel, color: primary,
            }}>
              <Icon name="barcode" size={10} /> {result.barcode}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px 16px' }}>
            {[
              { label: isAR ? 'الماركة' : 'Brand',    value: result.brand    },
              { label: isAR ? 'الفئة'  : 'Category', value: result.category },
              { label: isAR ? 'الكمية' : 'Quantity', value: result.quantity },
              { label: isAR ? 'البلد'  : 'Country',  value: result.countries},
            ].filter(f => f.value).map(f => (
              <div key={f.label}>
                <div style={monoLabel}>{f.label}</div>
                <div style={{ fontSize: 13, color: tok.fgMuted, marginTop: 1 }}>{f.value}</div>
              </div>
            ))}
          </div>

          {result.ingredients && (
            <div style={{ marginTop: 10 }}>
              <button
                onClick={() => setExpanded(e => !e)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', ...monoLabel, display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}
              >
                <Icon name={expanded ? 'collapse' : 'expand'} size={11} />
                {isAR
                  ? (result.category === 'Book' ? 'الموضوعات' : 'المكونات')
                  : (result.category === 'Book' ? 'Subjects'  : 'Ingredients / Description')}
              </button>
              {expanded && (
                <div style={{ fontSize: 12, color: tok.fgMuted, marginTop: 6, lineHeight: 1.6, maxHeight: 120, overflowY: 'auto' }}>
                  {result.ingredients}
                </div>
              )}
            </div>
          )}

          {hasNutrition && (
            <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(result.nutrition).filter(([, v]) => v).map(([k, v]) => (
                <span key={k} style={{ padding: '2px 8px', borderRadius: 3, backgroundColor: tok.sunken, border: `1px solid ${tok.border}`, fontSize: 11, color: tok.fgMuted, fontFamily: 'ui-monospace, monospace' }}>
                  {v}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Add to inventory footer ── */}
      {canAdd && (
        <>
          <div style={{
            borderTop: `1px solid ${tok.border}`,
            padding: '8px 14px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}>
            {addDone ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10b981', fontSize: 12, fontWeight: 600 }}>
                  <Icon name="check" size={14} />
                  {isAR ? 'تمت الإضافة إلى المخزون ✓' : 'Added to inventory ✓'}
                </div>
                {/* Photo import status */}
                {photoStatus === 'importing' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: tok.fgSubtle }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', border: `1.5px solid ${tok.border}`, borderTopColor: tok.fgMuted, animation: 'spin 600ms linear infinite', flexShrink: 0 }} />
                    {isAR ? 'جاري استيراد الصورة...' : 'Importing image…'}
                  </div>
                )}
                {photoStatus === 'done' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#10b981' }}>
                    <Icon name="image" size={12} />
                    {isAR ? 'تمت إضافة الصورة ✓' : 'Image imported ✓'}
                  </div>
                )}
                {photoStatus === 'failed' && (
                  <div style={{ fontSize: 11, color: tok.fgSubtle }}>
                    {isAR ? 'تعذّر استيراد الصورة (لا يؤثر على الصنف)' : 'Image import failed — item was still saved'}
                  </div>
                )}
              </div>
            ) : (
              <>
                <span style={{ fontSize: 12, color: tok.fgSubtle }}>
                  {isAR ? 'هل تريد إضافة هذا المنتج إلى مخزونك؟' : 'Want to add this product to your inventory?'}
                </span>
                <button
                  onClick={() => setAddOpen(o => !o)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    height: 30, padding: '0 14px', borderRadius: 4, border: 'none',
                    backgroundColor: addOpen ? tok.sunken : primary,
                    color: addOpen ? tok.fgMuted : '#fff',
                    cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    flexShrink: 0, transition: 'background 120ms',
                  }}
                >
                  <Icon name={addOpen ? 'close' : 'add'} size={13} />
                  {addOpen
                    ? (isAR ? 'إلغاء' : 'Cancel')
                    : (isAR ? 'أضف إلى المخزون' : 'Add to Inventory')}
                </button>
              </>
            )}
          </div>

          {/* Inline add form */}
          {addOpen && !addDone && (
            <div style={{ borderTop: `1px solid ${tok.border}`, backgroundColor: tok.sunken, padding: '16px 18px' }}>
              <div style={{ ...monoLabel, display: 'block', marginBottom: 14 }}>
                {isAR ? 'بيانات الصنف الجديد' : 'New item details'}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                {/* Name AR */}
                <div>
                  <label style={{ ...monoLabel, display: 'block', marginBottom: 4 }}>
                    {isAR ? 'الاسم (ع) *' : 'Name (AR) *'}
                  </label>
                  <input
                    value={form.name}
                    onChange={e => setField('name', e.target.value)}
                    style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = primary; }}
                    onBlur={e => { e.target.style.borderColor = tok.border; }}
                  />
                </div>

                {/* Name EN */}
                <div>
                  <label style={{ ...monoLabel, display: 'block', marginBottom: 4 }}>
                    {isAR ? 'الاسم (EN)' : 'Name (EN)'}
                  </label>
                  <input
                    value={form.nameEn}
                    onChange={e => setField('nameEn', e.target.value)}
                    style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = primary; }}
                    onBlur={e => { e.target.style.borderColor = tok.border; }}
                  />
                </div>

                {/* Barcode */}
                <div>
                  <label style={{ ...monoLabel, display: 'block', marginBottom: 4 }}>
                    {isAR ? 'الباركود' : 'Barcode'}
                  </label>
                  <input
                    value={form.barcode}
                    onChange={e => setField('barcode', e.target.value)}
                    style={{ ...inputStyle, fontFamily: 'ui-monospace, monospace' }}
                    onFocus={e => { e.target.style.borderColor = primary; }}
                    onBlur={e => { e.target.style.borderColor = tok.border; }}
                  />
                </div>

                {/* SKU */}
                <div>
                  <label style={{ ...monoLabel, display: 'block', marginBottom: 4 }}>
                    {isAR ? 'الرمز الداخلي (SKU)' : 'SKU / Ref'}
                  </label>
                  <input
                    value={form.sku}
                    onChange={e => setField('sku', e.target.value)}
                    style={{ ...inputStyle, fontFamily: 'ui-monospace, monospace' }}
                    onFocus={e => { e.target.style.borderColor = primary; }}
                    onBlur={e => { e.target.style.borderColor = tok.border; }}
                  />
                </div>

                {/* Price */}
                <div>
                  <label style={{ ...monoLabel, display: 'block', marginBottom: 4 }}>
                    {isAR ? 'السعر' : 'Price'}
                  </label>
                  <input
                    type="number" min="0" step="0.01"
                    value={form.price}
                    onChange={e => setField('price', e.target.value)}
                    placeholder="0.00"
                    style={{ ...inputStyle, fontFamily: 'ui-monospace, monospace' }}
                    onFocus={e => { e.target.style.borderColor = primary; }}
                    onBlur={e => { e.target.style.borderColor = tok.border; }}
                  />
                </div>

                {/* Initial qty */}
                <div>
                  <label style={{ ...monoLabel, display: 'block', marginBottom: 4 }}>
                    {isAR ? 'الكمية الأولية' : 'Initial qty'}
                  </label>
                  <input
                    type="number" min="0" step="1"
                    value={form.qty}
                    onChange={e => setField('qty', e.target.value)}
                    placeholder="0"
                    style={{ ...inputStyle, fontFamily: 'ui-monospace, monospace' }}
                    onFocus={e => { e.target.style.borderColor = primary; }}
                    onBlur={e => { e.target.style.borderColor = tok.border; }}
                  />
                </div>
              </div>

              {/* Description */}
              <div style={{ marginTop: 10 }}>
                <label style={{ ...monoLabel, display: 'block', marginBottom: 4 }}>
                  {isAR ? 'الوصف / ملاحظات' : 'Description / Notes'}
                </label>
                <input
                  value={form.description}
                  onChange={e => setField('description', e.target.value)}
                  style={{ ...inputStyle, width: '100%' }}
                  onFocus={e => { e.target.style.borderColor = primary; }}
                  onBlur={e => { e.target.style.borderColor = tok.border; }}
                />
              </div>

              {addError && (
                <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 4, backgroundColor: tok.negTint, border: `1px solid ${tok.neg}40`, color: tok.neg, fontSize: 12 }}>
                  {addError}
                </div>
              )}

              <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => { setAddOpen(false); setAddError(''); }}
                  style={{ height: 32, padding: '0 16px', borderRadius: 4, border: `1px solid ${tok.border}`, background: 'none', color: tok.fgMuted, cursor: 'pointer', fontSize: 12 }}
                >
                  {isAR ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={handleAdd}
                  disabled={addLoading || (!form.name && !form.nameEn)}
                  style={{
                    height: 32, padding: '0 20px', borderRadius: 4, border: 'none',
                    backgroundColor: (form.name || form.nameEn) && !addLoading ? primary : tok.border,
                    color: (form.name || form.nameEn) && !addLoading ? '#fff' : tok.fgSubtle,
                    cursor: (form.name || form.nameEn) && !addLoading ? 'pointer' : 'not-allowed',
                    fontSize: 12, fontWeight: 600,
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                  }}
                >
                  {addLoading && (
                    <div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 600ms linear infinite' }} />
                  )}
                  <Icon name="add" size={13} />
                  {isAR ? 'إضافة إلى المخزون' : 'Add to Inventory'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
