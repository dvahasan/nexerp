import { useState, useEffect, useMemo } from 'react';
import Modal from '../components/Modal';
import { useAppContext } from '../context/AppContext';
import { T } from '../theme';

const defaultForm = {
  itemId: '', type: 'IN', qty: '', source: '', dest: '',
  notes: '', date: new Date().toISOString().slice(0, 16),
};

export default function TxModal({ open, onClose, editTx = null, onSaved, forcedType = null }) {
  const { items, saveTx, t: tr, isAR, theme, company } = useAppContext();
  const t = T[theme] || T.light;
  const primary = company?.primaryColor || '#3b82f6';

  const [form,     setForm]     = useState({ ...defaultForm, type: forcedType || 'IN' });
  const [query,    setQuery]    = useState('');
  const [saving,   setSaving]   = useState(false);
  const [showDrop, setShowDrop] = useState(false);
  const [focused,  setFocused]  = useState('');

  useEffect(() => {
    if (editTx) {
      setForm({
        itemId: editTx.itemId?._id || editTx.itemId || '',
        type:   forcedType || editTx.type || 'IN',
        qty:    editTx.qty    ?? '',
        source: editTx.source || '',
        dest:   editTx.dest   || '',
        notes:  editTx.notes  || '',
        date:   editTx.date
          ? new Date(editTx.date).toISOString().slice(0, 16)
          : new Date().toISOString().slice(0, 16),
      });
      const item = items.find(i => i._id === (editTx.itemId?._id || editTx.itemId));
      setQuery(item ? (isAR ? item.name : (item.nameEn || item.name)) : '');
    } else {
      setForm({ ...defaultForm, type: forcedType || 'IN' });
      setQuery('');
    }
  }, [editTx, open, forcedType]);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const filteredItems = useMemo(() => {
    if (!query) return items.slice(0, 20);
    const q = query.toLowerCase();
    return items.filter(i =>
      i.name.toLowerCase().includes(q) ||
      (i.nameEn || '').toLowerCase().includes(q) ||
      (i.sku || '').toLowerCase().includes(q)
    ).slice(0, 20);
  }, [items, query]);

  const selectedItem = items.find(i => i._id === form.itemId);

  const handleItemSelect = (item) => {
    setForm(prev => ({ ...prev, itemId: item._id }));
    setQuery(isAR ? item.name : (item.nameEn || item.name));
    setShowDrop(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.itemId) return;
    setSaving(true);
    try {
      await saveTx({
        ...form,
        qty:  parseInt(form.qty) || 0,
        date: form.date ? new Date(form.date) : new Date(),
      }, editTx?._id);
      onClose();
      onSaved?.();
    } catch { /* toast shown */ }
    finally { setSaving(false); }
  };

  // ── style helpers
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

  return (
    <Modal open={open} onClose={onClose} title={editTx ? tr.editTransaction : tr.addTransaction}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Item search combobox */}
        <div>
          {lbl(`${isAR ? 'الصنف' : 'Item'} *`)}
          <div style={{ position: 'relative' }}>
            <input
              required
              value={query}
              onChange={e => { setQuery(e.target.value); setShowDrop(true); if (!e.target.value) set('itemId', ''); }}
              onFocus={() => { setFocused('item'); setShowDrop(true); }}
              onBlur={() => { setTimeout(() => setShowDrop(false), 200); setFocused(''); }}
              placeholder={isAR ? 'ابحث بالاسم أو الكود...' : 'Search by name or SKU...'}
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
                      <div style={{ fontSize: 10, color: t.fgSubtle, fontFamily: 'ui-monospace, monospace' }}>
                        {item.sku || '—'} · Qty: {item.qty}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
            </div>
          )}
        </div>

        {/* Type + Qty */}
        <div style={{ display: 'grid', gridTemplateColumns: forcedType ? '1fr' : '1fr 1fr', gap: 12 }}>
          {/* Type selector — hidden when forcedType locks it */}
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
          {/* Forced type badge */}
          {forcedType && (
            <div style={{ display: 'none' }} />
          )}
          <div>
            {lbl(`${tr.qty} *`)}
            <input required type="number" min="1" value={form.qty} onChange={e => set('qty', e.target.value)}
              style={inp('qty')} onFocus={() => setFocused('qty')} onBlur={() => setFocused('')} />
          </div>
        </div>

        {/* Source / Destination */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            {lbl(tr.source)}
            <input value={form.source} onChange={e => set('source', e.target.value)}
              placeholder={isAR ? 'المورد، المستودع...' : 'Supplier, warehouse...'}
              style={inp('source')} onFocus={() => setFocused('source')} onBlur={() => setFocused('')} />
          </div>
          <div>
            {lbl(tr.destination)}
            <input value={form.dest} onChange={e => set('dest', e.target.value)}
              placeholder={isAR ? 'العميل، الفرع...' : 'Customer, branch...'}
              style={inp('dest')} onFocus={() => setFocused('dest')} onBlur={() => setFocused('')} />
          </div>
        </div>

        {/* Date */}
        <div>
          {lbl(tr.date)}
          <input type="datetime-local" value={form.date} onChange={e => set('date', e.target.value)}
            style={inp('date')} onFocus={() => setFocused('date')} onBlur={() => setFocused('')} />
        </div>

        {/* Notes */}
        <div>
          {lbl(tr.notes)}
          <textarea
            rows={2}
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder={isAR ? 'ملاحظات إضافية...' : 'Additional notes...'}
            style={{
              ...inp('notes', { height: 'auto', padding: '8px 10px', resize: 'vertical' }),
            }}
            onFocus={() => setFocused('notes')}
            onBlur={() => setFocused('')}
          />
        </div>

        {/* Actions */}
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
  );
}
