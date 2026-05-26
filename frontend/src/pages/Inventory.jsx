import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { T, inputStyle, inputFocus, labelStyle } from '../theme';
import { api } from '../api';
import Icon from '../components/Icon';
import InfiniteScrollTrigger from '../components/InfiniteScrollTrigger';
import LazyScroll from '../components/LazyScroll';
import TxModal from './TxModal';
import Confirm from '../components/Confirm';

const LIMIT = 12;

export default function Inventory() {
  const navigate = useNavigate();
  const { depts, loading: ctxLoading, t: tr, isAR, company, user, removeItem, theme } = useAppContext();
  const t = T[theme] || T.light;
  const primary = company?.primaryColor || '#3b82f6';

  const [search, setSearch] = useState('');
  const [deptF,  setDeptF]  = useState('all');
  const [stF,    setStF]    = useState('all');

  const [items,    setItems]    = useState([]);
  const [total,    setTotal]    = useState(0);
  const [hasMore,  setHasMore]  = useState(false);
  const [page,     setPage]     = useState(1);
  const [fetching, setFetching] = useState(true);
  const [version,  setVersion]  = useState(0);

  const [txModal,      setTxModal]      = useState(false);
  const [txItem,       setTxItem]       = useState(null);
  const [confirmOpen,  setConfirmOpen]  = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  // Focus tracking for inputs
  const [focused, setFocused] = useState('');

  useEffect(() => {
    const f = sessionStorage.getItem('nexinv_inv_filter');
    if (f) { setStF(f); sessionStorage.removeItem('nexinv_inv_filter'); }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setFetching(true);
    const params = { page, limit: LIMIT };
    if (search) params.search = search;
    if (deptF !== 'all') params.dept = deptF;
    if (stF   !== 'all') params.stock = stF;

    api.getItemsPaged(params)
      .then(res => {
        if (!cancelled) {
          const newItems = res.items || [];
          if (page === 1) setItems(newItems);
          else            setItems(prev => [...prev, ...newItems]);
          setTotal(res.total || 0);
          setHasMore(page < (res.pages || 1));
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setFetching(false); });
    return () => { cancelled = true; };
  }, [page, search, deptF, stF, version]);

  useEffect(() => { setPage(1); }, [search, deptF, stF]);

  const refresh = () => { setPage(1); setVersion(v => v + 1); };

  const getStatus = (i) => {
    if (i.qty === 0) return { label: isAR ? 'نفذت' : 'Out',    dot: '#ef4444', fg: '#ef4444', bg: t.negTint     };
    if (i.minThreshold > 0 && i.qty <= i.minThreshold)
      return               { label: isAR ? 'منخفض' : 'Low',   dot: '#f59e0b', fg: '#f59e0b', bg: theme === 'dark' ? '#2b1f0a' : '#fffbeb' };
    return                 { label: isAR ? 'متوفر' : 'OK',    dot: '#16774A', fg: '#16774A', bg: theme === 'dark' ? '#0c1f12' : '#f0fdf4' };
  };

  const openAdd  = ()     => navigate('/item/new');
  const openEdit = (item) => navigate('/item/' + item._id);
  const openTx   = (item) => { setTxItem(item);      setTxModal(true);  };

  const confirmDelete = (item) => { setDeleteTarget(item); setConfirmOpen(true); };
  const handleDelete  = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await removeItem(deleteTarget._id);
      setItems(prev => prev.filter(i => i._id !== deleteTarget._id));
      setTotal(prev => prev - 1);
      setConfirmOpen(false);
    }
    catch { /* toast shown by context */ }
    finally { setDeleting(false); }
  };

  const currencySymbol = company?.baseCurrency || '';

  // ── filter input style helper
  const filterInput = (name, extra = {}) => ({
    ...inputStyle(t),
    height: 36,
    borderColor: focused === name ? primary : t.border,
    boxShadow: focused === name ? `0 0 0 1px ${primary}` : 'none',
    ...extra,
  });

  const selectStyle = (name) => ({
    height: 36, padding: '0 10px', borderRadius: 4,
    border: `1px solid ${focused === name ? primary : t.border}`,
    backgroundColor: t.canvas, color: t.fg,
    fontSize: 13, outline: 'none', fontFamily: 'inherit',
    cursor: 'pointer', transition: 'border-color 120ms, box-shadow 120ms',
    boxShadow: focused === name ? `0 0 0 1px ${primary}` : 'none',
  });

  if (ctxLoading) {
    return (
      <div style={{ flex: 1 }} className="animate-in fade-in duration-500">
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 20,
        }}>
          <div style={{ width: 180, height: 24, borderRadius: 4, backgroundColor: t.border }} className="animate-pulse" />
          <div style={{ width: 100, height: 34, borderRadius: 4, backgroundColor: t.border }} className="animate-pulse" />
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12,
        }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ backgroundColor: t.elev, border: `1px solid ${t.border}`, borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: 160, backgroundColor: t.border }} className="animate-pulse" />
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ height: 14, width: '70%', borderRadius: 3, backgroundColor: t.border }} className="animate-pulse" />
                <div style={{ height: 12, width: '50%', borderRadius: 3, backgroundColor: t.border }} className="animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.fgSubtle }}>
            {tr.inventory}
          </span>
          <span style={{ marginLeft: 8, fontFamily: 'ui-monospace, monospace', fontSize: 11, color: t.fgSubtle }}>
            ({total})
          </span>
        </div>
        {user?.perms?.canAdd && (
          <button
            onClick={openAdd}
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
            <Icon name="add" size={18} /> {tr.addItem}
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
            placeholder={isAR ? 'ابحث بالاسم، SKU، أو الباركود...' : 'Search by name, SKU, or barcode...'}
            style={{ ...filterInput('search'), paddingLeft: 32 }}
            onFocus={() => setFocused('search')}
            onBlur={() => setFocused('')}
          />
        </div>

        {/* Dept filter */}
        <select
          value={deptF}
          onChange={e => setDeptF(e.target.value)}
          style={{ ...selectStyle('deptF'), minWidth: 140 }}
          onFocus={() => setFocused('deptF')}
          onBlur={() => setFocused('')}
        >
          <option value="all">{isAR ? 'جميع الأقسام' : 'All Depts'}</option>
          {depts.map(d => (
            <option key={d._id} value={d._id}>{isAR ? d.name : (d.nameEn || d.name)}</option>
          ))}
        </select>

        {/* Stock status filter */}
        <select
          value={stF}
          onChange={e => setStF(e.target.value)}
          style={{ ...selectStyle('stF'), minWidth: 110 }}
          onFocus={() => setFocused('stF')}
          onBlur={() => setFocused('')}
        >
          <option value="all">{isAR ? 'الجميع' : 'All'}</option>
          <option value="ok">✓ {isAR ? 'متوفر' : 'OK'}</option>
          <option value="low">⚠ {isAR ? 'منخفض' : 'Low'}</option>
          <option value="out">✕ {isAR ? 'نفد' : 'Out'}</option>
        </select>
      </div>

      {/* ── Item grid ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 12,
      }}>
        {/* Loading skeleton */}
        {fetching && items.length === 0 && (
          Array.from({ length: LIMIT }).map((_, i) => (
            <div key={i} style={{ backgroundColor: t.elev, border: `1px solid ${t.border}`, borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: 160, backgroundColor: t.border }} className="animate-pulse" />
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ height: 14, width: '70%', borderRadius: 3, backgroundColor: t.border }} className="animate-pulse" />
                <div style={{ height: 12, width: '50%', borderRadius: 3, backgroundColor: t.border }} className="animate-pulse" />
              </div>
            </div>
          ))
        )}

        {/* Empty state */}
        {!fetching && items.length === 0 && (
          <div style={{
            gridColumn: '1 / -1', padding: '60px 20px', textAlign: 'center',
            backgroundColor: t.elev, border: `1px dashed ${t.border}`, borderRadius: 4,
            color: t.fgSubtle, fontFamily: 'ui-monospace, monospace',
            fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>
            {isAR ? 'لا توجد أصناف مطابقة للبحث' : 'No items match your search'}
          </div>
        )}

        {items.map(item => {
          const dept = depts.find(d => d._id === (item.deptId?._id || item.deptId));
          const st   = getStatus(item);

          return (
            <LazyScroll key={item._id} alwaysRender rootMargin="200px">
              <div
                style={{
                  backgroundColor: t.elev, border: `1px solid ${t.border}`,
                  borderRadius: 4, overflow: 'hidden', cursor: 'pointer',
                  transition: 'border-color 120ms, box-shadow 120ms',
                }}
                onClick={() => openEdit(item)}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = primary;
                  e.currentTarget.style.boxShadow = `0 0 0 1px ${primary}`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = t.border;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Photo area */}
                <div style={{
                  height: 160, backgroundColor: t.sunken,
                  position: 'relative', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                }}>
                  {item.photo ? (
                    <img
                      src={item.photo.startsWith('/') ? `http://localhost:5000${item.photo}` : item.photo}
                      alt={item.name}
                      loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <Icon name="image" size={48} style={{ color: t.border }} />
                  )}

                  {dept && (
                    <div style={{
                      position: 'absolute', top: 8, left: 8,
                      padding: '3px 8px', borderRadius: 3,
                      fontSize: 10, fontWeight: 700, color: '#fff',
                      backgroundColor: dept.color,
                      fontFamily: 'ui-monospace, monospace',
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>
                      {isAR ? dept.name : (dept.nameEn || dept.name)}
                    </div>
                  )}

                  {/* Status dot */}
                  <div style={{
                    position: 'absolute', top: 10, right: 10,
                    width: 8, height: 8, borderRadius: '50%',
                    backgroundColor: st.dot,
                    boxShadow: `0 0 0 2px ${t.elev}`,
                  }} />

                  {item.photos?.length > 1 && (
                    <div style={{
                      position: 'absolute', bottom: 6, right: 6,
                      fontSize: 10, backgroundColor: 'rgba(0,0,0,0.5)',
                      color: '#fff', padding: '2px 6px', borderRadius: 3,
                      fontFamily: 'ui-monospace, monospace',
                    }}>
                      +{item.photos.length - 1}
                    </div>
                  )}
                </div>

                {/* Card body */}
                <div style={{ padding: 14 }}>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontWeight: 700, color: t.fg, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {isAR ? item.name : (item.nameEn || item.name)}
                    </div>
                    {item.datasheet && (
                      <div style={{ fontSize: 11, color: t.fgSubtle, marginTop: 2, fontFamily: 'ui-monospace, monospace' }}>
                        #{item.datasheet}
                      </div>
                    )}
                  </div>

                  {/* Stats row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 10 }}>
                    {/* Qty */}
                    <div style={{
                      backgroundColor: st.bg, borderRadius: 3,
                      padding: '5px 4px', textAlign: 'center',
                    }}>
                      <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: t.fgSubtle }}>
                        {isAR ? 'كمية' : 'Qty'}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: st.fg }}>
                        {item.qty}
                      </div>
                    </div>
                    {/* Price */}
                    <div style={{
                      backgroundColor: t.sunken, borderRadius: 3,
                      padding: '5px 4px', textAlign: 'center',
                    }}>
                      <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: t.fgSubtle }}>
                        {isAR ? 'سعر' : 'Price'}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: t.fgMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {currencySymbol}{item.price}
                      </div>
                    </div>
                    {/* SKU */}
                    <div style={{
                      backgroundColor: t.sunken, borderRadius: 3,
                      padding: '5px 4px', textAlign: 'center', overflow: 'hidden',
                    }}>
                      <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: t.fgSubtle }}>
                        SKU
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: t.fgSubtle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'ui-monospace, monospace' }}>
                        {item.sku || '—'}
                      </div>
                    </div>
                  </div>

                  {/* Stock level bar */}
                  {item.minThreshold > 0 && (
                    <div style={{ height: 3, backgroundColor: t.border, borderRadius: 2, overflow: 'hidden', marginBottom: 10 }}>
                      <div style={{
                        height: '100%', borderRadius: 2, backgroundColor: st.dot,
                        width: `${Math.min(100, (item.qty / Math.max(item.minThreshold * 3, 1)) * 100)}%`,
                        transition: 'width 300ms',
                      }} />
                    </div>
                  )}

                  {/* Action buttons */}
                  <div
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      paddingTop: 10, borderTop: `1px solid ${t.border}`,
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    <span style={{ fontSize: 10, fontFamily: 'ui-monospace, monospace', color: t.fgSubtle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 80 }}>
                      {item.barcode || '—'}
                    </span>
                    <div style={{ display: 'flex', gap: 2 }}>
                      {user?.perms?.canTx && (
                        <button
                          onClick={() => openTx(item)}
                          title={isAR ? 'تسجيل حركة' : 'Record Transaction'}
                          style={{ background: 'transparent', border: 'none', borderRadius: 4, cursor: 'pointer', color: t.fgMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 5, transition: 'background 120ms, color 120ms', width: 28, height: 28 }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = primary + '1a'; e.currentTarget.style.color = primary; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = t.fgMuted; }}
                        >
                          <Icon name="swap" size={15} />
                        </button>
                      )}
                      {user?.perms?.canEdit && (
                        <button
                          onClick={() => openEdit(item)}
                          title={tr.edit}
                          style={{ background: 'transparent', border: 'none', borderRadius: 4, cursor: 'pointer', color: t.fgMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 5, transition: 'background 120ms, color 120ms', width: 28, height: 28 }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f59e0b1a'; e.currentTarget.style.color = '#f59e0b'; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = t.fgMuted; }}
                        >
                          <Icon name="edit" size={15} />
                        </button>
                      )}
                      {user?.perms?.canDelete && (
                        <button
                          onClick={() => confirmDelete(item)}
                          title={tr.delete}
                          style={{ background: 'transparent', border: 'none', borderRadius: 4, cursor: 'pointer', color: t.fgMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 5, transition: 'background 120ms, color 120ms', width: 28, height: 28 }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = t.negTint; e.currentTarget.style.color = t.neg; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = t.fgMuted; }}
                        >
                          <Icon name="delete" size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </LazyScroll>
          );
        })}
      </div>

      {/* Infinite scroll trigger */}
      <InfiniteScrollTrigger hasMore={hasMore && !fetching} onVisible={() => setPage(p => p + 1)} />

      {/* Loading more spinner */}
      {fetching && items.length > 0 && (
        <div style={{ padding: '20px 0', display: 'flex', justifyContent: 'center' }}>
          <div style={{
            width: 20, height: 20, borderRadius: '50%',
            border: `2px solid ${t.border}`, borderTopColor: primary,
            animation: 'spin 600ms linear infinite',
          }} />
        </div>
      )}

      {/* ── Modals ── */}
      <TxModal
        open={txModal}
        onClose={() => { setTxModal(false); setTxItem(null); }}
        editTx={txItem ? { itemId: txItem } : null}
        onSaved={refresh}
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
