import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { T, inputStyle } from '../theme';
import { api } from '../api';
import Icon from '../components/Icon';
import TxModal from './TxModal';
import Confirm from '../components/Confirm';
import InfiniteScrollTrigger from '../components/InfiniteScrollTrigger';

const LIMIT = 20;

/**
 * Shared transaction page used by StockIn (type="IN") and StockOut (type="OUT").
 * The `type` prop locks the page to one transaction direction.
 */
export default function TxPage({ type }) {
  const { t: tr, isAR, user, users, removeTx, theme, company } = useAppContext();
  const t = T[theme] || T.light;
  const primary = company?.primaryColor || '#3b82f6';

  const isIN       = type === 'IN';
  const permKey    = isIN ? 'canTxIn' : 'canTxOut';
  const canRecord  = user?.role === 'owner' || user?.perms?.[permKey];
  const canSeeAll  = user?.role === 'owner' || user?.role === 'admin';

  // ── accent colour per type ──────────────────────────────────────────────
  const typeColor  = isIN ? '#16774A' : t.neg;
  const typeTint   = isIN
    ? (theme === 'dark' ? '#0c1f12' : '#f0fdf4')
    : (theme === 'dark' ? '#2b1818' : '#fef2f2');
  const typeBorder = isIN
    ? (theme === 'dark' ? '#1a4228' : '#bbf7d0')
    : (theme === 'dark' ? '#5c1e1e' : '#fca5a5');

  // ── page title ──────────────────────────────────────────────────────────
  const pageTitle = isIN
    ? (isAR ? '↓ وارد — Stock In'  : '↓ Stock In')
    : (isAR ? '↑ صادر — Stock Out' : '↑ Stock Out');

  const pageDesc = isIN
    ? (isAR ? 'جميع حركات الإدخال والبضاعة الواردة' : 'All incoming stock movements and receipts')
    : (isAR ? 'جميع حركات الإخراج والبضاعة الصادرة'  : 'All outgoing stock movements and dispatches');

  // ── state ───────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
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

  // ── fetch ───────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setFetching(true);
    const params = { page, limit: LIMIT, type }; // always filter by this page's type
    if (userF) params.user = userF;
    if (fromF) params.from = fromF;
    if (toF)   params.to   = toF;
    api.getTxs(params)
      .then(res => {
        if (!cancelled) {
          if (page === 1) setData(res);
          else setData(prev => ({
            ...res,
            txs: [...(prev.txs || []), ...(res.txs || [])],
          }));
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setFetching(false); });
    return () => { cancelled = true; };
  }, [page, type, userF, fromF, toF]);

  useEffect(() => { setPage(1); }, [type, userF, fromF, toF]);

  const refetch = () => {
    setFetching(true);
    const params = { page: 1, limit: LIMIT, type };
    if (userF) params.user = userF;
    if (fromF) params.from = fromF;
    if (toF)   params.to   = toF;
    api.getTxs(params)
      .then(res => { setData(res); setPage(1); })
      .catch(() => {})
      .finally(() => setFetching(false));
  };

  // ── handlers ────────────────────────────────────────────────────────────
  const openRecord = ()   => { setEditTx(null); setTxModal(true); };
  const openEdit   = (tx) => { setEditTx(tx);   setTxModal(true); };
  const confirmDel = (tx) => { setDeleteTarget(tx); setConfirmOpen(true); };

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

  // ── search ──────────────────────────────────────────────────────────────
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

  // ── style helpers ────────────────────────────────────────────────────────
  const fInput = (name, extra = {}) => ({
    ...inputStyle(t),
    height: 34,
    borderColor: focused === name ? primary : t.border,
    boxShadow: focused === name ? `0 0 0 1px ${primary}` : 'none',
    ...extra,
  });
  const fSelect = (name) => ({
    height: 34, padding: '0 10px', borderRadius: 4,
    border: `1px solid ${focused === name ? primary : t.border}`,
    backgroundColor: t.canvas, color: t.fg, fontSize: 13,
    outline: 'none', cursor: 'pointer', fontFamily: 'inherit',
    boxSizing: 'border-box',
    boxShadow: focused === name ? `0 0 0 1px ${primary}` : 'none',
    transition: 'border-color 120ms, box-shadow 120ms',
  });
  const lbl = (text) => (
    <label style={{
      fontFamily: 'ui-monospace, monospace', fontSize: 9, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.06em',
      color: t.fgSubtle, display: 'block', marginBottom: 3,
    }}>
      {text}
    </label>
  );
  const th = (label, align = 'left') => (
    <th style={{
      padding: '0 14px', height: 36,
      fontFamily: 'ui-monospace, monospace', fontSize: 10,
      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
      color: t.fgSubtle, textAlign: align, whiteSpace: 'nowrap',
      backgroundColor: t.sunken, borderBottom: `1px solid ${t.border}`,
    }}>
      {label}
    </th>
  );

  // column count
  const colCount = canSeeAll ? 7 : 5;

  return (
    <div className="animate-in fade-in duration-300"
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          {/* Type badge + title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '3px 10px', borderRadius: 3,
              backgroundColor: typeTint,
              border: `1px solid ${typeBorder}`,
              fontFamily: 'ui-monospace, monospace', fontSize: 11,
              fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
              color: typeColor,
            }}>
              {isIN ? '↓' : '↑'} {type}
            </span>
            <h1 style={{ fontSize: 18, fontWeight: 900, color: t.fg, letterSpacing: '-0.02em', margin: 0 }}>
              {pageTitle}
            </h1>
            <span style={{
              fontFamily: 'ui-monospace, monospace', fontSize: 11,
              color: t.fgSubtle,
            }}>
              ({data.total ?? 0})
            </span>
          </div>
          <p style={{ fontSize: 12, color: t.fgMuted, margin: 0 }}>{pageDesc}</p>
        </div>

        {/* Record button */}
        {canRecord && (
          <button
            onClick={openRecord}
            style={{
              height: 34, padding: '0 16px', borderRadius: 4,
              backgroundColor: typeColor, color: '#fff', border: 'none',
              cursor: 'pointer', fontSize: 13, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              transition: 'opacity 120ms',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <Icon name="add" size={16} />
            {isIN
              ? (isAR ? 'تسجيل وارد' : 'Record IN')
              : (isAR ? 'تسجيل صادر' : 'Record OUT')}
          </button>
        )}
      </div>

      {/* ── Filters ── */}
      <div style={{
        backgroundColor: t.elev, border: `1px solid ${t.border}`,
        borderRadius: 4, padding: '10px 14px',
        display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end',
      }}>
        {/* Search */}
        <div style={{ flex: 1, minWidth: 180 }}>
          {lbl(isAR ? 'بحث' : 'Search')}
          <div style={{ position: 'relative' }}>
            <Icon name="search" size={13} style={{
              position: 'absolute', top: '50%', left: 9,
              transform: 'translateY(-50%)', color: t.fgSubtle, pointerEvents: 'none',
            }} />
            <input
              type="text" value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={isAR ? 'ابحث عن الصنف أو المصدر...' : 'Search item, source...'}
              style={{ ...fInput('search'), paddingLeft: 28 }}
              onFocus={() => setFocused('search')}
              onBlur={() => setFocused('')}
            />
          </div>
        </div>

        {/* User filter (admin/owner only) */}
        {canSeeAll && (
          <div>
            {lbl(isAR ? 'المستخدم' : 'User')}
            <select value={userF} onChange={e => setUserF(e.target.value)}
              style={fSelect('userF')} onFocus={() => setFocused('userF')} onBlur={() => setFocused('')}>
              <option value="">{isAR ? 'جميع المستخدمين' : 'All Users'}</option>
              {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
            </select>
          </div>
        )}

        {/* From date */}
        <div>
          {lbl(isAR ? 'من' : 'From')}
          <input type="date" value={fromF} onChange={e => setFromF(e.target.value)}
            style={fInput('fromF')} onFocus={() => setFocused('fromF')} onBlur={() => setFocused('')} />
        </div>

        {/* To date */}
        <div>
          {lbl(isAR ? 'إلى' : 'To')}
          <input type="date" value={toF} onChange={e => setToF(e.target.value)}
            style={fInput('toF')} onFocus={() => setFocused('toF')} onBlur={() => setFocused('')} />
        </div>

        {/* Clear filters */}
        {(userF || fromF || toF || search) && (
          <button
            onClick={() => { setSearch(''); setUserF(''); setFromF(''); setToF(''); }}
            style={{
              height: 34, padding: '0 10px', borderRadius: 4,
              border: `1px solid ${t.border}`, backgroundColor: 'transparent',
              color: t.fgMuted, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
              transition: 'background 120ms',
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = t.sunken}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            {isAR ? 'مسح الفلاتر' : 'Clear'}
          </button>
        )}
      </div>

      {/* ── Table ── */}
      <div style={{ backgroundColor: t.elev, border: `1px solid ${t.border}`, borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {th('#', 'center')}
                {th(isAR ? 'التاريخ' : 'Date')}
                {th(isAR ? 'الصنف' : 'Item')}
                {th(isAR ? 'الكمية' : 'Qty')}
                {th(isAR ? (isIN ? 'المصدر' : 'الوجهة') : (isIN ? 'Source' : 'Destination'))}
                {canSeeAll && th(isAR ? 'المستخدم' : 'User')}
                {canSeeAll && th(isAR ? 'إجراءات' : 'Actions', 'right')}
              </tr>
            </thead>

            <tbody>
              {fetching ? (
                <tr>
                  <td colSpan={colCount} style={{ padding: '48px 0', textAlign: 'center' }}>
                    <div style={{
                      width: 22, height: 22, margin: '0 auto', borderRadius: '50%',
                      border: `2px solid ${t.border}`, borderTopColor: typeColor,
                      animation: 'spin 600ms linear infinite',
                    }} />
                  </td>
                </tr>
              ) : visibleTxs.length === 0 ? (
                <tr>
                  <td colSpan={colCount} style={{
                    padding: '48px 0', textAlign: 'center',
                    fontFamily: 'ui-monospace, monospace', fontSize: 11,
                    textTransform: 'uppercase', letterSpacing: '0.08em', color: t.fgSubtle,
                  }}>
                    {isAR
                      ? (isIN ? 'لا توجد حركات واردة' : 'لا توجد حركات صادرة')
                      : (isIN ? 'No incoming transactions found' : 'No outgoing transactions found')}
                  </td>
                </tr>
              ) : visibleTxs.map((tx, idx) => (
                <TxRow
                  key={tx._id}
                  tx={tx} idx={idx} page={page}
                  t={t} isAR={isAR} isIN={isIN}
                  typeColor={typeColor} typeTint={typeTint} typeBorder={typeBorder}
                  primary={primary} canSeeAll={canSeeAll}
                  onEdit={() => openEdit(tx)}
                  onDelete={() => confirmDel(tx)}
                  tr={tr}
                />
              ))}
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
        forcedType={type}
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

// ── Row sub-component ─────────────────────────────────────────────────────────
function TxRow({ tx, idx, page, t, isAR, isIN, typeColor, typeTint, typeBorder, primary, canSeeAll, onEdit, onDelete, tr }) {
  const [hovered, setHovered] = useState(false);

  const locationField = isIN ? tx.source : tx.dest;

  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: hovered ? t.sunken : 'transparent',
        borderBottom: `1px solid ${t.border}`,
        transition: 'background 120ms',
      }}
    >
      {/* # */}
      <td style={{
        padding: '10px 14px', textAlign: 'center',
        fontFamily: 'ui-monospace, monospace', fontSize: 10, color: t.fgSubtle,
      }}>
        {(page - 1) * LIMIT + idx + 1}
      </td>

      {/* Date */}
      <td style={{ padding: '10px 14px', fontFamily: 'ui-monospace, monospace', fontSize: 11, color: t.fgMuted, whiteSpace: 'nowrap' }}>
        {new Date(tx.date).toLocaleDateString(isAR ? 'ar-EG' : 'en-US', {
          year: 'numeric', month: 'short', day: 'numeric',
        })}
        <div style={{ fontSize: 9, color: t.fgSubtle, marginTop: 1 }}>
          {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </td>

      {/* Item */}
      <td style={{ padding: '10px 14px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: t.fg }}>
          {isAR ? (tx.itemId?.name || '—') : (tx.itemId?.nameEn || tx.itemId?.name || '—')}
        </div>
        {tx.itemId?.sku && (
          <div style={{ fontSize: 10, color: t.fgSubtle, fontFamily: 'ui-monospace, monospace', marginTop: 1 }}>
            {tx.itemId.sku}
          </div>
        )}
      </td>

      {/* Qty */}
      <td style={{ padding: '10px 14px' }}>
        <span style={{
          fontFamily: 'ui-monospace, monospace', fontSize: 14, fontWeight: 800,
          color: typeColor,
        }}>
          {isIN ? '+' : '−'}{tx.qty}
        </span>
      </td>

      {/* Source / Destination */}
      <td style={{ padding: '10px 14px', fontSize: 12, color: t.fgMuted, fontFamily: 'ui-monospace, monospace' }}>
        {locationField || <span style={{ color: t.fgSubtle }}>—</span>}
      </td>

      {/* User */}
      {canSeeAll && (
        <td style={{ padding: '10px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 24, height: 24, borderRadius: 4, flexShrink: 0,
              backgroundColor: primary + '18', border: `1px solid ${primary}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 800, color: primary,
              fontFamily: 'ui-monospace, monospace',
            }}>
              {tx.userName?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <span style={{ fontSize: 11, color: t.fgMuted, fontFamily: 'ui-monospace, monospace' }}>
              {tx.userName || '—'}
            </span>
          </div>
        </td>
      )}

      {/* Actions */}
      {canSeeAll && (
        <td style={{ padding: '10px 14px', textAlign: 'right' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
            <button
              onClick={onEdit}
              title={tr.edit}
              style={{
                width: 26, height: 26, borderRadius: 4, border: 'none',
                background: 'transparent', cursor: 'pointer',
                color: hovered ? primary : t.fgSubtle,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 120ms',
                backgroundColor: hovered ? primary + '18' : 'transparent',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = primary + '1a'; e.currentTarget.style.color = primary; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = t.fgMuted; }}
            >
              <Icon name="edit" size={13} />
            </button>
            <button
              onClick={onDelete}
              title={tr.delete}
              style={{
                width: 26, height: 26, borderRadius: 4, border: 'none',
                background: 'transparent', cursor: 'pointer',
                color: t.fgMuted,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 120ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = t.negTint; e.currentTarget.style.color = t.neg; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = t.fgMuted; }}
            >
              <Icon name="delete" size={13} />
            </button>
          </div>
        </td>
      )}
    </tr>
  );
}
