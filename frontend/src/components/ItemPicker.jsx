/**
 * ItemPicker.jsx — universal searchable item selector with barcode scanner
 *
 * Props:
 *   value       {string}           — selected item _id
 *   onChange    {(id, item)=>void} — called on selection or clear
 *   items       {Array}            — flat item list to pick from
 *   exclude     {Array<string>}    — _ids to hide from the list
 *   placeholder {string}
 *   required    {bool}             — triggers native form validation
 *   disabled    {bool}
 *   primary     {string}           — accent colour (falls back to company colour)
 *
 * Features:
 *   • Searches name · nameEn · SKU · barcode simultaneously
 *   • Shows current Qty and SKU in list rows
 *   • Camera scan button → BarcodeScanner overlay → auto-selects on hit
 *   • On miss: populates search field with scanned code so user can refine
 *   • Closes dropdown on outside click
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { T } from '../theme';
import Icon from './Icon';
import BarcodeScanner from './BarcodeScanner';

export default function ItemPicker({
  value,
  onChange,
  items = [],
  exclude = [],
  placeholder,
  required = false,
  disabled = false,
  primary: primaryProp,
}) {
  const { theme, company, isAR } = useAppContext();
  const tok     = T[theme] || T.light;
  const primary = primaryProp || company?.primaryColor || '#3b82f6';

  const [open,        setOpen]        = useState(false);
  const [search,      setSearch]      = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);

  const wrapRef    = useRef(null);
  const searchRef  = useRef(null);

  // ── Selected item label ─────────────────────────────────────────────────
  const selected = items.find(i => i._id === value);
  const label    = selected
    ? (isAR ? selected.name : (selected.nameEn || selected.name))
    : '';

  // ── Filtered list ───────────────────────────────────────────────────────
  const filtered = items
    .filter(i => !exclude.includes(i._id))
    .filter(i => {
      if (!search.trim()) return true;
      const s = search.toLowerCase();
      return (
        i.name?.toLowerCase().includes(s) ||
        i.nameEn?.toLowerCase().includes(s) ||
        i.sku?.toLowerCase().includes(s) ||
        i.barcode?.toLowerCase().includes(s)
      );
    });

  // ── Close dropdown on outside click ────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Auto-focus search when dropdown opens ───────────────────────────────
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 30);
  }, [open]);

  // ── Selection helpers ───────────────────────────────────────────────────
  const select = (item) => {
    onChange(item._id, item);
    setSearch('');
    setOpen(false);
  };

  const clear = (e) => {
    e.stopPropagation();
    onChange('', null);
    setSearch('');
  };

  // ── Barcode scan handler ────────────────────────────────────────────────
  const handleScan = useCallback((code) => {
    setScannerOpen(false);
    setScanLoading(true);

    const hit = items.find(i =>
      i.barcode === code || i.sku === code ||
      i.barcode?.toLowerCase() === code.toLowerCase() ||
      i.sku?.toLowerCase()     === code.toLowerCase()
    );

    if (hit && !exclude.includes(hit._id)) {
      onChange(hit._id, hit);
    } else {
      // No direct match — open dropdown pre-filled with scanned code
      setSearch(code);
      setOpen(true);
    }

    setScanLoading(false);
  }, [items, exclude, onChange]);

  // ── Styles ──────────────────────────────────────────────────────────────
  const triggerStyle = {
    flex: 1, height: 34, padding: '0 8px 0 10px',
    borderRadius: 4,
    border: `1px solid ${open ? primary : tok.border}`,
    backgroundColor: disabled ? tok.sunken : tok.canvas,
    color: value ? tok.fg : tok.fgSubtle,
    fontSize: 13, cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center',
    userSelect: 'none', boxSizing: 'border-box',
    opacity: disabled ? 0.6 : 1,
    transition: 'border-color 120ms',
  };

  const scanBtnStyle = {
    width: 34, height: 34, borderRadius: 4, flexShrink: 0,
    border: `1px solid ${tok.border}`,
    backgroundColor: scanLoading ? tok.sunken : 'transparent',
    color: scanLoading ? primary : tok.fgMuted,
    cursor: disabled || scanLoading ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 120ms',
    opacity: disabled ? 0.5 : 1,
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'flex', gap: 6 }}>

      {/* ── Trigger + dropdown ─────────────────────────────────────────── */}
      <div style={{ position: 'relative', flex: 1 }}>
        {/* Trigger row */}
        <div
          onClick={() => { if (!disabled) setOpen(o => !o); }}
          style={triggerStyle}
        >
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {label || placeholder}
          </span>
          {value && !disabled && (
            <span
              onClick={clear}
              title={isAR ? 'مسح' : 'Clear'}
              style={{ color: tok.fgSubtle, fontSize: 15, lineHeight: 1, cursor: 'pointer', padding: '0 2px', flexShrink: 0 }}
            >×</span>
          )}
          <span style={{ color: tok.fgSubtle, fontSize: 10, flexShrink: 0, marginLeft: 2 }}>▾</span>
        </div>

        {/* Hidden input for required validation */}
        <input
          tabIndex={-1}
          required={required}
          value={value || ''}
          onChange={() => {}}
          style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
        />

        {/* Dropdown */}
        {open && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
            backgroundColor: tok.elev, border: `1px solid ${tok.border}`,
            borderRadius: 4, boxShadow: '0 6px 18px rgba(0,0,0,0.18)',
            marginTop: 2, maxHeight: 240,
            display: 'flex', flexDirection: 'column',
          }}>
            {/* Search input */}
            <div style={{ padding: '6px 8px', borderBottom: `1px solid ${tok.border}`, flexShrink: 0 }}>
              <input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={isAR ? 'ابحث بالاسم، SKU، أو الباركود...' : 'Search name, SKU or barcode…'}
                style={{
                  width: '100%', height: 28, padding: '0 8px', borderRadius: 3,
                  border: `1px solid ${tok.border}`, backgroundColor: tok.canvas,
                  color: tok.fg, fontSize: 12, outline: 'none', boxSizing: 'border-box',
                }}
                onClick={e => e.stopPropagation()}
              />
            </div>

            {/* Options list */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {filtered.length === 0 ? (
                <div style={{ padding: '12px 10px', fontSize: 12, color: tok.fgSubtle, textAlign: 'center' }}>
                  {isAR ? 'لا توجد نتائج' : 'No items found'}
                </div>
              ) : filtered.map(item => {
                const name       = isAR ? item.name : (item.nameEn || item.name);
                const isSelected = item._id === value;
                const isLow      = item.qty <= item.minThreshold && item.qty > 0;
                const isOut      = item.qty === 0;

                return (
                  <div
                    key={item._id}
                    onClick={() => select(item)}
                    style={{
                      padding: '7px 10px', cursor: 'pointer',
                      backgroundColor: isSelected ? `${primary}18` : 'transparent',
                      borderBottom: `1px solid ${tok.border}`,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      gap: 8,
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = `${tok.fg}08`; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = isSelected ? `${primary}18` : 'transparent'; }}
                  >
                    {/* Name + SKU */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: isSelected ? 600 : 400, color: tok.fg, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {name}
                      </div>
                      {item.sku && (
                        <div style={{ fontSize: 10, color: tok.fgSubtle, fontFamily: 'ui-monospace,monospace', marginTop: 1 }}>
                          {item.sku}
                          {item.barcode && ` · ${item.barcode}`}
                        </div>
                      )}
                    </div>

                    {/* Qty badge */}
                    <span style={{
                      fontSize: 10, fontFamily: 'ui-monospace,monospace', flexShrink: 0,
                      color: isOut ? '#ef4444' : isLow ? '#f59e0b' : '#16a34a',
                      fontWeight: 700,
                    }}>
                      {item.qty ?? '?'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Camera scan button ─────────────────────────────────────────── */}
      <button
        type="button"
        disabled={disabled || scanLoading}
        onClick={() => !disabled && setScannerOpen(true)}
        title={isAR ? 'مسح الباركود بالكاميرا' : 'Scan barcode with camera'}
        style={scanBtnStyle}
        onMouseEnter={e => { if (!disabled && !scanLoading) { e.currentTarget.style.backgroundColor = tok.sunken; e.currentTarget.style.color = primary; } }}
        onMouseLeave={e => { if (!disabled && !scanLoading) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = tok.fgMuted; } }}
      >
        {scanLoading
          ? <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${tok.border}`, borderTopColor: primary, animation: 'spin 600ms linear infinite' }} />
          : <Icon name="scan" size={16} />
        }
      </button>

      {/* ── BarcodeScanner overlay ─────────────────────────────────────── */}
      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={handleScan}
      />
    </div>
  );
}
