import { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import Icon from '../components/Icon';
import ItemModal from './ItemModal';
import TxModal from './TxModal';
import Confirm from '../components/Confirm';

export default function Inventory() {
  const { items, depts, cats, loading, t, isAR, company, user, removeItem } = useAppContext();

  const [search, setSearch] = useState('');
  const [deptF,  setDeptF]  = useState('all');
  const [stF,    setStF]    = useState('all');

  // Modal state
  const [itemModal, setItemModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);   // item being edited

  const [txModal, setTxModal] = useState(false);
  const [txItem, setTxItem]   = useState(null);         // pre-selected item for quick TX

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(i => {
      const matchQ = !q || i.name.toLowerCase().includes(q)
        || (i.nameEn || '').toLowerCase().includes(q)
        || (i.sku    || '').toLowerCase().includes(q)
        || (i.barcode|| '').includes(q);
      const dId   = i.deptId?._id || i.deptId;
      const matchD = deptF === 'all' || dId === deptF;
      const matchS = stF === 'all'
        || (stF === 'low' && i.qty > 0 && i.qty <= i.minThreshold)
        || (stF === 'out' && i.qty === 0)
        || (stF === 'ok'  && i.qty > i.minThreshold);
      return matchQ && matchD && matchS;
    });
  }, [items, search, deptF, stF]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-10 h-10 border-4 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  const getStatus = (i) => {
    if (i.qty === 0) return { label: isAR ? 'نفذت' : 'Out',  color: 'bg-red-500',    text: 'text-red-500',    bg: 'bg-red-50 dark:bg-red-500/10' };
    if (i.minThreshold > 0 && i.qty <= i.minThreshold)
      return { label: isAR ? 'منخفض' : 'Low', color: 'bg-yellow-500', text: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-500/10' };
    return   { label: isAR ? 'متوفر' : 'OK',   color: 'bg-green-500',  text: 'text-green-500',  bg: 'bg-green-50 dark:bg-green-500/10' };
  };

  const openAdd  = ()     => { setEditTarget(null); setItemModal(true); };
  const openEdit = (item) => { setEditTarget(item);  setItemModal(true); };
  const openTx   = (item) => { setTxItem(item);      setTxModal(true);  };

  const confirmDelete = (item) => { setDeleteTarget(item); setConfirmOpen(true); };
  const handleDelete  = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await removeItem(deleteTarget._id); setConfirmOpen(false); }
    catch { /* toast shown by context */ }
    finally { setDeleting(false); }
  };

  const currencySymbol = company?.baseCurrency || '';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
          {t.inventory}
          <span className="ml-2 text-base font-normal text-slate-400">({filtered.length})</span>
        </h1>
        <div className="flex gap-2">
          {user?.perms?.canAdd && (
            <button
              onClick={openAdd}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/30"
            >
              <Icon name="add" size={20} /> {t.addItem}
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Icon name="search" size={18} className="absolute top-1/2 -translate-y-1/2 left-3 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={isAR ? 'ابحث بالاسم، SKU، أو الباركود...' : 'Search by name, SKU, or barcode...'}
            className="w-full bg-white dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-white rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
          />
        </div>
        <div className="flex gap-2 md:w-auto w-full">
          <select
            value={deptF} onChange={e => setDeptF(e.target.value)}
            className="flex-1 md:w-44 bg-white dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">{isAR ? 'جميع الأقسام' : 'All Depts'}</option>
            {depts.map(d => <option key={d._id} value={d._id}>{isAR ? d.name : (d.nameEn || d.name)}</option>)}
          </select>
          <select
            value={stF} onChange={e => setStF(e.target.value)}
            className="flex-1 md:w-36 bg-white dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">{isAR ? 'الجميع' : 'All'}</option>
            <option value="ok">✅ {isAR ? 'متوفر' : 'OK'}</option>
            <option value="low">⚠️ {isAR ? 'منخفض' : 'Low'}</option>
            <option value="out">🔴 {isAR ? 'نفد' : 'Out'}</option>
          </select>
        </div>
      </div>

      {/* Item grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filtered.length === 0 && (
          <div className="col-span-full py-20 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
            {isAR ? 'لا توجد أصناف مطابقة للبحث' : 'No items match your search'}
          </div>
        )}

        {filtered.map(item => {
          const dept = depts.find(d => d._id === (item.deptId?._id || item.deptId));
          const st   = getStatus(item);

          return (
            <div
              key={item._id}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
              onClick={() => openEdit(item)}
            >
              {/* Photo */}
              <div className="h-44 bg-slate-100 dark:bg-slate-900 relative flex items-center justify-center overflow-hidden">
                {item.photo ? (
                  <img
                    src={item.photo.startsWith('/') ? `http://localhost:5000${item.photo}` : item.photo}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <Icon name="image" size={56} className="text-slate-300 dark:text-slate-700" />
                )}
                {dept && (
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold text-white shadow-sm" style={{ backgroundColor: dept.color }}>
                    {isAR ? dept.name : (dept.nameEn || dept.name)}
                  </div>
                )}
                <div className={`absolute top-3 right-3 w-3 h-3 rounded-full shadow-sm ring-2 ring-white dark:ring-slate-800 ${st.color}`} />
                {item.photos?.length > 1 && (
                  <div className="absolute bottom-2 right-2 text-xs bg-black/50 text-white px-2 py-0.5 rounded-full">
                    +{item.photos.length - 1}
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="p-4">
                <div className="mb-3">
                  <h3 className="font-bold text-slate-800 dark:text-white truncate text-sm">
                    {isAR ? item.name : (item.nameEn || item.name)}
                  </h3>
                  {item.datasheet && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-mono">#{item.datasheet}</p>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-1.5 mb-3">
                  <div className={`rounded-lg p-1.5 text-center ${st.bg}`}>
                    <div className="text-[9px] uppercase font-bold text-slate-400">{isAR ? 'كمية' : 'Qty'}</div>
                    <div className={`text-sm font-black ${st.text}`}>{item.qty}</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-1.5 text-center">
                    <div className="text-[9px] uppercase font-bold text-slate-400">{isAR ? 'سعر' : 'Price'}</div>
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300">{currencySymbol}{item.price}</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-1.5 text-center overflow-hidden">
                    <div className="text-[9px] uppercase font-bold text-slate-400">SKU</div>
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate">{item.sku || '—'}</div>
                  </div>
                </div>

                {item.minThreshold > 0 && (
                  <div className="w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-3">
                    <div
                      className={`h-full rounded-full ${st.color}`}
                      style={{ width: `${Math.min(100, (item.qty / Math.max(item.minThreshold * 3, 1)) * 100)}%` }}
                    />
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700/50">
                  <span className="text-xs font-mono text-slate-400 truncate w-20">{item.barcode || '—'}</span>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    {user?.perms?.canTx && (
                      <button
                        onClick={() => openTx(item)}
                        title={isAR ? 'تسجيل حركة' : 'Record Transaction'}
                        className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                      >
                        <Icon name="swap" size={17} />
                      </button>
                    )}
                    {user?.perms?.canEdit && (
                      <button
                        onClick={() => openEdit(item)}
                        title={t.edit}
                        className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg transition-colors"
                      >
                        <Icon name="edit" size={17} />
                      </button>
                    )}
                    {user?.perms?.canDelete && (
                      <button
                        onClick={() => confirmDelete(item)}
                        title={t.delete}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Icon name="delete" size={17} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modals */}
      <ItemModal
        open={itemModal}
        onClose={() => { setItemModal(false); setEditTarget(null); }}
        editItem={editTarget}
      />

      <TxModal
        open={txModal}
        onClose={() => { setTxModal(false); setTxItem(null); }}
        editTx={txItem ? { itemId: txItem } : null}
      />

      <Confirm
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        loading={deleting}
        message={isAR
          ? `هل تريد حذف "${deleteTarget?.name}"؟ لا يمكن التراجع.`
          : `Delete "${deleteTarget?.nameEn || deleteTarget?.name}"? This cannot be undone.`}
      />
    </div>
  );
}
