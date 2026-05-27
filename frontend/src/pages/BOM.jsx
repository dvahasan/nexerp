import { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { api } from '../api';
import { T } from '../theme';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import Confirm from '../components/Confirm';
import ItemPicker from '../components/ItemPicker';


/* ── Default form ─────────────────────────────────────────────────────────── */
const defaultBomForm = {
  name: '', nameEn: '',
  outputItemId: '', outputQty: '1', projectId: '',
  components: [],
  notes: '',
};

/* ── Main component ───────────────────────────────────────────────────────── */
export default function BOM() {
  const { theme, company, isAR, showToast, user, warehouses, socketStatus, liveTx, liveItem } = useAppContext();
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

  const [projects, setProjects] = useState([]);
  useEffect(() => {
    if (company?.features?.projects) {
      api.getProjects().then(setProjects).catch(() => {});
    }
  }, [company?.features?.projects]);

  // ── BOMs ──────────────────────────────────────────────────────────────────
  const [boms,       setBoms]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [silentRefresh, setSilentRefresh] = useState(0);

  const loadBoms = useCallback(async (silent = false) => {
    setFetchError('');
    if (!silent) setLoading(true);
    try {
      const data = await api.getBoms();
      setBoms(Array.isArray(data) ? data : []);
    } catch (err) {
      setFetchError(err.message || 'Error fetching BOMs');
    } finally { if (!silent) setLoading(false); }
  }, []);

  useEffect(() => { loadBoms(silentRefresh > 0); }, [loadBoms, silentRefresh]);

  // ── Polling fallback for fastRefresh ──
  useEffect(() => {
    if (socketStatus === 'online' || !(company?.fastRefresh ?? true)) return;
    const id = setInterval(() => setSilentRefresh(p => p + 1), 30000);
    return () => clearInterval(id);
  }, [socketStatus, company?.fastRefresh]);

  // ── Live Sync Refetch ──
  useEffect(() => {
    if (liveTx?.type === 'refresh_boms') {
      setSilentRefresh(p => p + 1);
    }
  }, [liveTx]);

  useEffect(() => {
    if (liveItem) {
      // Refresh items list when items change globally
      fetchItems();
    }
  }, [liveItem, fetchItems]);

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

  // ── History state ─────────────────────────────────────────────────────────
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyBom,  setHistoryBom]  = useState(null);
  const [bomHistory,  setBomHistory]  = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

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
      projectId:    bom.projectId?._id || bom.projectId || '',
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
        projectId:  bomForm.projectId || undefined,
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

  // ── History & Print ───────────────────────────────────────────────────────
  const openHistory = async (bom) => {
    setHistoryBom(bom);
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const data = await api.getBomHistory(bom._id);
      setBomHistory(Array.isArray(data) ? data : []);
    } catch {
      setBomHistory([]); // If it fails to fetch, just show "No history yet"
    } finally {
      setHistoryLoading(false);
    }
  };

  const printBom = (bom) => {
    const printWindow = window.open('', '_blank');
    const header = company?.printSettings?.headerText || company?.name || 'NexERP';
    const footer = company?.printSettings?.footerText || '';
    const logoUrl = company?.logoUrl || '';

    const content = `
      <html>
        <head>
          <title>${bom.name || bom.nameEn}</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #111827; }
            .header { text-align: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { max-height: 60px; margin-bottom: 10px; }
            .title { font-size: 24px; font-weight: bold; margin: 0; }
            .subtitle { font-size: 14px; color: #6b7280; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #d1d5db; padding: 10px; text-align: ${isAR ? 'right' : 'left'}; }
            th { background-color: #f3f4f6; }
            .footer { position: fixed; bottom: 20px; left: 0; width: 100%; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 10px; }
          </style>
        </head>
        <body dir="${isAR ? 'rtl' : 'ltr'}">
          <div class="header">
            ${logoUrl ? `<img src="${logoUrl}" class="logo" />` : ''}
            <div class="title">${header}</div>
            <div class="subtitle">${isAR ? 'وصفة إنتاج' : 'Bill of Materials'}: ${bom.name}</div>
          </div>
          
          <div style="margin-bottom: 20px;">
            <strong>${isAR ? 'المنتج النهائي:' : 'Finished Product:'}</strong> ${bom.outputQty} × ${bom.outputItemId?.name || ''}
            ${bom.projectId ? `<br><strong>${isAR ? 'المشروع:' : 'Project:'}</strong> ${bom.projectId.name}` : ''}
          </div>

          <table>
            <thead>
              <tr>
                <th>${isAR ? 'المكون' : 'Component'}</th>
                <th>${isAR ? 'الكمية المطلوبة' : 'Required Qty'}</th>
              </tr>
            </thead>
            <tbody>
              ${bom.components.map(c => `
                <tr>
                  <td>${c.itemId?.name || ''}</td>
                  <td>${c.qty}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            ${footer}<br>
            Printed on: ${new Date().toLocaleString()}
          </div>
          <script>
            window.onload = () => { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `;
    printWindow.document.open();
    printWindow.document.write(content);
    printWindow.document.close();
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
    <div className="tour-bom-page animate-in fade-in duration-300" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 12 }}>
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

                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
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
                    <button onClick={() => openHistory(bom)}
                      style={{ height: 30, padding: '0 10px', borderRadius: 4, border: `1px solid ${t.border}`, background: 'transparent', cursor: 'pointer', color: primary, fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = t.sunken; }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
                      <Icon name="inventory" size={14} />
                      {isAR ? 'السجل' : 'History'}
                    </button>
                    <button onClick={() => printBom(bom)}
                      style={{ height: 30, padding: '0 10px', borderRadius: 4, border: `1px solid ${t.border}`, background: 'transparent', cursor: 'pointer', color: t.fgSubtle, fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = t.sunken; e.currentTarget.style.color = t.fg; }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = t.fgSubtle; }}>
                      <Icon name="document" size={14} />
                      {isAR ? 'طباعة' : 'Print'}
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
                <div style={{ overflow: 'auto', maxHeight: 300 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 400 }}>
                    <thead>
                      <tr>
                        {[
                          isAR ? 'المكون'         : 'Component',
                          isAR ? 'الكمية المطلوبة' : 'Required',
                          isAR ? 'المخزون الحالي'  : 'In Stock',
                          isAR ? 'الحالة'          : 'Status',
                        ].map(h => (
                          <th key={h} style={{ padding: '5px 10px', textAlign: 'start', fontSize: 10, fontFamily: 'ui-monospace,monospace', textTransform: 'uppercase', letterSpacing: '0.06em', color: t.fgSubtle, borderBottom: `1px solid ${t.border}`, backgroundColor: t.sunken, position: 'sticky', top: 0, zIndex: 10 }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: company?.features?.projects ? '1fr 1fr 1fr' : '1fr 1fr', gap: 10 }}>
            <div>
              {lbl(isAR ? 'الاسم (عربي) *' : 'Name (AR) *')}
              <input required value={bomForm.name} onChange={e => setBomForm(p => ({ ...p, name: e.target.value }))} style={inp()} />
            </div>
            <div>
              {lbl(isAR ? 'الاسم (إنجليزي)' : 'Name (EN)')}
              <input value={bomForm.nameEn} onChange={e => setBomForm(p => ({ ...p, nameEn: e.target.value }))} style={inp()} />
            </div>
            {company?.features?.projects && (
              <div>
                {lbl(isAR ? 'المشروع المرتبط' : 'Linked Project')}
                <select value={bomForm.projectId} onChange={e => setBomForm(p => ({ ...p, projectId: e.target.value }))} style={inp()}>
                  <option value="">{isAR ? '— عام (بدون مشروع) —' : '— General (No Project) —'}</option>
                  {projects.filter(p => p.status === 'ACTIVE').map(p => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Output item */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
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

      {/* ── History Modal ──────────────────────────────────────────────────────── */}
      <Modal open={historyOpen} onClose={() => setHistoryOpen(false)} title={isAR ? 'سجل الإنتاج' : 'Production History'}>
        {historyLoading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ width: 22, height: 22, margin: '0 auto', borderRadius: '50%', border: `2px solid ${t.border}`, borderTopColor: primary, animation: 'spin 600ms linear infinite' }} />
          </div>
        ) : bomHistory.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: t.fgMuted, fontSize: 13 }}>
            {isAR ? 'لا يوجد سجل إنتاج.' : 'No production history yet.'}
          </div>
        ) : (
          <div style={{ maxHeight: '60vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {bomHistory.map(h => (
              <div key={h._id} style={{ padding: 12, border: `1px solid ${t.border}`, borderRadius: 4, backgroundColor: t.sunken }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <strong style={{ fontSize: 13, color: t.fg }}>
                    {isAR ? 'إنتاج:' : 'Produced:'} {h.qtyProduced} × {h.outputItemId?.name || ''}
                  </strong>
                  <span style={{ fontSize: 11, color: t.fgSubtle }}>
                    {new Date(h.createdAt).toLocaleString()}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: t.fgMuted, marginBottom: 8 }}>
                  {isAR ? 'بواسطة:' : 'By:'} {h.userId?.name || '—'}
                  {h.projectId && <span style={{ marginLeft: 8 }}>| {isAR ? 'المشروع:' : 'Project:'} {h.projectId?.name}</span>}
                </div>
                <div style={{ fontSize: 11, color: t.fg, padding: '6px 8px', backgroundColor: t.canvas, borderRadius: 4, border: `1px solid ${t.border}` }}>
                  <div style={{ marginBottom: 4, fontWeight: 600, color: t.fgSubtle }}>{isAR ? 'المكونات المستخدمة:' : 'Components Used:'}</div>
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {h.componentsUsed.map((c, i) => (
                      <li key={i}>{c.qty} × {c.itemId?.name || '—'}</li>
                    ))}
                  </ul>
                </div>
                {h.notes && (
                  <div style={{ marginTop: 6, fontSize: 11, color: t.fgSubtle, fontStyle: 'italic' }}>
                    "{h.notes}"
                  </div>
                )}
              </div>
            ))}
          </div>
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
