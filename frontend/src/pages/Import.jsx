/**
 * Import.jsx — Owner-only Odoo CSV/Excel data import wizard.
 * Steps: 0) Upload  1) Map Columns  2) Preview & Review  3) Done
 *
 * Duplicate detection: before importing, the system fetches existing
 * items and checks for name collisions. Any conflict surfaces a modal
 * where the user picks per-item: Merge into existing | Add as new | Skip.
 */
import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { useAppContext } from '../context/AppContext';
import { T } from '../theme';
import { api } from '../api';
import Icon from '../components/Icon';

// ── System fields the user can map to ──────────────────────────────────────
const SYSTEM_FIELDS = [
  { key: 'name',         label: 'Name (AR)',               required: true  },
  { key: 'nameEn',       label: 'Name (EN)',               required: false },
  { key: 'sku',          label: 'SKU / Ref',               required: false },
  { key: 'barcode',      label: 'Barcode',                 required: false },
  { key: 'qty',          label: 'Quantity',                required: false },
  { key: 'minThreshold', label: 'Min Qty',                 required: false },
  { key: 'price',        label: 'Price',                   required: false },
  { key: 'currency',     label: 'Currency',                required: false },
  { key: 'active',       label: 'Active (Status)',         required: false },
  { key: 'isFavorite',   label: 'Favorite',                required: false },
  { key: 'serialCode',   label: 'Serial Code',             required: false },
  { key: 'updateCount',  label: 'Number of Changes',       required: false },
  { key: 'type',         label: 'Type of Unit',            required: false },
  { key: 'publish',      label: 'Publish',                 required: false },
  { key: 'deletedAt',    label: 'Deleted At',              required: false },
  { key: 'description',  label: 'Description / Notes',     required: false },
  { key: '_custom',      label: '+ Custom attribute…',     required: false },
  { key: '_skip',        label: '— Skip this column —',    required: false },
];

// ── Common Odoo export headers → system field auto-detect ──────────────────
const ODOO_AUTO = {
  'internal reference': 'sku',
  'internal ref':       'sku',
  'reference':          'sku',
  'product name':       'nameEn',
  'name':               'name',
  'اسم المنتج':         'name',
  'الاسم':              'name',
  'sales price':        'price',
  'price':              'price',
  'السعر':              'price',
  'currency':           'currency',
  'quantity on hand':   'qty',
  'on hand':            'qty',
  'qty':                'qty',
  'quantity':           'qty',
  'qty_available':      'qty',
  'الكمية':             'qty',
  'min qty':            'minThreshold',
  'minimum qty':        'minThreshold',
  'barcode':            'barcode',
  'الباركود':           'barcode',
  'status':             'active',
  'active':             'active',
  'favorite':           'isFavorite',
  'serial_code':        'serialCode',
  'serial code':        'serialCode',
  'number_of_changes':  'updateCount',
  'number of changes':  'updateCount',
  'type_of_unit':       'type',
  'type of unit':       'type',
  'publish':            'publish',
  'deleted_at':         'deletedAt',
  'deleted at':         'deletedAt',
  'notes':              'description',
  'description':        'description',
  'الوصف':              'description',
};

function autoMap(headers) {
  return headers.map(h => ODOO_AUTO[h.trim().toLowerCase()] || '_skip');
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  return lines.map(line => {
    const row = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (ch === ',' && !inQ) {
        row.push(cur.trim()); cur = '';
      } else {
        cur += ch;
      }
    }
    row.push(cur.trim());
    return row;
  });
}

// ── Conflict decision labels ───────────────────────────────────────────────
const DECISIONS = {
  merge: { en: 'Update existing',  ar: 'تحديث الموجود',     color: '#3b82f6' },
  new:   { en: 'Add as new item',  ar: 'إضافة كصنف جديد',   color: '#10b981' },
  skip:  { en: 'Skip',             ar: 'تخطي',              color: '#94a3b8' },
};

export default function Import() {
  const { theme, company, isAR, user, showToast } = useAppContext();
  const tok     = T[theme] || T.light;
  const primary = company?.primaryColor || '#3b82f6';

  const [step,        setStep]        = useState(0);
  const [headers,     setHeaders]     = useState([]);
  const [rows,        setRows]        = useState([]);
  const [mapping,     setMapping]     = useState([]);
  const [defaults,    setDefaults]    = useState({});
  const [customNames, setCustomNames] = useState({});
  const [fileName,    setFileName]    = useState('');
  const [dragging,    setDragging]    = useState(false);
  const [importing,   setImporting]   = useState(false);
  const [checking,    setChecking]    = useState(false);
  const [result,      setResult]      = useState(null);
  const [error,       setError]       = useState('');

  // ── Conflict state ─────────────────────────────────────────────────────────
  // conflicts: [{idx (index into validItems), imported, existing}]
  // decisions: { conflictIndex -> 'merge' | 'new' | 'skip' }
  const [conflicts,     setConflicts]     = useState([]);
  const [decisions,     setDecisions]     = useState({});
  const [showConflicts, setShowConflicts] = useState(false);

  const fileRef = useRef();

  const monoLabel = {
    fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.08em', color: tok.fgSubtle,
  };
  const panel = { backgroundColor: tok.elev, border: `1px solid ${tok.border}`, borderRadius: 4 };

  // ── Owner guard ────────────────────────────────────────────────────────────
  if (user?.role !== 'owner') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
          <h2 style={{ color: tok.fg, fontSize: 20, fontWeight: 800, margin: '0 0 8px' }}>
            {isAR ? 'هذه الصفحة للمالك فقط' : 'Owner Access Only'}
          </h2>
          <p style={{ color: tok.fgMuted, fontSize: 13 }}>
            {isAR ? 'فقط مالك النظام يمكنه استيراد البيانات.' : 'Only the system owner can import data.'}
          </p>
        </div>
      </div>
    );
  }

  // ── File processing ────────────────────────────────────────────────────────
  const processFile = useCallback((file) => {
    if (user?.isDemo) {
      showToast(isAR ? 'رفع الملفات غير متاح في وضع التجربة' : 'File imports are disabled in Demo Mode', 'error');
      return;
    }
    setError('');
    setFileName(file.name);
    const ext = file.name.split('.').pop().toLowerCase();

    const done = (hdrs, data) => {
      setHeaders(hdrs);
      setRows(data);
      setMapping(autoMap(hdrs));
      setDefaults({}); setCustomNames({});
      setStep(1);
    };

    if (ext === 'csv') {
      const reader = new FileReader();
      reader.onload = e => {
        const parsed = parseCSV(e.target.result);
        if (parsed.length < 2) { setError('File appears empty or invalid.'); return; }
        done(parsed[0], parsed.slice(1).filter(r => r.some(c => c)));
      };
      reader.readAsText(file, 'UTF-8');
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const wb   = XLSX.read(e.target.result, { type: 'array' });
          const ws   = wb.Sheets[wb.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
          if (data.length < 2) { setError('Spreadsheet appears empty.'); return; }
          const hdrs    = data[0].map(String);
          const dataRows = data.slice(1)
            .filter(r => r.some(c => c !== '' && c != null))
            .map(r => hdrs.map((_, i) => r[i] != null ? String(r[i]) : ''));
          done(hdrs, dataRows);
        } catch (err) {
          setError('Could not read Excel file: ' + err.message);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setError('Unsupported file type. Please upload .csv, .xlsx, or .xls');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDrop = e => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  // ── Build mapped items from rows ───────────────────────────────────────────
  const mappedItems = rows.map(row => {
    const obj   = {};
    const attrs = {};
    SYSTEM_FIELDS.forEach(f => {
      if (f.key !== '_skip' && f.key !== '_custom' && !mapping.includes(f.key)) {
        if (defaults[f.key]) obj[f.key] = defaults[f.key];
      }
    });
    mapping.forEach((field, i) => {
      if (!field || field === '_skip') return;
      if (field === '_custom') {
        const cname = (customNames[i] || '').trim();
        if (cname) attrs[cname] = row[i] || '';
      } else {
        const val = row[i];
        if (val !== undefined && val !== '') obj[field] = val;
      }
    });
    if (Object.keys(attrs).length > 0) obj.attributes = attrs;
    return obj;
  });

  const validItems  = mappedItems.filter(it => it.name || it.nameEn);
  const hasNameCol  = mapping.some(m => m === 'name' || m === 'nameEn') || !!defaults['name'] || !!defaults['nameEn'];

  const activeSystemFields = SYSTEM_FIELDS.filter(
    f => f.key !== '_skip' && f.key !== '_custom' && (mapping.includes(f.key) || defaults[f.key])
  );
  const activeCustomFields = Object.entries(customNames)
    .filter(([i, name]) => mapping[parseInt(i)] === '_custom' && name?.trim())
    .map(([i, name]) => ({ colIdx: parseInt(i), name: name.trim() }));

  // ── Step 1: "Import" clicked → check for name-based duplicates ────────────
  const handleImport = async () => {
    setChecking(true);
    setError('');
    try {
      // Fetch all existing items (up to 500; covers most inventories)
      const existing = await api.getItems();

      // Build case-insensitive name lookup maps
      const byNameAR = {}, byNameEN = {};
      existing.forEach(item => {
        if (item.name)   byNameAR[item.name.trim().toLowerCase()]   = item;
        if (item.nameEn) byNameEN[item.nameEn.trim().toLowerCase()] = item;
      });

      // Find conflicts: imported items whose name matches an existing item
      // (Skip items that match by SKU/barcode — the backend already upserts those)
      const found = [];
      validItems.forEach((imported, idx) => {
        const matchAR = imported.name   && byNameAR[imported.name.trim().toLowerCase()];
        const matchEN = imported.nameEn && byNameEN[imported.nameEn.trim().toLowerCase()];
        const match   = matchAR || matchEN;
        if (!match) return;

        // If already matched by SKU or barcode the backend handles it → skip conflict UI
        const skuMatch = imported.sku     && match.sku     && imported.sku.trim()     === match.sku.trim();
        const bcMatch  = imported.barcode && match.barcode && imported.barcode.trim() === match.barcode.trim();
        if (skuMatch || bcMatch) return;

        found.push({ idx, imported, existing: match });
      });

      if (found.length === 0) {
        // No conflicts — import directly
        await doImport(validItems, []);
      } else {
        // Show conflict resolution modal, default all to 'merge'
        setConflicts(found);
        setDecisions(Object.fromEntries(found.map((_, ci) => [ci, 'merge'])));
        setShowConflicts(true);
      }
    } catch (e) {
      setError(e.message || 'Failed to check for duplicates');
    } finally {
      setChecking(false);
    }
  };

  // ── Core import execution (called after conflicts are resolved) ────────────
  const doImport = async (itemsForBatch, mergeOps /* [{id, data}] */) => {
    setImporting(true);
    setShowConflicts(false);
    try {
      let created = 0, updated = 0, skipped = 0, errors = [];

      // Direct updates for "merge" decisions
      for (const { id, data } of mergeOps) {
        try {
          await api.updateItem(id, data);
          updated++;
        } catch (e) {
          errors.push({ row: data.name || data.nameEn || '?', error: e.message });
        }
      }

      // Batch import for new / non-conflicting items
      if (itemsForBatch.length > 0) {
        const res = await api.importItems(itemsForBatch);
        created += res.created || 0;
        updated += res.updated || 0;
        skipped += res.skipped || 0;
        errors   = [...errors, ...(res.errors || [])];
      }

      setResult({ created, updated, skipped, errors });
      setStep(3);
    } catch (e) {
      setError(e.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  // ── Confirm conflict resolution and run import ─────────────────────────────
  const handleConfirmConflicts = async () => {
    // Map conflict indices → {idx into validItems, decision, existing item}
    const conflictByValidIdx = {};
    conflicts.forEach((c, ci) => {
      conflictByValidIdx[c.idx] = { decision: decisions[ci] ?? 'merge', existing: c.existing };
    });

    const itemsForBatch = [];
    const mergeOps      = [];
    let   skippedCount  = 0;

    validItems.forEach((item, idx) => {
      const conflict = conflictByValidIdx[idx];
      if (!conflict) {
        itemsForBatch.push(item); // no conflict → batch as normal
        return;
      }
      if (conflict.decision === 'skip') {
        skippedCount++;
        return;
      }
      if (conflict.decision === 'merge') {
        mergeOps.push({ id: conflict.existing._id, data: item });
        return;
      }
      // 'new' → add to batch as-is (clear SKU/barcode that might link to existing)
      itemsForBatch.push({ ...item });
    });

    await doImport(itemsForBatch, mergeOps);
    // skippedCount is already captured in doImport via result.skipped
    // but we need to add manually-skipped conflicts
    setResult(prev => prev ? { ...prev, skipped: (prev.skipped || 0) + skippedCount } : prev);
  };

  const reset = () => {
    setStep(0); setHeaders([]); setRows([]);
    setMapping([]); setDefaults({}); setCustomNames({});
    setResult(null); setFileName('');
    setConflicts([]); setDecisions({}); setShowConflicts(false);
  };

  const stepLabels = isAR
    ? ['رفع الملف', 'تعيين الأعمدة', 'مراجعة', 'تم']
    : ['Upload', 'Map Columns', 'Review', 'Done'];

  // ── Shared field preview helper ────────────────────────────────────────────
  const fieldRow = (label, val, muted = false) => val ? (
    <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', fontSize: 12 }}>
      <span style={{ ...monoLabel, fontSize: 9, flexShrink: 0 }}>{label}</span>
      <span style={{ color: muted ? tok.fgMuted : tok.fg, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{val}</span>
    </div>
  ) : null;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>

      {/* Page header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Icon name="import_data" size={20} style={{ color: primary }} />
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: tok.fg }}>
            {isAR ? 'استيراد البيانات من Odoo' : 'Import Data from Odoo'}
          </h1>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: tok.fgMuted }}>
          {isAR
            ? 'ارفع ملف CSV أو Excel صادر من Odoo، وعيّن الأعمدة، ثم راجع البيانات قبل الاستيراد.'
            : 'Upload a CSV or Excel file exported from Odoo, map the columns, then review before importing.'}
        </p>
      </div>

      {/* Step breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 24, ...panel, padding: '10px 16px', flexWrap: 'wrap' }}>
        {stepLabels.map((lbl, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                backgroundColor: i < step ? '#10b981' : i === step ? primary : tok.sunken,
                border: `2px solid ${i < step ? '#10b981' : i === step ? primary : tok.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                {i < step
                  ? <Icon name="check" size={11} style={{ color: '#fff' }} />
                  : <span style={{ fontSize: 10, fontWeight: 700, color: i === step ? '#fff' : tok.fgSubtle }}>{i + 1}</span>
                }
              </div>
              <span style={{ fontSize: 12, fontWeight: i === step ? 600 : 400, color: i <= step ? tok.fg : tok.fgSubtle }}>
                {lbl}
              </span>
            </div>
            {i < stepLabels.length - 1 && (
              <div style={{ width: 24, height: 1, backgroundColor: i < step ? '#10b981' : tok.border, margin: '0 8px' }} />
            )}
          </div>
        ))}
      </div>

      {/* ── STEP 0: Upload ──────────────────────────────────────────────────── */}
      {step === 0 && (
        <div>
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => {
              if (user?.isDemo) {
                showToast(isAR ? 'رفع الملفات غير متاح في وضع التجربة' : 'File imports are disabled in Demo Mode', 'error');
                return;
              }
              fileRef.current?.click();
            }}
            style={{
              ...panel,
              border: `2px dashed ${dragging ? primary : tok.border}`,
              backgroundColor: dragging ? `${primary}08` : tok.elev,
              padding: '60px 20px', textAlign: 'center',
              cursor: 'pointer', transition: 'border-color 120ms, background 120ms',
            }}
          >
            <div style={{ width: 56, height: 56, borderRadius: 8, margin: '0 auto 16px', backgroundColor: `${primary}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="upload" size={26} style={{ color: primary }} />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: tok.fg }}>
              {isAR ? 'اسحب وأفلت الملف هنا' : 'Drag & drop your file here'}
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: tok.fgMuted }}>
              {isAR ? 'أو انقر للتصفح — .csv، .xlsx، .xls' : 'or click to browse — .csv, .xlsx, .xls'}
            </p>
            <div style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              {['CSV', 'XLSX', 'XLS'].map(fmt => (
                <span key={fmt} style={{ padding: '3px 10px', borderRadius: 4, border: `1px solid ${tok.border}`, backgroundColor: tok.sunken, ...monoLabel, color: tok.fgMuted }}>
                  {fmt}
                </span>
              ))}
            </div>
            <input
              ref={fileRef} type="file" accept=".csv,.xlsx,.xls"
              style={{ display: 'none' }}
              onChange={e => { if (e.target.files[0]) processFile(e.target.files[0]); }}
            />
          </div>

          {error && (
            <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 4, backgroundColor: tok.negTint, border: `1px solid ${tok.neg}40`, color: tok.neg, fontSize: 13 }}>
              {error}
            </div>
          )}

          <div style={{ ...panel, marginTop: 16, padding: '14px 18px' }}>
            <div style={{ ...monoLabel, display: 'block', marginBottom: 10 }}>
              {isAR ? 'كيفية تصدير البيانات من Odoo' : 'How to export from Odoo'}
            </div>
            <ol style={{ margin: 0, paddingInlineStart: 20, color: tok.fgMuted, fontSize: 13, lineHeight: 2 }}>
              <li>{isAR ? 'افتح Inventory → Products' : 'Open Inventory → Products'}</li>
              <li>{isAR ? 'اختر الأصناف المطلوبة أو الكل' : 'Select items or all'}</li>
              <li>{isAR ? 'اضغط Action → Export' : 'Click Action → Export'}</li>
              <li>{isAR ? 'اختر حقول: Name, Internal Ref, Barcode, Qty On Hand, Sales Price' : 'Choose fields: Name, Internal Ref, Barcode, Qty On Hand, Sales Price'}</li>
              <li>{isAR ? 'صدّر كـ CSV أو XLSX' : 'Export as CSV or XLSX'}</li>
            </ol>
          </div>
        </div>
      )}

      {/* ── STEP 1: Map Columns ─────────────────────────────────────────────── */}
      {step === 1 && (
        <div>
          <div style={{ ...panel, padding: '16px 20px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ ...monoLabel, display: 'block', marginBottom: 2 }}>
                  {isAR ? 'تعيين الأعمدة' : 'Column Mapping'}
                </div>
                <div style={{ fontSize: 12, color: tok.fgMuted }}>
                  {isAR
                    ? `${headers.length} أعمدة · ${rows.length} صف`
                    : `${headers.length} columns · ${rows.length} rows`}
                  {' — '}
                  <span style={{ fontFamily: 'ui-monospace,monospace', fontSize: 11, color: primary }}>{fileName}</span>
                </div>
              </div>
              <button
                onClick={() => { setStep(0); setHeaders([]); setRows([]); setMapping([]); setDefaults({}); setCustomNames({}); }}
                style={{ background: 'none', border: `1px solid ${tok.border}`, borderRadius: 4, cursor: 'pointer', color: tok.fgMuted, padding: '5px 12px', fontSize: 12 }}
              >
                {isAR ? 'ملف آخر' : 'Change File'}
              </button>
            </div>

            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 14,
              padding: '8px 12px', borderRadius: 4,
              backgroundColor: `${primary}0d`, border: `1px solid ${primary}30`,
              fontSize: 12, color: tok.fgMuted,
            }}>
              <Icon name="info" size={14} style={{ color: primary, flexShrink: 0, marginTop: 1 }} />
              <span>
                {isAR
                  ? 'يمكنك اختيار "+ حقل مخصص..." لتعيين أعمدة إضافية غير موجودة في النظام وحفظها كخصائص إضافية للصنف.'
                  : 'Choose "+ Custom attribute…" to map extra columns not in the system — they are saved as custom attributes on each item.'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {headers.map((hdr, i) => {
                const isCustom = mapping[i] === '_custom';
                return (
                  <div key={i} style={{
                    display: 'grid', gridTemplateColumns: '1fr auto 1fr',
                    alignItems: 'start', gap: 12,
                    padding: '8px 12px', borderRadius: 4,
                    backgroundColor: tok.sunken, border: `1px solid ${tok.border}`,
                  }}>
                    <div>
                      <div style={{ ...monoLabel, marginBottom: 2 }}>{isAR ? 'عمود الملف' : 'File column'}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: tok.fg, fontFamily: 'ui-monospace,monospace' }}>
                        {hdr || <span style={{ color: tok.fgSubtle }}>(empty)</span>}
                      </div>
                      {rows[0]?.[i] && (
                        <div style={{ fontSize: 11, color: tok.fgSubtle, marginTop: 2 }}>
                          {isAR ? 'مثال:' : 'e.g.'} {String(rows[0][i]).slice(0, 40)}
                        </div>
                      )}
                    </div>
                    <Icon name="arrow_down" size={14} style={{ color: tok.fgSubtle, transform: 'rotate(-90deg)', marginTop: 18, flexShrink: 0 }} />
                    <div>
                      <div style={{ ...monoLabel, marginBottom: 4 }}>{isAR ? 'حقل النظام' : 'System field'}</div>
                      <select
                        value={mapping[i] || '_skip'}
                        onChange={e => {
                          const next = [...mapping];
                          next[i] = e.target.value;
                          setMapping(next);
                          if (e.target.value !== '_custom') {
                            setCustomNames(prev => { const n = { ...prev }; delete n[i]; return n; });
                          }
                        }}
                        style={{
                          width: '100%', height: 30, padding: '0 8px', borderRadius: 4,
                          border: `1px solid ${mapping[i] && mapping[i] !== '_skip' ? primary : tok.border}`,
                          backgroundColor: tok.elev, color: tok.fg,
                          fontSize: 12, fontFamily: 'inherit', outline: 'none', cursor: 'pointer',
                        }}
                      >
                        {SYSTEM_FIELDS.map(f => (
                          <option key={f.key} value={f.key}>{f.label}{f.required ? ' *' : ''}</option>
                        ))}
                      </select>
                      {isCustom && (
                        <input
                          value={customNames[i] || ''}
                          onChange={e => setCustomNames(prev => ({ ...prev, [i]: e.target.value }))}
                          placeholder={isAR ? 'اسم الحقل المخصص...' : 'Custom field name…'}
                          style={{
                            width: '100%', height: 28, padding: '0 8px', marginTop: 6, borderRadius: 4,
                            border: `1px solid ${customNames[i]?.trim() ? primary : tok.border}`,
                            backgroundColor: tok.elev, color: tok.fg,
                            fontSize: 12, fontFamily: 'ui-monospace, monospace',
                            outline: 'none', boxSizing: 'border-box',
                          }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ ...panel, padding: '16px 20px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Icon name="info" size={16} style={{ color: primary }} />
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: tok.fg }}>
                {isAR ? 'تعيين قيم افتراضية للحقول الناقصة' : 'Set Default Values for Unmapped Fields'}
              </h3>
            </div>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: tok.fgMuted }}>
              {isAR
                ? 'أي حقل في النظام غير مرتبط بعمود في الملف، يمكنك إدخال قيمة افتراضية له هنا لتطبق على جميع الأصناف المستوردة.'
                : 'For any system field not mapped to a file column above, you can provide a default value that will apply to all imported items.'}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {SYSTEM_FIELDS.filter(f => f.key !== '_skip' && f.key !== '_custom' && !mapping.includes(f.key)).map(f => (
                <div key={f.key}>
                  <div style={{ ...monoLabel, marginBottom: 4 }}>{f.label}</div>
                  <input
                    value={defaults[f.key] || ''}
                    onChange={e => setDefaults(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={isAR ? 'قيمة افتراضية...' : 'Default value...'}
                    style={{
                      width: '100%', height: 30, padding: '0 8px', borderRadius: 4,
                      border: `1px dashed ${defaults[f.key]?.trim() ? primary : tok.border}`,
                      backgroundColor: tok.sunken, color: tok.fg, fontSize: 12,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {!hasNameCol && (
            <div style={{
              padding: '10px 14px', borderRadius: 4, marginBottom: 12,
              backgroundColor: '#f59e0b14', border: '1px solid #f59e0b40',
              color: '#92400e', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center',
            }}>
              <Icon name="warning" size={16} style={{ flexShrink: 0 }} />
              {isAR ? 'يجب تعيين عمود واحد على الأقل لـ "الاسم" حتى يمكن الاستيراد.' : 'You must map at least one column to Name (AR or EN) to proceed.'}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setStep(0)} style={{ height: 34, padding: '0 16px', borderRadius: 4, border: `1px solid ${tok.border}`, background: 'none', color: tok.fgMuted, cursor: 'pointer', fontSize: 13 }}>
              {isAR ? 'رجوع' : 'Back'}
            </button>
            <button
              disabled={!hasNameCol}
              onClick={() => setStep(2)}
              style={{
                height: 34, padding: '0 20px', borderRadius: 4, border: 'none',
                backgroundColor: hasNameCol ? primary : tok.border,
                color: hasNameCol ? '#fff' : tok.fgSubtle,
                cursor: hasNameCol ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 600,
              }}
            >
              {isAR ? 'معاينة البيانات' : 'Preview Data'}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Preview ─────────────────────────────────────────────────── */}
      {step === 2 && (
        <div>
          <div style={{ ...panel, marginBottom: 16, overflow: 'hidden' }}>
            <div style={{
              padding: '10px 16px', borderBottom: `1px solid ${tok.border}`,
              display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
            }}>
              {[
                { label: isAR ? 'إجمالي الصفوف'    : 'Total rows',       value: rows.length,                     color: tok.fg    },
                { label: isAR ? 'صالحة للاستيراد'  : 'Ready to import',  value: validItems.length,               color: '#10b981' },
                { label: isAR ? 'ستُتخطى (بلا اسم)': 'Will skip',        value: rows.length - validItems.length, color: '#f59e0b' },
                ...(activeCustomFields.length > 0 ? [{
                  label: isAR ? 'حقول مخصصة' : 'Custom fields',
                  value: activeCustomFields.length,
                  color: primary,
                }] : []),
              ].map(s => (
                <div key={s.label}>
                  <span style={monoLabel}>{s.label}</span>
                  <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'ui-monospace,monospace', color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            {activeCustomFields.length > 0 && (
              <div style={{ padding: '8px 16px', borderBottom: `1px solid ${tok.border}`, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ ...monoLabel }}>{isAR ? 'حقول مخصصة:' : 'Custom fields:'}</span>
                {activeCustomFields.map(cf => (
                  <span key={cf.name} style={{
                    padding: '2px 8px', borderRadius: 3, fontSize: 11,
                    backgroundColor: `${primary}12`, border: `1px solid ${primary}30`,
                    fontFamily: 'ui-monospace,monospace', color: primary,
                  }}>
                    {cf.name}
                  </span>
                ))}
              </div>
            )}

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ backgroundColor: tok.sunken }}>
                    <th style={{ padding: '6px 12px', textAlign: 'start', borderBottom: `1px solid ${tok.border}`, ...monoLabel }}>#</th>
                    {activeSystemFields.map(f => (
                      <th key={f.key} style={{ padding: '6px 12px', textAlign: 'start', borderBottom: `1px solid ${tok.border}`, ...monoLabel }}>{f.label}</th>
                    ))}
                    {activeCustomFields.map(cf => (
                      <th key={cf.name} style={{ padding: '6px 12px', textAlign: 'start', borderBottom: `1px solid ${tok.border}`, ...monoLabel, color: primary }}>★ {cf.name}</th>
                    ))}
                    <th style={{ padding: '6px 12px', borderBottom: `1px solid ${tok.border}`, ...monoLabel }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {mappedItems.slice(0, 50).map((item, i) => {
                    const hasName = item.name || item.nameEn;
                    return (
                      <tr key={i} style={{ backgroundColor: !hasName ? `${tok.neg}08` : 'transparent', borderBottom: `1px solid ${tok.border}` }}>
                        <td style={{ padding: '6px 12px', color: tok.fgSubtle, fontFamily: 'ui-monospace,monospace' }}>{i + 1}</td>
                        {activeSystemFields.map(f => (
                          <td key={f.key} style={{ padding: '6px 12px', color: tok.fg, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item[f.key] || <span style={{ color: tok.fgSubtle }}>—</span>}
                          </td>
                        ))}
                        {activeCustomFields.map(cf => (
                          <td key={cf.name} style={{ padding: '6px 12px', color: tok.fgMuted, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: 'italic' }}>
                            {item.attributes?.[cf.name] || <span style={{ color: tok.fgSubtle }}>—</span>}
                          </td>
                        ))}
                        <td style={{ padding: '6px 12px', textAlign: 'center' }}>
                          {hasName
                            ? <span style={{ fontSize: 10, fontWeight: 700, color: '#10b981', fontFamily: 'ui-monospace,monospace' }}>✓ OK</span>
                            : <span style={{ fontSize: 10, fontWeight: 700, color: tok.neg, fontFamily: 'ui-monospace,monospace' }}>✗ SKIP</span>
                          }
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {mappedItems.length > 50 && (
                <div style={{ padding: '8px 16px', fontSize: 12, color: tok.fgSubtle, borderTop: `1px solid ${tok.border}` }}>
                  {isAR
                    ? `يُعرض أول 50 صف من ${mappedItems.length} إجمالاً`
                    : `Showing first 50 of ${mappedItems.length} rows`}
                </div>
              )}
            </div>
          </div>

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 4, marginBottom: 12, backgroundColor: tok.negTint, border: `1px solid ${tok.neg}40`, color: tok.neg, fontSize: 13 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setStep(1)} style={{ height: 34, padding: '0 16px', borderRadius: 4, border: `1px solid ${tok.border}`, background: 'none', color: tok.fgMuted, cursor: 'pointer', fontSize: 13 }}>
              {isAR ? 'رجوع' : 'Back'}
            </button>
            <button
              onClick={handleImport}
              disabled={checking || importing || validItems.length === 0}
              style={{
                height: 34, padding: '0 20px', borderRadius: 4, border: 'none',
                backgroundColor: validItems.length > 0 && !checking && !importing ? primary : tok.border,
                color: validItems.length > 0 && !checking && !importing ? '#fff' : tok.fgSubtle,
                cursor: validItems.length > 0 && !checking && !importing ? 'pointer' : 'not-allowed',
                fontSize: 13, fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', gap: 8,
              }}
            >
              {(checking || importing) && (
                <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 600ms linear infinite' }} />
              )}
              {checking
                ? (isAR ? 'جاري فحص التكرارات...' : 'Checking for duplicates…')
                : importing
                  ? (isAR ? 'جاري الاستيراد...' : 'Importing…')
                  : isAR
                    ? `استيراد ${validItems.length} صنف`
                    : `Import ${validItems.length} item${validItems.length !== 1 ? 's' : ''}`
              }
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Done ────────────────────────────────────────────────────── */}
      {step === 3 && result && (
        <div style={{ ...panel, padding: '40px 32px', textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            backgroundColor: '#10b98118', border: '2px solid #10b98140',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <Icon name="check" size={28} style={{ color: '#10b981' }} />
          </div>
          <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: tok.fg }}>
            {isAR ? 'اكتمل الاستيراد!' : 'Import Complete!'}
          </h2>
          <p style={{ margin: '0 0 24px', fontSize: 13, color: tok.fgMuted }}>
            {isAR
              ? `تمت معالجة ${validItems.length} صنف بنجاح.`
              : `Successfully processed ${validItems.length} item${validItems.length !== 1 ? 's' : ''}.`}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
            {[
              { label: isAR ? 'تمت إضافته' : 'Created', value: result.created,            color: '#10b981' },
              { label: isAR ? 'تم تحديثه' : 'Updated', value: result.updated,             color: primary  },
              { label: isAR ? 'تم تخطيه'  : 'Skipped', value: result.skipped,             color: '#f59e0b' },
              { label: isAR ? 'أخطاء'     : 'Errors',  value: result.errors?.length || 0,  color: tok.neg  },
            ].map(s => (
              <div key={s.label} style={{ ...panel, padding: '12px 20px', minWidth: 90, textAlign: 'center', borderInlineStart: `3px solid ${s.color}` }}>
                <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'ui-monospace,monospace', color: s.color }}>{s.value}</div>
                <div style={{ ...monoLabel, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
          {result.errors?.length > 0 && (
            <div style={{ ...panel, padding: '12px 16px', marginBottom: 20, maxHeight: 160, overflowY: 'auto', textAlign: 'start' }}>
              <div style={{ ...monoLabel, marginBottom: 8 }}>{isAR ? 'أخطاء في الصفوف' : 'Row errors'}</div>
              {result.errors.map((e, i) => (
                <div key={i} style={{ fontSize: 12, color: tok.neg, padding: '3px 0', borderBottom: i < result.errors.length - 1 ? `1px solid ${tok.border}` : 'none' }}>
                  <span style={{ fontWeight: 600 }}>{e.row}</span>: {e.error}
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={reset} style={{ height: 34, padding: '0 20px', borderRadius: 4, border: `1px solid ${tok.border}`, background: 'none', color: tok.fgMuted, cursor: 'pointer', fontSize: 13 }}>
              {isAR ? 'استيراد آخر' : 'Import Another'}
            </button>
            <a href="/inventory" style={{ height: 34, padding: '0 20px', borderRadius: 4, border: 'none', backgroundColor: primary, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
              <Icon name="inventory" size={14} />
              {isAR ? 'عرض المخزون' : 'View Inventory'}
            </a>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          CONFLICT RESOLUTION MODAL
          Appears after duplicate check finds name collisions.
          ══════════════════════════════════════════════════════════════════════ */}
      {showConflicts && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          backgroundColor: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          padding: '40px 16px', overflowY: 'auto',
        }}>
          <div style={{
            width: '100%', maxWidth: 780,
            backgroundColor: tok.canvas,
            border: `1px solid ${tok.border}`,
            borderRadius: 8,
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            display: 'flex', flexDirection: 'column',
            maxHeight: 'calc(100vh - 80px)',
          }}>

            {/* Modal header */}
            <div style={{
              padding: '18px 24px', borderBottom: `1px solid ${tok.border}`,
              display: 'flex', alignItems: 'flex-start', gap: 14, flexShrink: 0,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 8, flexShrink: 0,
                backgroundColor: '#f59e0b18', border: '1px solid #f59e0b40',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 20 }}>⚠️</span>
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: tok.fg }}>
                  {isAR
                    ? `تم العثور على ${conflicts.length} تكرار`
                    : `${conflicts.length} duplicate${conflicts.length !== 1 ? 's' : ''} found`}
                </h2>
                <p style={{ margin: 0, fontSize: 13, color: tok.fgMuted }}>
                  {isAR
                    ? 'هذه الأصناف موجودة بالفعل في المخزون. اختر ما تريد فعله بكل صنف.'
                    : 'These items already exist in your inventory. Choose what to do with each one.'}
                </p>
              </div>
            </div>

            {/* Bulk actions */}
            <div style={{
              padding: '10px 24px', borderBottom: `1px solid ${tok.border}`,
              display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap',
            }}>
              <span style={{ ...monoLabel, marginInlineEnd: 4 }}>
                {isAR ? 'تطبيق على الكل:' : 'Apply to all:'}
              </span>
              {Object.entries(DECISIONS).map(([key, d]) => (
                <button
                  key={key}
                  onClick={() => setDecisions(Object.fromEntries(conflicts.map((_, ci) => [ci, key])))}
                  style={{
                    height: 26, padding: '0 12px', borderRadius: 4, border: `1px solid ${d.color}44`,
                    backgroundColor: `${d.color}12`, color: d.color,
                    cursor: 'pointer', fontSize: 11, fontWeight: 700,
                    fontFamily: 'ui-monospace, monospace', textTransform: 'uppercase', letterSpacing: '0.04em',
                    transition: 'background 120ms',
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = `${d.color}22`}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = `${d.color}12`}
                >
                  {isAR ? d.ar : d.en}
                </button>
              ))}
            </div>

            {/* Conflict list — scrollable */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0' }}>
              {conflicts.map((c, ci) => {
                const dec   = decisions[ci] ?? 'merge';
                const decCfg = DECISIONS[dec];
                return (
                  <div
                    key={ci}
                    style={{
                      margin: '8px 16px',
                      borderRadius: 6,
                      border: `1px solid ${decCfg.color}44`,
                      backgroundColor: `${decCfg.color}08`,
                      overflow: 'hidden',
                      transition: 'border-color 120ms, background 120ms',
                    }}
                  >
                    {/* Conflict header row */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 12px', borderBottom: `1px solid ${tok.border}`,
                      backgroundColor: tok.sunken,
                    }}>
                      <span style={{
                        fontFamily: 'ui-monospace, monospace', fontSize: 9, fontWeight: 800,
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                        color: '#f59e0b', backgroundColor: '#f59e0b18',
                        border: '1px solid #f59e0b40', borderRadius: 3, padding: '1px 6px', flexShrink: 0,
                      }}>
                        {isAR ? 'تكرار' : 'Duplicate'}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: 13, color: tok.fg, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.imported.name || c.imported.nameEn}
                      </span>
                      {/* Decision badge */}
                      <span style={{
                        fontFamily: 'ui-monospace, monospace', fontSize: 9, fontWeight: 800,
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                        color: decCfg.color, backgroundColor: `${decCfg.color}18`,
                        border: `1px solid ${decCfg.color}44`, borderRadius: 3, padding: '1px 6px', flexShrink: 0,
                      }}>
                        {isAR ? decCfg.ar : decCfg.en}
                      </span>
                    </div>

                    {/* Side-by-side comparison */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                      {/* Importing */}
                      <div style={{ padding: '10px 14px', borderInlineEnd: `1px solid ${tok.border}` }}>
                        <div style={{ ...monoLabel, color: '#10b981', marginBottom: 8 }}>
                          {isAR ? '📥 يُستورد' : '📥 Importing'}
                        </div>
                        {fieldRow(isAR ? 'الاسم' : 'Name',    c.imported.name   || c.imported.nameEn)}
                        {fieldRow('EN',                         c.imported.nameEn)}
                        {fieldRow('SKU',                        c.imported.sku)}
                        {fieldRow(isAR ? 'الكمية' : 'Qty',     c.imported.qty)}
                        {fieldRow(isAR ? 'السعر'  : 'Price',   c.imported.price)}
                        {fieldRow(isAR ? 'الباركود' : 'Barcode', c.imported.barcode)}
                      </div>
                      {/* Existing */}
                      <div style={{ padding: '10px 14px' }}>
                        <div style={{ ...monoLabel, color: tok.fgSubtle, marginBottom: 8 }}>
                          {isAR ? '🗄️ في النظام' : '🗄️ In system'}
                        </div>
                        {fieldRow(isAR ? 'الاسم' : 'Name',    c.existing.name   || c.existing.nameEn)}
                        {fieldRow('EN',                         c.existing.nameEn)}
                        {fieldRow('SKU',                        c.existing.sku)}
                        {fieldRow(isAR ? 'الكمية' : 'Qty',     c.existing.qty != null ? String(c.existing.qty) : '')}
                        {fieldRow(isAR ? 'السعر'  : 'Price',   c.existing.price != null ? String(c.existing.price) : '')}
                        {fieldRow(isAR ? 'الباركود' : 'Barcode', c.existing.barcode)}
                      </div>
                    </div>

                    {/* Per-item decision buttons */}
                    <div style={{
                      display: 'flex', gap: 6, padding: '8px 12px',
                      borderTop: `1px solid ${tok.border}`, flexWrap: 'wrap',
                    }}>
                      <span style={{ ...monoLabel, alignSelf: 'center', marginInlineEnd: 4 }}>
                        {isAR ? 'الإجراء:' : 'Action:'}
                      </span>
                      {Object.entries(DECISIONS).map(([key, d]) => {
                        const active = dec === key;
                        return (
                          <button
                            key={key}
                            onClick={() => setDecisions(prev => ({ ...prev, [ci]: key }))}
                            style={{
                              height: 28, padding: '0 14px', borderRadius: 4,
                              border: `1px solid ${active ? d.color : tok.border}`,
                              backgroundColor: active ? d.color : 'transparent',
                              color: active ? '#fff' : tok.fgMuted,
                              cursor: 'pointer', fontSize: 12, fontWeight: active ? 700 : 400,
                              transition: 'all 120ms',
                            }}
                            onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = d.color; e.currentTarget.style.color = d.color; } }}
                            onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = tok.border; e.currentTarget.style.color = tok.fgMuted; } }}
                          >
                            {isAR ? d.ar : d.en}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal footer */}
            <div style={{
              padding: '14px 24px', borderTop: `1px solid ${tok.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexShrink: 0, gap: 12, flexWrap: 'wrap',
            }}>
              {/* Summary of decisions */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {Object.entries(DECISIONS).map(([key, d]) => {
                  const count = Object.values(decisions).filter(v => v === key).length;
                  if (count === 0) return null;
                  return (
                    <span key={key} style={{ fontSize: 12, color: d.color, fontWeight: 600 }}>
                      {count} {isAR ? d.ar : d.en}
                    </span>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                <button
                  onClick={() => setShowConflicts(false)}
                  style={{ height: 34, padding: '0 16px', borderRadius: 4, border: `1px solid ${tok.border}`, background: 'none', color: tok.fgMuted, cursor: 'pointer', fontSize: 13 }}
                >
                  {isAR ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={handleConfirmConflicts}
                  disabled={importing}
                  style={{
                    height: 34, padding: '0 20px', borderRadius: 4, border: 'none',
                    backgroundColor: importing ? tok.border : primary,
                    color: importing ? tok.fgSubtle : '#fff',
                    cursor: importing ? 'not-allowed' : 'pointer',
                    fontSize: 13, fontWeight: 600,
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                  }}
                >
                  {importing && <div style={{ width: 13, height: 13, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 600ms linear infinite' }} />}
                  {isAR ? 'تأكيد الاستيراد' : 'Confirm Import'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
