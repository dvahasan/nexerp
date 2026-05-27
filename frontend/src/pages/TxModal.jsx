import { useState, useEffect, useMemo, useCallback } from 'react';
import Modal from '../components/Modal';
import BarcodeScanner from '../components/BarcodeScanner';
import Icon from '../components/Icon';
import { useAppContext } from '../context/AppContext';
import { api } from '../api';
import { T } from '../theme';

const defaultForm = {
  itemId: '', type: 'IN', qty: '', sourceId: '', destId: '',
  projectId: '', reasonId: '',
  notes: '', date: new Date().toISOString().slice(0, 16),
  warehouseId: '', binId: '', unitCost: '', landedCost: '',
};

export default function TxModal({ open, onClose, editTx = null, onSaved, forcedType = null }) {
  const { items, warehouses, saveTx, t: tr, isAR, theme, company } = useAppContext();
  const t = T[theme] || T.light;
  const primary = company?.primaryColor || '#3b82f6';

  const [form,          setForm]          = useState({ ...defaultForm, type: forcedType || 'IN' });
  const [query,         setQuery]         = useState('');
  const [saving,        setSaving]        = useState(false);
  const [showDrop,      setShowDrop]      = useState(false);
  const [focused,       setFocused]       = useState('');
  const [scannerOpen,   setScannerOpen]   = useState(false);
  const [binsForWh,     setBinsForWh]     = useState([]);
  const [scanLoading,   setScanLoading]   = useState(false);

  const [sources, setSources] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [reasons, setReasons] = useState([]);

  useEffect(() => {
    if (open) {
      api.getSources().then(setSources).catch(()=>{});
      api.getDestinations().then(setDestinations).catch(()=>{});
      if (company?.features?.projects) api.getProjects().then(setProjects).catch(()=>{});
      if (company?.features?.reasons) api.getReasons().then(setReasons).catch(()=>{});
    }
  }, [open, company?.features]);

  // ── Load bins when warehouse selected ─────────────────────────────────────
  useEffect(() => {
    if (!form.warehouseId) { setBinsForWh([]); return; }
    api.getBins({ warehouseId: form.warehouseId }).then(bins => setBinsForWh(bins || [])).catch(() => setBinsForWh([]));
  }, [form.warehouseId]);

  // ── Populate form when editing ─────────────────────────────────────────────
  useEffect(() => {
    if (editTx) {
      setForm({
        itemId:      editTx.itemId?._id || editTx.itemId || '',
        type:        forcedType || editTx.type || 'IN',
        qty:         editTx.qty    ?? '',
        sourceId:    editTx.sourceId?._id || editTx.sourceId || '',
        destId:      editTx.destId?._id || editTx.destId || '',
        projectId:   editTx.projectId?._id || editTx.projectId || '',
        reasonId:    editTx.reasonId?._id || editTx.reasonId || '',
        notes:       editTx.notes  || '',
        date:        editTx.date
          ? new Date(editTx.date).toISOString().slice(0, 16)
          : new Date().toISOString().slice(0, 16),
        warehouseId: editTx.warehouseId || '',
        binId:       editTx.binId       || '',
        unitCost:    editTx.unitCost    || '',
        landedCost:  editTx.landedCost  || '',
      });
      const item = items.find(i => i._id === (editTx.itemId?._id || editTx.itemId));
      setQuery(item ? (isAR ? item.name : (item.nameEn || item.name)) : '');
    } else {
      setForm({ ...defaultForm, type: forcedType || 'IN' });
      setQuery('');
    }
  }, [editTx, open, forcedType]);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  // ── Item search ───────────────────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    if (!query) return items.slice(0, 20);
    const q = query.toLowerCase();
    return items.filter(i =>
      i.name.toLowerCase().includes(q) ||
      (i.nameEn  || '').toLowerCase().includes(q) ||
      (i.sku     || '').toLowerCase().includes(q) ||
      (i.barcode || '').toLowerCase().includes(q)
    ).slice(0, 20);
  }, [items, query]);

  const selectedItem = items.find(i => i._id === form.itemId);

  const handleItemSelect = (item) => {
    setForm(prev => ({
      ...prev,
      itemId:      item._id,
      warehouseId: item.warehouseId || prev.warehouseId,
      unitCost:    item.avgCost > 0 ? item.avgCost : (item.price || ''),
    }));
    setQuery(isAR ? item.name : (item.nameEn || item.name));
    setShowDrop(false);
  };

  // ── Barcode scan handler ──────────────────────────────────────────────────
  const handleBarcodeScan = useCallback(async (code) => {
    setScannerOpen(false);
    setScanLoading(true);
    try {
      // Search local inventory by barcode first
      const found = items.find(i => i.barcode === code || i.sku === code);
      if (found) {
        handleItemSelect(found);
        return;
      }
      // Fallback: API lookup by barcode
      const item = await api.getByBarcode(code);
      if (item?._id) {
        handleItemSelect(item);
      } else {
        // Populate query so user can see what was scanned
        setQuery(code);
        setShowDrop(true);
      }
    } catch {
      setQuery(code);
    } finally {
      setScanLoading(false);
    }
  }, [items]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.itemId) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        qty:        parseInt(form.qty) || 0,
        date:       form.date ? new Date(form.date) : new Date(),
        unitCost:   parseFloat(form.unitCost)   || 0,
        landedCost: parseFloat(form.landedCost) || 0,
        warehouseId: form.warehouseId || undefined,
        binId:       form.binId       || undefined,
        binCode:     binsForWh.find(b => b._id === form.binId)?.code || undefined,
      };
      await saveTx(payload, editTx?._id);
      onClose();
      onSaved?.();
    } catch { /* toast shown by context */ }
    finally { setSaving(false); }
  };

  // ── Style helpers ─────────────────────────────────────────────────────────
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

  const sectionDivider = (label) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      margin: '4px 0 2px',
    }}>
      <div style={{ flex: 1, height: 1, backgroundColor: t.border }} />
      <span style={{
        fontFamily: 'ui-monospace, monospace', fontSize: 9,
        fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.1em', color: t.fgSubtle, whiteSpace: 'nowrap',
      }}>{label}</span>
      <div style={{ flex: 1, height: 1, backgroundColor: t.border }} />
    </div>
  );

  return (
    <>
      <Modal open={open} onClose={onClose} title={editTx ? tr.editTransaction : tr.addTransaction}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* ── Item search + barcode scan ── */}
          <div>
            {lbl(`${isAR ? 'الصنف' : 'Item'} *`)}
            <div style={{ display: 'flex', gap: 6 }}>
              {/* Search input */}
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  required
                  value={query}
                  onChange={e => { setQuery(e.target.value); setShowDrop(true); if (!e.target.value) set('itemId', ''); }}
                  onFocus={() => { setFocused('item'); setShowDrop(true); }}
                  onBlur={() => { setTimeout(() => setShowDrop(false), 200); setFocused(''); }}
                  placeholder={isAR ? 'ابحث بالاسم، الكود، أو الباركود...' : 'Search by name, SKU, or barcode...'}
                  autoComplete="off"
                  style={inp('item')}
                />

                {/* Dropdown */}
                {showDrop && filteredItems.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                    marginTop: 4, backgroundColor: t.elev,
                    border: `1px solid ${t.border}`, borderRadius: 4,
                    maxHeight: 220, overflowY: 'auto',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                  }}>
                    {filteredItems.map(item => (
                      <div
                        key={item._id}
                        onMouseDown={() => handleItemSelect(item)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 12px', cursor: 'pointer',
                          borderBottom: `1px solid ${t.border}`,
                          transition: 'background 120ms',
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = t.sunken}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        {item.photo ? (
                          <img src={item.photo} alt="" loading="lazy" style={{ width: 30, height: 30, borderRadius: 3, objectFit: 'cover', flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 30, height: 30, borderRadius: 3, backgroundColor: t.border, flexShrink: 0 }} />
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: t.fg, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {isAR ? item.name : (item.nameEn || item.name)}
                          </div>
                          <div style={{ fontSize: 10, color: t.fgSubtle, fontFamily: 'ui-monospace, monospace', marginTop: 1 }}>
                            {item.sku || '—'} · Qty: {item.qty}
                            {item.barcode && ` · ${item.barcode}`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Barcode scan button */}
              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                title={isAR ? 'مسح الباركود بالكاميرا' : 'Scan barcode with camera'}
                disabled={scanLoading}
                style={{
                  width: 34, height: 34, borderRadius: 4, flexShrink: 0,
                  border: `1px solid ${t.border}`,
                  backgroundColor: scanLoading ? t.sunken : 'transparent',
                  color: scanLoading ? primary : t.fgMuted,
                  cursor: scanLoading ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 120ms',
                }}
                onMouseEnter={e => { if (!scanLoading) { e.currentTarget.style.backgroundColor = t.sunken; e.currentTarget.style.color = primary; } }}
                onMouseLeave={e => { if (!scanLoading) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = t.fgMuted; } }}
              >
                {scanLoading
                  ? <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${t.border}`, borderTopColor: primary, animation: 'spin 600ms linear infinite' }} />
                  : <Icon name="barcode" size={16} />
                }
              </button>
            </div>

            {/* Current stock indicator */}
            {selectedItem && (
              <div style={{ marginTop: 6, fontFamily: 'ui-monospace, monospace', fontSize: 10, color: t.fgSubtle }}>
                <span style={{
                  fontWeight: 700,
                  color: selectedItem.qty === 0 ? t.neg
                    : selectedItem.qty <= selectedItem.minThreshold ? '#f59e0b'
                    : '#16774A',
                }}>
                  {isAR ? 'الكمية الحالية:' : 'Current Qty:'} {selectedItem.qty}
                </span>
                {selectedItem.avgCost > 0 && (
                  <span style={{ marginLeft: 12, color: t.fgSubtle }}>
                    {isAR ? 'متوسط التكلفة:' : 'Avg Cost:'} {selectedItem.avgCost.toFixed(2)}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* ── Type + Qty ── */}
          <div style={{ display: 'grid', gridTemplateColumns: forcedType ? '1fr' : '1fr 1fr', gap: 12 }}>
            {!forcedType && (
              <div>
                {lbl(`${isAR ? 'نوع الحركة' : 'Type'} *`)}
                <div style={{ display: 'flex', border: `1px solid ${t.border}`, borderRadius: 4, overflow: 'hidden' }}>
                  {['IN', 'OUT'].map(tp => (
                    <button
                      key={tp}
                      type="button"
                      onClick={() => set('type', tp)}
                      style={{
                        flex: 1, height: 34, fontSize: 12, fontWeight: 700,
                        fontFamily: 'ui-monospace, monospace', cursor: 'pointer', border: 'none',
                        backgroundColor: form.type === tp
                          ? (tp === 'IN' ? '#16774A' : t.neg)
                          : t.canvas,
                        color: form.type === tp ? '#fff' : t.fgMuted,
                        transition: 'all 120ms',
                      }}
                    >
                      {tp === 'IN' ? (isAR ? '↓ وارد' : '↓ IN') : (isAR ? '↑ صادر' : '↑ OUT')}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {forcedType && <div style={{ display: 'none' }} />}
            <div>
              {lbl(`${tr.qty} *`)}
              <input required type="number" min="1" value={form.qty} onChange={e => set('qty', e.target.value)}
                style={inp('qty')} onFocus={() => setFocused('qty')} onBlur={() => setFocused('')} />
            </div>
          </div>

          {/* ── Source / Destination / Projects / Reasons ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {(form.type === 'IN' || !forcedType) && (
              <div>
                {lbl(tr.source)}
                <select value={form.sourceId} onChange={e => set('sourceId', e.target.value)} style={inp('sourceId')} onFocus={() => setFocused('sourceId')} onBlur={() => setFocused('')}>
                  <option value="">{isAR ? '— اختر المصدر —' : '— Select Source —'}</option>
                  {sources.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
            )}
            {(form.type === 'OUT' || !forcedType) && (
              <div>
                {lbl(tr.destination)}
                <select value={form.destId} onChange={e => set('destId', e.target.value)} style={inp('destId')} onFocus={() => setFocused('destId')} onBlur={() => setFocused('')}>
                  <option value="">{isAR ? '— اختر الوجهة —' : '— Select Destination —'}</option>
                  {destinations.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                </select>
              </div>
            )}
            {company?.features?.projects && (form.type === 'OUT' || !forcedType) && (
              <div>
                {lbl(isAR ? 'المشروع' : 'Project')}
                <select value={form.projectId} onChange={e => set('projectId', e.target.value)} style={inp('projectId')} onFocus={() => setFocused('projectId')} onBlur={() => setFocused('')}>
                  <option value="">{isAR ? '— اختر المشروع —' : '— Select Project —'}</option>
                  {projects.filter(p => p.status === 'ACTIVE').map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              </div>
            )}
            {company?.features?.reasons && (
              <div>
                {lbl(isAR ? 'سبب الحركة' : 'Reason')}
                <select value={form.reasonId} onChange={e => set('reasonId', e.target.value)} style={inp('reasonId')} onFocus={() => setFocused('reasonId')} onBlur={() => setFocused('')}>
                  <option value="">{isAR ? '— اختر السبب —' : '— Select Reason —'}</option>
                  {reasons.filter(r => r.type === 'BOTH' || r.type === form.type).map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* ── Warehouse & Bin ── */}
          {warehouses.length > 0 && (
            <>
              {sectionDivider(isAR ? 'الموقع' : 'Location')}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                <div>
                  {lbl(isAR ? 'المستودع' : 'Warehouse')}
                  <select
                    value={form.warehouseId}
                    onChange={e => { set('warehouseId', e.target.value); set('binId', ''); }}
                    style={{ ...inp('wh'), padding: '0 8px', cursor: 'pointer' }}
                    onFocus={() => setFocused('wh')} onBlur={() => setFocused('')}
                  >
                    <option value="">{isAR ? '— لا يوجد —' : '— None —'}</option>
                    {warehouses.map(wh => (
                      <option key={wh._id} value={wh._id}>
                        [{wh.code}] {isAR ? wh.name : (wh.nameEn || wh.name)}
                        {wh.alert85 ? ' ⚠' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  {lbl(isAR ? 'الرف / المكان' : 'Bin Location')}
                  <select
                    value={form.binId}
                    onChange={e => set('binId', e.target.value)}
                    disabled={!form.warehouseId || binsForWh.length === 0}
                    style={{ ...inp('bin'), padding: '0 8px', cursor: form.warehouseId && binsForWh.length > 0 ? 'pointer' : 'default', opacity: !form.warehouseId ? 0.5 : 1 }}
                    onFocus={() => setFocused('bin')} onBlur={() => setFocused('')}
                  >
                    <option value="">{isAR ? '— لا يوجد —' : '— None —'}</option>
                    {binsForWh.map(bin => (
                      <option key={bin._id} value={bin._id}>{bin.code}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {/* ── Costing (StockIn only) ── */}
          {(form.type === 'IN' || !forcedType) && (
            <>
              {sectionDivider(isAR ? 'التكلفة' : 'Costing')}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                <div>
                  {lbl(isAR ? 'تكلفة الوحدة' : 'Unit Cost')}
                  <input
                    type="number" min="0" step="0.01" value={form.unitCost}
                    onChange={e => set('unitCost', e.target.value)}
                    placeholder="0.00"
                    style={inp('unitCost')} onFocus={() => setFocused('unitCost')} onBlur={() => setFocused('')}
                  />
                </div>
                <div>
                  {lbl(isAR ? 'تكاليف الشحن / جمارك' : 'Landed Cost')}
                  <input
                    type="number" min="0" step="0.01" value={form.landedCost}
                    onChange={e => set('landedCost', e.target.value)}
                    placeholder="0.00"
                    style={inp('landedCost')} onFocus={() => setFocused('landedCost')} onBlur={() => setFocused('')}
                  />
                </div>
              </div>
              {form.unitCost && form.qty && (
                <div style={{
                  padding: '6px 10px', borderRadius: 4,
                  backgroundColor: `${primary}12`, border: `1px solid ${primary}25`,
                  fontFamily: 'ui-monospace, monospace', fontSize: 10,
                  color: t.fgMuted,
                }}>
                  {isAR ? 'إجمالي التكلفة:' : 'Total Cost:'}
                  {' '}
                  <strong style={{ color: t.fg }}>
                    {((parseFloat(form.unitCost) || 0) * (parseInt(form.qty) || 0) + (parseFloat(form.landedCost) || 0)).toFixed(2)}
                  </strong>
                </div>
              )}
            </>
          )}

          {/* ── Date ── */}
          <div>
            {lbl(tr.date)}
            <input type="datetime-local" value={form.date} onChange={e => set('date', e.target.value)}
              style={inp('date')} onFocus={() => setFocused('date')} onBlur={() => setFocused('')} />
          </div>

          {/* ── Notes ── */}
          <div>
            {lbl(tr.notes)}
            <textarea
              rows={2}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder={isAR ? 'ملاحظات إضافية...' : 'Additional notes...'}
              style={{ ...inp('notes', { height: 'auto', padding: '8px 10px', resize: 'vertical' }) }}
              onFocus={() => setFocused('notes')}
              onBlur={() => setFocused('')}
            />
          </div>

          {/* ── Actions ── */}
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

      {/* ── Camera barcode scanner overlay ── */}
      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={handleBarcodeScan}
      />
    </>
  );
}
