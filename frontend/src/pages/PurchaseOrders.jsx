import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { T, inputStyle, labelStyle, btnPrimary, btnGhost } from '../theme';
import { api } from '../api';
import Icon from '../components/Icon';
import Modal from '../components/Modal';

export const PO_STATUS_META = {
  draft:              { en: 'Draft',              ar: 'مسودة',          color: '#6b7280' },
  confirmed:          { en: 'Confirmed',          ar: 'مؤكد',           color: '#3b82f6' },
  partially_received: { en: 'Partially Received', ar: 'مستلم جزئياً',   color: '#d97706' },
  received:           { en: 'Received',           ar: 'مستلم',          color: '#16a34a' },
  cancelled:          { en: 'Cancelled',          ar: 'ملغي',           color: '#b91c1c' },
};

export function StatusBadge({ status, isAR }) {
  const meta = PO_STATUS_META[status] || PO_STATUS_META.draft;
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 999,
      fontSize: 11, fontWeight: 700, color: meta.color,
      backgroundColor: `${meta.color}1a`, border: `1px solid ${meta.color}40`,
      whiteSpace: 'nowrap',
    }}>
      {isAR ? meta.ar : meta.en}
    </span>
  );
}

const emptyLine = () => ({ itemId: '', orderedQty: 1, unitCost: 0 });

export default function PurchaseOrders() {
  const { isAR, theme, company, showToast } = useAppContext();
  const t = T[theme] || T.light;
  const primary = company?.primaryColor || '#3b82f6';
  const navigate = useNavigate();

  const [pos, setPos] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  // Create modal
  const [modalOpen, setModalOpen] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ supplier: '', expectedDate: '', currency: '', notes: '', lines: [emptyLine()] });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getPurchaseOrders({ page, status });
      setPos(res.pos || []);
      setTotal(res.total || 0);
      setPages(res.pages || 1);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [page, status]);

  const openCreate = async () => {
    setForm({ supplier: '', expectedDate: '', currency: '', notes: '', lines: [emptyLine()] });
    setModalOpen(true);
    try {
      const [src, its] = await Promise.all([api.getSources(), api.getItems()]);
      setSuppliers(Array.isArray(src) ? src : src.sources || []);
      setItems(Array.isArray(its) ? its : its.items || []);
    } catch (e) { showToast(e.message || 'Error', 'error'); }
  };

  const setLine = (i, patch) =>
    setForm(f => ({ ...f, lines: f.lines.map((l, idx) => idx === i ? { ...l, ...patch } : l) }));

  const validLines = form.lines.filter(l => l.itemId && Number(l.orderedQty) > 0);
  const canSave = form.supplier && validLines.length > 0 && validLines.length === form.lines.length;

  const handleCreate = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const po = await api.addPurchaseOrder({
        supplier: form.supplier,
        expectedDate: form.expectedDate || undefined,
        currency: form.currency,
        notes: form.notes,
        lines: form.lines.map(l => ({ itemId: l.itemId, orderedQty: Number(l.orderedQty), unitCost: Number(l.unitCost) || 0 })),
      });
      setModalOpen(false);
      showToast(isAR ? 'تم إنشاء أمر الشراء' : 'Purchase order created', 'success');
      navigate(`/purchase-orders/${po._id}`);
    } catch (e) {
      showToast(e.message || 'Error', 'error');
    } finally { setSaving(false); }
  };

  const itemLabel = (it) => (isAR ? it.name : (it.nameEn || it.name)) + (it.sku ? ` — ${it.sku}` : '');

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: t.fg }}>
            {isAR ? 'أوامر الشراء' : 'Purchase Orders'}
          </h1>
          <p style={{ color: t.fgMuted, margin: '4px 0 0', fontSize: 14 }}>
            {isAR ? 'إدارة المشتريات واستلام البضائع من الموردين' : 'Manage procurement and goods receipts from suppliers'}
          </p>
        </div>
        <button onClick={openCreate} style={{ ...btnPrimary(primary), height: 36 }}>
          <Icon name="add" size={18} /> {isAR ? 'أمر شراء جديد' : 'New Purchase Order'}
        </button>
      </div>

      {/* Status filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {['all', ...Object.keys(PO_STATUS_META)].map(s => {
          const active = status === s;
          const label = s === 'all' ? (isAR ? 'الكل' : 'All') : (isAR ? PO_STATUS_META[s].ar : PO_STATUS_META[s].en);
          return (
            <button key={s} onClick={() => { setStatus(s); setPage(1); }} style={{
              padding: '5px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: `1px solid ${active ? primary : t.border}`,
              backgroundColor: active ? `${primary}14` : 'transparent',
              color: active ? primary : t.fgMuted,
            }}>
              {label}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div style={{ backgroundColor: t.elev, borderRadius: 4, border: `1px solid ${t.border}`, overflow: 'auto' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: t.fgMuted }}>{isAR ? 'جار التحميل…' : 'Loading…'}</div>
        ) : pos.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: t.fgMuted }}>
            {isAR ? 'لا توجد أوامر شراء' : 'No purchase orders yet'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isAR ? 'right' : 'left' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${t.border}`, backgroundColor: t.sunken }}>
                <th style={{ padding: 12, color: t.fgMuted, fontSize: 12 }}>{isAR ? 'رقم الأمر' : 'PO #'}</th>
                <th style={{ padding: 12, color: t.fgMuted, fontSize: 12 }}>{isAR ? 'المورد' : 'Supplier'}</th>
                <th style={{ padding: 12, color: t.fgMuted, fontSize: 12 }}>{isAR ? 'الحالة' : 'Status'}</th>
                <th style={{ padding: 12, color: t.fgMuted, fontSize: 12 }}>{isAR ? 'البنود' : 'Lines'}</th>
                <th style={{ padding: 12, color: t.fgMuted, fontSize: 12 }}>{isAR ? 'الإجمالي' : 'Total'}</th>
                <th style={{ padding: 12, color: t.fgMuted, fontSize: 12 }}>{isAR ? 'تاريخ التوريد' : 'Expected'}</th>
              </tr>
            </thead>
            <tbody>
              {pos.map(po => {
                const totalCost = (po.lines || []).reduce((a, l) => a + l.orderedQty * (l.unitCost || 0), 0);
                return (
                  <tr key={po._id}
                      onClick={() => navigate(`/purchase-orders/${po._id}`)}
                      style={{ borderBottom: `1px solid ${t.border}`, cursor: 'pointer' }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = t.sunken; }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
                    <td style={{ padding: 12, color: t.fg, fontWeight: 600, fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{po.poNo}</td>
                    <td style={{ padding: 12, color: t.fg }}>{po.supplier?.name || '—'}</td>
                    <td style={{ padding: 12 }}><StatusBadge status={po.status} isAR={isAR} /></td>
                    <td style={{ padding: 12, color: t.fgMuted }}>{po.lines?.length || 0}</td>
                    <td style={{ padding: 12, color: t.fg }}>{totalCost.toLocaleString()} {po.currency}</td>
                    <td style={{ padding: 12, color: t.fgSubtle, fontSize: 13 }}>
                      {po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16, alignItems: 'center' }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ ...btnGhost(t), opacity: page <= 1 ? 0.5 : 1 }}>
            {isAR ? 'السابق' : 'Prev'}
          </button>
          <span style={{ color: t.fgMuted, fontSize: 13 }}>{page} / {pages} — {total}</span>
          <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} style={{ ...btnGhost(t), opacity: page >= pages ? 0.5 : 1 }}>
            {isAR ? 'التالي' : 'Next'}
          </button>
        </div>
      )}

      {/* Create modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={isAR ? 'أمر شراء جديد' : 'New Purchase Order'} wide>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: 'span 1' }}>
              <label style={labelStyle(t)}>{isAR ? 'المورد' : 'Supplier'}</label>
              <select value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} style={inputStyle(t)}>
                <option value="">{isAR ? '— اختر —' : '— select —'}</option>
                {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle(t)}>{isAR ? 'تاريخ التوريد المتوقع' : 'Expected Date'}</label>
              <input type="date" value={form.expectedDate} onChange={e => setForm({ ...form, expectedDate: e.target.value })} style={inputStyle(t)} />
            </div>
            <div>
              <label style={labelStyle(t)}>{isAR ? 'العملة' : 'Currency'}</label>
              <input value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} placeholder="USD" style={inputStyle(t)} />
            </div>
          </div>

          {/* Lines */}
          <div>
            <label style={labelStyle(t)}>{isAR ? 'البنود' : 'Lines'}</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {form.lines.map((line, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 110px 110px 34px', gap: 8, alignItems: 'center' }}>
                  <select value={line.itemId} onChange={e => setLine(i, { itemId: e.target.value })} style={inputStyle(t)}>
                    <option value="">{isAR ? '— الصنف —' : '— item —'}</option>
                    {items.map(it => <option key={it._id} value={it._id}>{itemLabel(it)}</option>)}
                  </select>
                  <input type="number" min="1" value={line.orderedQty} title={isAR ? 'الكمية' : 'Quantity'}
                         onChange={e => setLine(i, { orderedQty: e.target.value })} style={inputStyle(t)} />
                  <input type="number" min="0" step="0.01" value={line.unitCost} title={isAR ? 'سعر الوحدة' : 'Unit cost'}
                         onChange={e => setLine(i, { unitCost: e.target.value })} style={inputStyle(t)} />
                  <button onClick={() => setForm(f => ({ ...f, lines: f.lines.filter((_, idx) => idx !== i) }))}
                          disabled={form.lines.length === 1}
                          style={{ background: 'none', border: 'none', color: form.lines.length === 1 ? t.fgSubtle : t.neg, cursor: 'pointer', padding: 4 }}>
                    <Icon name="delete" size={16} />
                  </button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <button onClick={() => setForm(f => ({ ...f, lines: [...f.lines, emptyLine()] }))}
                      style={{ background: 'none', border: 'none', color: primary, cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0 }}>
                + {isAR ? 'إضافة بند' : 'Add line'}
              </button>
              <span style={{ color: t.fgMuted, fontSize: 13 }}>
                {isAR ? 'الإجمالي:' : 'Total:'}{' '}
                <b style={{ color: t.fg }}>
                  {form.lines.reduce((a, l) => a + (Number(l.orderedQty) || 0) * (Number(l.unitCost) || 0), 0).toLocaleString()} {form.currency}
                </b>
              </span>
            </div>
          </div>

          <div>
            <label style={labelStyle(t)}>{isAR ? 'ملاحظات' : 'Notes'}</label>
            <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={inputStyle(t)} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={() => setModalOpen(false)} style={btnGhost(t)}>{isAR ? 'إلغاء' : 'Cancel'}</button>
            <button onClick={handleCreate} disabled={!canSave || saving}
                    style={{ ...btnPrimary(primary), opacity: !canSave || saving ? 0.6 : 1 }}>
              {saving ? (isAR ? 'جار الحفظ…' : 'Saving…') : (isAR ? 'إنشاء المسودة' : 'Create Draft')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
