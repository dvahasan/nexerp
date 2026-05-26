import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { api } from '../api';
import { T } from '../theme';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import Confirm from '../components/Confirm';

/* ── Searchable item picker ──────────────────────────────────────────────────
   Props:
   - value      : selected item _id (string)
   - onChange   : (id, item) => void
   - items      : full item list
   - exclude    : array of _ids to hide (e.g. already-selected components)
   - placeholder: string
   - isAR       : bool
   - t          : theme tokens
   - required   : bool
*/
function ItemPicker({ value, onChange, items, exclude = [], placeholder, isAR, t, required }) {
  const [open,   setOpen]   = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  const selected = items.find(i => i._id === value);
  const label    = selected
    ? (isAR ? selected.name : (selected.nameEn || selected.name))
    : '';

  const filtered = items
    .filter(i => !exclude.includes(i._id))
    .filter(i => {
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        i.name?.toLowerCase().includes(s) ||
        i.nameEn?.toLowerCase().includes(s) ||
        i.sku?.toLowerCase().includes(s)
      );
    });

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (item) => {
    onChange(item._id, item);
    setSearch('');
    setOpen(false);
  };

  const clear = (e) => {
    e.stopPropagation();
    onChange('', null);
    setSearch('');
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          height: 34, padding: '0 32px 0 10px', borderRadius: 4,
          border: `1px solid ${open ? t.fg + '60' : t.border}`,
          backgroundColor: t.canvas, color: value ? t.fg : t.fgSubtle,
          fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center',
          userSelect: 'none', boxSizing: 'border-box', position: 'relative',
        }}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label || placeholder}
        </span>
        {value && (
          <span
            onClick={clear}
            style={{ position: 'absolute', right: 28, color: t.fgSubtle, fontSize: 14, lineHeight: 1, cursor: 'pointer' }}
          >×</span>
        )}
        <span style={{ position: 'absolute', right: 8, color: t.fgSubtle, fontSize: 10 }}>▾</span>
      </div>

      {/* Hidden native input so form required validation works */}
      <input
        tabIndex={-1}
        required={required}
        value={value || ''}
        onChange={() => {}}
        style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
      />

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 999,
          backgroundColor: t.elev, border: `1px solid ${t.border}`, borderRadius: 4,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', marginTop: 2,
          maxHeight: 220, display: 'flex', flexDirection: 'column',
        }}>
          {/* Search box */}
          <div style={{ padding: '6px 8px', borderBottom: `1px solid ${t.border}` }}>
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={isAR ? 'ابحث...' : 'Search...'}
              style={{
                width: '100%', height: 28, padding: '0 8px', borderRadius: 3,
                border: `1px solid ${t.border}`, backgroundColor: t.canvas,
                color: t.fg, fontSize: 12, outline: 'none', boxSizing: 'border-box',
              }}
              onClick={e => e.stopPropagation()}
            />
          </div>

          {/* Options */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '12px 10px', fontSize: 12, color: t.fgSubtle, textAlign: 'center' }}>
                {isAR ? 'لا توجد نتائج' : 'No items found'}
              </div>
            ) : filtered.map(item => {
              const name = isAR ? item.name : (item.nameEn || item.name);
              const isSelected = item._id === value;
              return (
                <div
                  key={item._id}
                  onClick={() => select(item)}
                  style={{
                    padding: '7px 10px', cursor: 'pointer', fontSize: 13,
                    backgroundColor: isSelected ? `${t.fg}10` : 'transparent',
                    borderBottom: `1px solid ${t.border}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = `${t.fg}08`}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = isSelected ? `${t.fg}10` : 'transparent'}
                >
                  <span style={{ color: t.fg, fontWeight: isSelected ? 600 : 400 }}>{name}</span>
                  <span style={{ fontFamily: 'ui-monospace,monospace', fontSize: 11, color: t.fgSubtle }}>
                    {item.sku && `${item.sku} · `}qty:{item.qty ?? '?'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Default form ─────────────────────────────────────────────────────────── */
const defaultBomForm = {
  name: '', nameEn: '',
  outputItemId: '', outputQty: '1',
  components: [],
  notes: '',
};

/* ── Main component ───────────────────────────────────────────────────────── */
export default function BOM() {
  const { theme, company, isAR, showToast, user, warehouses } = useAppContext();
  const t       = T[theme] || T.light;
  const primary = company?.primaryColor || '#3b82f6';

  const canAdd    = user?.role === 'owner' || user?.perms?.canAdd;
  const canEdit   = user?.role === 'owner' || user?.perms?.canEdit;
  const canDelete = user?.role === 'owner' || user?.perms?.canDelete;

  // ── Items fetched locally (never rely on context items) ───────────────────
  const [allItems,     setAllItems]     = useState([]);
  const [itemsLoading, setItemsLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    try {
      const data = await api.getItems();
      setAllItems(Array.isArray(data) ? data : (data?.items || []));
    } catch { /* leave empty */ }
    finally { setItemsLoading(false); }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // ── BOMs ──────────────────────────────────────────────────────────────────
  const [boms,       setBoms]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [fetchError, setFetchError] = useState('');

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

  // ── BOM modal state ───────────────────────────────────────────────────────
  const [bomModal, setBomModal] = useState(false);
  const [bomForm,  setBomForm]  = useState({ ...defaultBomForm });
  const [editBom,  setEditBom]  = useState(null);
  const [saving,   setSaving]   = useState(false);

  // ── Delete state ──────────────────────────────────────────────────────────
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId,    setDeleteId]    = useState(null);
  const [deleting,    setDeleting]    = useState(false);

  // ── Produce modal state ───────────────────────────────────────────────────
  const [produceOpen, setProduceOpen] = useState(false);
  const [produceBom,  setProduceBom]  = useState(null);
  const [produceQty,  setProduceQty]  = useState('1');
  const [produceWh,   setProduceWh]   = useState('');
  const [producing,   setProducing]   = useState(false);

  // ── Open / close modal ────────────────────────────────────────────────────
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

  // ── Component row helpers ─────────────────────────────────────────────────
  const addComponent = () =>
    setBomForm(p => ({ ...p, components: [...p.components, { itemId: '', qty: '1', unit: 'unit', notes: '' }] }));

  const removeComponent = (i) =>
    setBomForm(p => ({ ...p, components: p.components.filter((_, idx) => idx !== i) }));

  const setComp = (i, k, v) =>
    setBomForm(p => {
      const comps = [...p.components];
      comps[i] = { ...comps[i], [k]: v };
      return { ...p, components: comps };
    });

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!bomForm.outputItemId) {
      showToast(isAR ? 'اختر الصنف المنتج' : 'Select output item', 'error');
      return;
    }
    const validComps = bomForm.components.filter(c => c.itemId);
    if (validComps.length === 0) {
      showToast(isAR ? 'أضف مكوناً واحداً على الأقل' : 'Add at least one component', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...bomForm,
        outputQty:  parseFloat(bomForm.outputQty) || 1,
        components: validComps.map(c => ({
          itemId: c.itemId,
          qty:    parseFloat(c.qty) || 1,
          unit:   c.unit,
          notes:  c.notes,
        })),
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

  // ── Delete ────────────────────────────────────────────────────────────────
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

  // ── Produce ───────────────────────────────────────────────────────────────
  const openProduce = (bom) => {
    setProduceBom(bom);
    setProduceQty('1');
    setProduceWh('');
    setProduceOpen(true);
  };

  const handleProduce = async (e) => {
    e.preventDefault();
    setProducing(true);
    try {
      const result = await api.produceBom(produceBom._id, {
        qty:         parseFloat(produceQty) || 1,
        warehouseId: produceWh || undefined,
        notes:       `Production run — ${produceQty}× ${produceBom.name}`,
      });
      showToast(`${isAR ? 'تم الإنتاج:' : 'Produced:'} ${result.produced} ${isAR ? 'وحدة' : 'units'}`);
      setProduceOpen(false);
      loadBoms();
      fetchItems(); // refresh stock levels
    } catch (err) {
      showToast(err.message || 'Error', 'error');
    } finally { setProducing(false); }
  };

  // ── Style helpers ─────────────────────────────────────────────────────────
  const inp = (extra = {}) => ({
    width: '100%', height: 34, padding: '0 10px', borderRadius: 4,
    border: `1px solid ${t.border}`, backgroundColor: t.canvas, color: t.fg,
    fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
    ...extra,
  });

  const lbl = (text) => (
    <label style={{
      display: 'block', fontFamily: 'ui-monospace, monospace', fontSize: 10,
      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
      color: t.fgSubtle, marginBottom: 4,
    }}>
      {text}
    </label>
  );

  // Selected component _ids (for exclusion in pickers)
  const usedCompIds = bomForm.components.map(c => c.itemId).filter(Boolean);

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
          <p style={{ color: t.fgMuted, fontSize: 13, marginBottom: 16 }}>
            {isAR ? 'لا توجد وصفات إنتاج بعد. أنشئ واحدة للبدء.' : 'No BOM templates yet. Create one to get started.'}
          </p>
          {canAdd && (
            <button onClick={openAdd} style={{ height: 32, padding: '0 16px', borderRadius: 4, backgroundColor: primary, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              {isAR ? '+ إنشاء BOM' : '+ New BOM'}
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {boms.map(bom => {
            const outputItem = bom.outputItemId;
            const canProduce = bom.components?.every(c => {
              const live = allItems.find(i => i._id === (c.itemId?._id || c.itemId));
              const qty  = live?.qty ?? c.itemId?.qty ?? 0;
              return qty >= c.qty;
            });

            return (
              <div key={bom._id} style={{ backgroundColor: t.elev, border: `1px solid ${t.border}`, borderRadius: 4, padding: 16 }}>
                {/* BOM header row */}
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
                          <span style={{ marginLeft: 8, fontFamily: 'ui-monospace,monospace', fontSize: 11, color: t.fgSubtle }}>
                            ({isAR ? 'المخزون:' : 'stock:'} {outputItem.qty})
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
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
                      <button onClick={() => openEdit(bom)}
                        style={{ width: 30, height: 30, borderRadius: 4, border: `1px solid ${t.border}`, background: 'transparent', cursor: 'pointer', color: t.fgSubtle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = primary; e.currentTarget.style.color = primary; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.fgSubtle; }}>
                        <Icon name="edit" size={14} />
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => { setDeleteId(bom._id); setConfirmOpen(true); }}
                        style={{ width: 30, height: 30, borderRadius: 4, border: `1px solid ${t.border}`, background: 'transparent', cursor: 'pointer', color: t.fgSubtle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
                        {[
                          isAR ? 'المكون'         : 'Component',
                          isAR ? 'الكمية المطلوبة' : 'Required',
                          isAR ? 'المخزون الحالي'  : 'In Stock',
                          isAR ? 'الحالة'          : 'Status',
                        ].map(h => (
                          <th key={h} style={{ padding: '5px 10px', textAlign: 'start', fontSize: 10, fontFamily: 'ui-monospace,monospace', textTransform: 'uppercase', letterSpacing: '0.06em', color: t.fgSubtle, borderBottom: `1px solid ${t.border}`, backgroundColor: t.sunken }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(bom.components || []).map((comp, i) => {
                        const live      = allItems.find(itm => itm._id === (comp.itemId?._id || comp.itemId));
                        const stockQty  = live?.qty ?? comp.itemId?.qty ?? null;
                        const needed    = comp.qty;
                        const hasEnough = stockQty !== null && stockQty >= needed;
                        const compName  = comp.itemId?.name
                          ? (isAR ? comp.itemId.name : (comp.itemId.nameEn || comp.itemId.name))
                          : live ? (isAR ? live.name : (live.nameEn || live.name)) : '—';
                        return (
                          <tr key={i} style={{ borderBottom: `1px solid ${t.border}` }}>
                            <td style={{ padding: '8px 10px', color: t.fg, fontWeight: 500 }}>{compName}</td>
                            <td style={{ padding: '8px 10px', fontFamily: 'ui-monospace,monospace', fontWeight: 700 }}>
                              {needed} {comp.unit || 'unit'}
                            </td>
                            <td style={{ padding: '8px 10px', fontFamily: 'ui-monospace,monospace', color: hasEnough ? '#10b981' : (stockQty === 0 ? t.neg : '#f59e0b') }}>
                              {stockQty ?? '—'}
                            </td>
                            <td style={{ padding: '8px 10px' }}>
                              <span style={{ padding: '2px 6px', borderRadius: 3, fontSize: 10, fontFamily: 'ui-monospace,monospace', fontWeight: 700, backgroundColor: hasEnough ? '#10b98118' : '#ef444418', color: hasEnough ? '#10b981' : '#ef4444' }}>
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

      {/* ── BOM create / edit modal ─────────────────────────────────────────── */}
      <Modal
        open={bomModal}
        onClose={() => setBomModal(false)}
        title={editBom ? (isAR ? 'تعديل BOM' : 'Edit BOM') : (isAR ? 'إنشاء BOM جديد' : 'New Bill of Materials')}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Names */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              {lbl(isAR ? 'الاسم (عربي) *' : 'Name (AR) *')}
              <input required value={bomForm.name} onChange={e => setBomForm(p => ({ ...p, name: e.target.value }))} style={inp()} />
            </div>
            <div>
              {lbl(isAR ? 'الاسم (إنجليزي)' : 'Name (EN)')}
              <input value={bomForm.nameEn} onChange={e => setBomForm(p => ({ ...p, nameEn: e.target.value }))} style={inp()} />
            </div>
          </div>

          {/* Output item */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
            <div>
              {lbl(isAR ? 'الصنف المنتج (Output Item) *' : 'Output Item (Finished Product) *')}
              {itemsLoading ? (
                <div style={{ ...inp(), display: 'flex', alignItems: 'center', color: t.fgSubtle, fontSize: 12 }}>
                  {isAR ? 'جار تحميل الأصناف...' : 'Loading items...'}
                </div>
              ) : allItems.length === 0 ? (
                <div style={{ ...inp(), display: 'flex', alignItems: 'center', color: t.neg, fontSize: 12 }}>
                  {isAR ? 'لا توجد أصناف — أضف أصنافاً في المخزون أولاً' : 'No items found — add items to Inventory first'}
                </div>
              ) : (
                <ItemPicker
                  value={bomForm.outputItemId}
                  onChange={(id) => setBomForm(p => ({ ...p, outputItemId: id }))}
                  items={allItems}
                  exclude={usedCompIds}
                  placeholder={isAR ? 'اختر الصنف المنتج...' : 'Select finished product...'}
                  isAR={isAR}
                  t={t}
                  required
                />
              )}
            </div>
            <div>
              {lbl(isAR ? 'كمية الإنتاج' : 'Output Qty')}
              <input
                type="number" min="0.001" step="any"
                value={bomForm.outputQty}
                onChange={e => setBomForm(p => ({ ...p, outputQty: e.target.value }))}
                style={inp()}
              />
            </div>
          </div>

          {/* Components */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontFamily: 'ui-monospace,monospace', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.fgSubtle }}>
                {isAR ? 'المكونات (المواد الخام)' : 'Components (Raw Materials)'}
              </span>
              <button
                type="button" onClick={addComponent}
                style={{ height: 26, padding: '0 10px', borderRadius: 4, backgroundColor: `${primary}18`, color: primary, border: `1px solid ${primary}30`, cursor: 'pointer', fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <Icon name="add" size={13} /> {isAR ? 'إضافة مكون' : 'Add Component'}
              </button>
            </div>

            {bomForm.components.length === 0 ? (
              <div style={{ padding: '20px 0', textAlign: 'center', color: t.fgSubtle, fontSize: 12, border: `1px dashed ${t.border}`, borderRadius: 4 }}>
                {isAR ? 'لا توجد مكونات — اضغط "إضافة مكون"' : 'No components yet — click "Add Component"'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {bomForm.components.map((comp, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 80px 30px', gap: 6, alignItems: 'end', padding: '10px 10px 10px', backgroundColor: t.sunken, borderRadius: 4 }}>
                    <div>
                      {i === 0 && lbl(isAR ? 'الصنف (مادة خام)' : 'Item (Raw Material)')}
                      <ItemPicker
                        value={comp.itemId}
                        onChange={(id) => setComp(i, 'itemId', id)}
                        items={allItems}
                        exclude={[bomForm.outputItemId, ...usedCompIds.filter((_, idx) => idx !== i)].filter(Boolean)}
                        placeholder={isAR ? 'اختر مادة خام...' : 'Select raw material...'}
                        isAR={isAR}
                        t={t}
                      />
                    </div>
                    <div>
                      {i === 0 && lbl(isAR ? 'الكمية' : 'Qty')}
                      <input
                        type="number" min="0.001" step="any"
                        value={comp.qty}
                        onChange={e => setComp(i, 'qty', e.target.value)}
                        style={inp()}
                      />
                    </div>
                    <div>
                      {i === 0 && lbl(isAR ? 'الوحدة' : 'Unit')}
                      <input
                        value={comp.unit}
                        onChange={e => setComp(i, 'unit', e.target.value)}
                        placeholder="unit"
                        style={inp()}
                      />
                    </div>
                    <button
                      type="button" onClick={() => removeComponent(i)}
                      style={{ width: 30, height: 34, borderRadius: 4, border: `1px solid ${t.border}`, background: 'transparent', cursor: 'pointer', color: t.neg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: i === 0 ? 18 : 0 }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = t.negTint}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
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
            <textarea
              rows={2}
              value={bomForm.notes}
              onChange={e => setBomForm(p => ({ ...p, notes: e.target.value }))}
              style={{ ...inp(), height: 'auto', padding: '8px 10px', resize: 'vertical' }}
            />
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8, borderTop: `1px solid ${t.border}` }}>
            <button type="button" onClick={() => setBomModal(false)}
              style={{ height: 32, padding: '0 14px', borderRadius: 4, backgroundColor: 'transparent', color: t.fgMuted, border: `1px solid ${t.border}`, cursor: 'pointer', fontSize: 13 }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = t.sunken}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
              {isAR ? 'إلغاء' : 'Cancel'}
            </button>
            <button type="submit" disabled={saving}
              style={{ height: 32, padding: '0 16px', borderRadius: 4, backgroundColor: primary, color: '#fff', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, opacity: saving ? 0.65 : 1 }}>
              {saving && <div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 600ms linear infinite' }} />}
              {isAR ? 'حفظ' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Produce modal ─────────────────────────────────────────────────────── */}
      <Modal open={produceOpen} onClose={() => setProduceOpen(false)} title={isAR ? 'تنفيذ أمر إنتاج' : 'Execute Production Order'}>
        {produceBom && (
          <form onSubmit={handleProduce} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ padding: '10px 12px', borderRadius: 4, backgroundColor: `${primary}12`, border: `1px solid ${primary}25`, fontSize: 13, color: t.fg }}>
              <strong>{isAR ? 'الوصفة:' : 'BOM:'}</strong>{' '}
              {isAR ? produceBom.name : (produceBom.nameEn || produceBom.name)}
              <br />
              <span style={{ fontSize: 11, color: t.fgMuted }}>
                {isAR ? 'ينتج:' : 'Produces:'} {produceBom.outputQty} ×{' '}
                {isAR ? produceBom.outputItemId?.name : (produceBom.outputItemId?.nameEn || produceBom.outputItemId?.name)}{' '}
                {isAR ? 'لكل دورة' : 'per run'}
              </span>
            </div>

            <div>
              {lbl(isAR ? 'عدد الدورات *' : 'Number of Runs *')}
              <input
                required type="number" min="1" step="1"
                value={produceQty}
                onChange={e => setProduceQty(e.target.value)}
                style={inp()}
              />
              {produceBom.outputQty && produceQty && (
                <div style={{ marginTop: 4, fontFamily: 'ui-monospace,monospace', fontSize: 11, color: t.fgMuted }}>
                  {isAR ? 'الإنتاج الكلي:' : 'Total output:'}{' '}
                  <strong style={{ color: primary }}>
                    {(parseFloat(produceQty) || 0) * produceBom.outputQty} {isAR ? 'وحدة' : 'units'}
                  </strong>
                </div>
              )}
            </div>

            {warehouses.length > 0 && (
              <div>
                {lbl(isAR ? 'المستودع (اختياري)' : 'Warehouse (optional)')}
                <select value={produceWh} onChange={e => setProduceWh(e.target.value)}
                  style={{ ...inp(), padding: '0 8px', cursor: 'pointer' }}>
                  <option value="">{isAR ? '— لا يوجد —' : '— None —'}</option>
                  {warehouses.map(wh => (
                    <option key={wh._id} value={wh._id}>[{wh.code}] {isAR ? wh.name : (wh.nameEn || wh.name)}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Component check */}
            <div>
              <div style={{ fontFamily: 'ui-monospace,monospace', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.fgSubtle, marginBottom: 6 }}>
                {isAR ? 'التحقق من المكونات' : 'Component Check'}
              </div>
              {(produceBom.components || []).map((comp, i) => {
                const live   = allItems.find(itm => itm._id === (comp.itemId?._id || comp.itemId));
                const needed = comp.qty * (parseFloat(produceQty) || 1);
                const have   = live?.qty ?? comp.itemId?.qty ?? 0;
                const ok     = have >= needed;
                const name   = comp.itemId?.name
                  ? (isAR ? comp.itemId.name : (comp.itemId.nameEn || comp.itemId.name))
                  : live?.name || '—';
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: `1px solid ${t.border}`, fontSize: 12 }}>
                    <span style={{ color: t.fg }}>{name}</span>
                    <span style={{ fontFamily: 'ui-monospace,monospace', fontSize: 11, color: ok ? '#10b981' : t.neg, fontWeight: 700 }}>
                      need {needed} / have {have} {ok ? '✓' : '✗'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8, borderTop: `1px solid ${t.border}` }}>
              <button type="button" onClick={() => setProduceOpen(false)}
                style={{ height: 32, padding: '0 14px', borderRadius: 4, backgroundColor: 'transparent', color: t.fgMuted, border: `1px solid ${t.border}`, cursor: 'pointer', fontSize: 13 }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = t.sunken}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                {isAR ? 'إلغاء' : 'Cancel'}
              </button>
              <button type="submit" disabled={producing}
                style={{ height: 32, padding: '0 16px', borderRadius: 4, backgroundColor: '#16774A', color: '#fff', border: 'none', cursor: producing ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, opacity: producing ? 0.65 : 1 }}>
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
