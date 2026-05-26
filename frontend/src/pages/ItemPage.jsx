import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import RichTextEditor from '../components/RichTextEditor';
import BarcodeScanner from '../components/BarcodeScanner';
import Icon from '../components/Icon';
import { useAppContext } from '../context/AppContext';
import { T } from '../theme';
import { api } from '../api';

const ITEM_TYPES = ['unit', 'box', 'pack', 'group', 'roll', 'bag', 'pallet'];

// Barcode SVG icon
const BarcodeIcon = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 100 70" fill={color} style={{ display: 'block', flexShrink: 0 }}>
    <rect x="0"  y="0" width="6"  height="70"/>
    <rect x="10" y="0" width="3"  height="70"/>
    <rect x="16" y="0" width="8"  height="70"/>
    <rect x="28" y="0" width="3"  height="70"/>
    <rect x="34" y="0" width="6"  height="70"/>
    <rect x="44" y="0" width="3"  height="70"/>
    <rect x="50" y="0" width="10" height="70"/>
    <rect x="64" y="0" width="3"  height="70"/>
    <rect x="70" y="0" width="6"  height="70"/>
    <rect x="80" y="0" width="3"  height="70"/>
    <rect x="87" y="0" width="8"  height="70"/>
    <rect x="98" y="0" width="2"  height="70"/>
  </svg>
);

const defaultForm = {
  name: '', nameEn: '', sku: '', barcode: '', price: '', qty: '',
  minThreshold: '', type: 'unit', unitsPerPackage: 1, datasheet: '',
  deptId: '', catId: '', description: '',
  currency: '', active: true, isFavorite: false, serialCode: '', publish: true,
  attributes: {},
};

function fmt(bytes) {
  if (!bytes) return '';
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ItemPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';
  const [editItem, setEditItem] = useState(null);
  const onClose = () => navigate('/inventory');
  
  const { depts, cats, loadData, saveItem, t: tr, isAR, theme, company, user, showToast } = useAppContext();
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
  const [newPdfFiles,  setNewPdfFiles]  = useState([]);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [deletingAtt,  setDeletingAtt]  = useState(null); // publicId

  // ── Scanner state ──────────────────────────────────────────────────────────
  const [scannerOpen,     setScannerOpen]     = useState(false);
  const [scanLookup,      setScanLookup]      = useState(false);
  const [lookupCard,      setLookupCard]      = useState(null);
  // Pending category from lookup that didn't match any existing cat
  const [pendingCatName,  setPendingCatName]  = useState('');
  const [pendingDeptPick, setPendingDeptPick] = useState('');  // dept selected in the prompt
  const [linkingCat,      setLinkingCat]      = useState(false);

  // ── Tabs ───────────────────────────────────────────────────────────────────
  const TABS = editItem
    ? ['info', 'advanced', 'description', 'media']
    : ['info', 'advanced', 'description'];

  const tabLabels = {
    info:        isAR ? 'معلومات الصنف' : 'Item Info',
    advanced:    isAR ? 'خصائص إضافية'   : 'Advanced',
    description: isAR ? 'الوصف'          : 'Description',
    media:       isAR ? 'الصور والملفات'  : 'Media',
  };

  // ── Fetch item on mount ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isNew && id) {
      api.getItem(id).then(item => setEditItem(item)).catch(e => {
        console.error("Failed to load item", e);
        navigate('/inventory');
      });
    }
  }, [id, isNew, navigate]);

  // ── Reset form ─────────────────────────────────────────────────────────────
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
        description:     editItem.description     || '',
        currency:        editItem.currency        || '',
        active:          editItem.active          ?? true,
        isFavorite:      editItem.isFavorite      ?? false,
        serialCode:      editItem.serialCode      || '',
        publish:         editItem.publish         ?? true,
        attributes:      editItem.attributes      || {},
      });
      setImages(editItem.images || []);
      setAttachments(editItem.attachments || []);
      setPhotoPreview(editItem.photo || '');
    } else {
      setForm(defaultForm);
      setImages([]);
      setAttachments([]);
      setPhotoPreview('');
    }
    setTab('info');
    setNewPhotoFile(null);
    setNewPdfFiles([]);
    setImportImgUrl('');
    setScannerOpen(false);
    setScanLookup(false);
    setLookupCard(null);
    setPendingCatName('');
    setPendingDeptPick('');
  }, [editItem]);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  // ── Shared: apply one lookup result into the form ─────────────────────────
  const applyLookupResult = useCallback((r, code) => {
    // ── 1. Build description ──────────────────────────────────────────────
    // Use the API description if available; otherwise construct one from
    // whatever spec fields the source provided (so something is always imported).
    let descriptionToImport = (r.description || '').trim();

    if (!descriptionToImport) {
      const parts = [];
      if (r.brand)      parts.push(`${isAR ? 'العلامة التجارية' : 'Brand'}: ${r.brand}`);
      if (r.category)   parts.push(`${isAR ? 'الفئة'           : 'Category'}: ${r.category}`);
      if (r.quantity)   parts.push(`${isAR ? 'الحجم / الكمية'  : 'Size'}: ${r.quantity}`);
      if (r.weight && r.weight !== r.quantity)
                        parts.push(`${isAR ? 'الوزن'           : 'Weight'}: ${r.weight}`);
      if (r.dimensions) parts.push(`${isAR ? 'الأبعاد'         : 'Dimensions'}: ${r.dimensions}`);
      if (r.model)      parts.push(`${isAR ? 'الموديل'         : 'Model'}: ${r.model}`);
      if (r.color)      parts.push(`${isAR ? 'اللون'           : 'Color'}: ${r.color}`);
      if (r.countries)  parts.push(`${isAR ? 'بلد المنشأ'      : 'Origin'}: ${r.countries}`);
      descriptionToImport = parts.join('\n');
    }

    // ── 2. Build new attributes map ───────────────────────────────────────
    // We read form state via setForm updater, but build the card synchronously
    // using the result data so there's no timing issue with async state.
    const incomingAttrs = {};
    const tryAttr = (key, val) => { if (val) incomingAttrs[key] = String(val); };
    tryAttr('Brand',      r.brand);
    tryAttr('Category',   r.category);
    tryAttr('Quantity',   r.quantity);
    tryAttr('Weight',     r.weight);
    tryAttr('Dimensions', r.dimensions);
    tryAttr('Model',      r.model);
    tryAttr('Color',      r.color);
    tryAttr('Origin',     r.countries);
    if (r.attributes && typeof r.attributes === 'object') {
      Object.entries(r.attributes).forEach(([k, v]) => { if (v) incomingAttrs[k] = String(v); });
    }

    // ── 3. Match category/dept strings to existing records ───────────────
    const normalize = (s) => (s || '').toLowerCase().replace(/[^a-z0-9؀-ۿ]/g, ' ').trim();
    const catStr    = normalize(r.category);

    let matchedCatId  = '';
    let matchedDeptId = '';

    if (catStr) {
      // Try to find an existing category by exact or substring match
      const matchedCat = cats.find(c => {
        const a = normalize(c.name);
        const b = normalize(c.nameEn);
        return a === catStr || b === catStr || a.includes(catStr) || b.includes(catStr) || catStr.includes(a) || catStr.includes(b);
      });

      if (matchedCat) {
        matchedCatId  = matchedCat._id;
        matchedDeptId = (typeof matchedCat.deptId === 'object' ? matchedCat.deptId?._id : matchedCat.deptId) || '';
      } else {
        // No match — prompt user to pick a dept and we'll create/link the category
        setPendingCatName(r.category);
        setPendingDeptPick(depts[0]?._id || '');
      }
    }

    // ── 4. Apply to form — pure updater, no side effects ─────────────────
    setForm(prev => {
      const next = { ...prev };
      if (code) next.barcode = code;
      if (!prev.name        && r.name)             next.name        = r.name;
      if (!prev.nameEn      && r.nameEn)           next.nameEn      = r.nameEn;
      if (!prev.description && descriptionToImport) next.description = descriptionToImport;

      // Set dept / category if matched
      if (matchedCatId  && !prev.catId)  next.catId  = matchedCatId;
      if (matchedDeptId && !prev.deptId) next.deptId = matchedDeptId;

      // Merge only keys not already present
      const attrs = { ...(prev.attributes || {}) };
      Object.entries(incomingAttrs).forEach(([k, v]) => { if (!attrs[k]) attrs[k] = v; });
      next.attributes = attrs;
      return next;
    });

    // ── 4. Photo ──────────────────────────────────────────────────────────
    if (r.image) {
      setPhotoPreview(r.image);
      setImportImgUrl(r.image);
    }

    // ── 5. Build summary card (synchronous — derived from r, not from state) ─
    const imported = [];
    const cardFields = [];

    const push = (label, value, importLabel) => {
      if (!value) return;
      cardFields.push({ label, value: String(value).length > 60 ? String(value).slice(0, 57) + '…' : String(value) });
      if (importLabel) imported.push(importLabel);
    };

    push(isAR ? 'الاسم'        : 'Name',        r.name || r.nameEn,   isAR ? 'الاسم'        : 'Name');
    push(isAR ? 'الماركة'      : 'Brand',       r.brand,              isAR ? 'الماركة'      : 'Brand');
    push(isAR ? 'التصنيف'      : 'Category',    r.category,           isAR ? 'التصنيف'      : 'Category');
    push(isAR ? 'الحجم/الكمية' : 'Size/Qty',    r.quantity,           null);
    if (r.weight && r.weight !== r.quantity)
      push(isAR ? 'الوزن'      : 'Weight',      r.weight,             null);
    push(isAR ? 'الأبعاد'      : 'Dimensions',  r.dimensions,         null);
    push(isAR ? 'الموديل'      : 'Model',       r.model,              null);
    push(isAR ? 'اللون'        : 'Color',       r.color,              null);
    push(isAR ? 'بلد المنشأ'   : 'Origin',      r.countries,          null);

    if (descriptionToImport) {
      cardFields.push({ label: isAR ? 'الوصف' : 'Description', value: '✓ ' + (isAR ? 'مستورد' : 'imported') });
      imported.push(isAR ? 'الوصف' : 'Description');
    }

    const extraAttrCount = Object.keys(incomingAttrs).length;
    if (extraAttrCount > 0) {
      cardFields.push({ label: isAR ? 'خصائص إضافية' : 'Attributes', value: `${extraAttrCount} ${isAR ? 'حقول' : 'fields'}` });
      imported.push(isAR ? 'خصائص' : 'Attributes');
    }

    if (r.image) imported.push(isAR ? 'الصورة' : 'Photo');
    if (matchedCatId)  imported.push(isAR ? 'التصنيف' : 'Category');
    if (matchedDeptId) imported.push(isAR ? 'القسم'   : 'Department');

    setLookupCard({
      source:    r.source,
      sourceUrl: r.sourceUrl,
      image:     r.image,
      fields:    cardFields,
      imported,
    });
  }, [isAR, cats, depts]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Barcode scan handler (camera) ─────────────────────────────────────────
  const handleBarcodeScanned = useCallback(async (code) => {
    setScannerOpen(false);
    set('barcode', code);
    setScanLookup(true);
    try {
      const data = await api.lookupBarcode(code);
      console.log('[Barcode Scan] raw response:', data);
      const results = data?.results || [];
      if (results.length > 0) {
        console.log('[Barcode Scan] using result[0]:', results[0]);
        applyLookupResult(results[0], code);
      }
    } catch (e) {
      console.error('Barcode lookup failed', e);
    } finally {
      setScanLookup(false);
    }
  }, [applyLookupResult]);

  // ── Barcode lookup (manual — user typed or pasted a code) ─────────────────
  const handleBarcodeLookup = async () => {
    if (!form.barcode) return;
    setLookupCard(null);
    setScanLookup(true);
    try {
      const data = await api.lookupBarcode(form.barcode);
      console.log('[Barcode Lookup] raw response:', data);
      const results = data?.results || [];
      if (results.length > 0) {
        console.log('[Barcode Lookup] using result[0]:', results[0]);
        applyLookupResult(results[0], null);
        showToast(isAR ? 'تم استيراد بيانات الباركود' : 'Barcode data imported', 'success');
      } else {
        showToast(isAR ? 'لم يتم العثور على نتائج لهذا الباركود' : 'No results found for this barcode', 'info');
      }
    } catch (e) {
      console.error('Barcode lookup failed', e);
      showToast(isAR ? 'فشل البحث عن الباركود' : 'Barcode lookup failed', 'error');
    } finally {
      setScanLookup(false);
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
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

        // Upload PDF attachments (blocking)
        if (newPdfFiles.length > 0) {
          try {
            setUploadingPdf(true);
            for (const f of newPdfFiles) {
              await api.uploadAttachment(result._id, f);
            }
          } catch (err) { console.error('PDF upload failed', err); }
          finally { setUploadingPdf(false); }
        }

        if (isNew) {
          // New item — navigate to its edit page
          showToast(isAR ? '✓ تم إنشاء الصنف بنجاح' : '✓ Item created successfully', 'success');
          navigate(`/items/${result._id}`);
        } else {
          // Existing item — stay on page, reload fresh data, show toast
          showToast(isAR ? '✓ تم حفظ التغييرات بنجاح' : '✓ Changes saved successfully', 'success');
          setNewPhotoFile(null);
          setNewPdfFiles([]);
          setImportImgUrl('');
          try {
            const fresh = await api.getItem(result._id);
            setEditItem(fresh);
          } catch { /* not fatal */ }
        }
      }
    } catch { /* errors shown via toast */ }
    finally { setSaving(false); }
  };

  // ── Link pending category to a dept ──────────────────────────────────────
  const handleLinkCategory = async () => {
    if (!pendingCatName || !pendingDeptPick) return;
    setLinkingCat(true);
    try {
      // Check if a matching cat already exists under that dept
      const normalize = (s) => (s || '').toLowerCase().trim();
      const existing = cats.find(c => {
        const cDept = typeof c.deptId === 'object' ? c.deptId?._id : c.deptId;
        return cDept === pendingDeptPick && (
          normalize(c.name) === normalize(pendingCatName) ||
          normalize(c.nameEn) === normalize(pendingCatName)
        );
      });

      let catId;
      if (existing) {
        catId = existing._id;
      } else {
        const created = await api.addCat({ name: pendingCatName, nameEn: pendingCatName, deptId: pendingDeptPick });
        catId = created._id;
        loadData(); // refresh cats list in background
      }

      setForm(prev => ({ ...prev, catId, deptId: pendingDeptPick }));
      setPendingCatName('');
      showToast(
        existing
          ? (isAR ? `تم ربط التصنيف "${pendingCatName}"` : `Category "${pendingCatName}" linked`)
          : (isAR ? `تم إنشاء التصنيف "${pendingCatName}" وربطه` : `Category "${pendingCatName}" created & linked`),
        'success'
      );
    } catch (e) {
      showToast(e.message || (isAR ? 'فشل ربط التصنيف' : 'Failed to link category'), 'error');
    } finally {
      setLinkingCat(false);
    }
  };

  // ── Photos tab: add photo ──────────────────────────────────────────────────
  const handleAddPhoto = async (file) => {
    if (user?.isDemo) {
      alert(isAR ? 'رفع الملفات غير متاح في وضع التجربة' : 'Action disabled in Demo Mode');
      return;
    }
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
    if (user?.isDemo) {
      alert(isAR ? 'رفع الملفات غير متاح في وضع التجربة' : 'Action disabled in Demo Mode');
      return;
    }
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
    const { accept, disabled, onChange, children, highlight, multiple } = opts;
    return (
      <label onClick={e => { if (user?.isDemo) { e.preventDefault(); showToast(isAR ? 'رفع الملفات غير متاح في وضع التجربة' : 'File uploads are disabled in Demo Mode', 'error'); } }} style={{
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
        <input type="file" accept={accept} multiple={multiple} style={{ display: 'none' }} disabled={disabled} onChange={onChange} />
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

  const grid2 = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 };
  const grid3 = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 };

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
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 0' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <button
              type="button"
              onClick={() => navigate('/inventory')}
              style={btnGhost({ padding: '6px 12px', fontSize: 13, flexShrink: 0 })}
            >
              ← {isAR ? 'عودة' : 'Back'}
            </button>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: t.fg, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {isNew ? tr.addItem : editItem?.nameEn || editItem?.name || tr.editItem}
            </h1>
          </div>

          {/* ── Save / Cancel ────────────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button
              type="button"
              onClick={onClose}
              style={btnGhost({ height: 34, padding: '0 14px', fontSize: 13, fontWeight: 500 })}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = t.sunken}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              {tr.cancel}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isBusy}
              style={{
                height: 34, padding: '0 20px', borderRadius: 4,
                backgroundColor: primary, color: '#fff', border: 'none',
                cursor: isBusy ? 'not-allowed' : 'pointer',
                fontSize: 13, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', gap: 6,
                opacity: isBusy ? 0.65 : 1, transition: 'opacity 120ms',
              }}
            >
              {isBusy && (
                <div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 600ms linear infinite' }} />
              )}
              💾 {tr.save}
            </button>
          </div>
        </div>
        
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          
          {/* PROFILE SIDEBAR */}
          <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16, padding: 16, backgroundColor: t.elev, borderRadius: 6, border: `1px solid ${t.border}` }}>
            {/* Feature Photo */}
            <div style={{ position: 'relative', width: '100%', aspectRatio: '1', borderRadius: 6, overflow: 'hidden', backgroundColor: t.sunken, border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {photoPreview ? (
                <img src={photoPreview} alt="feature" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setPhotoPreview('')} />
              ) : (
                <span style={{ fontSize: 40, opacity: 0.2 }}>🖼️</span>
              )}
              {/* Overlay upload */}
              <label onClick={e => { if (user?.isDemo) { e.preventDefault(); showToast(isAR ? 'رفع الملفات غير متاح في وضع التجربة' : 'File uploads are disabled in Demo Mode', 'error'); } }} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', opacity: 0, cursor: 'pointer', transition: 'opacity 150ms' }} onMouseEnter={e => e.currentTarget.style.opacity=1} onMouseLeave={e => e.currentTarget.style.opacity=0}>
                <Icon name="upload" size={24} />
                <span style={{ fontSize: 12, marginTop: 8, fontWeight: 600 }}>{isAR ? 'تغيير الصورة' : 'Change Photo'}</span>
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                  const f = e.target.files[0];
                  if (!f) return;
                  setNewPhotoFile(f);
                  setImportImgUrl('');
                  setPhotoPreview(URL.createObjectURL(f));
                }} />
              </label>
            </div>
            
            {/* Badges / Quick info */}
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: t.fg }}>{form.nameEn || form.name || (isAR ? 'صنف جديد' : 'New Item')}</h2>
              <p style={{ margin: 0, fontSize: 12, color: t.fgMuted, fontFamily: 'ui-monospace, monospace' }}>{form.sku || form.barcode || '—'}</p>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              {form.active && <span style={{ padding: '2px 8px', borderRadius: 4, backgroundColor: '#10b98122', color: '#10b981', fontSize: 11, fontWeight: 700 }}>{tr.active}</span>}
              {!form.active && <span style={{ padding: '2px 8px', borderRadius: 4, backgroundColor: '#f43f5e22', color: '#f43f5e', fontSize: 11, fontWeight: 700 }}>{tr.discontinued}</span>}
              {form.publish && <span style={{ padding: '2px 8px', borderRadius: 4, backgroundColor: `${primary}22`, color: primary, fontSize: 11, fontWeight: 700 }}>{isAR ? 'منشور' : 'Published'}</span>}
            </div>
          </div>
          
          {/* MAIN TABS AREA */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>

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
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

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
                  <input
                    value={form.barcode}
                    onChange={e => set('barcode', e.target.value)}
                    style={inp('barcode', { fontFamily: 'ui-monospace, monospace', paddingRight: 62 })}
                    onFocus={() => setFocused('barcode')}
                    onBlur={() => setFocused('')}
                  />
                  {/* Right-side buttons: Lookup + Camera-scan */}
                  <div style={{
                    position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
                    display: 'flex', alignItems: 'center', gap: 2,
                  }}>
                    {/* Lookup button — barcode icon + text */}
                    <button
                      type="button"
                      title={isAR ? 'البحث عن الباركود واستيراد البيانات' : 'Lookup barcode & import data'}
                      onClick={handleBarcodeLookup}
                      disabled={!form.barcode || scanLookup}
                      style={{
                        background: form.barcode && !scanLookup ? `${primary}15` : 'none',
                        border: `1px solid ${form.barcode && !scanLookup ? primary + '44' : t.border}`,
                        borderRadius: 3,
                        cursor: (!form.barcode || scanLookup) ? 'not-allowed' : 'pointer',
                        color: (!form.barcode || scanLookup) ? t.fgSubtle : primary,
                        padding: '2px 5px', display: 'flex', alignItems: 'center', gap: 3,
                        fontSize: 10, fontWeight: 700, fontFamily: 'ui-monospace, monospace',
                        transition: 'all 120ms', lineHeight: 1, height: 22, whiteSpace: 'nowrap',
                      }}
                    >
                      {scanLookup
                        ? <div style={{ width: 10, height: 10, border: `2px solid ${t.border}`, borderTopColor: primary, borderRadius: '50%', animation: 'spin 600ms linear infinite' }} />
                        : <BarcodeIcon size={11} color="currentColor" />
                      }
                      <span>{isAR ? 'بحث' : 'Lookup'}</span>
                    </button>
                    {/* Camera scan button — barcode icon (not camera) */}
                    <button
                      type="button"
                      title={isAR ? 'مسح بالكاميرا' : 'Scan with camera'}
                      onClick={() => setScannerOpen(true)}
                      disabled={scanLookup}
                      style={{
                        background: 'none',
                        border: `1px solid ${t.border}`,
                        borderRadius: 3,
                        cursor: scanLookup ? 'not-allowed' : 'pointer',
                        color: t.fgSubtle,
                        padding: '2px 5px',
                        display: 'flex', alignItems: 'center', lineHeight: 1, height: 22,
                        transition: 'border-color 120ms, color 120ms',
                      }}
                      onMouseEnter={e => { if (!scanLookup) { e.currentTarget.style.color = primary; e.currentTarget.style.borderColor = primary + '66'; } }}
                      onMouseLeave={e => { e.currentTarget.style.color = t.fgSubtle; e.currentTarget.style.borderColor = t.border; }}
                    >
                      <BarcodeIcon size={12} color="currentColor" />
                    </button>
                  </div>
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
                <select value={form.deptId} onChange={e => {
                  setForm(prev => ({ ...prev, deptId: e.target.value, catId: '' }));
                }} style={inp('dept')} onFocus={() => setFocused('dept')} onBlur={() => setFocused('')}>
                  <option value="">— {isAR ? 'بدون' : 'None'} —</option>
                  {depts.map(d => (
                    <option key={d._id} value={d._id}>{isAR ? d.name : (d.nameEn || d.name)}</option>
                  ))}
                </select>
              </div>
              <div>
                {lbl(tr.category)}
                <select value={form.catId} onChange={e => set('catId', e.target.value)}
                  style={inp('cat')} disabled={!form.deptId}
                  onFocus={() => setFocused('cat')} onBlur={() => setFocused('')}>
                  <option value="">— {isAR ? 'بدون' : 'None'} —</option>
                  {(() => {
                    const deptCats = cats.filter(c => {
                      const cDeptId = typeof c.deptId === 'object' ? c.deptId?._id : c.deptId;
                      return cDeptId === form.deptId;
                    });
                    const buildTree = (parentId, depth = 0) => {
                      let res = [];
                      const children = deptCats.filter(c => (c.parentId || null) === parentId);
                      for (const child of children) {
                        res.push({ ...child, depth });
                        res = res.concat(buildTree(child._id, depth + 1));
                      }
                      return res;
                    };
                    const tree = buildTree(null);
                    return tree.map(c => (
                      <option key={c._id} value={c._id}>
                        {"\u00A0\u00A0\u00A0\u00A0".repeat(c.depth)}{c.depth > 0 ? '↳ ' : ''}{(isAR && c.name) ? c.name : (c.nameEn || c.name)}
                      </option>
                    ));
                  })()}
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
                      multiple: true,
                      highlight: newPdfFiles.length > 0,
                      disabled: uploadingPdf,
                      onChange: e => { 
                        if (e.target.files) {
                          setNewPdfFiles(Array.from(e.target.files));
                        }
                      },
                      children: uploadingPdf
                        ? <><div style={{ width: 14, height: 14, border: `2px solid ${t.border}`, borderTopColor: primary, borderRadius: '50%', animation: 'spin 600ms linear infinite' }} /> {isAR ? 'جاري الرفع...' : 'Uploading…'}</>
                        : <>
                            <Icon name="upload" size={16} style={{ color: newPdfFiles.length > 0 ? primary : t.fgMuted }} />
                            {newPdfFiles.length > 0 
                              ? (isAR ? `تم اختيار ${newPdfFiles.length} ملفات` : `${newPdfFiles.length} files selected`) 
                              : (isAR ? 'إرفاق ملفات PDF للكتالوج...' : 'Attach PDF Catalogues…')}
                          </>,
                    })}
                    {newPdfFiles.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, marginTop: 4 }}>
                        {newPdfFiles.map((file, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                            <span style={{ flex: 1, fontSize: 11, color: t.fgMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {file.name}
                            </span>
                            <span style={{ fontSize: 10, color: t.fgSubtle, flexShrink: 0 }}>{fmt(file.size)}</span>
                            <button
                              type="button"
                              onClick={() => setNewPdfFiles(prev => prev.filter((_, i) => i !== idx))}
                              style={btnGhost({ fontSize: 10, padding: '2px 8px', color: t.neg, borderColor: `${t.neg}55`, flexShrink: 0 })}
                              onMouseEnter={e => e.currentTarget.style.backgroundColor = t.negTint || '#fee2e2'}
                              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              ×
                            </button>
                          </div>
                        ))}
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

            {/* ── Lookup result card ─────────────────────────────────────── */}
            {lookupCard && (
              <div style={{
                borderRadius: 6, border: `1px solid ${primary}33`,
                backgroundColor: `${primary}08`, overflow: 'hidden',
              }}>
                {/* Card header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', borderBottom: `1px solid ${primary}22`,
                  backgroundColor: `${primary}12`,
                }}>
                  {lookupCard.image && (
                    <img src={lookupCard.image} alt="product"
                      style={{ width: 38, height: 38, borderRadius: 4, objectFit: 'cover', flexShrink: 0, border: `1px solid ${primary}33` }}
                      onError={e => e.currentTarget.style.display = 'none'}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, fontFamily: 'ui-monospace, monospace', color: primary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {isAR ? '✓ تم استيراد البيانات من:' : '✓ Data imported from:'}{' '}
                      {lookupCard.sourceUrl
                        ? <a href={lookupCard.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: primary, textDecoration: 'underline' }}>{lookupCard.source}</a>
                        : lookupCard.source
                      }
                    </div>
                    <div style={{ fontSize: 10, color: t.fgSubtle, marginTop: 2 }}>
                      {lookupCard.imported.join(' · ')}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLookupCard(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.fgSubtle, fontSize: 16, padding: 4, lineHeight: 1 }}
                    title={isAR ? 'إغلاق' : 'Dismiss'}
                  >×</button>
                </div>
                {/* Fields grid */}
                {lookupCard.fields.length > 0 && (
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                    gap: 6, padding: 10,
                  }}>
                    {lookupCard.fields.map((f, i) => (
                      <div key={i} style={{
                        padding: '4px 8px', borderRadius: 4,
                        backgroundColor: t.canvas, border: `1px solid ${t.border}`,
                        minWidth: 0,
                      }}>
                        <div style={{ fontSize: 9, fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: t.fgSubtle, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                          {f.label}
                        </div>
                        <div style={{ fontSize: 11, color: t.fg, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.value}>
                          {f.value}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Pending category from lookup ────────────────────────────── */}
            {pendingCatName && (
              <div style={{
                padding: '10px 14px', borderRadius: 6,
                border: `1px solid ${primary}44`,
                backgroundColor: `${primary}0a`,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: primary, fontFamily: 'ui-monospace, monospace', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  {isAR ? '⚠ تصنيف من الباركود لم يتم مطابقته' : '⚠ Unmatched category from barcode lookup'}
                </div>
                <div style={{ fontSize: 12, color: t.fg, marginBottom: 10 }}>
                  {isAR
                    ? <>التصنيف المسترجع: <strong>"{pendingCatName}"</strong> — اختر القسم لإنشائه أو ربطه تلقائياً:</>
                    : <>Retrieved category: <strong>"{pendingCatName}"</strong> — select a department to create or link it:</>
                  }
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <select
                    value={pendingDeptPick}
                    onChange={e => setPendingDeptPick(e.target.value)}
                    style={{
                      flex: 1, minWidth: 140, height: 30, padding: '0 8px', borderRadius: 4,
                      border: `1px solid ${t.border}`, backgroundColor: t.canvas, color: t.fg,
                      fontSize: 12, fontFamily: 'inherit', outline: 'none',
                    }}
                  >
                    <option value="">{isAR ? '— اختر القسم —' : '— Select Department —'}</option>
                    {depts.map(d => (
                      <option key={d._id} value={d._id}>{isAR ? d.name : (d.nameEn || d.name)}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleLinkCategory}
                    disabled={!pendingDeptPick || linkingCat}
                    style={{
                      height: 30, padding: '0 14px', borderRadius: 4,
                      backgroundColor: (!pendingDeptPick || linkingCat) ? t.sunken : primary,
                      color: (!pendingDeptPick || linkingCat) ? t.fgSubtle : '#fff',
                      border: 'none', cursor: (!pendingDeptPick || linkingCat) ? 'not-allowed' : 'pointer',
                      fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
                      transition: 'all 120ms', flexShrink: 0,
                    }}
                  >
                    {linkingCat
                      ? <div style={{ width: 11, height: 11, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 600ms linear infinite' }} />
                      : null
                    }
                    {isAR ? 'إنشاء / ربط' : 'Create & Link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingCatName('')}
                    style={btnGhost({ fontSize: 11, padding: '3px 10px', height: 30 })}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = t.sunken}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {isAR ? 'تجاهل' : 'Dismiss'}
                  </button>
                </div>
              </div>
            )}

            {/* Description — always visible read-only preview, editable in Description tab */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                <label style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.fgSubtle }}>
                  {isAR ? 'الوصف' : 'Description'}
                </label>
                <button
                  type="button"
                  onClick={() => setTab('description')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: primary, fontSize: 11, fontFamily: 'ui-monospace, monospace', fontWeight: 600, padding: 0 }}
                >
                  {isAR ? 'تحرير ↗' : 'Edit ↗'}
                </button>
              </div>
              <div
                onClick={() => setTab('description')}
                title={isAR ? 'انقر للتحرير في تبويب الوصف' : 'Click to edit in Description tab'}
                style={{
                  padding: '8px 12px', borderRadius: 4, cursor: 'pointer',
                  border: `1px solid ${form.description ? t.border : t.border}`,
                  backgroundColor: t.canvas, fontSize: 12, color: form.description ? t.fgMuted : t.fgSubtle,
                  lineHeight: 1.6, minHeight: 48, maxHeight: 90, overflow: 'hidden', position: 'relative',
                  transition: 'border-color 120ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = primary; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; }}
              >
                {form.description
                  ? <>
                      <div dangerouslySetInnerHTML={{ __html: form.description }} style={{ pointerEvents: 'none' }} />
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 24, background: `linear-gradient(transparent, ${t.canvas})` }} />
                    </>
                  : <span style={{ fontStyle: 'italic', opacity: 0.55 }}>
                      {isAR ? 'لا يوجد وصف — انقر لإضافة وصف مفصّل...' : 'No description — click to add one…'}
                    </span>
                }
              </div>
            </div>

            
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB: Advanced
            ══════════════════════════════════════════════════════════════════ */}
        {tab === 'advanced' && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Active / Publish / Favorite */}
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: t.fg, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: primary }} />
                {isAR ? 'نشط (متاح للاستخدام)' : 'Active'}
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: t.fg, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.publish} onChange={e => set('publish', e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: primary }} />
                {isAR ? 'نشر في المتجر/الكتالوج' : 'Published'}
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: t.fg, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.isFavorite} onChange={e => set('isFavorite', e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: primary }} />
                {isAR ? 'مفضل (نجمة)' : 'Favorite'}
              </label>
            </div>

            {/* Extra standard fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                {lbl(isAR ? 'العملة' : 'Currency')}
                <input value={form.currency} onChange={e => set('currency', e.target.value)}
                  style={inp('currency')} placeholder="e.g. USD, SAR"
                  onFocus={() => setFocused('currency')} onBlur={() => setFocused('')} />
              </div>
              <div>
                {lbl(isAR ? 'الرقم التسلسلي' : 'Serial Code')}
                <input value={form.serialCode} onChange={e => set('serialCode', e.target.value)}
                  style={inp('serialCode', { fontFamily: 'ui-monospace, monospace' })}
                  onFocus={() => setFocused('serialCode')} onBlur={() => setFocused('')} />
              </div>
            </div>

            <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: t.fg }}>{isAR ? 'خصائص مخصصة (Custom Attributes)' : 'Custom Attributes'}</h3>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: t.fgMuted }}>{isAR ? 'أضف أي حقول ديناميكية تم استيرادها أو تريد إضافتها.' : 'Add dynamic fields imported from files or custom logic.'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newAttrs = { ...form.attributes };
                    let key = `New_Field_${Object.keys(newAttrs).length + 1}`;
                    newAttrs[key] = '';
                    set('attributes', newAttrs);
                  }}
                  style={{
                    height: 28, padding: '0 12px', borderRadius: 4,
                    backgroundColor: `${primary}15`, color: primary, border: 'none',
                    cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  }}
                >
                  + {isAR ? 'إضافة خاصية' : 'Add Attribute'}
                </button>
              </div>

              {Object.keys(form.attributes || {}).length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: t.fgSubtle, backgroundColor: t.sunken, borderRadius: 4, fontSize: 12 }}>
                  {isAR ? 'لا توجد خصائص مخصصة لهذا الصنف.' : 'No custom attributes on this item.'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {Object.entries(form.attributes || {}).map(([key, val], i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <input
                        value={key}
                        onChange={e => {
                          const newAttrs = {};
                          Object.keys(form.attributes).forEach(k => {
                            if (k === key) newAttrs[e.target.value] = form.attributes[k];
                            else newAttrs[k] = form.attributes[k];
                          });
                          set('attributes', newAttrs);
                        }}
                        style={{ ...inp(`attrKey_${i}`), flex: 1, fontFamily: 'ui-monospace, monospace' }}
                        placeholder={isAR ? 'اسم الخاصية' : 'Attribute Name'}
                      />
                      <input
                        value={val}
                        onChange={e => set('attributes', { ...form.attributes, [key]: e.target.value })}
                        style={{ ...inp(`attrVal_${i}`), flex: 2 }}
                        placeholder={isAR ? 'القيمة' : 'Value'}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newAttrs = { ...form.attributes };
                          delete newAttrs[key];
                          set('attributes', newAttrs);
                        }}
                        style={{ background: 'none', border: 'none', color: t.neg, cursor: 'pointer', padding: 6 }}
                        title={tr.delete}
                      >
                        <Icon name="delete" size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB: Description
            ══════════════════════════════════════════════════════════════════ */}
        {tab === 'description' && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
            
          </div>
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
               </div>
        </div>
      </div>

      {/* ── Barcode scanner (portal-like, renders outside modal) ─────────────── */}
      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={handleBarcodeScanned}
      />
    </>
  );
}
