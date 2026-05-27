import { useState, useEffect, useMemo, useCallback } from 'react';
import Modal from '../components/Modal';
import BarcodeScanner from '../components/BarcodeScanner';
import Icon from '../components/Icon';
import { useAppContext } from '../context/AppContext';
import { api } from '../api';
import { T } from '../theme';

const getLocalDatetime = (dateObj) => {
  const d = dateObj ? new Date(dateObj) : new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

const defaultHeader = {
  type: 'IN', sourceId: '', destId: '',
  projectId: '', reasonId: '',
  notes: '', date: getLocalDatetime(),
  warehouseId: '',
};

export default function TxModal({ open, onClose, editTx = null, onSaved, forcedType = null }) {
  const { items, warehouses, saveTx, t: tr, isAR, theme, company, showToast } = useAppContext();
  const t = T[theme] || T.light;
  const primary = company?.primaryColor || '#3b82f6';

  const [header,        setHeader]        = useState({ ...defaultHeader, type: forcedType || 'IN' });
  const [itemsList,     setItemsList]     = useState([]); // { id, item, qty, unitCost, binId }
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

  useEffect(() => {
    if (!header.warehouseId) { setBinsForWh([]); return; }
    api.getBins({ warehouseId: header.warehouseId }).then(bins => setBinsForWh(bins || [])).catch(() => setBinsForWh([]));
  }, [header.warehouseId]);

  useEffect(() => {
    if (editTx) {
      setHeader({
        type:        forcedType || editTx.type || 'IN',
        sourceId:    editTx.sourceId?._id || editTx.sourceId || '',
        destId:      editTx.destId?._id || editTx.destId || '',
        projectId:   editTx.projectId?._id || editTx.projectId || '',
        reasonId:    editTx.reasonId?._id || editTx.reasonId || '',
        notes:       editTx.notes  || '',
        date:        editTx.date ? getLocalDatetime(editTx.date) : getLocalDatetime(),
        warehouseId: editTx.warehouseId || '',
      });
      const itemObj = items.find(i => i._id === (editTx.itemId?._id || editTx.itemId));
      if (itemObj) {
        setItemsList([{
          id: Math.random().toString(),
          item: itemObj,
          qty: editTx.qty || 1,
          unitCost: editTx.unitCost || itemObj.avgCost || itemObj.price || 0,
          binId: editTx.binId || '',
        }]);
      }
    } else {
      setHeader({ ...defaultHeader, type: forcedType || 'IN' });
      setItemsList([]);
      setQuery('');
    }
  }, [editTx, open, forcedType, items]);

  const setH = (k, v) => setHeader(prev => ({ ...prev, [k]: v }));

  const filteredItems = useMemo(() => {
    let sourceItems = items;
    if (header.type === 'OUT' && header.warehouseId) {
      sourceItems = items.filter(i => i.warehouseId === header.warehouseId);
    }
    if (!query) return sourceItems;
    const q = query.toLowerCase();
    return sourceItems.filter(i =>
      i.name.toLowerCase().includes(q) ||
      (i.nameEn  || '').toLowerCase().includes(q) ||
      (i.sku     || '').toLowerCase().includes(q) ||
      (i.barcode || '').toLowerCase().includes(q)
    );
  }, [items, query, header.type, header.warehouseId]);

  const handleItemSelect = (item) => {
    setItemsList(prev => {
      const existing = prev.find(p => p.item._id === item._id);
      if (existing) {
        return prev.map(p => p.item._id === item._id ? { ...p, qty: p.qty + 1 } : p);
      }
      return [...prev, {
        id: Math.random().toString(),
        item: item,
        qty: 1,
        unitCost: item.avgCost > 0 ? item.avgCost : (item.price || 0),
        binId: header.type === 'OUT' ? (item.binId || '') : ''
      }];
    });
    // Auto-set warehouse if not set
    if (!header.warehouseId && item.warehouseId) {
      setH('warehouseId', item.warehouseId);
    }
    setQuery('');
    setShowDrop(false);
  };

  const handleBarcodeScan = useCallback(async (code) => {
    setScannerOpen(false);
    setScanLoading(true);
    try {
      const found = items.find(i => i.barcode === code || i.sku === code);
      let itemToAdd = found;
      if (!found) {
        const itemRes = await api.getByBarcode(code);
        if (itemRes?._id) itemToAdd = itemRes;
      }
      
      if (itemToAdd) {
        handleItemSelect(itemToAdd);
      } else {
        showToast(isAR ? 'الصنف غير موجود' : 'Item not found', 'error');
      }
    } catch {
      showToast(isAR ? 'خطأ في البحث' : 'Error searching', 'error');
    } finally {
      setScanLoading(false);
    }
  }, [items, header.warehouseId, isAR, showToast]); // eslint-disable-line

  const handleSearchKeyDown = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!query) return;
      await handleBarcodeScan(query);
      setQuery('');
      setShowDrop(false);
    }
  };

  const updateRow = (id, key, val) => {
    setItemsList(prev => prev.map(r => r.id === id ? { ...r, [key]: val } : r));
  };
  const removeRow = (id) => setItemsList(prev => prev.filter(r => r.id !== id));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (itemsList.length === 0) {
      showToast(isAR ? 'أضف صنفاً واحداً على الأقل' : 'Add at least one item', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editTx) {
        const row = itemsList[0];
        const payload = {
          ...header,
          date: header.date ? new Date(header.date) : new Date(),
          itemId: row.item._id,
          qty: parseInt(row.qty) || 0,
          unitCost: parseFloat(row.unitCost) || 0,
          binId: row.binId || undefined,
          warehouseId: header.warehouseId || undefined,
        };
        await saveTx(payload, editTx._id);
      } else {
        const payload = {
          ...header,
          date: header.date ? new Date(header.date) : new Date(),
          warehouseId: header.warehouseId || undefined,
          items: itemsList.map(r => ({
            itemId: r.item._id,
            qty: parseInt(r.qty) || 0,
            unitCost: parseFloat(r.unitCost) || 0,
            binId: r.binId || undefined,
          }))
        };
        await saveTx(payload);
      }
      onClose();
      onSaved?.();
    } catch { /* handled in context */ }
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

  const sectionDivider = (label) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0 6px' }}>
      <div style={{ flex: 1, height: 1, backgroundColor: t.border }} />
      <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: primary, whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: 1, backgroundColor: t.border }} />
    </div>
  );

  return (
    <>
      <Modal open={open} onClose={onClose} title={editTx ? tr.editTransaction : tr.addTransaction}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          
          {/* ── HEADER INFO ── */}
          <div style={{ display: 'grid', gridTemplateColumns: forcedType ? '1fr' : '1fr 1fr', gap: 12 }}>
            {!forcedType && (
              <div>
                {lbl(`${isAR ? 'نوع الحركة' : 'Type'} *`)}
                <div style={{ display: 'flex', border: `1px solid ${t.border}`, borderRadius: 4, overflow: 'hidden' }}>
                  {['IN', 'OUT'].map(tp => (
                    <button key={tp} type="button" onClick={() => setH('type', tp)}
                      style={{
                        flex: 1, height: 34, fontSize: 12, fontWeight: 700,
                        fontFamily: 'ui-monospace, monospace', cursor: 'pointer', border: 'none',
                        backgroundColor: header.type === tp ? (tp === 'IN' ? '#16774A' : t.neg) : t.canvas,
                        color: header.type === tp ? '#fff' : t.fgMuted,
                        transition: 'all 120ms',
                      }}>
                      {tp === 'IN' ? (isAR ? '↓ وارد' : '↓ IN') : (isAR ? '↑ صادر' : '↑ OUT')}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {forcedType && <div style={{ display: 'none' }} />}
            <div>
              {lbl(tr.date)}
              <input type="datetime-local" value={header.date} onChange={e => setH('date', e.target.value)} style={inp('date')} onFocus={() => setFocused('date')} onBlur={() => setFocused('')} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {(header.type === 'IN' || !forcedType) && (
              <div>
                {lbl(tr.source)}
                <select value={header.sourceId} onChange={e => setH('sourceId', e.target.value)} style={inp('sourceId')} onFocus={() => setFocused('sourceId')} onBlur={() => setFocused('')}>
                  <option value="">{isAR ? '— اختر المصدر —' : '— Select Source —'}</option>
                  {sources.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
            )}
            {(header.type === 'OUT' || !forcedType) && (
              <div>
                {lbl(tr.destination)}
                <select value={header.destId} onChange={e => setH('destId', e.target.value)} style={inp('destId')} onFocus={() => setFocused('destId')} onBlur={() => setFocused('')}>
                  <option value="">{isAR ? '— اختر الوجهة —' : '— Select Destination —'}</option>
                  {destinations.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                </select>
              </div>
            )}
            {company?.features?.projects && (header.type === 'OUT' || !forcedType) && (
              <div>
                {lbl(isAR ? 'المشروع' : 'Project')}
                <select value={header.projectId} onChange={e => setH('projectId', e.target.value)} style={inp('projectId')} onFocus={() => setFocused('projectId')} onBlur={() => setFocused('')}>
                  <option value="">{isAR ? '— اختر المشروع —' : '— Select Project —'}</option>
                  {projects.filter(p => p.status === 'ACTIVE').map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              </div>
            )}
            {company?.features?.reasons && (
              <div>
                {lbl(isAR ? 'سبب الحركة' : 'Reason')}
                <select value={header.reasonId} onChange={e => setH('reasonId', e.target.value)} style={inp('reasonId')} onFocus={() => setFocused('reasonId')} onBlur={() => setFocused('')}>
                  <option value="">{isAR ? '— اختر السبب —' : '— Select Reason —'}</option>
                  {reasons.filter(r => r.type === 'BOTH' || r.type === header.type).map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
                </select>
              </div>
            )}
          </div>

          {warehouses.length > 0 && (
            <div>
              {lbl(isAR ? 'المستودع' : 'Warehouse')}
              <select value={header.warehouseId} onChange={e => setH('warehouseId', e.target.value)} style={{ ...inp('wh'), padding: '0 8px', cursor: 'pointer' }} onFocus={() => setFocused('wh')} onBlur={() => setFocused('')}>
                <option value="">{isAR ? '— لا يوجد —' : '— None —'}</option>
                {warehouses.map(wh => (
                  <option key={wh._id} value={wh._id}>[{wh.code}] {isAR ? wh.name : (wh.nameEn || wh.name)}</option>
                ))}
              </select>
            </div>
          )}

          {/* ── SCANNER & ITEMS ── */}
          {sectionDivider(isAR ? 'الأصناف (Barcode Scan)' : 'Items (Barcode Scan)')}
          
          {!editTx && (
            <div style={{ display: 'flex', gap: 6 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input value={query} onChange={e => { setQuery(e.target.value); setShowDrop(true); }}
                  onKeyDown={handleSearchKeyDown}
                  onFocus={() => { setFocused('item'); setShowDrop(true); }}
                  onBlur={() => { setTimeout(() => setShowDrop(false), 200); setFocused(''); }}
                  placeholder={isAR ? 'امسح الباركود أو ابحث بالاسم...' : 'Scan barcode or search name...'}
                  autoComplete="off" style={{ ...inp('item'), borderColor: primary }} autoFocus
                />
                {showDrop && filteredItems.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, marginTop: 4, backgroundColor: t.elev,
                    border: `1px solid ${t.border}`, borderRadius: 4, maxHeight: 220, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                  }}>
                    {filteredItems.map(item => (
                      <div key={item._id} onMouseDown={() => handleItemSelect(item)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer', borderBottom: `1px solid ${t.border}` }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = t.sunken} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                        <div style={{ width: 30, height: 30, borderRadius: 3, backgroundColor: t.border, flexShrink: 0, overflow: 'hidden' }}>
                          {item.photo && <img src={item.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: t.fg, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{isAR ? item.name : (item.nameEn || item.name)}</div>
                          <div style={{ fontSize: 10, color: t.fgSubtle, fontFamily: 'ui-monospace, monospace', marginTop: 1 }}>{item.sku || '—'} · Qty: {item.qty} {item.barcode && `· ${item.barcode}`}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button type="button" onClick={() => setScannerOpen(true)} disabled={scanLoading}
                style={{
                  width: 34, height: 34, borderRadius: 4, flexShrink: 0, border: `1px solid ${primary}`,
                  backgroundColor: scanLoading ? t.sunken : `${primary}15`, color: primary, cursor: scanLoading ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 120ms',
                }}>
                {scanLoading ? <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${primary}`, borderTopColor: 'transparent', animation: 'spin 600ms linear infinite' }} /> : <Icon name="barcode" size={16} />}
              </button>
            </div>
          )}

          {/* Scanned Items List */}
          {itemsList.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              {itemsList.map((row, idx) => (
                <div key={row.id} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 10, borderRadius: 4, backgroundColor: t.sunken, border: `1px solid ${t.border}`, alignItems: 'center' }}>
                  <div style={{ flex: '1 1 150px', minWidth: 150 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: t.fg }}>
                      {idx + 1}. {isAR ? row.item.name : (row.item.nameEn || row.item.name)}
                    </div>
                    <div style={{ fontSize: 10, color: t.fgSubtle, fontFamily: 'ui-monospace, monospace' }}>{row.item.barcode || row.item.sku || 'No Barcode'}</div>
                  </div>
                  
                  {/* Qty Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${t.border}`, borderRadius: 4, overflow: 'hidden', backgroundColor: t.canvas, height: 30 }}>
                    <button type="button" onClick={() => updateRow(row.id, 'qty', Math.max(1, row.qty - 1))} style={{ width: 30, height: 30, border: 'none', backgroundColor: 'transparent', color: t.fg, cursor: 'pointer', fontSize: 16 }}>-</button>
                    <input type="number" min="1" value={row.qty} onChange={e => updateRow(row.id, 'qty', parseInt(e.target.value) || 1)} style={{ width: 45, height: 30, border: 'none', borderLeft: `1px solid ${t.border}`, borderRight: `1px solid ${t.border}`, textAlign: 'center', backgroundColor: 'transparent', color: t.fg, fontFamily: 'ui-monospace, monospace', fontSize: 13, outline: 'none' }} />
                    <button type="button" onClick={() => updateRow(row.id, 'qty', row.qty + 1)} style={{ width: 30, height: 30, border: 'none', backgroundColor: 'transparent', color: t.fg, cursor: 'pointer', fontSize: 16 }}>+</button>
                  </div>

                  {!editTx && (
                    <button type="button" onClick={() => removeRow(row.id)} style={{ width: 30, height: 30, border: 'none', backgroundColor: 'transparent', color: t.neg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyItems: 'center', padding: 0 }}>
                      <Icon name="delete" size={16} style={{ margin: 'auto' }} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Notes ── */}
          <div style={{ marginTop: 8 }}>
            {lbl(tr.notes)}
            <textarea rows={1} value={header.notes} onChange={e => setH('notes', e.target.value)} placeholder={isAR ? 'ملاحظات الفاتورة...' : 'Invoice notes...'} style={{ ...inp('notes', { height: 'auto', padding: '8px 10px', resize: 'vertical' }) }} onFocus={() => setFocused('notes')} onBlur={() => setFocused('')} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8, borderTop: `1px solid ${t.border}`, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ height: 32, padding: '0 14px', borderRadius: 4, backgroundColor: 'transparent', color: t.fgMuted, border: `1px solid ${t.border}`, cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'background 120ms' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = t.sunken} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>{tr.cancel}</button>
            <button type="submit" disabled={saving || itemsList.length === 0} style={{ height: 32, padding: '0 16px', borderRadius: 4, backgroundColor: primary, color: '#fff', border: 'none', cursor: saving || itemsList.length === 0 ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, opacity: saving || itemsList.length === 0 ? 0.65 : 1, transition: 'opacity 120ms' }}>
              {saving && <div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 600ms linear infinite' }} />}
              {tr.save}
            </button>
          </div>
        </form>
      </Modal>

      <BarcodeScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onDetected={handleBarcodeScan} />
    </>
  );
}
