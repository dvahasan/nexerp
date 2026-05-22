import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { api } from '../api';
import Icon from '../components/Icon';
import TxModal from './TxModal';
import Confirm from '../components/Confirm';
import InfiniteScrollTrigger from '../components/InfiniteScrollTrigger';

const LIMIT = 20;

export default function Transactions() {
  const { t, isAR, user, users, removeTx, saveTx } = useAppContext();
  const canSeeAll = user?.role === 'owner' || user?.role === 'admin';

  const [search, setSearch] = useState('');
  const [typeF,  setTypeF]  = useState('all');
  const [userF,  setUserF]  = useState('');
  const [fromF,  setFromF]  = useState('');
  const [toF,    setToF]    = useState('');
  const [page,   setPage]   = useState(1);

  const [data,     setData]     = useState({ txs: [], total: 0, pages: 1 });
  const [fetching, setFetching] = useState(true);

  const [txModal,      setTxModal]      = useState(false);
  const [editTx,       setEditTx]       = useState(null);
  const [confirmOpen,  setConfirmOpen]  = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  // Single effect: whenever page/typeF/search change, fetch
  useEffect(() => {
    let cancelled = false;
    setFetching(true);
    const params = { page, limit: LIMIT };
    if (typeF !== 'all') params.type = typeF;
    if (userF) params.user = userF;
    if (fromF) params.from = fromF;
    if (toF) params.to = toF;
    api.getTxs(params)
      .then(res => { 
        if (!cancelled) {
          if (page === 1) setData(res);
          else {
            setData(prev => {
              const prevArr = Array.isArray(prev) ? prev : (prev.txs || []);
              const newArr = Array.isArray(res) ? res : (res.txs || []);
              return { ...res, txs: [...prevArr, ...newArr] };
            });
          }
        } 
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setFetching(false); });
    return () => { cancelled = true; };
  }, [page, typeF, userF, fromF, toF]);

  // Reset page to 1 when filters change
  useEffect(() => { setPage(1); }, [typeF, userF, fromF, toF]);

  const refetch = () => {
    setFetching(true);
    const params = { page, limit: LIMIT };
    if (typeF !== 'all') params.type = typeF;
    if (userF) params.user = userF;
    if (fromF) params.from = fromF;
    if (toF) params.to = toF;
    api.getTxs(params)
      .then(res => setData(res))
      .catch(() => {})
      .finally(() => setFetching(false));
  };

  const openRecord = ()    => { setEditTx(null); setTxModal(true); };
  const openEdit   = (tx)  => { setEditTx(tx);   setTxModal(true); };
  const confirmDel = (tx)  => { setDeleteTarget(tx); setConfirmOpen(true); };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await removeTx(deleteTarget._id);
      setConfirmOpen(false);
      refetch();
    } catch { /* toast handled */ }
    finally { setDeleting(false); }
  };

  const handleSaved = () => refetch();

  // Normalise: API may return {txs,total,pages} or a plain array (old backend)
  const txList = Array.isArray(data) ? data : (data.txs || []);

  // Client-side search filter on the current page's rows
  const q = search.toLowerCase();
  const visibleTxs = q
    ? txList.filter(tx =>
        (tx.itemId?.name   || '').toLowerCase().includes(q) ||
        (tx.itemId?.nameEn || '').toLowerCase().includes(q) ||
        (tx.source  || '').toLowerCase().includes(q) ||
        (tx.dest    || '').toLowerCase().includes(q) ||
        (tx.userName|| '').toLowerCase().includes(q)
      )
    : txList;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
          {t.transactions}
          <span className="ml-2 text-base font-normal text-slate-400">({data.total})</span>
        </h1>
        {user?.perms?.canTx && (
          <button
            onClick={openRecord}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 border border-purple-500"
          >
            <Icon name="add" size={20} /> {t.addTransaction}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col md:flex-row flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Icon name="search" size={18} className={`absolute top-1/2 -translate-y-1/2 ${isAR ? 'right-3' : 'left-3'} text-slate-400 pointer-events-none`} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={isAR ? 'ابحث عن الصنف، المصدر، الوجهة...' : 'Search item, source, destination...'}
            className={`w-full bg-white dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-white rounded-xl ${isAR ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors text-sm`}
          />
        </div>
        <select
          value={typeF} onChange={e => setTypeF(e.target.value)}
          className="w-full md:w-auto bg-white dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
        >
          <option value="all">{isAR ? 'جميع الحركات' : 'All Types'}</option>
          <option value="IN">↓ {isAR ? 'وارد' : 'Stock IN'}</option>
          <option value="OUT">↑ {isAR ? 'صادر' : 'Stock OUT'}</option>
        </select>

        {(user?.role === 'owner' || user?.role === 'admin') && (
          <select
            value={userF} onChange={e => setUserF(e.target.value)}
            className="w-full md:w-auto bg-white dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
          >
            <option value="">{isAR ? 'جميع المستخدمين' : 'All Users'}</option>
            {users.map(u => (
              <option key={u._id} value={u._id}>{u.name}</option>
            ))}
          </select>
        )}

        <input 
          type="date"
          value={fromF}
          onChange={e => setFromF(e.target.value)}
          className="w-full md:w-auto bg-white dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
        />
        <input 
          type="date"
          value={toF}
          onChange={e => setToF(e.target.value)}
          className="w-full md:w-auto bg-white dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-4 px-4 font-semibold w-12 text-center">#</th>
                <th className="py-4 px-4 font-semibold">{isAR ? 'التاريخ' : 'Date'}</th>
                <th className="py-4 px-4 font-semibold">{isAR ? 'النوع' : 'Type'}</th>
                <th className="py-4 px-4 font-semibold">{isAR ? 'الصنف' : 'Item'}</th>
                <th className="py-4 px-4 font-semibold">{isAR ? 'الكمية' : 'Qty'}</th>
                <th className="py-4 px-4 font-semibold hidden md:table-cell">{isAR ? 'المصدر/الوجهة' : 'Source/Dest'}</th>
                {canSeeAll && (
                  <th className="py-4 px-4 font-semibold hidden lg:table-cell">{isAR ? 'المستخدم' : 'User'}</th>
                )}
                {(user?.role === 'owner' || user?.role === 'admin') && (
                  <th className="py-4 px-4 font-semibold text-right">{isAR ? 'إجراءات' : 'Actions'}</th>
                )}
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100 dark:divide-slate-700/50">
              {fetching ? (
                <tr>
                  <td colSpan="8" className="py-16 text-center">
                    <div className="w-8 h-8 border-2 border-slate-200 dark:border-slate-700 border-t-purple-500 rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : visibleTxs.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-500 dark:text-slate-400">
                    {isAR ? 'لا توجد حركات مطابقة' : 'No transactions match your search'}
                  </td>
                </tr>
              ) : (
                visibleTxs.map((tx, idx) => (
                  <tr key={tx._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    {/* Row number */}
                    <td className="py-3.5 px-4 text-center text-xs font-mono text-slate-400 dark:text-slate-500">
                      {(page - 1) * LIMIT + idx + 1}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap text-xs">
                      {new Date(tx.date).toLocaleDateString(isAR ? 'ar-EG' : 'en-US', {
                        year: 'numeric', month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                        tx.type === 'IN'
                          ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                      }`}>
                        {tx.type === 'IN' ? '↓ IN' : '↑ OUT'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                      {isAR ? (tx.itemId?.name || '—') : (tx.itemId?.nameEn || tx.itemId?.name || '—')}
                    </td>
                    <td className="py-3.5 px-4 font-black text-slate-700 dark:text-slate-300">
                      {tx.qty}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 hidden md:table-cell text-xs">
                      <div className="flex flex-col gap-0.5">
                        {tx.source && <span>▲ {tx.source}</span>}
                        {tx.dest   && <span>▼ {tx.dest}</span>}
                        {!tx.source && !tx.dest && '—'}
                      </div>
                    </td>
                    {canSeeAll && (
                      <td className="py-3.5 px-4 hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                            {tx.userName?.charAt(0)?.toUpperCase()}
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400">{tx.userName}</span>
                        </div>
                      </td>
                    )}
                    {(user?.role === 'owner' || user?.role === 'admin') && (
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => openEdit(tx)}
                            className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded transition-colors"
                            title={t.edit}
                          >
                            <Icon name="edit" size={15} />
                          </button>
                          <button
                            onClick={() => confirmDel(tx)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors"
                            title={t.delete}
                          >
                            <Icon name="delete" size={15} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      {/* Infinite Scroll */}
      <InfiniteScrollTrigger 
        hasMore={data.total ? (page * LIMIT < data.total) : false} 
        onVisible={() => setPage(p => p + 1)} 
      />
      </div>

      {/* Modals */}
      <TxModal
        open={txModal}
        onClose={() => { setTxModal(false); setEditTx(null); }}
        editTx={editTx}
        onSaved={handleSaved}
      />
      <Confirm
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        loading={deleting}
        message={isAR ? 'هل تريد حذف هذه الحركة؟ سيتم عكس تأثيرها على المخزون.' : 'Delete this transaction? Stock levels will be reversed.'}
      />
    </div>
  );
}
