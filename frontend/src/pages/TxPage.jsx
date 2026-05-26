import { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { T } from '../theme';
import { api } from '../api';
import Icon from '../components/Icon';
import BarcodeScanner from '../components/BarcodeScanner';
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

  const isIN      = type === 'IN';
  const permKey   = isIN ? 'canTxIn' : 'canTxOut';
  const canRecord = user?.role === 'owner' || user?.perms?.[permKey];
  const canSeeAll = user?.role === 'owner' || user?.role === 'admin';

  // ── accent colour per type ────────────────────────────────────────────────
  const typeColor  = isIN ? '#16774A' : t.neg;
  const typeTint   = isIN
    ? (theme === 'dark' ? '#0c1f12' : '#f0fdf4')
    : (theme === 'dark' ? '#2b1818' : '#fef2f2');
  const typeBorder = isIN
    ? (theme === 'dark' ? '#1a4228' : '#bbf7d0')
    : (theme === 'dark' ? '#5c1e1e' : '#fca5a5');

  const pageTitle = isIN
    ? (isAR ? '↓ وارد — Stock In'  : '↓ Stock In')
    : (isAR ? '↑ صادر — Stock Out' : '↑ Stock Out');
  const pageDesc  = isIN
    ? (isAR ? 'جميع حركات الإدخال والبضاعة الواردة' : 'All incoming stock movements and receipts')
    : (isAR ? 'جميع حركات الإخراج والبضاعة الصادرة'  : 'All outgoing stock movements and dispatches');

  // ── primary filters ───────────────────────────────────────────────────────
  const [search,  setSearch]  = useState('');
  const [userF,   setUserF]   = useState('');

  // ── secondary filters (collapsible) ──────────────────────────────────────
  const [moreOpen, setMoreOpen] = useState(false);
  const [fromF,    setFromF]    = useState('');
  const [toF,      setToF]      = useState('');
  const [qtyMin,   setQtyMin]   = useState('');
  const [qtyMax,   setQtyMax]   = useState('');

  // ── paging + data ─────────────────────────────────────────────────────────
  const [page,     setPage]     = useState(1);
  const [data,     setData]     = useState({ txs: [], total: 0, pages: 1 });
  const [fetching, setFetching] = useState(true);

  // ── modals ────────────────────────────────────────────────────────────────
  const [txModal,      setTxModal]      = useState(false);
  const [editTx,       setEditTx]       = useState(null);
  const [confirmOpen,  setConfirmOpen]  = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  // ── barcode scanner ───────────────────────────────────────────────────────
  const [scannerOpen, setScannerOpen] = useState(false);

  // ── focus tracking ────────────────────────────────────────────────────────
  const [focused, setFocused] = useState('');

  // ── fetch ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setFetching(true);
    const params = { page, limit: LIMIT, type };
    if (search.trim()) params.search = search.trim();
    if (userF)         params.user   = userF;
    if (fromF)         params.from   = fromF;
    if (toF)           params.to     = toF;

    api.getTxs(params)
      .then(res => {
        if (cancelled) return;
        if (page === 1) {
          setData(res);
        } else {
          setData(prev => ({
            ...res,
            txs: [...(prev.txs || []), ...(res.txs || [])],
          }));
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setFetching(false); });

    return () => { cancelled = true; };
  }, [page, type, search, userF, fromF, toF]);

  // reset to page 1 on any filter change
  useEffect(() => { setPage(1); }, [type, search, userF, fromF, toF]);

  const refetch = useCallback(() => {
    setPage(1);
    setData({ txs: [], total: 0, pages: 1 });
  }, []);

  // ── handlers ──────────────────────────────────────────────────────────────
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

  // barcode detected → populate search field
  const handleBarcodeScan = useCallback((code) => {
    setScannerOpen(false);
    setSearch(code);
    setPage(1);
  }, []);

  // clear all filters
  const clearFilters = () => {
    setSearch(''); setUserF('');
    setFromF(''); setToF('');
    setQtyMin(''); setQtyMax('');
  };

  // ── derived state ─────────────────────────────────────────────────────────
  const hasSecondaryFilters = fromF || toF || qtyMin || qtyMax;
  const hasAnyFilter        = search || userF || hasSecondaryFilters;

  // client-side qty range filter (qty comes back from server, cheap to apply locally)
  const txList = (() => {
    let list = Array.isArray(data) ? data : (data.txs || []);
    if (qtyMin) list = list.filter(tx => tx.qty >= Number(qtyMin));
    if (qtyMax) list = list.filter(tx => tx.qty <= Number(qtyMax));
    return list;
  })();

  const colCount = canSeeAll ? 7 : 5;

  // ── style helpers ─────────────────────────────────────────────────────────
  const filterInput = (name, extra = {}) => ({
    height: 34, padding: '0 10px', borderRadius: 4,
    border: `1px solid ${focused === name ? primary : t.border}`,
    backgroundColor: t.canvas, color: t.fg, fontSize: 13,
    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
    boxShadow: focused === name ? `0 0 0 1px ${primary}` : 'none',
    transition: 'border-color 120ms, box-shadow 120ms',
    ...extra,
  });

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

  return (
    <div className="animate-in fade-in duration-300"
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '3px 10px', borderRadius: 3,
              backgroundColor: typeTint, border: `1px solid ${typeBorder}`,
              fontFamily: 'ui-monospace, monospace', fontSize: 11,
              fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
              color: typeColor,
            }}>
              {isIN ? '↓' : '↑'} {type}
            </span>
            <h1 style={{ fontSize: 18, fontWeight: 900, color: t.fg, letterSpacing: '-0.02em', margin: 0 }}>
              {pageTitle}
            </h1>
            <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: t.fgSubtle }}>
              ({data.total ?? 0})
            </span>
          </div>
          <p style={{ fontSize: 12, color: t.fgMuted, margin: 0 }}>{pageDesc}</p>
        </div>

        {canRecord && (
          <button
            onClick={openRecord}
            style={{
              height: 34, padding: '0 16px', borderRadius: 4,
              backgroundColor: typeColor, color: '#fff', border: 'none',
              cursor: 'pointer', fontSize: 13, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontFamily: 'inherit', transition: 'opacity 120ms',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <Icon name="add" size={16} />
            {isIN ? (isAR ? 'تسجيل وارد' : 'Record IN') : (isAR ? 'تسجيل صادر' : 'Record OUT')}
          </button>
        )}
      </div>

      {/* ── Filters ── */}
      <div style={{
        backgroundColor: t.elev, border: `1px solid ${t.border}`,
        borderRadius: 4, padding: '12px 14px',
      }}>

        {/* ── Row 1: primary filters ── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>

          {/* Search + scan */}
          <div className="tour-tx-search" style={{ display: 'flex', gap: 6, flex: '1 1 220px', minWidth: 200 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Icon name="search" size={15} style={{
                position: 'absolute', top: '50%', left: 10,
                transform: 'translateY(-50%)', color: t.fgSubtle, pointerEvents: 'none',
              }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={isAR
                  ? 'ابحث بالصنف، SKU، الباركود، المصدر، الملاحظات...'
                  : 'Search item, SKU, barcode, source, notes…'}
                style={{ ...filterInput('search'), paddingLeft: 32, width: '100%' }}
                onFocus={() => setFocused('search')}
                onBlur={() => setFocused('')}
              />
            </div>
            {/* Camera scan button */}
            <button
              type="button"
              onClick={() => setScannerOpen(true)}
              title={isAR ? 'مسح الباركود بالكاميرا' : 'Scan barcode with camera'}
              style={{
                width: 34, height: 34, borderRadius: 4, flexShrink: 0,
                border: `1px solid ${t.border}`,
                backgroundColor: 'transparent', color: t.fgMuted,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 120ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = t.sunken; e.currentTarget.style.color = primary; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = t.fgMuted; }}
            >
              <Icon name="scan" size={16} />
            </button>
          </div>

          {/* User filter (admin/owner only) */}
          {canSeeAll && (
            <select
              value={userF}
              onChange={e => setUserF(e.target.value)}
              style={{ ...filterInput('userF', { padding: '0 8px', cursor: 'pointer', flex: '0 1 150px' }) }}
              onFocus={() => setFocused('userF')} onBlur={() => setFocused('')}
            >
              <option value="">{isAR ? 'جميع المستخدمين' : 'All Users'}</option>
              {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
            </select>
          )}

          {/* More filters toggle */}
          <button
            type="button"
            onClick={() => setMoreOpen(o => !o)}
            style={{
              height: 34, padding: '0 12px', borderRadius: 4,
              border: `1px solid ${moreOpen || hasSecondaryFilters ? primary : t.border}`,
              backgroundColor: moreOpen ? `${primary}12` : 'transparent',
              color: moreOpen || hasSecondaryFilters ? primary : t.fgMuted,
              fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              transition: 'all 120ms', flexShrink: 0,
            }}
          >
            <Icon name="filter" size={14} />
            {isAR ? 'فلاتر إضافية' : 'More filters'}
            {/* Active secondary filter count badge */}
            {hasSecondaryFilters && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 16, height: 16, borderRadius: '50%',
                backgroundColor: primary, color: '#fff',
                fontSize: 9, fontWeight: 700, fontFamily: 'ui-monospace, monospace',
              }}>
                {[fromF, toF, qtyMin, qtyMax].filter(Boolean).length}
              </span>
            )}
          </button>

          {/* Clear all */}
          {hasAnyFilter && (
            <button
              type="button"
              onClick={clearFilters}
              title={isAR ? 'مسح جميع الفلاتر' : 'Clear all filters'}
              style={{
                height: 34, padding: '0 10px', borderRadius: 4,
                border: `1px solid ${t.border}`,
                backgroundColor: 'transparent', color: t.fgMuted,
                fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                display: 'inline-flex', alignItems: 'center', gap: 5,
                transition: 'background 120ms', flexShrink: 0,
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = t.sunken}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <Icon name="close" size={13} />
              {isAR ? 'مسح' : 'Clear'}
            </button>
          )}
        </div>

        {/* ── Row 2: secondary filters (collapsible) ── */}
        {moreOpen && (
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 10,
            marginTop: 10, paddingTop: 10, borderTop: `1px solid ${t.border}`,
            alignItems: 'flex-end',
          }}>
            {/* Date from */}
            <div>
              <label style={{
                display: 'block', fontFamily: 'ui-monospace,monospace',
                fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.06em', color: t.fgSubtle, marginBottom: 4,
              }}>
                {isAR ? 'من تاريخ' : 'From date'}
              </label>
              <input
                type="date" value={fromF}
                onChange={e => setFromF(e.target.value)}
                style={filterInput('fromF')}
                onFocus={() => setFocused('fromF')} onBlur={() => setFocused('')}
              />
            </div>

            {/* Date to */}
            <div>
              <label style={{
                display: 'block', fontFamily: 'ui-monospace,monospace',
                fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.06em', color: t.fgSubtle, marginBottom: 4,
              }}>
                {isAR ? 'إلى تاريخ' : 'To date'}
              </label>
              <input
                type="date" value={toF}
                onChange={e => setToF(e.target.value)}
                style={filterInput('toF')}
                onFocus={() => setFocused('toF')} onBlur={() => setFocused('')}
              />
            </div>

            {/* Qty range */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
              <div>
                <label style={{
                  display: 'block', fontFamily: 'ui-monospace,monospace',
                  fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.06em', color: t.fgSubtle, marginBottom: 4,
                }}>
                  {isAR ? 'الكمية من' : 'Qty min'}
                </label>
                <input
                  type="number" min="0" value={qtyMin}
                  onChange={e => setQtyMin(e.target.value)}
                  placeholder="0"
                  style={{ ...filterInput('qtyMin'), width: 80 }}
                  onFocus={() => setFocused('qtyMin')} onBlur={() => setFocused('')}
                />
              </div>
              <div>
                <label style={{
                  display: 'block', fontFamily: 'ui-monospace,monospace',
                  fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.06em', color: t.fgSubtle, marginBottom: 4,
                }}>
                  {isAR ? 'الكمية إلى' : 'Qty max'}
                </label>
                <input
                  type="number" min="0" value={qtyMax}
                  onChange={e => setQtyMax(e.target.value)}
                  placeholder="∞"
                  style={{ ...filterInput('qtyMax'), width: 80 }}
                  onFocus={() => setFocused('qtyMax')} onBlur={() => setFocused('')}
                />
              </div>
            </div>

            {/* Clear secondary */}
            {hasSecondaryFilters && (
              <button
                type="button"
                onClick={() => { setFromF(''); setToF(''); setQtyMin(''); setQtyMax(''); }}
                style={{
                  height: 34, padding: '0 10px', borderRadius: 4,
                  border: `1px solid ${t.border}`,
                  backgroundColor: 'transparent', color: t.fgMuted,
                  fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'background 120ms', alignSelf: 'flex-end',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = t.sunken}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                {isAR ? 'مسح' : 'Clear'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Table ── */}
      <div className="tour-tx-history" style={{
        backgroundColor: t.elev, border: `1px solid ${t.border}`,
        borderRadius: 4, overflow: 'hidden',
      }}>
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
              {fetching && txList.length === 0 ? (
                <tr>
                  <td colSpan={colCount} style={{ padding: '48px 0', textAlign: 'center' }}>
                    <div style={{
                      width: 22, height: 22, margin: '0 auto', borderRadius: '50%',
                      border: `2px solid ${t.border}`, borderTopColor: typeColor,
                      animation: 'spin 600ms linear infinite',
                    }} />
                  </td>
                </tr>
              ) : txList.length === 0 ? (
                <tr>
                  <td colSpan={colCount} style={{
                    padding: '48px 0', textAlign: 'center',
                    fontFamily: 'ui-monospace, monospace', fontSize: 11,
                    textTransform: 'uppercase', letterSpacing: '0.08em', color: t.fgSubtle,
                  }}>
                    {hasAnyFilter
                      ? (isAR ? 'لا توجد نتائج مطابقة' : 'No matching transactions')
                      : (isIN ? (isAR ? 'لا توجد حركات واردة' : 'No incoming transactions') : (isAR ? 'لا توجد حركات صادرة' : 'No outgoing transactions'))
                    }
                  </td>
                </tr>
              ) : txList.map((tx, idx) => (
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

              {/* Loading more indicator (infinite scroll) */}
              {fetching && txList.length > 0 && (
                <tr>
                  <td colSpan={colCount} style={{ padding: '12px 0', textAlign: 'center' }}>
                    <div style={{
                      width: 18, height: 18, margin: '0 auto', borderRadius: '50%',
                      border: `2px solid ${t.border}`, borderTopColor: typeColor,
                      animation: 'spin 600ms linear infinite',
                    }} />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <InfiniteScrollTrigger
          hasMore={data.total ? (page * LIMIT < data.total) : false}
          onVisible={() => { if (!fetching) setPage(p => p + 1); }}
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

      {/* ── Barcode scanner overlay ── */}
      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={handleBarcodeScan}
      />
    </div>
  );
}

// ── Row sub-component ──────────────────────────────────────────────────────────
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
            {tx.itemId.barcode && ` · ${tx.itemId.barcode}`}
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
        {tx.unitCost > 0 && (
          <div style={{ fontSize: 9, color: t.fgSubtle, fontFamily: 'ui-monospace, monospace', marginTop: 1 }}>
            @ {tx.unitCost.toFixed(2)}
          </div>
        )}
      </td>

      {/* Source / Destination */}
      <td style={{ padding: '10px 14px' }}>
        <span style={{ fontSize: 12, color: t.fgMuted, fontFamily: 'ui-monospace, monospace' }}>
          {locationField || <span style={{ color: t.fgSubtle }}>—</span>}
        </span>
        {tx.notes && (
          <div style={{
            fontSize: 10, color: t.fgSubtle, marginTop: 2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180,
          }}>
            {tx.notes}
          </div>
        )}
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
