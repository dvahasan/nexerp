import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { T, inputStyle, labelStyle, btnPrimary, btnGhost, btnDanger, panelStyle, monoLabel } from '../theme';
import { api } from '../api';
import Icon from '../components/Icon';
import Confirm from '../components/Confirm';
import { StatusBadge } from './PurchaseOrders';

export default function PurchaseOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAR, theme, company, showToast, user } = useAppContext();
  const t = T[theme] || T.light;
  const primary = company?.primaryColor || '#3b82f6';

  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  // Receive form: { [lineId]: qty }, one warehouse for the whole receipt
  const [recvQty, setRecvQty] = useState({});
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseId, setWarehouseId] = useState('');

  const canReceive = user?.role === 'owner' || user?.perms?.canTxIn;
  const receivable = po && ['confirmed', 'partially_received'].includes(po.status);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getPurchaseOrder(id);
      setPo(data);
      const init = {};
      (data.lines || []).forEach(l => { init[l._id] = ''; });
      setRecvQty(init);
    } catch (e) {
      showToast(e.message || 'Error', 'error');
      navigate('/purchase-orders');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    api.getWarehouses().then(w => setWarehouses(Array.isArray(w) ? w : w.warehouses || [])).catch(() => {});
  }, []);

  const act = async (fn, okMsg) => {
    setBusy(true);
    try {
      await fn();
      showToast(okMsg, 'success');
      await load();
    } catch (e) {
      showToast(e.message || 'Error', 'error');
    } finally { setBusy(false); }
  };

  const handleReceive = () => {
    const lines = Object.entries(recvQty)
      .filter(([, q]) => Number(q) > 0)
      .map(([lineId, q]) => ({ lineId, qty: Number(q), ...(warehouseId ? { warehouseId } : {}) }));
    if (lines.length === 0) return;
    act(() => api.receivePurchaseOrder(id, { lines }), isAR ? 'تم استلام البضاعة' : 'Goods received');
  };

  if (loading || !po) {
    return <div style={{ padding: 60, textAlign: 'center', color: t.fgMuted }}>{isAR ? 'جار التحميل…' : 'Loading…'}</div>;
  }

  const itemName = (l) => {
    const it = l.itemId || {};
    return (isAR ? it.name : (it.nameEn || it.name)) || '—';
  };
  const totalCost = (po.lines || []).reduce((a, l) => a + l.orderedQty * (l.unitCost || 0), 0);
  const anyRecvInput = Object.values(recvQty).some(q => Number(q) > 0);

  const infoCell = (label, value) => (
    <div>
      <div style={monoLabel(t)}>{label}</div>
      <div style={{ color: t.fg, fontSize: 14, marginTop: 4 }}>{value || '—'}</div>
    </div>
  );

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Link to="/purchase-orders" style={{ color: t.fgMuted, fontSize: 13, textDecoration: 'none' }}>
            {isAR ? '→ أوامر الشراء' : '← Purchase Orders'}
          </Link>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: '6px 0 0', color: t.fg, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontFamily: 'ui-monospace, monospace' }}>{po.poNo}</span>
            <StatusBadge status={po.status} isAR={isAR} />
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {po.status === 'draft' && (
            <button onClick={() => act(() => api.confirmPurchaseOrder(id), isAR ? 'تم تأكيد أمر الشراء' : 'Purchase order confirmed')}
                    disabled={busy} style={btnPrimary(primary)}>
              <Icon name="check" size={15} /> {isAR ? 'تأكيد' : 'Confirm'}
            </button>
          )}
          {['draft', 'confirmed'].includes(po.status) && (
            <button onClick={() => setConfirmCancel(true)} disabled={busy} style={btnDanger(t)}>
              {isAR ? 'إلغاء الأمر' : 'Cancel PO'}
            </button>
          )}
        </div>
      </div>

      {/* Info panel */}
      <div style={{ ...panelStyle(t), padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
          {infoCell(isAR ? 'المورد' : 'Supplier', po.supplier?.name)}
          {infoCell(isAR ? 'تاريخ التوريد المتوقع' : 'Expected Date', po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : null)}
          {infoCell(isAR ? 'العملة' : 'Currency', po.currency)}
          {infoCell(isAR ? 'الإجمالي' : 'Total', `${totalCost.toLocaleString()} ${po.currency || ''}`)}
          {infoCell(isAR ? 'أنشئ بواسطة' : 'Created By', po.createdBy?.name)}
          {infoCell(isAR ? 'تاريخ الإنشاء' : 'Created', po.createdAt ? new Date(po.createdAt).toLocaleDateString() : null)}
        </div>
        {po.notes && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${t.border}` }}>
            {infoCell(isAR ? 'ملاحظات' : 'Notes', po.notes)}
          </div>
        )}
      </div>

      {/* Lines table */}
      <div style={{ ...panelStyle(t), overflow: 'auto', marginBottom: 20 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isAR ? 'right' : 'left' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${t.border}`, backgroundColor: t.sunken }}>
              <th style={{ padding: 12, color: t.fgMuted, fontSize: 12 }}>{isAR ? 'الصنف' : 'Item'}</th>
              <th style={{ padding: 12, color: t.fgMuted, fontSize: 12 }}>{isAR ? 'المطلوب' : 'Ordered'}</th>
              <th style={{ padding: 12, color: t.fgMuted, fontSize: 12 }}>{isAR ? 'المستلم' : 'Received'}</th>
              <th style={{ padding: 12, color: t.fgMuted, fontSize: 12 }}>{isAR ? 'المتبقي' : 'Remaining'}</th>
              <th style={{ padding: 12, color: t.fgMuted, fontSize: 12 }}>{isAR ? 'سعر الوحدة' : 'Unit Cost'}</th>
              {receivable && canReceive && (
                <th style={{ padding: 12, color: t.fgMuted, fontSize: 12 }}>{isAR ? 'استلام الآن' : 'Receive Now'}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {po.lines.map(l => {
              const remaining = l.orderedQty - l.receivedQty;
              return (
                <tr key={l._id} style={{ borderBottom: `1px solid ${t.border}` }}>
                  <td style={{ padding: 12, color: t.fg, fontWeight: 500 }}>
                    {itemName(l)}
                    {l.itemId?.sku && <span style={{ color: t.fgSubtle, fontSize: 12 }}> — {l.itemId.sku}</span>}
                  </td>
                  <td style={{ padding: 12, color: t.fg }}>{l.orderedQty}</td>
                  <td style={{ padding: 12, color: l.receivedQty > 0 ? '#16a34a' : t.fgMuted, fontWeight: 600 }}>{l.receivedQty}</td>
                  <td style={{ padding: 12, color: remaining > 0 ? t.fg : t.fgSubtle }}>{remaining}</td>
                  <td style={{ padding: 12, color: t.fgMuted }}>{(l.unitCost || 0).toLocaleString()}</td>
                  {receivable && canReceive && (
                    <td style={{ padding: 12 }}>
                      {remaining > 0 ? (
                        <input type="number" min="0" max={remaining} placeholder={`≤ ${remaining}`}
                               value={recvQty[l._id] ?? ''}
                               onChange={e => setRecvQty(q => ({ ...q, [l._id]: e.target.value }))}
                               style={{ ...inputStyle(t), width: 90, height: 30 }} />
                      ) : (
                        <span style={{ color: '#16a34a', fontSize: 12, fontWeight: 700 }}>✓</span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Receive action bar */}
      {receivable && canReceive && (
        <div style={{ ...panelStyle(t), padding: 16, display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 220 }}>
            <label style={labelStyle(t)}>{isAR ? 'المستودع (اختياري)' : 'Warehouse (optional)'}</label>
            <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} style={inputStyle(t)}>
              <option value="">{isAR ? '— بدون —' : '— none —'}</option>
              {warehouses.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
            </select>
          </div>
          <button onClick={handleReceive} disabled={busy || !anyRecvInput}
                  style={{ ...btnPrimary(primary), height: 34, opacity: busy || !anyRecvInput ? 0.6 : 1 }}>
            <Icon name="arrow_down" size={15} />
            {isAR ? 'استلام البضاعة' : 'Receive Goods'}
          </button>
          <span style={{ color: t.fgSubtle, fontSize: 12, alignSelf: 'center' }}>
            {isAR
              ? 'يُنشئ الاستلام حركة وارد (IN) وقيود دفتر الأستاذ تلقائياً'
              : 'Receiving creates IN transactions and ledger entries automatically'}
          </span>
        </div>
      )}

      <Confirm
        open={confirmCancel}
        title={isAR ? 'إلغاء أمر الشراء' : 'Cancel Purchase Order'}
        msg={isAR ? 'هل أنت متأكد من إلغاء هذا الأمر؟ لا يمكن التراجع.' : 'Are you sure you want to cancel this purchase order? This cannot be undone.'}
        onCancel={() => setConfirmCancel(false)}
        onConfirm={async () => {
          setConfirmCancel(false);
          await act(() => api.cancelPurchaseOrder(id), isAR ? 'تم إلغاء أمر الشراء' : 'Purchase order cancelled');
        }}
        loading={busy}
      />
    </div>
  );
}
