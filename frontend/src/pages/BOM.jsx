import { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { api } from '../api';
import { T } from '../theme';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import Confirm from '../components/Confirm';

const defaultBomForm = {
  name: '', nameEn: '',
  outputItemId: '', outputQty: '1',
  components: [], // { itemId, qty, unit, notes }
  notes: '',
};

export default function BOM() {
  const { theme, company, isAR, showToast, user, items, warehouses } = useAppContext();
  const t = T[theme] || T.light;
  const primary = company?.primaryColor || '#3b82f6';

  const canAdd    = user?.role === 'owner' || user?.perms?.canAdd;
  const canEdit   = user?.role === 'owner' || user?.perms?.canEdit;
  const canDelete = user?.role === 'owner' || user?.perms?.canDelete;

  const [boms,        setBoms]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [fetchError,  setFetchError]  = useState('');
  const [bomModal,    setBomModal]    = useState(false);
  const [bomForm,     setBomForm]     = useState({ ...defaultBomForm });
  const [editBom,     setEditBom]     = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId,    setDeleteId]    = useState(null);
  const [deleting,    setDeleting]    = useState(false);

  // Produce modal
  const [produceOpen, setProduceOpen] = useState(false);
  const [produceBom,  setProduceBom]  = useState(null);
  const [produceQty,  setProduceQty]  = useState('1');
  const [produceWh,   setProduceWh]   = useState('');
  const [producing,   setProducing]   = useState(false);

  // ── Load BOMs ──────────────────────────────────────────────────────────────
  const loadBoms = useCallback(async () => {
    setFetchError('');
    try {
      const data = await api.getBoms();
      setBoms(Array.isArray(data) ? data : []);
    } catch (err) {
      setFetchError(err.message || 'Failed to load BOMs');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadBoms(); }, [loadBoms]);

  // ── Open modal ─────────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditBom(null);
    setBomForm({ ...defaultBomForm, components: [] });
    setBomModal(true);
  };

  const openEdit = (bom) => {
    setEditBom(bom);
    setBomForm({
      name:         bom.name || '',
      nameEn:       bom.nameEn || '',
      outputItemId: bom.outputItemId?._id || '',
      outputQty:    String(bom.outputQty || 1),
      components:   (bom.components || []).map(c => ({
        itemId: c.itemId?._id || '',
        qty:    String(c.qty || 1),
        unit:   c.unit || 'unit',
        notes:  c.notes || '',
      })),
      notes: bom.notes || '',
    });
    setBomModal(true);
  };

  // ── Component management ───────────────────────────────────────────────────
  const addComponent = () => {
    setBomForm(prev => ({
      ...prev,
      components: [...prev.components, { itemId: '', qty: '1', unit: 'unit', notes: '' }],
    }));
  };

  const removeComponent = (i) => {
    setBomForm(prev => ({ ...prev, components: prev.components.filter((_, idx) => idx !== i) }));
  };

  const setComp = (i, k, v) => {
    setBomForm(prev => {
      const comps = [...prev.components];
      comps[i] = { ...comps[i], [k]: v };
      return { ...prev, components: comps };
    });
  };

  // ── Save BOM ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!bomForm.outputItemId) { showToast(isAR ? 'اختر الصنف المنتج' : 'Select output item', 'error'); return; }
    if (bomForm.components.length === 0) { showToast(isAR ? 'أضف مكوناً واحداً على الأقل' : 'Add at least one component', 'error'); return; }
    setSaving(true);
    try {
      const payload = {
        ...bomForm,
        outputQty:  parseFloat(bomForm.outputQty) || 1,
        components: bomForm.components.map(c => ({
          itemId: c.itemId,
          qty:    parseFloat(c.qty) || 1,
          unit:   c.unit,
          notes:  c.notes,
        })).filter(c => c.itemId),
      };
      if (editBom) {
        await api.updateBom(editBom._id, payload);
        showToast(isAR ? 'تم تعديل BOM' : 'BOM updated');
      } else {
        await api.addBom(payload);
        showToast(isAR ? 'تم إنشاء BOM' : 'BOM created');
      }
      setBomModal(false);
      loadBoms();
    } catch (err) {
      showToast(err.message || 'Error', 'error');
    } finally { setSaving(false); }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteBom(deleteId);
      showToast(isAR ? 'تم حذف BOM' : 'BOM deleted');
      loadBoms();
      setConfirmOpen(false);
    } catch (err) {
      showToast(err.message || 'Error', 'error');
    } finally { setDeleting(false); }
  };

  // ── Produce ────────────────────────────────────────────────────────────────
  const openProduce = (bom) => { setProduceBom(bom); setProduceQty('1'); setProduceWh(''); setProduceOpen(true); };

  const handleProduce = async (e) => {
    e.preventDefault();
    setProducing(true);
    try {
      const result = await api.produceBom(produceBom._id, {
        qty: parseFloat(produceQty) || 1,
        warehouseId: produceWh || undefined,
        notes: `Production run — ${produceQty}× ${produceBom.name}`,
      });
      showToast(`${isAR ? 'تم الإنتاج:' : 'Produced:'} ${result.produced} ${isAR ? 'وحدة' : 'units'}`);
      setProduceOpen(false);
      loadBoms();
    } catch (err) {
      showToast(err.message || 'Error', 'error');
    } finally { setProducing(false); }
  };

  // ── Style helpers ──────────────────────────────────────────────────────────
  const inp = (extra = {}) => ({
    width: '100%', height: 34, padding: '0 10px', borderRadius: 4,
    border: `1px solid ${t.border}`, backgroundColor: t.canvas, color: t.fg,
    fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
    ...extra,
  });

  const lbl = (text) => (
    <label style={{ display: 'block', fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.fgSubtle, marginBottom: 4 }}>
      {text}
    </label>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="animate-in fade-in duration-300" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 900, color: t.fg, letterSpacing: '-0.02em', margin: '0 0 4px' }}>
            {isAR ? '⚙️ بيانات المواد (BOM)' : '⚙️ Bill of Materials'}
          </h1>
          <p style={{ fontSize: 12, color: t.fgMuted, margin: 0 }}>
            {isAR ? 'تعريف وصفات الإنتاج وتنفيذ أوامر التصنيع' : 'Define production recipes and execute manufacturing orders'}
          </p>
        </div>
        {canAdd && (
          <button
            onClick={openAdd}
            style={{ height: 34, padding: '0 16px', borderRadius: 4, backgroundColor: primary, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Icon name="add" size={16} />
            {isAR ? 'إنشاء BOM' : 'New BOM'}
          </button>
        )}
      </div>

      {/* BOM list */}
      {loading ? (
        <div style={{ padding: '48px 0', textAlign: 'center' }}>
          <div style={{ width: 22, height: 22, margin: '0 auto', borderRadius: '50%', border: `2px solid ${t.border}`, borderTopColor: primary, animation: 'spin 600ms linear infinite' }} />
        </div>
      ) : fetchError ? (
        <div style={{ padding: '48px 24px', textAlign: 'center', backgroundColor: t.elev, border: `1px solid ${t.neg}30`, borderRadius: 4 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>⚠️</div>
          <p style={{ color: t.neg, fontSize: 13, marginBottom: 12 }}>{fetchError}</p>
          <button onClick={loadBoms} style={{ height: 30, padding: '0 14px', borderRadius: 4, backgroundColor: primary, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
            {isAR ? 'إعادة المحاولة' : 'Retry'}
          </button>
        </div>
      ) : boms.length === 0 ? (
        <div style={{ padding: '60px 24px', textAlign: 'center', backgroundColor: t.elev, border: `1px solid ${t.border}`, borderRadius: 4 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚙️</div>
          <p style={{ color: t.fgMuted, fontSize: 13 }}>
            {isAR ? 'لا توجد وصفات إنتاج بعد. أنشئ واحدة للبدء.' : 'No BOM templates yet. Create one to start manufacturing.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {boms.map(bom => {
            const outputItem = bom.outputItemId;
            const canProduce = bom.components?.every(c => {
              const item = items.find(i => i._id === (c.itemId?._id || c.itemId));
              return item && item.qty >= c.qty;
            });

            return (
              <div key={bom._id} style={{ backgroundColor: t.elev, border: `1px solid ${t.border}`, borderRadius: 4, padding: 16 }}>
                {/* BOM header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: t.fg }}>
                      {isAR ? bom.name : (bom.nameEn || bom.name)}
                    </div>
                    {outputItem && (
                      <div style={{ fontSize: 12, color: t.fgMuted, marginTop: 3 }}>
                        {isAR ? 'ينتج:' : 'Produces:'}{' '}
                        <strong style={{ color: primary }}>
                          {bom.outputQty}× {isAR ? outputItem.name : (outputItem.nameEn || outputItem.name)}
                        </strong>
                        {outputItem.qty != null && (
                          <span style={{ marginLeft: 8, fontFamily: 'ui-monospace, monospace', fontSize: 11, color: t.fgSubtle }}>
                            (in stock: {outputItem.qty})
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    {/* Produce button */}
                    <button
                      onClick={() => openProduce(bom)}
                      title={canProduce ? (isAR ? 'تنفيذ الإنتاج' : 'Execute Production') : (isAR ? 'مكونات غير كافية' : 'Insufficient components')}
                      style={{
                        height: 30, padding: '0 12px', borderRadius: 4,
                        backgroundColor: canProduce ? '#16774A' : t.sunken,
                        color: canProduce ? '#fff' : t.fgSubtle,
                        border: `1px solid ${canProduce ? '#16774A' : t.border}`,
                        cursor: 'pointer', fontSize: 12, fontWeight: 600,
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                      }}
                    >
                      ▶ {isAR ? 'تشغيل' : 'Produce'}
                    </button>
                    {canEdit && (
                      <button onClick={() => openEdit(bom)} style={{ width: 30, height: 30, borderRadius: 4, border: `1px solid ${t.border}`, background: 'transparent', cursor: 'pointer', color: t.fgSubtle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = primary; e.currentTarget.style.color = primary; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.fgSubtle; }}>
                        <Icon name="edit" size={14} />
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => { setDeleteId(bom._id); setConfirmOpen(true); }} style={{ width: 30, height: 30, borderRadius: 4, border: `1px solid ${t.border}`, background: 'transparent', cursor: 'pointer', color: t.fgSubtle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = t.neg; e.currentTarget.style.color = t.neg; e.currentTarget.style.backgroundColor = t.negTint; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.fgSubtle; e.currentTarget.style.backgroundColor = 'transparent'; }}>
                        <Icon name="delete" size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Components table */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr>
                        {[isAR ? 'المكون' : 'Component', isAR ? 'الكمية المطلوبة' : 'Required Qty', isAR ? 'المخزون الحالي' : 'In Stock', isAR ? 'الحالة' : 'Status'].map(h => (
                          <th key={h} style={{ padding: '5px 10px', textAlign: 'start', fontSize: 10, fontFamily: 'ui-monospace,monospace', textTransform: 'uppercase', letterSpacing: '0.06em', color: t.fgSubtle, borderBottom: `1px solid ${t.border}`, backgroundColor: t.sunken }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(bom.components || []).map((comp, i) => {
                        const compItem  = items.find(itm => itm._id === (comp.itemId?._id || comp.itemId));
                        const stockQty  = compItem?.qty ?? null;
                        const needed    = comp.qty;
                        const hasEnough = stockQty !== null && stockQty >= needed;
                        return (
                          <tr key={i} style={{ borderBottom: `1px solid ${t.border}` }}>
                            <td style={{ padding: '8px 10px', color: t.fg, fontWeight: 500 }}>
                              {comp.itemId?.name ? (isAR ? comp.itemId.name : (comp.itemId.nameEn || comp.itemId.name)) : compItem ? (isAR ? compItem.name : (compItem.nameEn || compItem.name)) : comp.itemId}
                            </td>
                            <td style={{ padding: '8px 10px', fontFamily: 'ui-monospace,monospace', fontWeight: 700 }}>
                              {needed} {comp.unit || 'unit'}
                            </td>
                            <td style={{ padding: '8px 10px', fontFamily: 'ui-monospace,monospace', color: hasEnough ? '#10b981' : (stockQty === 0 ? t.neg : '#f59e0b') }}>
                              {stockQty ?? '—'}
                            </td>
                            <td style={{ padding: '8px 10px' }}>
                              <span style={{
                                padding: '2px 6px', borderRadius: 3, fontSize: 10, fontFamily: 'ui-monospace,monospace', fontWeight: 700,
                                backgroundColor: hasEnough ? '#10b98118' : '#ef444418',
                                color: hasEnough ? '#10b981' : '#ef4444',
                              }}>
                                {hasEnough ? '✓ OK' : '✗ LOW'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── BOM edit/create modal ── */}
      <Modal open={bomModal} onClose={() => setBomModal(false)} title={editBom ? (isAR ? 'تعديل BOM' : 'Edit BOM') : (isAR ? 'إنشاء BOM جديد' : 'New Bill of Materials')}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Name */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>{lbl(isAR ? 'الاسم (عربي)' : 'Name (AR)')} <input required value={bomForm.name} onChange={e => setBomForm(p => ({ ...p, name: e.target.value }))} style={inp()} /></div>
            <div>{lbl(isAR ? 'الاسم (إنجليزي)' : 'Name (EN)')} <input value={bomForm.nameEn} onChange={e => setBomForm(p => ({ ...p, nameEn: e.target.value }))} style={inp()} /></div>
          </div>

          {/* Output item */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
            <div>
              {lbl(isAR ? 'الصنف المنتج *' : 'Output Item *')}
              <select required value={bomForm.outputItemId} onChange={e => setBomForm(p => ({ ...p, outputItemId: e.target.value }))} style={{ ...inp(), padding: '0 8px', cursor: 'pointer' }}>
                <option value="">{isAR ? 'اختر الصنف...' : 'Select item...'}</option>
                {items.map(i => <option key={i._id} value={i._id}>{isAR ? i.name : (i.nameEn || i.name)}</option>)}
              </select>
            </div>
            <div>
              {lbl(isAR ? 'كمية الإنتاج' : 'Output Qty')}
              <input type="number" min="0.001" step="any" value={bomForm.outputQty} onChange={e => setBomForm(p => ({ ...p, outputQty: e.target.value }))} style={inp()} />
            </div>
          </div>

          {/* Components */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.fgSubtle }}>
                {isAR ? 'المكونات (المواد الأولية)' : 'Components (Raw Materials)'}
              </span>
              <button type="button" onClick={addComponent}
                style={{ height: 26, padding: '0 10px', borderRadius: 4, backgroundColor: `${primary}18`, color: primary, border: `1px solid ${primary}30`, cursor: 'pointer', fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Icon name="add" size={13} /> {isAR ? 'إضافة مكون' : 'Add Component'}
              </button>
            </div>

            {bomForm.components.length === 0 ? (
              <div style={{ padding: '16px 0', textAlign: 'center', color: t.fgSubtle, fontSize: 12 }}>
                {isAR ? 'لا توجد مكونات — اضغط "إضافة مكون"' : 'No components yet — click "Add Component"'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {bomForm.components.map((comp, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 80px 26px', gap: 6, alignItems: 'end' }}>
                    <div>
                      {i === 0 && lbl(isAR ? 'الصنف' : 'Item')}
                      <select value={comp.itemId} onChange={e => setComp(i, 'itemId', e.target.value)} style={{ ...inp(), padding: '0 8px', cursor: 'pointer' }}>
                        <option value="">{isAR ? 'اختر...' : 'Select...'}</option>
                        {items.filter(it => it._id !== bomForm.outputItemId).map(it => (
                          <option key={it._id} value={it._id}>{isAR ? it.name : (it.nameEn || it.name)} (x{it.qty})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      {i === 0 && lbl(isAR ? 'الكمية' : 'Qty')}
                      <input type="number" min="0.001" step="any" value={comp.qty} onChange={e => setComp(i, 'qty', e.target.value)} style={inp()} />
                    </div>
                    <div>
                      {i === 0 && lbl(isAR ? 'الوحدة' : 'Unit')}
                      <input value={comp.unit} onChange={e => setComp(i, 'unit', e.target.value)} style={inp()} placeholder="unit" />
                    </div>
                    <button type="button" onClick={() => removeComponent(i)}
                      style={{ width: 26, height: 34, borderRadius: 4, border: `1px solid ${t.border}`, background: 'transparent', cursor: 'pointer', color: t.neg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: i === 0 ? 18 : 0 }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = t.negTint}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <Icon name="delete" size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            {lbl(isAR ? 'ملاحظات' : 'Notes')}
            <textarea rows={2} value={bomForm.notes} onChange={e => setBomForm(p => ({ ...p, notes: e.target.value }))} style={{ ...inp(), height: 'auto', padding: '8px 10px', resize: 'vertical' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8, borderTop: `1px solid ${t.border}` }}>
            <button type="button" onClick={() => setBomModal(false)} style={{ height: 32, padding: '0 14px', borderRadius: 4, backgroundColor: 'transparent', color: t.fgMuted, border: `1px solid ${t.border}`, cursor: 'pointer', fontSize: 13 }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = t.sunken} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
              {isAR ? 'إلغاء' : 'Cancel'}
            </button>
            <button type="submit" disabled={saving} style={{ height: 32, padding: '0 16px', borderRadius: 4, backgroundColor: primary, color: '#fff', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, opacity: saving ? 0.65 : 1 }}>
              {saving && <div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 600ms linear infinite' }} />}
              {isAR ? 'حفظ' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Produce modal ── */}
      <Modal open={produceOpen} onClose={() => setProduceOpen(false)} title={isAR ? 'تنفيذ أمر إنتاج' : 'Execute Production Order'}>
        {produceBom && (
          <form onSubmit={handleProduce} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ padding: '10px 12px', borderRadius: 4, backgroundColor: `${primary}12`, border: `1px solid ${primary}25`, fontSize: 13, color: t.fg }}>
              <strong>{isAR ? 'الوصفة:' : 'BOM:'}</strong> {isAR ? produceBom.name : (produceBom.nameEn || produceBom.name)}
              <br />
              <span style={{ fontSize: 11, color: t.fgMuted }}>
                {isAR ? 'ينتج:' : 'Produces:'} {produceBom.outputQty} × {isAR ? produceBom.outputItemId?.name : (produceBom.outputItemId?.nameEn || produceBom.outputItemId?.name)} {isAR ? 'لكل دورة' : 'per run'}
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.fgSubtle, marginBottom: 4 }}>
                {isAR ? 'عدد الدورات *' : 'Number of Runs *'}
              </label>
              <input
                required type="number" min="1" step="1"
                value={produceQty} onChange={e => setProduceQty(e.target.value)}
                style={{ width: '100%', height: 34, padding: '0 10px', borderRadius: 4, border: `1px solid ${t.border}`, backgroundColor: t.canvas, color: t.fg, fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
              {produceBom.outputQty && produceQty && (
                <div style={{ marginTop: 4, fontFamily: 'ui-monospace, monospace', fontSize: 11, color: t.fgMuted }}>
                  {isAR ? 'الإنتاج الكلي:' : 'Total output:'} <strong style={{ color: primary }}>{(parseFloat(produceQty) || 0) * produceBom.outputQty} {isAR ? 'وحدة' : 'units'}</strong>
                </div>
              )}
            </div>

            {warehouses.length > 0 && (
              <div>
                <label style={{ display: 'block', fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.fgSubtle, marginBottom: 4 }}>
                  {isAR ? 'المستودع (اختياري)' : 'Warehouse (optional)'}
                </label>
                <select value={produceWh} onChange={e => setProduceWh(e.target.value)} style={{ width: '100%', height: 34, padding: '0 8px', borderRadius: 4, border: `1px solid ${t.border}`, backgroundColor: t.canvas, color: t.fg, fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', cursor: 'pointer' }}>
                  <option value="">{isAR ? '— لا يوجد —' : '— None —'}</option>
                  {warehouses.map(wh => <option key={wh._id} value={wh._id}>[{wh.code}] {isAR ? wh.name : (wh.nameEn || wh.name)}</option>)}
                </select>
              </div>
            )}

            {/* Component sufficiency check */}
            <div style={{ fontSize: 12, color: t.fgMuted }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>{isAR ? 'التحقق من المكونات:' : 'Component check:'}</div>
              {(produceBom.components || []).map((comp, i) => {
                const compItem = items.find(itm => itm._id === (comp.itemId?._id || comp.itemId));
                const needed   = comp.qty * (parseFloat(produceQty) || 1);
                const have     = compItem?.qty || 0;
                const ok       = have >= needed;
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: `1px solid ${t.border}` }}>
                    <span style={{ color: t.fg }}>
                      {comp.itemId?.name ? (isAR ? comp.itemId.name : (comp.itemId.nameEn || comp.itemId.name)) : compItem?.name || '—'}
                    </span>
                    <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: ok ? '#10b981' : t.neg, fontWeight: 700 }}>
                      {needed} / {have} {ok ? '✓' : '✗'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8, borderTop: `1px solid ${t.border}` }}>
              <button type="button" onClick={() => setProduceOpen(false)} style={{ height: 32, padding: '0 14px', borderRadius: 4, backgroundColor: 'transparent', color: t.fgMuted, border: `1px solid ${t.border}`, cursor: 'pointer', fontSize: 13 }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = t.sunken} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                {isAR ? 'إلغاء' : 'Cancel'}
              </button>
              <button type="submit" disabled={producing} style={{ height: 32, padding: '0 16px', borderRadius: 4, backgroundColor: '#16774A', color: '#fff', border: 'none', cursor: producing ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, opacity: producing ? 0.65 : 1 }}>
                {producing && <div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 600ms linear infinite' }} />}
                ▶ {isAR ? 'تشغيل الإنتاج' : 'Run Production'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Confirm
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        loading={deleting}
        message={isAR ? 'هل تريد حذف هذه الوصفة؟' : 'Delete this BOM template?'}
      />
    </div>
  );
}
