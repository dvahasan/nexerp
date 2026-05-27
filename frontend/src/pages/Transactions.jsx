import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { T, inputStyle } from '../theme';
import { api } from '../api';
import Icon from '../components/Icon';
import TxModal from './TxModal';
import Confirm from '../components/Confirm';
import InfiniteScrollTrigger from '../components/InfiniteScrollTrigger';

const LIMIT = 20;

export default function Transactions() {
  const { t: tr, isAR, user, users, removeTx, theme, company, liveTx, socketStatus } = useAppContext();
  const t = T[theme] || T.light;
  const primary = company?.primaryColor || '#3b82f6';

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
  const [focused,      setFocused]      = useState('');

  useEffect(() => {
    let cancelled = false;
    setFetching(true);
    const params = { page, limit: LIMIT };
    if (typeF !== 'all') params.type = typeF;
    if (userF) params.user = userF;
    if (fromF) params.from = fromF;
    if (toF)   params.to   = toF;
    api.getTxs(params)
      .then(res => {
        if (!cancelled) {
          if (page === 1) setData(res);
          else {
            setData(prev => {
              const prevArr = Array.isArray(prev) ? prev : (prev.txs || []);
              const newArr  = Array.isArray(res)  ? res  : (res.txs  || []);
              return { ...res, txs: [...prevArr, ...newArr] };
            });
          }
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setFetching(false); });
    return () => { cancelled = true; };
  }, [page, typeF, userF, fromF, toF]);

  useEffect(() => { setPage(1); }, [typeF, userF, fromF, toF]);

  // ── Live sync for transactions ──
  useEffect(() => {
    if (!liveTx) return;
    
    setData(prev => {
      const prevArr = Array.isArray(prev) ? prev : (prev.txs || []);
      
      if (liveTx.type === 'delete') {
        return {
          ...prev,
          total: Math.max(0, (prev.total || 0) - 1),
          txs: prevArr.filter(t => t._id !== liveTx.txId)
        };
      }
      
      const newTx = { ...liveTx.tx };
      if (!newTx) return prev;
      
      if (newTx.userId && typeof newTx.userId === 'object') {
        newTx.userName = newTx.userId.name;
      }
      
      // Check filters
      if (typeF !== 'all' && newTx.type !== typeF) return prev;
      if (userF && newTx.userId?._id !== userF && newTx.userId !== userF) return prev;
      
      if (liveTx.type === 'add') {
        if (prevArr.some(t => t._id === newTx._id)) return prev;
        return {
          ...prev,
          total: (prev.total || 0) + 1,
          txs: [newTx, ...prevArr]
        };
      }
      
      if (liveTx.type === 'update') {
        return {
          ...prev,
          txs: prevArr.map(t => t._id === newTx._id ? newTx : t)
        };
      }
      
      return prev;
    });
  }, [liveTx, typeF, userF]);

  const refetch = (silent = false) => {
    if (!silent) setFetching(true);
    const params = { page, limit: LIMIT };
    if (typeF !== 'all') params.type = typeF;
    if (userF) params.user = userF;
    if (fromF) params.from = fromF;
    if (toF)   params.to   = toF;
    api.getTxs(params)
      .then(res => setData(res))
      .catch(() => {})
      .finally(() => { if (!silent) setFetching(false); });
  };

  // ── Polling fallback for fastRefresh ──
  useEffect(() => {
    if (socketStatus === 'online' || !(company?.fastRefresh ?? true)) return;
    const id = setInterval(() => refetch(true), 30000);
    return () => clearInterval(id);
  }, [socketStatus, company?.fastRefresh, page, typeF, userF, fromF, toF]);

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

  const txList = Array.isArray(data) ? data : (data.txs || []);
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

  // ── Field style helpers
  const fInput = (name, extra = {}) => ({
    ...inputStyle(t),
    height: 36,
    borderColor: focused === name ? primary : t.border,
    boxShadow: focused === name ? `0 0 0 1px ${primary}` : 'none',
    ...extra,
  });
  const fSelect = (name) => ({
    height: 36, padding: '0 10px', borderRadius: 4,
    border: `1px solid ${focused === name ? primary : t.border}`,
    backgroundColor: t.canvas, color: t.fg,
    fontSize: 13, outline: 'none', cursor: 'pointer',
    fontFamily: 'inherit', boxSizing: 'border-box',
    boxShadow: focused === name ? `0 0 0 1px ${primary}` : 'none',
    transition: 'border-color 120ms, box-shadow 120ms',
  });

  return (
    <div className="animate-in fade-in duration-300" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.fgSubtle }}>
            {tr.transactions}
          </span>
          <span style={{ marginLeft: 8, fontFamily: 'ui-monospace, monospace', fontSize: 11, color: t.fgSubtle }}>
            ({data.total ?? 0})
          </span>
        </div>
        {user?.perms?.canTx && (
          <button
            onClick={openRecord}
            style={{
              height: 32, padding: '0 14px', borderRadius: 4,
              backgroundColor: primary, color: '#fff', border: 'none',
              cursor: 'pointer', fontSize: 13, fontWeight: 600,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              transition: 'opacity 120ms',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <Icon name="add" size={18} /> {tr.addTransaction}
          </button>
        )}
      </div>

      {/* ── Filters ── */}
      <div style={{
        backgroundColor: t.elev, border: `1px solid ${t.border}`,
        borderRadius: 4, padding: '12px 14px',
        display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Icon name="search" size={15} style={{
            position: 'absolute', top: '50%', left: 10, transform: 'translateY(-50%)',
            color: t.fgSubtle, pointerEvents: 'none',
          }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={isAR ? 'ابحث عن الصنف، المصدر، الوجهة...' : 'Search item, source, destination...'}
            style={{ ...fInput('search'), paddingLeft: 32 }}
            onFocus={() => setFocused('search')}
            onBlur={() => setFocused('')}
          />
        </div>

        {/* Type */}
        <select value={typeF} onChange={e => setTypeF(e.target.value)}
          style={fSelect('typeF')} onFocus={() => setFocused('typeF')} onBlur={() => setFocused('')}>
          <option value="all">{isAR ? 'جميع الحركات' : 'All Types'}</option>
          <option value="IN">↓ {isAR ? 'وارد' : 'IN'}</option>
          <option value="OUT">↑ {isAR ? 'صادر' : 'OUT'}</option>
        </select>

        {/* User filter (admin/owner only) */}
        {canSeeAll && (
          <select value={userF} onChange={e => setUserF(e.target.value)}
            style={fSelect('userF')} onFocus={() => setFocused('userF')} onBlur={() => setFocused('')}>
            <option value="">{isAR ? 'جميع المستخدمين' : 'All Users'}</option>
            {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
          </select>
        )}

        {/* Date range — From */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <label style={{ fontFamily: 'ui-monospace, monospace', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: t.fgSubtle }}>
            {isAR ? 'من' : 'From'}
          </label>
          <input type="date" value={fromF} onChange={e => setFromF(e.target.value)}
            style={fInput('fromF')} onFocus={() => setFocused('fromF')} onBlur={() => setFocused('')} />
        </div>

        {/* Date range — To */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <label style={{ fontFamily: 'ui-monospace, monospace', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: t.fgSubtle }}>
            {isAR ? 'إلى' : 'To'}
          </label>
          <input type="date" value={toF} onChange={e => setToF(e.target.value)}
            style={fInput('toF')} onFocus={() => setFocused('toF')} onBlur={() => setFocused('')} />
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ backgroundColor: t.elev, border: `1px solid ${t.border}`, borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
            <thead>
              <tr>
                {['#', isAR ? 'التاريخ' : 'Date', isAR ? 'النوع' : 'Type', isAR ? 'الصنف' : 'Item', isAR ? 'الكمية' : 'Qty', isAR ? 'المصدر/الوجهة' : 'Source / Dest'].map((h, idx) => (
                  <th key={idx} style={{
                    padding: '10px 14px', textAlign: idx === 0 ? 'center' : 'left',
                    fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.08em', color: t.fgSubtle,
                    whiteSpace: 'nowrap', borderBottom: `1px solid ${t.border}`,
                    backgroundColor: t.sunken, position: 'sticky', top: 0, zIndex: 10,
                  }}>
                    {h}
                  </th>
                ))}
                {canSeeAll && (
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.fgSubtle, borderBottom: `1px solid ${t.border}`, backgroundColor: t.sunken, position: 'sticky', top: 0, zIndex: 10 }}>
                    {isAR ? 'المستخدم' : 'User'}
                  </th>
                )}
                {canSeeAll && (
                  <th style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.fgSubtle, borderBottom: `1px solid ${t.border}`, backgroundColor: t.sunken, position: 'sticky', top: 0, zIndex: 10 }}>
                    {isAR ? 'إجراءات' : 'Actions'}
                  </th>
                )}
              </tr>
            </thead>

            <tbody>
              {fetching ? (
                <tr>
                  <td colSpan={canSeeAll ? 8 : 6} style={{ padding: '48px 0', textAlign: 'center' }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', margin: '0 auto',
                      border: `2px solid ${t.border}`, borderTopColor: primary,
                      animation: 'spin 600ms linear infinite',
                    }} />
                  </td>
                </tr>
              ) : visibleTxs.length === 0 ? (
                <tr>
                  <td colSpan={canSeeAll ? 8 : 6} style={{
                    padding: '48px 0', textAlign: 'center',
                    fontFamily: 'ui-monospace, monospace', fontSize: 11,
                    textTransform: 'uppercase', letterSpacing: '0.08em', color: t.fgSubtle,
                  }}>
                    {isAR ? 'لا توجد حركات مطابقة' : 'No transactions match your search'}
                  </td>
                </tr>
              ) : (
                visibleTxs.map((tx, idx) => (
                  <tr
                    key={tx._id}
                    style={{ borderBottom: `1px solid ${t.border}`, transition: 'background 120ms' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = t.sunken}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {/* # */}
                    <td style={{ padding: '10px 14px', textAlign: 'center', fontFamily: 'ui-monospace, monospace', fontSize: 10, color: t.fgSubtle }}>
                      {(page - 1) * LIMIT + idx + 1}
                    </td>

                    {/* Date */}
                    <td style={{ padding: '10px 14px', fontFamily: 'ui-monospace, monospace', fontSize: 11, color: t.fgMuted, whiteSpace: 'nowrap' }}>
                      {new Date(tx.date).toLocaleDateString(isAR ? 'ar-EG' : 'en-US', {
                        year: 'numeric', month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>

                    {/* Type badge */}
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '3px 8px', borderRadius: 3, fontSize: 11, fontWeight: 700,
                        fontFamily: 'ui-monospace, monospace', textTransform: 'uppercase',
                        backgroundColor: tx.type === 'IN'
                          ? (theme === 'dark' ? '#0c1f12' : '#f0fdf4')
                          : (theme === 'dark' ? '#2b1818' : '#fef2f2'),
                        color: tx.type === 'IN' ? '#16774A' : t.neg,
                        border: `1px solid ${tx.type === 'IN' ? (theme === 'dark' ? '#1a4228' : '#bbf7d0') : (theme === 'dark' ? '#5c1e1e' : '#fca5a5')}`,
                      }}>
                        {tx.type === 'IN' ? '↓ IN' : '↑ OUT'}
                      </span>
                    </td>

                    {/* Item */}
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: t.fg, fontSize: 13 }}>
                      {isAR ? (tx.itemId?.name || '—') : (tx.itemId?.nameEn || tx.itemId?.name || '—')}
                    </td>

                    {/* Qty */}
                    <td style={{ padding: '10px 14px', fontWeight: 800, color: t.fg, fontSize: 13, fontFamily: 'ui-monospace, monospace' }}>
                      {tx.qty}
                    </td>

                    {/* Source/Dest */}
                    <td style={{ padding: '10px 14px', fontSize: 11, color: t.fgMuted, fontFamily: 'ui-monospace, monospace' }}>
                      {tx.source && <div>▲ {tx.source}</div>}
                      {tx.dest   && <div>▼ {tx.dest}</div>}
                      {!tx.source && !tx.dest && '—'}
                    </td>

                    {/* User */}
                    {canSeeAll && (
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 24, height: 24, borderRadius: 4,
                            backgroundColor: t.border,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, fontWeight: 800, color: t.fgMuted,
                            fontFamily: 'ui-monospace, monospace',
                          }}>
                            {tx.userName?.charAt(0)?.toUpperCase()}
                          </div>
                          <span style={{ fontSize: 11, color: t.fgMuted, fontFamily: 'ui-monospace, monospace' }}>
                            {tx.userName}
                          </span>
                        </div>
                      </td>
                    )}

                    {/* Actions */}
                    {canSeeAll && (
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                          <button
                            onClick={() => openEdit(tx)}
                            title={tr.edit}
                            style={{ background: 'transparent', border: 'none', borderRadius: 4, cursor: 'pointer', color: t.fgMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4, transition: 'background 120ms, color 120ms', width: 26, height: 26 }}
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = primary + '1a'; e.currentTarget.style.color = primary; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = t.fgMuted; }}
                          >
                            <Icon name="edit" size={14} />
                          </button>
                          <button
                            onClick={() => confirmDel(tx)}
                            title={tr.delete}
                            style={{ background: 'transparent', border: 'none', borderRadius: 4, cursor: 'pointer', color: t.fgMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4, transition: 'background 120ms, color 120ms', width: 26, height: 26 }}
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = t.negTint; e.currentTarget.style.color = t.neg; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = t.fgMuted; }}
                          >
                            <Icon name="delete" size={14} />
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

        <InfiniteScrollTrigger
          hasMore={data.total ? (page * LIMIT < data.total) : false}
          onVisible={() => setPage(p => p + 1)}
        />
      </div>

      {/* ── Modals ── */}
      <TxModal
        open={txModal}
        onClose={() => { setTxModal(false); setEditTx(null); }}
        editTx={editTx}
        onSaved={refetch}
      />
      <Confirm
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        loading={deleting}
        message={isAR
          ? 'هل تريد حذف هذه الحركة؟ سيتم عكس تأثيرها على المخزون.'
          : 'Delete this transaction? Stock levels will be reversed.'}
      />
    </div>
  );
}
