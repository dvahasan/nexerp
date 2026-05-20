import { useState, useEffect, useMemo } from 'react';
import Modal from '../components/Modal';
import { useAppContext } from '../context/AppContext';

const defaultForm = {
  itemId: '', type: 'IN', qty: '', source: '', dest: '',
  notes: '', date: new Date().toISOString().slice(0, 16),
};

export default function TxModal({ open, onClose, editTx = null }) {
  const { items, saveTx, t, isAR } = useAppContext();
  const [form,   setForm]   = useState(defaultForm);
  const [query,  setQuery]  = useState('');
  const [saving, setSaving] = useState(false);
  const [showDrop, setShowDrop] = useState(false);

  useEffect(() => {
    if (editTx) {
      setForm({
        itemId: editTx.itemId?._id || editTx.itemId || '',
        type:   editTx.type   || 'IN',
        qty:    editTx.qty    ?? '',
        source: editTx.source || '',
        dest:   editTx.dest   || '',
        notes:  editTx.notes  || '',
        date:   editTx.date ? new Date(editTx.date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
      });
      const item = items.find(i => i._id === (editTx.itemId?._id || editTx.itemId));
      setQuery(item ? (isAR ? item.name : (item.nameEn || item.name)) : '');
    } else {
      setForm(defaultForm);
      setQuery('');
    }
  }, [editTx, open]);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  // Filtered item list for combobox
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
    } catch {
      // error shown by context toast
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full bg-white dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm transition-all";
  const labelCls = "block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editTx ? t.editTransaction : t.addTransaction}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Item search combobox */}
        <div>
          <label className={labelCls}>{isAR ? 'الصنف' : 'Item'} *</label>
          <div className="relative">
            <input
              required
              className={inputCls}
              value={query}
              onChange={e => { setQuery(e.target.value); setShowDrop(true); if (!e.target.value) set('itemId', ''); }}
              onFocus={() => setShowDrop(true)}
              onBlur={() => setTimeout(() => setShowDrop(false), 200)}
              placeholder={isAR ? 'ابحث بالاسم أو الكود...' : 'Search by name or SKU...'}
              autoComplete="off"
            />
            {showDrop && filteredItems.length > 0 && (
              <ul className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl max-h-56 overflow-y-auto">
                {filteredItems.map(item => (
                  <li
                    key={item._id}
                    onMouseDown={() => handleItemSelect(item)}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                  >
                    {item.photo ? (
                      <img src={item.photo} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                        {isAR ? item.name : (item.nameEn || item.name)}
                      </div>
                      <div className="text-xs text-slate-400 font-mono">
                        {item.sku || '—'} • Qty: {item.qty}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {selectedItem && (
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className={`font-semibold ${selectedItem.qty === 0 ? 'text-red-500' : selectedItem.qty <= selectedItem.minThreshold ? 'text-yellow-500' : 'text-green-500'}`}>
                {isAR ? 'الكمية الحالية:' : 'Current Qty:'} {selectedItem.qty}
              </span>
            </div>
          )}
        </div>

        {/* Type + Qty */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>{isAR ? 'نوع الحركة' : 'Type'} *</label>
            <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
              {['IN', 'OUT'].map(tp => (
                <button
                  key={tp}
                  type="button"
                  onClick={() => set('type', tp)}
                  className={`flex-1 py-2.5 text-sm font-bold transition-all ${
                    form.type === tp
                      ? tp === 'IN'
                        ? 'bg-green-500 text-white shadow-inner'
                        : 'bg-red-500 text-white shadow-inner'
                      : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {tp === 'IN' ? (isAR ? '↓ وارد' : '↓ IN') : (isAR ? '↑ صادر' : '↑ OUT')}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>{t.qty} *</label>
            <input
              required
              type="number"
              min="1"
              className={inputCls}
              value={form.qty}
              onChange={e => set('qty', e.target.value)}
            />
          </div>
        </div>

        {/* Source / Destination */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>{t.source}</label>
            <input
              className={inputCls}
              value={form.source}
              onChange={e => set('source', e.target.value)}
              placeholder={isAR ? 'المورد، المستودع...' : 'Supplier, warehouse...'}
            />
          </div>
          <div>
            <label className={labelCls}>{t.destination}</label>
            <input
              className={inputCls}
              value={form.dest}
              onChange={e => set('dest', e.target.value)}
              placeholder={isAR ? 'العميل، الفرع...' : 'Customer, branch...'}
            />
          </div>
        </div>

        {/* Date */}
        <div>
          <label className={labelCls}>{t.date}</label>
          <input
            type="datetime-local"
            className={inputCls}
            value={form.date}
            onChange={e => set('date', e.target.value)}
          />
        </div>

        {/* Notes */}
        <div>
          <label className={labelCls}>{t.notes}</label>
          <textarea
            rows={2}
            className={`${inputCls} resize-none`}
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder={isAR ? 'ملاحظات إضافية...' : 'Additional notes...'}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            {t.cancel}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 transition-all shadow-lg shadow-purple-500/30 flex items-center gap-2 disabled:opacity-70"
          >
            {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {t.save}
          </button>
        </div>
      </form>
    </Modal>
  );
}
