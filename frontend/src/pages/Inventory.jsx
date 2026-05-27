import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { T, inputStyle, inputFocus, labelStyle } from '../theme';
import { api } from '../api';
import Icon from '../components/Icon';
import InfiniteScrollTrigger from '../components/InfiniteScrollTrigger';
import LazyScroll from '../components/LazyScroll';
import TxModal from './TxModal';
import Confirm from '../components/Confirm';
import BarcodeScanner from '../components/BarcodeScanner';

const LIMIT = 12;

export default function Inventory() {
  const navigate = useNavigate();
  const { depts, cats, loading: ctxLoading, t: tr, isAR, company, user, removeItem, theme } = useAppContext();
  const t = T[theme] || T.light;
  const primary = company?.primaryColor || '#3b82f6';

  const [search,      setSearch]      = useState('');
  const [deptF,       setDeptF]       = useState('all');
  const [catF,        setCatF]        = useState('all');
  const [stF,         setStF]         = useState('all');
  const [barcodeF,    setBarcodeF]    = useState('all');
  const [photoF,      setPhotoF]      = useState('all');
  const [typeF,       setTypeF]       = useState('all');
  const [favF,        setFavF]        = useState('');
  const [descF,       setDescF]       = useState('all');
  const [priceMin,    setPriceMin]    = useState('');
  const [priceMax,    setPriceMax]    = useState('');
  const [moreOpen,    setMoreOpen]    = useState(false);

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

  // ── Barcode scanner ───────────────────────────────────────────────────────
  const [scannerOpen, setScannerOpen] = useState(false);

  const handleBarcodeScan = useCallback((code) => {
    setScannerOpen(false);
    setSearch(code);   // populate search → triggers re-fetch filtering by name/SKU/barcode
    setPage(1);
  }, []);

  useEffect(() => {
    const f = sessionStorage.getItem('nexinv_inv_filter');
    if (f) { setStF(f); sessionStorage.removeItem('nexinv_inv_filter'); }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setFetching(true);
    const params = { page, limit: LIMIT };
    if (search)            params.search         = search;
    if (deptF  !== 'all') params.dept            = deptF;
    if (catF   !== 'all') params.cat             = catF;
    if (stF    !== 'all') params.stock           = stF;
    if (barcodeF !== 'all') params.barcode       = barcodeF;
    if (photoF !== 'all') params.photo           = photoF;
    if (typeF  !== 'all') params.type            = typeF;
    if (favF)             params.favorites       = '1';
    if (descF  !== 'all') params.hasDescription  = descF;
    if (priceMin)         params.priceMin        = priceMin;
    if (priceMax)         params.priceMax        = priceMax;

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
  }, [page, search, deptF, catF, stF, barcodeF, photoF, typeF, favF, descF, priceMin, priceMax, version]);

  useEffect(() => { setPage(1); }, [search, deptF, catF, stF, barcodeF, photoF, typeF, favF, descF, priceMin, priceMax]);

  const refresh = () => { setPage(1); setVersion(v => v + 1); };

  const clearFilters = () => {
    setSearch(''); setDeptF('all'); setCatF('all'); setStF('all');
    setBarcodeF('all'); setPhotoF('all'); setTypeF('all');
    setFavF(''); setDescF('all'); setPriceMin(''); setPriceMax('');
  };
  const hasActiveFilters = search || deptF !== 'all' || catF !== 'all' || stF !== 'all' ||
    barcodeF !== 'all' || photoF !== 'all' || typeF !== 'all' || favF || descF !== 'all' || priceMin || priceMax;

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
            className="tour-add-item"
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
      <div className="tour-inventory-filters" style={{
        backgroundColor: t.elev, border: `1px solid ${t.border}`,
        borderRadius: 4, padding: '12px 14px',
      }}>
        {/* ── Row 1: primary filters ── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>

          {/* Search + scan */}
          <div className="tour-inventory-search" style={{ display: 'flex', gap: 6, flex: '1 1 200px', minWidth: 180 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Icon name="search" size={15} style={{
                position: 'absolute', top: '50%', left: 10, transform: 'translateY(-50%)',
                color: t.fgSubtle, pointerEvents: 'none',
              }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={isAR ? 'ابحث بالاسم، SKU، الباركود، أو الوصف...' : 'Search name, SKU, barcode or description…'}
                style={{ ...filterInput('search'), paddingLeft: 32, width: '100%', boxSizing: 'border-box' }}
                onFocus={() => setFocused('search')}
                onBlur={() => setFocused('')}
              />
            </div>
            {/* Camera barcode scan */}
            <button
              type="button"
              onClick={() => setScannerOpen(true)}
              title={isAR ? 'مسح الباركود بالكاميرا' : 'Scan barcode with camera'}
              style={{
                width: 34, height: 34, borderRadius: 4, flexShrink: 0,
                border: `1px solid ${t.border}`,
                backgroundColor: 'transparent',
                color: t.fgMuted,
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

          {/* Department */}
          <select value={deptF} onChange={e => { setDeptF(e.target.value); setCatF('all'); }}
            style={{ ...selectStyle('deptF'), flex: '0 1 150px' }}
            onFocus={() => setFocused('deptF')} onBlur={() => setFocused('')}>
            <option value="all">{isAR ? 'جميع الأقسام' : 'All Depts'}</option>
            {depts.map(d => <option key={d._id} value={d._id}>{isAR ? d.name : (d.nameEn || d.name)}</option>)}
          </select>

          {/* Category — filtered by dept */}
          <select value={catF} onChange={e => setCatF(e.target.value)}
            style={{ ...selectStyle('catF'), flex: '0 1 150px' }}
            onFocus={() => setFocused('catF')} onBlur={() => setFocused('')}>
            <option value="all">{isAR ? 'جميع التصنيفات' : 'All Categories'}</option>
            {(deptF === 'all' ? cats : cats.filter(c => {
              const cDept = typeof c.deptId === 'object' ? c.deptId?._id : c.deptId;
              return cDept === deptF;
            })).map(c => <option key={c._id} value={c._id}>{isAR ? c.name : (c.nameEn || c.name)}</option>)}
          </select>

          {/* Stock */}
          <select value={stF} onChange={e => setStF(e.target.value)}
            style={{ ...selectStyle('stF'), flex: '0 1 120px' }}
            onFocus={() => setFocused('stF')} onBlur={() => setFocused('')}>
            <option value="all">{isAR ? 'كل المخزون' : 'All Stock'}</option>
            <option value="ok">✓ {isAR ? 'متوفر' : 'OK'}</option>
            <option value="low">⚠ {isAR ? 'منخفض' : 'Low'}</option>
            <option value="out">✕ {isAR ? 'نفد' : 'Out'}</option>
          </select>

          {/* More / Clear row */}
          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
            {/* Favorites toggle */}
            <button
              onClick={() => setFavF(f => f ? '' : '1')}
              title={isAR ? 'المفضلة فقط' : 'Favorites only'}
              style={{
                height: 36, width: 36, borderRadius: 4, border: `1px solid ${favF ? '#f59e0b' : t.border}`,
                backgroundColor: favF ? '#f59e0b22' : 'transparent',
                color: favF ? '#f59e0b' : t.fgSubtle,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 17, transition: 'all 120ms', flexShrink: 0,
              }}
            >★</button>

            {/* More filters toggle */}
            <button
              onClick={() => setMoreOpen(o => !o)}
              style={{
                height: 36, padding: '0 12px', borderRadius: 4,
                border: `1px solid ${moreOpen ? primary : t.border}`,
                backgroundColor: moreOpen ? `${primary}18` : 'transparent',
                color: moreOpen ? primary : t.fgSubtle,
                cursor: 'pointer', fontSize: 12, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 5,
                transition: 'all 120ms', flexShrink: 0, fontFamily: 'inherit',
              }}
            >
              <Icon name="filter" size={14} />
              {isAR ? 'فلاتر إضافية' : 'More filters'}
              {/* Active-extra-filter count badge */}
              {(barcodeF !== 'all' || photoF !== 'all' || typeF !== 'all' || descF !== 'all' || priceMin || priceMax) && (
                <span style={{
                  backgroundColor: primary, color: '#fff',
                  borderRadius: 10, fontSize: 10, fontWeight: 700,
                  padding: '1px 5px', lineHeight: 1.4,
                }}>
                  {[barcodeF !== 'all', photoF !== 'all', typeF !== 'all', descF !== 'all', !!priceMin, !!priceMax].filter(Boolean).length}
                </span>
              )}
            </button>

            {/* Clear all */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                title={isAR ? 'مسح الفلاتر' : 'Clear filters'}
                style={{
                  height: 36, padding: '0 10px', borderRadius: 4,
                  border: `1px solid ${t.border}`, backgroundColor: 'transparent',
                  color: t.neg, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 4,
                  transition: 'all 120ms', flexShrink: 0, fontFamily: 'inherit',
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = t.negTint; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <Icon name="close" size={13} />
                {isAR ? 'مسح' : 'Clear'}
              </button>
            )}
          </div>
        </div>

        {/* ── Row 2: extra filters (collapsible) ── */}
        {moreOpen && (
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center',
            marginTop: 10, paddingTop: 10,
            borderTop: `1px dashed ${t.border}`,
          }}>

            {/* Barcode */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: t.fgSubtle, textTransform: 'uppercase', fontFamily: 'ui-monospace, monospace', letterSpacing: '0.06em' }}>
                {isAR ? 'الباركود' : 'Barcode'}
              </span>
              <select value={barcodeF} onChange={e => setBarcodeF(e.target.value)}
                style={{ ...selectStyle('barcodeF'), minWidth: 140 }}
                onFocus={() => setFocused('barcodeF')} onBlur={() => setFocused('')}>
                <option value="all">{isAR ? 'الكل' : 'All'}</option>
                <option value="has">▣ {isAR ? 'لديه باركود' : 'Has barcode'}</option>
                <option value="none">○ {isAR ? 'بدون باركود' : 'No barcode'}</option>
              </select>
            </div>

            {/* Photo */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: t.fgSubtle, textTransform: 'uppercase', fontFamily: 'ui-monospace, monospace', letterSpacing: '0.06em' }}>
                {isAR ? 'الصورة' : 'Photo'}
              </span>
              <select value={photoF} onChange={e => setPhotoF(e.target.value)}
                style={{ ...selectStyle('photoF'), minWidth: 140 }}
                onFocus={() => setFocused('photoF')} onBlur={() => setFocused('')}>
                <option value="all">{isAR ? 'الكل' : 'All'}</option>
                <option value="has">🖼 {isAR ? 'لديه صورة' : 'Has photo'}</option>
                <option value="none">□ {isAR ? 'بدون صورة' : 'No photo'}</option>
              </select>
            </div>

            {/* Type */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: t.fgSubtle, textTransform: 'uppercase', fontFamily: 'ui-monospace, monospace', letterSpacing: '0.06em' }}>
                {isAR ? 'النوع' : 'Type'}
              </span>
              <select value={typeF} onChange={e => setTypeF(e.target.value)}
                style={{ ...selectStyle('typeF'), minWidth: 130 }}
                onFocus={() => setFocused('typeF')} onBlur={() => setFocused('')}>
                <option value="all">{isAR ? 'جميع الأنواع' : 'All Types'}</option>
                <option value="unit">{isAR ? 'قطعة' : 'Unit'}</option>
                <option value="package">{isAR ? 'حزمة' : 'Package'}</option>
                <option value="service">{isAR ? 'خدمة' : 'Service'}</option>
                <option value="raw">{isAR ? 'مادة خام' : 'Raw Material'}</option>
              </select>
            </div>

            {/* Description */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: t.fgSubtle, textTransform: 'uppercase', fontFamily: 'ui-monospace, monospace', letterSpacing: '0.06em' }}>
                {isAR ? 'الوصف' : 'Description'}
              </span>
              <select value={descF} onChange={e => setDescF(e.target.value)}
                style={{ ...selectStyle('descF'), minWidth: 140 }}
                onFocus={() => setFocused('descF')} onBlur={() => setFocused('')}>
                <option value="all">{isAR ? 'الكل' : 'All'}</option>
                <option value="yes">✓ {isAR ? 'لديه وصف' : 'Has description'}</option>
                <option value="no">✕ {isAR ? 'بدون وصف' : 'No description'}</option>
              </select>
            </div>

            {/* Price range */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: t.fgSubtle, textTransform: 'uppercase', fontFamily: 'ui-monospace, monospace', letterSpacing: '0.06em' }}>
                {isAR ? 'نطاق السعر' : 'Price range'}
              </span>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <input
                  type="number" min="0" value={priceMin}
                  onChange={e => setPriceMin(e.target.value)}
                  placeholder={isAR ? 'من' : 'Min'}
                  style={{ ...filterInput('priceMin'), width: 72, textAlign: 'center' }}
                  onFocus={() => setFocused('priceMin')} onBlur={() => setFocused('')}
                />
                <span style={{ color: t.fgSubtle, fontSize: 11 }}>—</span>
                <input
                  type="number" min="0" value={priceMax}
                  onChange={e => setPriceMax(e.target.value)}
                  placeholder={isAR ? 'إلى' : 'Max'}
                  style={{ ...filterInput('priceMax'), width: 72, textAlign: 'center' }}
                  onFocus={() => setFocused('priceMax')} onBlur={() => setFocused('')}
                />
                {company?.baseCurrency && (
                  <span style={{ fontSize: 11, color: t.fgSubtle, fontFamily: 'ui-monospace, monospace' }}>
                    {company.baseCurrency}
                  </span>
                )}
              </div>
            </div>

          </div>
        )}

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {[
              search     && { label: `"${search}"`,                           clear: () => setSearch('') },
              deptF !== 'all' && { label: (isAR ? 'قسم: ' : 'Dept: ') + (depts.find(d => d._id === deptF)?.[isAR ? 'name' : 'nameEn'] || deptF), clear: () => { setDeptF('all'); setCatF('all'); } },
              catF  !== 'all' && { label: (isAR ? 'تصنيف: ' : 'Cat: ')  + (cats.find(c => c._id === catF)?.[isAR ? 'name' : 'nameEn'] || catF),   clear: () => setCatF('all') },
              stF   !== 'all' && { label: (isAR ? 'مخزون: ' : 'Stock: ') + stF,   clear: () => setStF('all') },
              barcodeF !== 'all' && { label: barcodeF === 'has' ? (isAR ? 'لديه باركود' : 'Has barcode') : (isAR ? 'بدون باركود' : 'No barcode'), clear: () => setBarcodeF('all') },
              photoF !== 'all' && { label: photoF === 'has' ? (isAR ? 'لديه صورة' : 'Has photo') : (isAR ? 'بدون صورة' : 'No photo'), clear: () => setPhotoF('all') },
              typeF  !== 'all' && { label: (isAR ? 'نوع: ' : 'Type: ') + typeF,   clear: () => setTypeF('all') },
              descF  !== 'all' && { label: descF === 'yes' ? (isAR ? 'لديه وصف' : 'Has desc') : (isAR ? 'بدون وصف' : 'No desc'), clear: () => setDescF('all') },
              favF               && { label: isAR ? 'المفضلة' : 'Favorites',         clear: () => setFavF('') },
              priceMin           && { label: (isAR ? 'من ' : 'Min ') + priceMin,     clear: () => setPriceMin('') },
              priceMax           && { label: (isAR ? 'إلى ' : 'Max ') + priceMax,    clear: () => setPriceMax('') },
            ].filter(Boolean).map((chip, i) => (
              <span key={i} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                backgroundColor: `${primary}18`, color: primary,
                border: `1px solid ${primary}44`, borderRadius: 100,
                fontSize: 11, fontWeight: 600, padding: '2px 8px 2px 10px',
              }}>
                {chip.label}
                <button onClick={chip.clear} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: primary, padding: 0, display: 'flex', alignItems: 'center',
                  fontSize: 13, lineHeight: 1,
                }}>×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Item grid ── */}
      <div className="tour-inventory-table" style={{
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

      {/* ── Barcode scanner overlay (inventory search) ── */}
      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={handleBarcodeScan}
      />
    </div>
  );
}
