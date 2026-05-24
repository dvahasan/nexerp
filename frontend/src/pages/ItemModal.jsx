import { useState, useEffect, useCallback } from 'react';
import Modal from '../components/Modal';
import RichTextEditor from '../components/RichTextEditor';
import BarcodeScanner from '../components/BarcodeScanner';
import { useAppContext } from '../context/AppContext';
import { T } from '../theme';
import { api } from '../api';

const ITEM_TYPES = ['unit', 'box', 'pack', 'group', 'roll', 'bag', 'pallet'];

const defaultForm = {
  name: '', nameEn: '', sku: '', barcode: '', price: '', qty: '',
  minThreshold: '', type: 'unit', unitsPerPackage: 1, datasheet: '',
  deptId: '', catId: '', status: 'active', description: '',
};

function fmt(bytes) {
  if (!bytes) return '';
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ItemModal({ open, onClose, editItem = null, onSaved }) {
  const { depts, cats, saveItem, t: tr, isAR, theme, company } = useAppContext();
  const t       = T[theme] || T.light;
  const primary = company?.primaryColor || '#3b82f6';

  // ── Form state ─────────────────────────────────────────────────────────────
  const [form,         setForm]         = useState(defaultForm);
  const [saving,       setSaving]       = useState(false);
  const [tab,          setTab]          = useState('info');
  const [focused,      setFocused]      = useState('');

  // ── Photo state ────────────────────────────────────────────────────────────
  const [images,       setImages]       = useState([]); // [{url, publicId}]
  const [photoPreview, setPhotoPreview] = useState(''); // blob URL or external URL
  const [newPhotoFile, setNewPhotoFile] = useState(null);
  const [importImgUrl, setImportImgUrl] = useState(''); // external URL to server-import
  const [uploading,    setUploading]    = useState(false);
  const [deleting,     setDeleting]     = useState(null); // publicId

  // ── Attachment state ───────────────────────────────────────────────────────
  const [attachments,  setAttachments]  = useState([]); // [{url, publicId, name, size}]
  const [newPdfFile,   setNewPdfFile]   = useState(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [deletingAtt,  setDeletingAtt]  = useState(null); // publicId

  // ── Scanner state ──────────────────────────────────────────────────────────
  const [scannerOpen,  setScannerOpen]  = useState(false);
  const [scanLookup,   setScanLookup]   = useState(false);

  // ── Tabs ───────────────────────────────────────────────────────────────────
  const TABS = editItem
    ? ['info', 'description', 'media']
    : ['info', 'description'];

  const tabLabels = {
    info:        isAR ? 'معلومات الصنف' : 'Item Info',
    description: isAR ? 'الوصف'          : 'Description',
    media:       isAR ? 'الصور والملفات'  : 'Media',
  };

  // ── Reset on open ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (editItem) {
      setForm({
        name:            editItem.name            || '',
        nameEn:          editItem.nameEn          || '',
        sku:             editItem.sku             || '',
        barcode:         editItem.barcode         || '',
        price:           editItem.price           ?? '',
        qty:             editItem.qty             ?? '',
        minThreshold:    editItem.minThreshold    ?? '',
        type:            editItem.type            || 'unit',
        unitsPerPackage: editItem.unitsPerPackage || 1,
        datasheet:       editItem.datasheet       || '',
        deptId:          editItem.deptId?._id     || editItem.deptId || '',
        catId:           editItem.catId?._id      || editItem.catId  || '',
        status:          editItem.status          || 'active',
        description:     editItem.description     || '',
      });
      setImages(editItem.images || []);
      setAttachments(editItem.attachments || []);
    } else {
      setForm(defaultForm);
      setImages([]);
      setAttachments([]);
    }
    setTab('info');
    setNewPhotoFile(null);
    setNewPdfFile(null);
    setPhotoPreview('');
    setImportImgUrl('');
    setScannerOpen(false);
    setScanLookup(false);
  }, [editItem, open]);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  // ── Barcode scan handler ───────────────────────────────────────────────────
  const handleBarcodeScanned = useCallback(async (code) => {
    setScannerOpen(false);
    set('barcode', code);
    setScanLookup(true);
    try {
      const data = await api.lookupBarcode(code);
      const results = data?.results || [];
      if (results.length > 0) {
        const r = results[0];
        setForm(prev => ({
          ...prev,
          barcode:     code,
          name:        (!prev.name        && r.name)        ? r.name        : prev.name,
          nameEn:      (!prev.nameEn      && r.nameEn)      ? r.nameEn      : prev.nameEn,
          description: (!prev.description && r.description) ? r.description : prev.description,
        }));
        if (r.image) {
          setPhotoPreview(r.image);
          setImportImgUrl(r.image);
        }
      }
    } catch (e) {
      console.error('Barcode lookup failed', e);
    } finally {
      setScanLookup(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        price:           parseFloat(form.price)        || 0,
        qty:             parseInt(form.qty)             || 0,
        minThreshold:    parseInt(form.minThreshold)    || 0,
        unitsPerPackage: parseInt(form.unitsPerPackage) || 1,
        deptId:          form.deptId  || undefined,
        catId:           form.catId   || undefined,
        description:     form.description || '',
      };
      const result = await saveItem(payload, editItem?._id);

      if (result?._id) {
        // Upload new photo file (blocking — user expects it saved)
        if (newPhotoFile) {
          try {
            setUploading(true);
            await api.uploadPhoto(result._id, newPhotoFile);
          } catch (err) { console.error('Photo upload failed', err); }
          finally { setUploading(false); }
        } else if (importImgUrl) {
          // Non-blocking server-side import from external URL
          api.importPhotoFromUrl(result._id, importImgUrl)
            .catch(err => console.error('Photo import failed', err));
        }

        // Upload PDF attachment (blocking)
        if (newPdfFile) {
          try {
            setUploadingPdf(true);
            await api.uploadAttachment(result._id, newPdfFile);
          } catch (err) { console.error('PDF upload failed', err); }
          finally { setUploadingPdf(false); }
        }
      }

      onClose();
      onSaved?.();
    } catch { /* errors shown via toast */ }
    finally { setSaving(false); }
  };

  // ── Photos tab: add photo ──────────────────────────────────────────────────
  const handleAddPhoto = async (file) => {
    if (!editItem?._id || !file) return;
    setUploading(true);
    try {
      const res = await api.addItemPhoto(editItem._id, file);
      setImages(res.images || []);
    } catch (err) { console.error(err); }
    finally { setUploading(false); }
  };

  // ── Photos tab: delete photo ───────────────────────────────────────────────
  const handleDeletePhoto = async (publicId) => {
    if (!editItem?._id) return;
    setDeleting(publicId);
    try {
      const res = await api.deleteItemPhoto(editItem._id, publicId);
      setImages(res.images || []);
    } catch (err) { console.error(err); }
    finally { setDeleting(null); }
  };

  // ── Attachments tab: add attachment ───────────────────────────────────────
  const handleAddAttachment = async (file) => {
    if (!editItem?._id || !file) return;
    setUploadingPdf(true);
    try {
      const res = await api.uploadAttachment(editItem._id, file);
      setAttachments(res.attachments || []);
    } catch (err) { console.error(err); }
    finally { setUploadingPdf(false); }
  };

  // ── Attachments tab: delete attachment ────────────────────────────────────
  const handleDeleteAttachment = async (publicId) => {
    if (!editItem?._id) return;
    setDeletingAtt(publicId);
    try {
      const res = await api.deleteAttachment(editItem._id, publicId);
      setAttachments(res.attachments || []);
    } catch (err) { console.error(err); }
    finally { setDeletingAtt(null); }
  };

  // ── Style helpers ──────────────────────────────────────────────────────────
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

  const filePicker = (opts) => {
    const { accept, disabled, onChange, children, highlight } = opts;
    return (
      <label style={{
        display: 'flex', alignItems: 'center', gap: 8,
        height: 34, padding: '0 10px', borderRadius: 4,
        border: `1px dashed ${highlight ? primary : t.border}`,
        backgroundColor: t.canvas, color: disabled ? t.fgSubtle : t.fgMuted,
        fontSize: 12, cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'border-color 120ms', boxSizing: 'border-box',
      }}
        onMouseEnter={e => { if (!disabled) e.currentTarget.style.borderColor = primary; }}
        onMouseLeave={e => { if (!disabled) e.currentTarget.style.borderColor = highlight ? primary : t.border; }}
      >
        <input type="file" accept={accept} style={{ display: 'none' }} disabled={disabled} onChange={onChange} />
        {children}
      </label>
    );
  };

  const btnGhost = (extra = {}) => ({
    background: 'none', border: `1px solid ${t.border}`,
    borderRadius: 4, cursor: 'pointer',
    color: t.fgMuted, fontSize: 11, padding: '3px 10px',
    fontFamily: 'inherit', transition: 'background 120ms',
    ...extra,
  });

  const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 };
  const grid3 = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 };

  const isBusy = saving || uploading || uploadingPdf;

  // ── Shared Save Bar ────────────────────────────────────────────────────────
  const SaveBar = () => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 12, borderTop: `1px solid ${t.border}`, marginTop: 4 }}>
      <button
        type="button" onClick={onClose}
        style={btnGhost({ height: 32, padding: '0 14px', fontSize: 13, fontWeight: 500 })}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = t.sunken}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        {tr.cancel}
      </button>
      <button
        type="submit" disabled={isBusy}
        style={{
          height: 32, padding: '0 16px', borderRadius: 4,
          backgroundColor: primary, color: '#fff', border: 'none',
          cursor: isBusy ? 'not-allowed' : 'pointer',
          fontSize: 13, fontWeight: 600,
          display: 'inline-flex', alignItems: 'center', gap: 6,
          opacity: isBusy ? 0.65 : 1, transition: 'opacity 120ms',
        }}
      >
        {isBusy && <div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 600ms linear infinite' }} />}
        {tr.save}
      </button>
    </div>
  );

  return (
    <>
      <Modal open={open} onClose={onClose} title={editItem ? tr.editItem : tr.addItem} wide>

        {/* ── Tab bar ─────────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', gap: 0, marginBottom: 20,
          border: `1px solid ${t.border}`, borderRadius: 4, overflow: 'hidden',
        }}>
          {TABS.map(tb => (
            <button
              key={tb} onClick={() => setTab(tb)}
              style={{
                flex: 1, height: 32, fontSize: 11, fontWeight: 700,
                fontFamily: 'ui-monospace, monospace', textTransform: 'uppercase',
                letterSpacing: '0.06em', cursor: 'pointer', border: 'none',
                backgroundColor: tab === tb ? primary : 'transparent',
                color: tab === tb ? '#fff' : t.fgSubtle,
                transition: 'background 120ms, color 120ms',
              }}
            >
              {tabLabels[tb]}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            TAB: Info
            ══════════════════════════════════════════════════════════════════ */}
        {tab === 'info' && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Names */}
            <div style={grid2}>
              <div>
                {lbl(`${tr.name} *`)}
                <input required value={form.name} onChange={e => set('name', e.target.value)}
                  style={inp('name')} onFocus={() => setFocused('name')} onBlur={() => setFocused('')} />
              </div>
              <div>
                {lbl(tr.nameEn)}
                <input value={form.nameEn} onChange={e => set('nameEn', e.target.value)}
                  style={inp('nameEn')} onFocus={() => setFocused('nameEn')} onBlur={() => setFocused('')} />
              </div>
            </div>

            {/* SKU / Barcode (+ camera scan) / Datasheet */}
            <div style={grid3}>
              <div>
                {lbl(tr.sku)}
                <input value={form.sku} onChange={e => set('sku', e.target.value)}
                  style={inp('sku', { fontFamily: 'ui-monospace, monospace' })}
                  onFocus={() => setFocused('sku')} onBlur={() => setFocused('')} />
              </div>
              <div>
                {lbl(tr.barcode)}
                <div style={{ position: 'relative' }}>
                  <input value={form.barcode} onChange={e => set('barcode', e.target.value)}
                    style={inp('barcode', { fontFamily: 'ui-monospace, monospace', paddingRight: 34 })}
                    onFocus={() => setFocused('barcode')} onBlur={() => setFocused('')} />
                  {/* Camera scan button */}
                  <button
                    type="button"
                    title={isAR ? 'مسح الباركود بالكاميرا' : 'Scan barcode with camera'}
                    onClick={() => setScannerOpen(true)}
                    disabled={scanLookup}
                    style={{
                      position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: scanLookup ? 'wait' : 'pointer',
                      color: scanLookup ? t.fgSubtle : primary, padding: '3px 5px', borderRadius: 3,
                      display: 'flex', alignItems: 'center', lineHeight: 1,
                      transition: 'color 120ms',
                    }}
                  >
                    {scanLookup
                      ? <div style={{ width: 12, height: 12, border: `2px solid ${t.border}`, borderTopColor: primary, borderRadius: '50%', animation: 'spin 600ms linear infinite' }} />
                      : <span style={{ fontSize: 15 }}>📷</span>
                    }
                  </button>
                </div>
              </div>
              <div>
                {lbl(tr.datasheet)}
                <input value={form.datasheet} onChange={e => set('datasheet', e.target.value)}
                  style={inp('datasheet')} onFocus={() => setFocused('datasheet')} onBlur={() => setFocused('')} />
              </div>
            </div>

            {/* Price / Qty / Min */}
            <div style={grid3}>
              <div>
                {lbl(tr.price)}
                <input type="number" min="0" step="0.01" value={form.price}
                  onChange={e => set('price', e.target.value)}
                  style={inp('price')} onFocus={() => setFocused('price')} onBlur={() => setFocused('')} />
              </div>
              <div>
                {lbl(tr.qty)}
                <input type="number" min="0" value={form.qty}
                  onChange={e => set('qty', e.target.value)}
                  style={inp('qty')} onFocus={() => setFocused('qty')} onBlur={() => setFocused('')} />
              </div>
              <div>
                {lbl(tr.minThreshold)}
                <input type="number" min="0" value={form.minThreshold}
                  onChange={e => set('minThreshold', e.target.value)}
                  style={inp('minThreshold')} onFocus={() => setFocused('minThreshold')} onBlur={() => setFocused('')} />
              </div>
            </div>

            {/* Type / Units per package */}
            <div style={grid2}>
              <div>
                {lbl(tr.type)}
                <select value={form.type} onChange={e => set('type', e.target.value)}
                  style={inp('type')} onFocus={() => setFocused('type')} onBlur={() => setFocused('')}>
                  {ITEM_TYPES.map(tp => (
                    <option key={tp} value={tp}>{tp.charAt(0).toUpperCase() + tp.slice(1)}</option>
                  ))}
                </select>
              </div>
              {form.type !== 'unit' && (
                <div>
                  {lbl(tr.unitsPerPackage)}
                  <input type="number" min="1" value={form.unitsPerPackage}
                    onChange={e => set('unitsPerPackage', e.target.value)}
                    style={inp('units')} onFocus={() => setFocused('units')} onBlur={() => setFocused('')} />
                </div>
              )}
            </div>

            {/* Dept / Cat / Status */}
            <div style={grid3}>
              <div>
                {lbl(tr.department)}
                <select value={form.deptId} onChange={e => set('deptId', e.target.value)}
                  style={inp('dept')} onFocus={() => setFocused('dept')} onBlur={() => setFocused('')}>
                  <option value="">— {isAR ? 'بدون' : 'None'} —</option>
                  {depts.map(d => (
                    <option key={d._id} value={d._id}>{isAR ? d.name : (d.nameEn || d.name)}</option>
                  ))}
                </select>
              </div>
              <div>
                {lbl(tr.category)}
                <select value={form.catId} onChange={e => set('catId', e.target.value)}
                  style={inp('cat')} onFocus={() => setFocused('cat')} onBlur={() => setFocused('')}>
                  <option value="">— {isAR ? 'بدون' : 'None'} —</option>
                  {cats.map(c => (
                    <option key={c._id} value={c._id}>{isAR ? c.name : (c.nameEn || c.name)}</option>
                  ))}
                </select>
              </div>
              <div>
                {lbl(tr.status)}
                <select value={form.status} onChange={e => set('status', e.target.value)}
                  style={inp('status')} onFocus={() => setFocused('status')} onBlur={() => setFocused('')}>
                  <option value="active">{tr.active}</option>
                  <option value="discontinued">{tr.discontinued}</option>
                </select>
              </div>
            </div>

            {/* ── Photo Preview + PDF (add mode) ─────────────────────────── */}
            {!editItem && (
              <div style={grid2}>

                {/* Photo */}
                <div>
                  {lbl(isAR ? 'الصورة الرئيسية' : 'Main Photo')}
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    {/* Preview square */}
                    <div style={{
                      width: 72, height: 72, flexShrink: 0, borderRadius: 6,
                      border: `2px dashed ${photoPreview ? primary : t.border}`,
                      backgroundColor: t.sunken, overflow: 'hidden',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'border-color 120ms',
                    }}>
                      {photoPreview
                        ? <img src={photoPreview} alt="preview"
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            onError={() => setPhotoPreview('')}
                          />
                        : <span style={{ fontSize: 24, opacity: 0.25 }}>🖼️</span>
                      }
                    </div>
                    {/* Controls */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                      {filePicker({
                        accept: 'image/*',
                        highlight: !!photoPreview,
                        onChange: e => {
                          const f = e.target.files[0];
                          if (!f) return;
                          setNewPhotoFile(f);
                          setImportImgUrl('');
                          const prev = URL.createObjectURL(f);
                          setPhotoPreview(prev);
                        },
                        children: <>
                          <Icon name="image" size={16} style={{ color: newPhotoFile ? primary : t.fgMuted }} />
                          {newPhotoFile ? newPhotoFile.name : (isAR ? 'رفع صورة الصنف...' : 'Upload Item Photo…')}
                        </>,
                      })}
                      {photoPreview && importImgUrl && !newPhotoFile && (
                        <div style={{ fontSize: 10, color: primary, fontFamily: 'ui-monospace, monospace', fontWeight: 600, letterSpacing: '0.06em' }}>
                          ✓ {isAR ? 'صورة من الباركود' : 'From barcode scan'}
                        </div>
                      )}
                      {photoPreview && (
                        <button
                          type="button"
                          onClick={() => { setPhotoPreview(''); setNewPhotoFile(null); setImportImgUrl(''); }}
                          style={btnGhost({ fontSize: 10, padding: '2px 8px', color: t.neg, borderColor: `${t.neg}55` })}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = t.negTint || '#fee2e2'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          {isAR ? 'إزالة' : 'Remove'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* PDF / Datasheet file */}
                <div>
                  {lbl(isAR ? 'ملف PDF (كتالوج / مواصفات)' : 'PDF (Datasheet / Catalogue)')}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {filePicker({
                      accept: '.pdf,application/pdf',
                      highlight: !!newPdfFile,
                      disabled: uploadingPdf,
                      onChange: e => { setNewPdfFile(e.target.files[0] || null); },
                      children: uploadingPdf
                        ? <><div style={{ width: 14, height: 14, border: `2px solid ${t.border}`, borderTopColor: primary, borderRadius: '50%', animation: 'spin 600ms linear infinite' }} /> {isAR ? 'جاري الرفع...' : 'Uploading…'}</>
                        : <>
                            <Icon name="upload" size={16} style={{ color: newPdfFile ? primary : t.fgMuted }} />
                            {newPdfFile ? newPdfFile.name : (isAR ? 'إرفاق ملف PDF للكتالوج...' : 'Attach PDF Catalogue…')}
                          </>,
                    })}
                    {newPdfFile && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        <span style={{ flex: 1, fontSize: 11, color: t.fgMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {newPdfFile.name}
                        </span>
                        <span style={{ fontSize: 10, color: t.fgSubtle, flexShrink: 0 }}>{fmt(newPdfFile.size)}</span>
                        <button
                          type="button"
                          onClick={() => setNewPdfFile(null)}
                          style={btnGhost({ fontSize: 10, padding: '2px 8px', color: t.neg, borderColor: `${t.neg}55`, flexShrink: 0 })}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = t.negTint || '#fee2e2'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── Barcode scan found image badge (edit mode) ─────────────── */}
            {editItem && photoPreview && importImgUrl && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', borderRadius: 4,
                backgroundColor: `${primary}12`, border: `1px solid ${primary}33`,
              }}>
                <img src={photoPreview} alt="scan-preview"
                  style={{ width: 40, height: 40, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }}
                  onError={() => { setPhotoPreview(''); setImportImgUrl(''); }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, fontFamily: 'ui-monospace, monospace', color: primary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {isAR ? 'صورة من الباركود' : 'Photo from barcode scan'}
                  </div>
                  <div style={{ fontSize: 11, color: t.fgSubtle }}>
                    {isAR ? 'ستُضاف تلقائياً عند الحفظ' : 'Will be imported automatically on save'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setPhotoPreview(''); setImportImgUrl(''); }}
                  style={btnGhost({ fontSize: 11, padding: '3px 8px' })}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = t.sunken}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {isAR ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            )}

            {/* Description hint / preview */}
            {!form.description ? (
              <div
                onClick={() => setTab('description')}
                style={{
                  padding: '10px 14px', borderRadius: 4, cursor: 'pointer',
                  border: `1px dashed ${t.border}`, backgroundColor: t.sunken,
                  display: 'flex', alignItems: 'center', gap: 8,
                  color: t.fgSubtle, fontSize: 12, transition: 'border-color 120ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = primary; e.currentTarget.style.color = primary; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.fgSubtle; }}
              >
                <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {isAR ? 'الوصف' : 'Description'}
                </span>
                <span style={{ flex: 1 }}>
                  {isAR ? '← انقر لإضافة وصف مفصّل...' : '← Click to add a detailed description…'}
                </span>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                  <label style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.fgSubtle }}>
                    {isAR ? 'الوصف' : 'Description'}
                  </label>
                  <button type="button" onClick={() => setTab('description')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: primary, fontSize: 11, fontFamily: 'ui-monospace, monospace', fontWeight: 600, padding: 0 }}>
                    {isAR ? 'تحرير ↗' : 'Edit ↗'}
                  </button>
                </div>
                <div style={{
                  padding: '8px 12px', borderRadius: 4, border: `1px solid ${t.border}`,
                  backgroundColor: t.canvas, fontSize: 12, color: t.fgMuted,
                  lineHeight: 1.6, maxHeight: 80, overflow: 'hidden', position: 'relative',
                }}>
                  <div dangerouslySetInnerHTML={{ __html: form.description }} style={{ pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 24, background: `linear-gradient(transparent, ${t.canvas})` }} />
                </div>
              </div>
            )}

            <SaveBar />
          </form>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB: Description
            ══════════════════════════════════════════════════════════════════ */}
        {tab === 'description' && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.fgSubtle, marginBottom: 8 }}>
                {isAR
                  ? `وصف الصنف — ${form.name || form.nameEn || ''}`
                  : `Description — ${form.nameEn || form.name || ''}`}
              </label>
              <RichTextEditor
                value={form.description}
                onChange={v => set('description', v)}
                tok={t}
                primary={primary}
                isAR={isAR}
                placeholder={isAR
                  ? 'اكتب وصفاً مفصّلاً للصنف: المواصفات، الاستخدامات، الملاحظات...'
                  : 'Write a detailed description: specifications, usage, notes, warnings…'}
                minHeight={220}
                maxHeight={420}
              />
              <div style={{ marginTop: 8, fontSize: 11, color: t.fgSubtle, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'ui-monospace, monospace' }}>{isAR ? 'تلميح:' : 'Tip:'}</span>
                <span>{isAR ? 'تحديد النص ثم الضغط' : 'Select text then press'}</span>
                {[
                  { key: 'Ctrl+B', label: isAR ? 'غامق' : 'Bold' },
                  { key: 'Ctrl+I', label: isAR ? 'مائل' : 'Italic' },
                  { key: 'Ctrl+U', label: isAR ? 'تحتسطر' : 'Underline' },
                ].map(k => (
                  <span key={k.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <kbd style={{ fontFamily: 'ui-monospace, monospace', fontSize: 9, padding: '1px 5px', borderRadius: 3, border: `1px solid ${t.border}`, backgroundColor: t.sunken, color: t.fgMuted }}>{k.key}</kbd>
                    <span>{k.label}</span>
                  </span>
                ))}
              </div>
            </div>
            {form.description && (
              <div>
                <button
                  type="button"
                  onClick={() => set('description', '')}
                  style={btnGhost({ color: t.neg, borderColor: `${t.neg}55`, fontSize: 12, padding: '4px 12px' })}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = t.negTint || '#fee2e2'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {isAR ? 'مسح الوصف بالكامل' : 'Clear description'}
                </button>
              </div>
            )}
            <SaveBar />
          </form>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB: Media (edit mode only)
            ══════════════════════════════════════════════════════════════════ */}
        {tab === 'media' && editItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* ── Photos section ───────────────────────────────────────────── */}
            <div>
              {lbl(isAR ? 'الصور' : 'Photos')}
              {filePicker({
                accept: 'image/*',
                disabled: uploading,
                onChange: e => { if (e.target.files[0]) handleAddPhoto(e.target.files[0]); },
                children: uploading
                  ? <><div style={{ width: 12, height: 12, border: `2px solid ${t.border}`, borderTopColor: primary, borderRadius: '50%', animation: 'spin 600ms linear infinite' }} /> {isAR ? 'جاري الرفع...' : 'Uploading…'}</>
                  : <>📎 {isAR ? 'إضافة صورة...' : 'Add photo…'}</>,
              })}

              <div style={{ marginTop: 10 }}>
                {images.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
                    {images.map((img, idx) => (
                      <div key={img.publicId || img.url} style={{
                        position: 'relative', aspectRatio: '1', borderRadius: 4,
                        overflow: 'hidden', backgroundColor: t.sunken,
                      }}>
                        <img src={img.url} alt={`photo-${idx}`} loading="lazy"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        <button
                          onClick={() => handleDeletePhoto(img.publicId)}
                          disabled={deleting === img.publicId}
                          style={{
                            position: 'absolute', inset: 0, width: '100%', height: '100%',
                            backgroundColor: 'rgba(0,0,0,0)', border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'background 120ms',
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.55)'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0)'}
                        >
                          <span style={{ opacity: 0, transition: 'opacity 120ms' }}
                            onMouseEnter={e => { e.currentTarget.style.opacity = 1; }}
                            onMouseLeave={e => { e.currentTarget.style.opacity = 0; }}
                          >
                            {deleting === img.publicId
                              ? <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 600ms linear infinite' }} />
                              : <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', backgroundColor: 'rgba(185,28,28,0.9)', padding: '4px 10px', borderRadius: 3 }}>{isAR ? 'حذف' : 'Delete'}</span>
                            }
                          </span>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '28px 0', textAlign: 'center', fontFamily: 'ui-monospace, monospace', fontSize: 11, color: t.fgSubtle, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {isAR ? 'لا توجد صور بعد' : 'No photos yet'}
                  </div>
                )}
              </div>
            </div>

            {/* ── Divider ──────────────────────────────────────────────────── */}
            <div style={{ borderTop: `1px solid ${t.border}` }} />

            {/* ── Attachments section ───────────────────────────────────────── */}
            <div>
              {lbl(isAR ? 'الملفات المرفقة (PDF)' : 'Attachments (PDF)')}
              {filePicker({
                accept: '.pdf,application/pdf',
                disabled: uploadingPdf,
                onChange: e => { if (e.target.files[0]) handleAddAttachment(e.target.files[0]); },
                children: uploadingPdf
                  ? <><div style={{ width: 12, height: 12, border: `2px solid ${t.border}`, borderTopColor: primary, borderRadius: '50%', animation: 'spin 600ms linear infinite' }} /> {isAR ? 'جاري الرفع...' : 'Uploading…'}</>
                  : <>📄 {isAR ? 'رفع ملف PDF...' : 'Upload PDF…'}</>,
              })}

              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {attachments.length > 0 ? attachments.map(att => (
                  <div key={att.publicId} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: 4,
                    border: `1px solid ${t.border}`, backgroundColor: t.sunken,
                  }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>📄</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: t.fg, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {att.name || 'attachment.pdf'}
                      </div>
                      {att.size > 0 && (
                        <div style={{ fontSize: 10, color: t.fgSubtle, fontFamily: 'ui-monospace, monospace' }}>
                          {fmt(att.size)}
                        </div>
                      )}
                    </div>
                    <a
                      href={att.url} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 11, color: primary, textDecoration: 'none', fontWeight: 600, flexShrink: 0, padding: '3px 8px', borderRadius: 3, border: `1px solid ${primary}44` }}
                    >
                      {isAR ? 'فتح' : 'Open'}
                    </a>
                    <button
                      onClick={() => handleDeleteAttachment(att.publicId)}
                      disabled={deletingAtt === att.publicId}
                      style={btnGhost({ color: t.neg, borderColor: `${t.neg}55`, fontSize: 11, padding: '3px 8px', flexShrink: 0 })}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = t.negTint || '#fee2e2'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {deletingAtt === att.publicId
                        ? <div style={{ width: 10, height: 10, border: `2px solid ${t.neg}44`, borderTopColor: t.neg, borderRadius: '50%', animation: 'spin 600ms linear infinite' }} />
                        : (isAR ? 'حذف' : 'Delete')
                      }
                    </button>
                  </div>
                )) : (
                  <div style={{ padding: '20px 0', textAlign: 'center', fontFamily: 'ui-monospace, monospace', fontSize: 11, color: t.fgSubtle, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {isAR ? 'لا توجد ملفات مرفقة' : 'No attachments yet'}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: `1px solid ${t.border}`, paddingTop: 14 }}>
              <button
                onClick={onClose}
                style={btnGhost({ height: 32, padding: '0 14px', fontSize: 13, fontWeight: 500 })}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = t.sunken}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                {tr.cancel}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Barcode scanner (portal-like, renders outside modal) ─────────────── */}
      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={handleBarcodeScanned}
      />
    </>
  );
}
