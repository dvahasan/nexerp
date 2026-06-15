import { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { api } from '../api';
import { T } from '../theme';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import Confirm from '../components/Confirm';

/* ── Design tokens ──────────────────────────────────────────────────────────── */

const defaultWhForm = {
  code: '', name: '', nameEn: '', location: '',
  type: 'PHYSICAL', latitude: '', longitude: '', mapLink: '',
  length: '', width: '', height: '',
  usableAreaPct: '0.85', palletFootprint: '0.96',
  capacityUnit: 'pallets', notes: '',
};

const defaultBinForm = {
  code: '', zone: '', aisle: '', level: '', capacity: '1', notes: '',
};

export default function Warehouses() {
  const { theme, company, isAR, showToast, user, socketStatus, liveTx } = useAppContext();
  const t = T[theme] || T.light;
  const primary = company?.primaryColor || '#3b82f6';

  const isOwner = user?.role === 'owner';
  const canManage = isOwner || user?.perms?.canManageDepts;

  // ── State ─────────────────────────────────────────────────────────────────
  const [warehouses,    setWarehouses]    = useState([]);
  const [selected,      setSelected]      = useState(null); // warehouse detail
  const [loading,       setLoading]       = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [silentRefresh, setSilentRefresh] = useState(0);

  // Warehouse modal
  const [whModal,   setWhModal]   = useState(false);
  const [whForm,    setWhForm]    = useState({ ...defaultWhForm });
  const [editWh,    setEditWh]    = useState(null);
  const [whSaving,  setWhSaving]  = useState(false);

  // Bin modal
  const [binModal,  setBinModal]  = useState(false);
  const [binForm,   setBinForm]   = useState({ ...defaultBinForm });
  const [editBin,   setEditBin]   = useState(null);
  const [binSaving, setBinSaving] = useState(false);

  // Confirm delete
  const [confirmOpen,    setConfirmOpen]    = useState(false);
  const [confirmTarget,  setConfirmTarget]  = useState(null); // { type:'wh'|'bin', id }
  const [deleting,       setDeleting]       = useState(false);

  // ── Fetch warehouses list ─────────────────────────────────────────────────
  const loadWarehouses = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.getWarehouses();
      setWarehouses(Array.isArray(data) ? data : []);
    } catch { /* silent */ }
    finally { if (!silent) setLoading(false); }
  }, []);

  useEffect(() => { loadWarehouses(silentRefresh > 0); }, [loadWarehouses, silentRefresh]);

  // ── Polling fallback for fastRefresh ──
  useEffect(() => {
    if (socketStatus === 'online' || !(company?.fastRefresh ?? true)) return;
    const id = setInterval(() => setSilentRefresh(p => p + 1), 30000);
    return () => clearInterval(id);
  }, [socketStatus, company?.fastRefresh]);

  // ── Fetch selected warehouse detail ───────────────────────────────────────
  const loadDetail = useCallback(async (id) => {
    setDetailLoading(true);
    try {
      const data = await api.getWarehouse(id);
      setSelected(data);
    } catch { setSelected(null); }
    finally { setDetailLoading(false); }
  }, []);

  // ── Live Sync Refetch ──
  useEffect(() => {
    if (liveTx?.type === 'refresh_warehouses') {
      setSilentRefresh(p => p + 1);
      // also reload detail if currently selected
      if (selected) {
        loadDetail(selected._id);
      }
    }
  }, [liveTx, selected, loadDetail]);

  // ── Warehouse CRUD ────────────────────────────────────────────────────────
  const openAddWh  = ()       => { setEditWh(null); setWhForm({ ...defaultWhForm }); setWhModal(true); };
  const openEditWh = (wh)     => { setEditWh(wh);   setWhForm({ ...defaultWhForm, ...wh, usableAreaPct: (wh.usableAreaPct * 100).toFixed(0) }); setWhModal(true); };

  const handleWhSubmit = async (e) => {
    e.preventDefault();
    if (whForm.mapLink && !whForm.mapLink.includes('<iframe')) {
      showToast(isAR ? 'الرابط غير صالح. يرجى إدخال كود التضمين (iframe) الصحيح.' : 'Invalid link. Please provide a valid embed iframe HTML.', 'error');
      return;
    }
    setWhSaving(true);
    try {
      const payload = {
        ...whForm,
        latitude:     parseFloat(whForm.latitude)     || undefined,
        longitude:    parseFloat(whForm.longitude)    || undefined,
        mapLink:      whForm.mapLink || '',
        length:       parseFloat(whForm.length)       || 0,
        width:        parseFloat(whForm.width)        || 0,
        height:       parseFloat(whForm.height)       || 0,
        usableAreaPct: parseFloat(whForm.usableAreaPct) / 100 || 0.85,
        palletFootprint: parseFloat(whForm.palletFootprint) || 0.96,
      };
      if (editWh) {
        await api.updateWarehouse(editWh._id, payload);
        showToast(isAR ? 'تم تعديل المستودع' : 'Warehouse updated');
      } else {
        await api.addWarehouse(payload);
        showToast(isAR ? 'تمت إضافة المستودع' : 'Warehouse created');
      }
      setWhModal(false);
      loadWarehouses();
      if (selected?._id === editWh?._id) loadDetail(editWh._id);
    } catch (err) {
      showToast(err.message || 'Error', 'error');
    } finally { setWhSaving(false); }
  };

  // ── Bin CRUD ──────────────────────────────────────────────────────────────
  const openAddBin  = ()    => { setEditBin(null); setBinForm({ ...defaultBinForm }); setBinModal(true); };
  const openEditBin = (bin) => { setEditBin(bin);  setBinForm({ ...defaultBinForm, ...bin }); setBinModal(true); };

  const handleBinSubmit = async (e) => {
    e.preventDefault();
    if (!selected) return;
    setBinSaving(true);
    try {
      const payload = { ...binForm, warehouseId: selected._id, capacity: parseInt(binForm.capacity) || 1 };
      if (editBin) {
        await api.updateBin(editBin._id, payload);
        showToast(isAR ? 'تم تعديل المكان' : 'Bin updated');
      } else {
        await api.addBin(payload);
        showToast(isAR ? 'تمت إضافة المكان' : 'Bin created');
      }
      setBinModal(false);
      loadDetail(selected._id);
    } catch (err) {
      showToast(err.message || 'Error', 'error');
    } finally { setBinSaving(false); }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!confirmTarget) return;
    setDeleting(true);
    try {
      if (confirmTarget.type === 'wh') {
        await api.deleteWarehouse(confirmTarget.id);
        if (selected?._id === confirmTarget.id) setSelected(null);
        loadWarehouses();
        showToast(isAR ? 'تم حذف المستودع' : 'Warehouse deleted');
      } else {
        await api.deleteBin(confirmTarget.id);
        loadDetail(selected._id);
        showToast(isAR ? 'تم حذف المكان' : 'Bin deleted');
      }
      setConfirmOpen(false);
    } catch (err) {
      showToast(err.message || 'Error', 'error');
    } finally { setDeleting(false); }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const inp = (extra = {}) => ({
    width: '100%', height: 34, padding: '0 10px', borderRadius: 4,
    border: `1px solid ${t.border}`, backgroundColor: t.canvas, color: t.fg,
    fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
    ...extra,
  });
  const setWh = (k, v) => setWhForm(p => ({ ...p, [k]: v }));
  const setBin = (k, v) => setBinForm(p => ({ ...p, [k]: v }));

  const lbl = (text, required = false) => (
    <label style={{
      display: 'block', fontFamily: 'ui-monospace, monospace',
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.08em', color: t.fgSubtle, marginBottom: 4,
    }}>
      {text}{required && <span style={{ color: t.neg }}> *</span>}
    </label>
  );

  // Capacity bar color
  const barColor = (pct) => {
    if (pct >= 85) return '#ef4444';
    if (pct >= 60) return '#f59e0b';
    return '#10b981';
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="tour-warehouse-page animate-in fade-in duration-300" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 900, color: t.fg, letterSpacing: '-0.02em', margin: '0 0 4px' }}>
            {isAR ? '🏭 المستودعات' : '🏭 Warehouses'}
          </h1>
          <p style={{ fontSize: 12, color: t.fgMuted, margin: 0 }}>
            {isAR
              ? 'إدارة المستودعات والمواقع والسعة التخزينية'
              : 'Manage warehouses, bin locations, and storage capacity'}
          </p>
        </div>
        {canManage && (
          <button
            onClick={openAddWh}
            style={{
              height: 34, padding: '0 16px', borderRadius: 4,
              backgroundColor: primary, color: '#fff', border: 'none',
              cursor: 'pointer', fontSize: 13, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            <Icon name="add" size={16} />
            {isAR ? 'إضافة مستودع' : 'Add Warehouse'}
          </button>
        )}
      </div>

      {/* ── Content: master list + detail panel ── */}
      <div className={`grid gap-3 ${selected ? 'grid-cols-1 md:grid-cols-[320px_1fr]' : 'grid-cols-1'}`}>

        {/* ── Warehouse list ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading ? (
            <div style={{ padding: '48px 0', textAlign: 'center' }}>
              <div style={{ width: 22, height: 22, margin: '0 auto', borderRadius: '50%', border: `2px solid ${t.border}`, borderTopColor: primary, animation: 'spin 600ms linear infinite' }} />
            </div>
          ) : warehouses.length === 0 ? (
            <div style={{
              padding: '48px 24px', textAlign: 'center',
              backgroundColor: t.elev, border: `1px solid ${t.border}`,
              borderRadius: 4,
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🏭</div>
              <p style={{ color: t.fgMuted, fontSize: 13 }}>
                {isAR ? 'لا توجد مستودعات بعد. أضف مستودعاً لبدء التتبع.' : 'No warehouses yet. Add one to start tracking capacity.'}
              </p>
            </div>
          ) : (
            warehouses.map(wh => (
              <div
                key={wh._id}
                onClick={() => { setSelected(wh._id === selected?._id ? null : wh); loadDetail(wh._id); }}
                style={{
                  backgroundColor: t.elev, border: `1px solid ${selected?._id === wh._id ? primary : t.border}`,
                  borderRadius: 4, padding: 14, cursor: 'pointer',
                  transition: 'all 120ms',
                  boxShadow: selected?._id === wh._id ? `0 0 0 1px ${primary}30` : 'none',
                }}
                onMouseEnter={e => { if (selected?._id !== wh._id) e.currentTarget.style.borderColor = t.fgSubtle; }}
                onMouseLeave={e => { if (selected?._id !== wh._id) e.currentTarget.style.borderColor = t.border; }}
              >
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 800,
                        backgroundColor: `${primary}18`, color: primary,
                        padding: '2px 6px', borderRadius: 3,
                      }}>
                        {wh.code}
                      </span>
                      {wh.alert85 && (
                        <span style={{
                          fontFamily: 'ui-monospace, monospace', fontSize: 9, fontWeight: 800,
                          backgroundColor: '#ef444418', color: '#ef4444',
                          padding: '2px 6px', borderRadius: 3,
                        }}>⚠ 85%</span>
                      )}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: t.fg, marginTop: 3 }}>
                      {isAR ? wh.name : (wh.nameEn || wh.name)}
                    </div>
                    {wh.location && (
                      <div style={{ fontSize: 11, color: t.fgSubtle, marginTop: 1 }}>📍 {wh.location}</div>
                    )}
                  </div>
                  {canManage && (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        onClick={e => { e.stopPropagation(); openEditWh(wh); }}
                        style={{ width: 26, height: 26, borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: t.fgSubtle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = t.sunken; e.currentTarget.style.color = primary; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = t.fgSubtle; }}
                      >
                        <Icon name="edit" size={13} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmTarget({ type: 'wh', id: wh._id }); setConfirmOpen(true); }}
                        style={{ width: 26, height: 26, borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: t.fgSubtle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = t.negTint; e.currentTarget.style.color = t.neg; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = t.fgSubtle; }}
                      >
                        <Icon name="delete" size={13} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Dimensions */}
                {(wh.length > 0 || wh.width > 0) && (
                  <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, color: t.fgSubtle, marginBottom: 8 }}>
                    {wh.length}m × {wh.width}m × {wh.height}m
                    {' · '}
                    {wh.maxPallets} {isAR ? 'بليت' : 'pallets'}
                  </div>
                )}

                {/* Capacity bar */}
                {wh.maxPallets > 0 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 9, color: t.fgSubtle, textTransform: 'uppercase' }}>
                        {isAR ? 'الإشغال' : 'Occupancy'}
                      </span>
                      <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 9, fontWeight: 700, color: barColor(wh.occupancyPct || 0) }}>
                        {(wh.occupancyPct || 0).toFixed(1)}%
                      </span>
                    </div>
                    <div style={{ height: 4, backgroundColor: t.sunken, borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${Math.min(100, wh.occupancyPct || 0)}%`,
                        backgroundColor: barColor(wh.occupancyPct || 0),
                        borderRadius: 2, transition: 'width 600ms ease-out',
                      }} />
                    </div>
                    <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 9, color: t.fgSubtle, marginTop: 3 }}>
                      {(wh.usedPallets || 0).toFixed(1)} / {wh.maxPallets} {isAR ? 'بليت مستخدم' : 'pallets used'}
                    </div>
                    {wh.alert85 && (
                      <div style={{
                        marginTop: 6, padding: '4px 8px', borderRadius: 3,
                        backgroundColor: '#ef444418', border: '1px solid #ef444430',
                        fontFamily: 'ui-monospace, monospace', fontSize: 9, color: '#ef4444',
                      }}>
                        ⚠ {isAR ? 'تجاوز عتبة الـ 85% — خطر "التجويف"' : '85% threshold exceeded — Honeycombing risk'}
                      </div>
                    )}
                  </div>
                )}

                <div style={{ marginTop: 8, fontFamily: 'ui-monospace, monospace', fontSize: 9, color: t.fgSubtle }}>
                  {wh.itemCount || 0} {isAR ? 'صنف' : 'items'}
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Detail panel ── */}
        {selected && (
          <div className="detail-modal" style={{ backgroundColor: t.elev, border: `1px solid ${t.border}`, borderRadius: 4, padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {detailLoading ? (
              <div style={{ padding: '48px 0', textAlign: 'center' }}>
                <div style={{ width: 22, height: 22, margin: '0 auto', borderRadius: '50%', border: `2px solid ${t.border}`, borderTopColor: primary, animation: 'spin 600ms linear infinite' }} />
              </div>
            ) : (
              <>
                {/* Warehouse header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: t.fg }}>
                      {isAR ? selected.name : (selected.nameEn || selected.name)}
                    </div>
                    <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: t.fgSubtle, marginTop: 2 }}>
                      [{selected.code}]{selected.location ? ` · 📍 ${selected.location}` : ''}
                    </div>
                  </div>
                  <button onClick={() => setSelected(null)} style={{ width: 28, height: 28, border: 'none', background: 'transparent', cursor: 'pointer', color: t.fgSubtle, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4 }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = t.sunken; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
                    <Icon name="close" size={14} />
                  </button>
                </div>

                {/* Map Viewer */}
                {selected.type === 'PHYSICAL' && (selected.latitude || selected.mapLink) && (
                  <div style={{ marginTop: 10, marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: t.fg }}>{isAR ? 'الموقع على الخريطة' : 'Map Location'}</div>
                      <button onClick={() => {
                        let url = `https://www.google.com/maps/search/?api=1&query=${selected.latitude || 0},${selected.longitude || 0}`;
                        if (selected.mapLink && selected.mapLink.includes('src=')) {
                          const match = selected.mapLink.match(/src="([^"]+)"/);
                          if (match) url = match[1];
                        } else if (selected.mapLink && !selected.mapLink.includes('<iframe')) {
                          url = selected.mapLink;
                        }
                        if (navigator.share) {
                          navigator.share({ title: selected.name, url }).catch(()=>{});
                        } else {
                          window.open(url, '_blank');
                        }
                      }} style={{ height: 26, padding: '0 10px', borderRadius: 4, backgroundColor: 'transparent', color: primary, border: `1px solid ${primary}40`, cursor: 'pointer', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Icon name="share" size={12} />
                        {isAR ? 'مشاركة الموقع' : 'Share Location'}
                      </button>
                    </div>
                    <div style={{ width: '100%', height: 200, borderRadius: 6, overflow: 'hidden', border: `1px solid ${t.border}` }}>
                      {selected.mapLink && selected.mapLink.includes('embed') ? (
                         <iframe
                          width="100%" height="100%" frameBorder="0" style={{ border: 0 }}
                          src={selected.mapLink.match(/src="([^"]+)"/) ? selected.mapLink.match(/src="([^"]+)"/)[1] : selected.mapLink}
                          allowFullScreen
                         />
                      ) : selected.latitude && selected.longitude ? (
                        company?.googleMapsApiKey ? (
                          <iframe
                            width="100%" height="100%" frameBorder="0" style={{ border: 0 }}
                            src={`https://www.google.com/maps/embed/v1/place?key=${company.googleMapsApiKey}&q=${selected.latitude},${selected.longitude}`}
                            allowFullScreen
                          />
                        ) : (
                          <iframe
                            width="100%" height="100%" frameBorder="0" style={{ border: 0 }}
                            src={`https://maps.google.com/maps?q=${selected.latitude},${selected.longitude}&z=15&output=embed`}
                            allowFullScreen
                          />
                        )
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: t.sunken, color: t.fgMuted, fontSize: 12, padding: 20, textAlign: 'center' }}>
                          {isAR ? 'معاينة الخريطة غير متاحة لهذا الرابط. استخدم زر المشاركة أو أدخل إحداثيات خط الطول والعرض.' : 'Map preview not available for this link. Click Share or provide Latitude/Longitude.'}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Capacity stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {[
                    { label: isAR ? 'المساحة الصالحة' : 'Usable Area', value: `${selected.usableArea || 0} m²` },
                    { label: isAR ? 'أقصى بليت' : 'Max Pallets', value: selected.maxPallets || 0 },
                    { label: isAR ? 'الحجم الكلي' : 'Total Volume', value: `${selected.totalVolume || 0} m³` },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ backgroundColor: t.sunken, borderRadius: 4, padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em', color: t.fgSubtle, marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: t.fg }}>{value}</div>
                    </div>
                  ))}
                </div>

                {/* Occupancy bar (large) */}
                {selected.maxPallets > 0 && (
                  <div style={{ backgroundColor: t.sunken, borderRadius: 4, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: t.fg }}>{isAR ? 'الإشغال الحالي' : 'Current Occupancy'}</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: barColor(selected.occupancyPct || 0) }}>
                        {(selected.occupancyPct || 0).toFixed(1)}%
                      </span>
                    </div>
                    <div style={{ height: 8, backgroundColor: t.border, borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${Math.min(100, selected.occupancyPct || 0)}%`,
                        backgroundColor: barColor(selected.occupancyPct || 0),
                        borderRadius: 4, transition: 'width 600ms',
                      }} />
                    </div>
                    {/* 85% marker */}
                    <div style={{ position: 'relative', marginTop: 2 }}>
                      <div style={{
                        position: 'absolute', left: '85%', top: 0,
                        width: 1, height: 6, backgroundColor: '#ef4444',
                      }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontFamily: 'ui-monospace, monospace', fontSize: 10, color: t.fgSubtle }}>
                      <span>{(selected.usedPallets || 0).toFixed(1)} {isAR ? 'مستخدم' : 'used'}</span>
                      <span style={{ color: '#ef4444', fontSize: 9 }}>▲ 85%</span>
                      <span>{selected.maxPallets} {isAR ? 'إجمالي' : 'max'}</span>
                    </div>
                    {selected.alert85 && (
                      <div style={{ marginTop: 8, padding: '6px 10px', borderRadius: 3, backgroundColor: '#ef444418', border: '1px solid #ef444430', fontSize: 11, color: '#ef4444' }}>
                        ⚠ {isAR ? 'تجاوزت 85% — يُنصح بإعادة ترتيب المخزون (Honeycombing)' : 'Exceeded 85% — consider rearranging stock (Honeycombing risk)'}
                      </div>
                    )}
                  </div>
                )}

                {/* Bin locations — zone-grouped table */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.fgSubtle }}>
                      {isAR ? 'مواقع التخزين (الأرفف)' : 'Storage Bins'}{' '}
                      <span style={{ backgroundColor: t.border, color: t.fgMuted, borderRadius: 8, padding: '1px 6px', fontSize: 9 }}>
                        {(selected.bins || []).length}
                      </span>
                    </div>
                    {canManage && (
                      <button
                        onClick={openAddBin}
                        style={{ height: 26, padding: '0 10px', borderRadius: 4, backgroundColor: primary, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <Icon name="add" size={13} />
                        {isAR ? 'إضافة موقع' : 'Add Bin'}
                      </button>
                    )}
                  </div>

                  {(selected.bins || []).length === 0 ? (
                    <div style={{ padding: '20px 0', textAlign: 'center', border: `1px dashed ${t.border}`, borderRadius: 4 }}>
                      <p style={{ fontSize: 12, color: t.fgSubtle, margin: 0 }}>
                        {isAR ? 'لا توجد أرفف — اضغط "إضافة موقع" لإنشاء رمز تخزين' : 'No bins yet — click "Add Bin" to define storage locations'}
                      </p>
                    </div>
                  ) : (() => {
                    // Group bins by zone
                    const zones = {};
                    (selected.bins || []).forEach(bin => {
                      const z = bin.zone || '—';
                      if (!zones[z]) zones[z] = [];
                      zones[z].push(bin);
                    });
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {Object.entries(zones).sort(([a], [b]) => a.localeCompare(b)).map(([zone, zoneBins]) => (
                          <div key={zone}>
                            {/* Zone header */}
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4,
                              padding: '3px 8px', backgroundColor: `${primary}10`,
                              borderRadius: 3, borderLeft: `3px solid ${primary}`,
                            }}>
                              <span style={{ fontFamily: 'ui-monospace,monospace', fontSize: 10, fontWeight: 800, color: primary }}>
                                {isAR ? 'المنطقة' : 'Zone'} {zone}
                              </span>
                              <span style={{ fontSize: 10, color: t.fgSubtle }}>{zoneBins.length} {isAR ? 'موقع' : 'bins'}</span>
                            </div>
                            <div style={{ overflow: 'auto', maxHeight: 400 }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 400 }}>
                                <thead>
                                  <tr>
                                    {[
                                      isAR ? 'الكود'    : 'Code',
                                      isAR ? 'الممر'    : 'Aisle',
                                      isAR ? 'المستوى'  : 'Level',
                                      isAR ? 'السعة'    : 'Cap.',
                                      '',
                                    ].map((h, i) => (
                                      <th key={i} style={{ padding: '4px 8px', textAlign: 'start', fontSize: 9, fontFamily: 'ui-monospace,monospace', textTransform: 'uppercase', letterSpacing: '0.06em', color: t.fgSubtle, borderBottom: `1px solid ${t.border}`, backgroundColor: t.sunken, position: 'sticky', top: 0, zIndex: 10 }}>
                                        {h}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                              <tbody>
                                {zoneBins.sort((a, b) => a.code.localeCompare(b.code)).map(bin => (
                                  <tr key={bin._id} style={{ borderBottom: `1px solid ${t.border}` }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = t.sunken}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                    <td style={{ padding: '6px 8px' }}>
                                      <span style={{
                                        fontFamily: 'ui-monospace,monospace', fontSize: 12, fontWeight: 800,
                                        backgroundColor: `${primary}14`, color: primary,
                                        padding: '2px 7px', borderRadius: 3,
                                      }}>
                                        {bin.code}
                                      </span>
                                    </td>
                                    <td style={{ padding: '6px 8px', fontFamily: 'ui-monospace,monospace', fontSize: 11, color: t.fgMuted }}>{bin.aisle || '—'}</td>
                                    <td style={{ padding: '6px 8px', fontFamily: 'ui-monospace,monospace', fontSize: 11, color: t.fgMuted }}>{bin.level || '—'}</td>
                                    <td style={{ padding: '6px 8px', fontFamily: 'ui-monospace,monospace', fontSize: 11, color: t.fgMuted }}>{bin.capacity}</td>
                                    <td style={{ padding: '6px 8px', textAlign: 'end' }}>
                                      {canManage && (
                                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                                          <button onClick={() => openEditBin(bin)}
                                            style={{ width: 22, height: 22, border: 'none', background: 'transparent', cursor: 'pointer', color: t.fgSubtle, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3 }}
                                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = t.sunken; e.currentTarget.style.color = primary; }}
                                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = t.fgSubtle; }}>
                                            <Icon name="edit" size={12} />
                                          </button>
                                          <button onClick={() => { setConfirmTarget({ type: 'bin', id: bin._id }); setConfirmOpen(true); }}
                                            style={{ width: 22, height: 22, border: 'none', background: 'transparent', cursor: 'pointer', color: t.fgSubtle, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3 }}
                                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = t.negTint; e.currentTarget.style.color = t.neg; }}
                                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = t.fgSubtle; }}>
                                            <Icon name="delete" size={12} />
                                          </button>
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              </table>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Items in this warehouse */}
                {(selected.items || []).length > 0 && (
                  <div>
                    <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.fgSubtle, marginBottom: 8 }}>
                      {isAR ? 'الأصناف' : 'Items'} ({selected.items.length})
                    </div>
                    <div style={{ overflow: 'auto', maxHeight: 400 }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
                        <thead>
                          <tr>
                            {[
                              isAR ? 'الصنف' : 'Item',
                              isAR ? 'الكمية' : 'Qty',
                              isAR ? 'البليت المستخدمة' : 'Pallets',
                              isAR ? 'الموقع' : 'Bin',
                            ].map(h => (
                              <th key={h} style={{ padding: '6px 10px', textAlign: 'start', fontSize: 10, fontFamily: 'ui-monospace,monospace', textTransform: 'uppercase', letterSpacing: '0.06em', color: t.fgSubtle, borderBottom: `1px solid ${t.border}`, backgroundColor: t.sunken, position: 'sticky', top: 0, zIndex: 10 }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {selected.items.slice(0, 30).map(item => {
                            const pallets = item.qty / ((item.palletQty || 1) * (item.stackHeight || 1));
                            return (
                              <tr key={item._id} style={{ borderBottom: `1px solid ${t.border}` }}>
                                <td style={{ padding: '8px 10px', fontSize: 12, color: t.fg, fontWeight: 500 }}>
                                  {isAR ? item.name : (item.nameEn || item.name)}
                                </td>
                                <td style={{ padding: '8px 10px', fontSize: 12, fontFamily: 'ui-monospace,monospace', color: item.qty === 0 ? t.neg : t.fg, fontWeight: 700 }}>
                                  {item.qty}
                                </td>
                                <td style={{ padding: '8px 10px', fontSize: 11, fontFamily: 'ui-monospace,monospace', color: t.fgMuted }}>
                                  {pallets.toFixed(2)}
                                </td>
                                <td style={{ padding: '8px 10px', fontSize: 11, fontFamily: 'ui-monospace,monospace', color: t.fgSubtle }}>
                                  {item.binLocation || '—'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Warehouse modal ── */}
      <Modal open={whModal} onClose={() => setWhModal(false)} title={editWh ? (isAR ? 'تعديل المستودع' : 'Edit Warehouse') : (isAR ? 'إضافة مستودع' : 'Add Warehouse')}>
        <form onSubmit={handleWhSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            <div>
              {lbl(isAR ? 'الكود' : 'Code', true)}
              <input required value={whForm.code} onChange={e => setWh('code', e.target.value)} placeholder="WH-01" style={inp()} />
            </div>
            <div>
              {lbl(isAR ? 'الاسم' : 'Name (AR)', true)}
              <input required value={whForm.name} onChange={e => setWh('name', e.target.value)} style={inp()} />
            </div>
          </div>
          <div>
            {lbl(isAR ? 'الاسم (إنجليزي)' : 'Name (EN)')}
            <input value={whForm.nameEn} onChange={e => setWh('nameEn', e.target.value)} style={inp()} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            <div>
              {lbl(isAR ? 'الموقع الجغرافي' : 'Location')}
              <input value={whForm.location} onChange={e => setWh('location', e.target.value)} placeholder="Dubai, UAE" style={inp()} />
            </div>
            <div>
              {lbl(isAR ? 'النوع' : 'Type')}
              <select value={whForm.type} onChange={e => setWh('type', e.target.value)} style={inp()}>
                <option value="PHYSICAL">{isAR ? 'فيزيائي (مادي)' : 'PHYSICAL'}</option>
                <option value="VIRTUAL">{isAR ? 'افتراضي' : 'VIRTUAL'}</option>
              </select>
            </div>
          </div>

          {whForm.type === 'PHYSICAL' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                <div>
                  {lbl(isAR ? 'خط العرض (Latitude)' : 'Latitude')}
                  <input type="number" step="any" value={whForm.latitude} onChange={e => setWh('latitude', e.target.value)} placeholder="25.2048" style={inp()} />
                </div>
                <div>
                  {lbl(isAR ? 'خط الطول (Longitude)' : 'Longitude')}
                  <input type="number" step="any" value={whForm.longitude} onChange={e => setWh('longitude', e.target.value)} placeholder="55.2708" style={inp()} />
                </div>
              </div>
              <div>
                {lbl(isAR ? 'أو كود تضمين خرائط جوجل (Google Maps Embed)' : 'Or Google Maps Embed HTML')}
                <input value={whForm.mapLink || ''} onChange={e => setWh('mapLink', e.target.value)} placeholder={isAR ? '<iframe src="...">' : '<iframe src="...">'} style={inp()} />
                <div style={{ fontSize: 10, color: t.fgMuted, marginTop: 4 }}>
                  {isAR ? 'طريقة الاستخراج: افتح خريطة جوجل > شارك > تضمين خريطة > انسخ المحتوى والصقه هنا.' : 'How to get: Open Google Maps > Share > Embed a map > Copy HTML and paste here.'}
                </div>
              </div>
            </div>
          )}

          {/* Dimensions */}
          <div style={{ padding: '10px', backgroundColor: t.sunken, borderRadius: 4 }}>
            <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.fgSubtle, marginBottom: 8 }}>
              {isAR ? 'الأبعاد (متر)' : 'Dimensions (meters)'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[
                { k: 'length', label: isAR ? 'الطول' : 'Length' },
                { k: 'width',  label: isAR ? 'العرض'  : 'Width'  },
                { k: 'height', label: isAR ? 'الارتفاع الصافي' : 'Net Height' },
              ].map(({ k, label }) => (
                <div key={k}>
                  {lbl(label)}
                  <input type="number" min="0" step="0.1" value={whForm[k]} onChange={e => setWh(k, e.target.value)} style={inp()} placeholder="0" />
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8, marginTop: 8 }}>
              <div>
                {lbl(isAR ? 'نسبة المساحة الصالحة (%)' : 'Usable Area %')}
                <input type="number" min="50" max="100" step="1" value={whForm.usableAreaPct} onChange={e => setWh('usableAreaPct', e.target.value)} style={inp()} placeholder="85" />
              </div>
              <div>
                {lbl(isAR ? 'مساحة البليت (م²)' : 'Pallet Footprint (m²)')}
                <input type="number" min="0.1" step="0.01" value={whForm.palletFootprint} onChange={e => setWh('palletFootprint', e.target.value)} style={inp()} placeholder="0.96" />
              </div>
            </div>
            {/* Live preview */}
            {whForm.length && whForm.width && (
              <div style={{ marginTop: 8, padding: '6px 10px', borderRadius: 3, backgroundColor: `${primary}12`, fontSize: 11, fontFamily: 'ui-monospace, monospace', color: t.fgMuted }}>
                {isAR ? 'معاينة:' : 'Preview:'}
                {' '}
                <strong style={{ color: t.fg }}>
                  {Math.floor((parseFloat(whForm.length) * parseFloat(whForm.width) * (parseFloat(whForm.usableAreaPct) / 100)) / (parseFloat(whForm.palletFootprint) || 0.96))} {isAR ? 'بليت' : 'pallets'}
                </strong>
                {' · '}
                {((parseFloat(whForm.length) * parseFloat(whForm.width) * (parseFloat(whForm.usableAreaPct) / 100))).toFixed(1)} m²
              </div>
            )}
          </div>

          <div>
            {lbl(isAR ? 'ملاحظات' : 'Notes')}
            <textarea rows={2} value={whForm.notes} onChange={e => setWh('notes', e.target.value)} style={{ ...inp(), height: 'auto', padding: '8px 10px', resize: 'vertical' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8, borderTop: `1px solid ${t.border}` }}>
            <button type="button" onClick={() => setWhModal(false)} style={{ height: 32, padding: '0 14px', borderRadius: 4, backgroundColor: 'transparent', color: t.fgMuted, border: `1px solid ${t.border}`, cursor: 'pointer', fontSize: 13 }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = t.sunken} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
              {isAR ? 'إلغاء' : 'Cancel'}
            </button>
            <button type="submit" disabled={whSaving} style={{ height: 32, padding: '0 16px', borderRadius: 4, backgroundColor: primary, color: '#fff', border: 'none', cursor: whSaving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, opacity: whSaving ? 0.65 : 1 }}>
              {whSaving && <div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 600ms linear infinite' }} />}
              {isAR ? 'حفظ' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Bin modal ── */}
      <Modal open={binModal} onClose={() => setBinModal(false)} title={editBin ? (isAR ? 'تعديل الموقع' : 'Edit Bin') : (isAR ? 'إضافة موقع' : 'Add Bin')}>
        <form onSubmit={handleBinSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            <div>
              {lbl(isAR ? 'كود الموقع' : 'Bin Code', true)}
              <input required value={binForm.code} onChange={e => setBin('code', e.target.value)} placeholder="A1-01" style={inp()} />
            </div>
            <div>
              {lbl(isAR ? 'السعة (بليت)' : 'Capacity (pallets)')}
              <input type="number" min="1" value={binForm.capacity} onChange={e => setBin('capacity', e.target.value)} style={inp()} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <div>{lbl(isAR ? 'المنطقة' : 'Zone')} <input value={binForm.zone} onChange={e => setBin('zone', e.target.value)} placeholder="A" style={inp()} /></div>
            <div>{lbl(isAR ? 'الممر'   : 'Aisle')} <input value={binForm.aisle} onChange={e => setBin('aisle', e.target.value)} placeholder="1" style={inp()} /></div>
            <div>{lbl(isAR ? 'المستوى' : 'Level')} <input value={binForm.level} onChange={e => setBin('level', e.target.value)} placeholder="01" style={inp()} /></div>
          </div>
          <div>
            {lbl(isAR ? 'ملاحظات' : 'Notes')}
            <textarea rows={2} value={binForm.notes} onChange={e => setBin('notes', e.target.value)} style={{ ...inp(), height: 'auto', padding: '8px 10px', resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8, borderTop: `1px solid ${t.border}` }}>
            <button type="button" onClick={() => setBinModal(false)} style={{ height: 32, padding: '0 14px', borderRadius: 4, backgroundColor: 'transparent', color: t.fgMuted, border: `1px solid ${t.border}`, cursor: 'pointer', fontSize: 13 }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = t.sunken} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
              {isAR ? 'إلغاء' : 'Cancel'}
            </button>
            <button type="submit" disabled={binSaving} style={{ height: 32, padding: '0 16px', borderRadius: 4, backgroundColor: primary, color: '#fff', border: 'none', cursor: binSaving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, opacity: binSaving ? 0.65 : 1 }}>
              {binSaving && <div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 600ms linear infinite' }} />}
              {isAR ? 'حفظ' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      <Confirm
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        loading={deleting}
        message={
          confirmTarget?.type === 'wh'
            ? (isAR ? 'هل تريد حذف هذا المستودع؟ سيتم إلغاء ربط الأصناف به.' : 'Delete this warehouse? Items will be unlinked.')
            : (isAR ? 'هل تريد حذف هذا الموقع؟' : 'Delete this bin location?')
        }
      />
    </div>
  );
}
