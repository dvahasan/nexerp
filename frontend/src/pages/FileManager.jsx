import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { T } from '../theme';
import { api } from '../api';
import Icon from '../components/Icon';
import Confirm from '../components/Confirm';
import Skeleton from '../components/Skeleton';
import InfiniteScrollTrigger from '../components/InfiniteScrollTrigger';

export default function FileManager() {
  const { t: tr, isAR, user, theme, company, showToast } = useAppContext();
  const t = T[theme] || T.light;
  const primary = company?.primaryColor || '#3b82f6';

  const [files,      setFiles]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [uploading,  setUploading]  = useState(false);
  const [search,     setSearch]     = useState('');
  const [confirmDel, setConfirmDel] = useState(null);
  const [focused,    setFocused]    = useState(false);
  const [page,       setPage]       = useState(1);
  const LIMIT = 15;

  useEffect(() => { fetchFiles(); }, []);

  const fetchFiles = async () => {
    try {
      const data = await api.getFiles();
      setFiles(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    if (user?.isDemo) {
      showToast(isAR ? 'رفع الملفات غير متاح في وضع التجربة' : 'File uploads are disabled in Demo Mode', 'error');
      return;
    }
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      await api.uploadFile(file);
      await fetchFiles();
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
    e.target.value = null;
  };

  const handleDelete = async () => {
    if (user?.isDemo) {
      alert(isAR ? 'غير متاح في وضع التجربة' : 'Action disabled in Demo Mode');
      setConfirmDel(null);
      return;
    }
    if (!confirmDel) return;
    try {
      await api.deleteFile(confirmDel._id);
      setFiles(f => f.filter(x => x._id !== confirmDel._id));
    } catch (e) {
      console.error(e);
    } finally {
      setConfirmDel(null);
    }
  };

  const filtered = files.filter(f =>
    !search ||
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    (f.itemId && f.itemId.name.toLowerCase().includes(search.toLowerCase())) ||
    (f.uploaderId && f.uploaderId.name.toLowerCase().includes(search.toLowerCase()))
  );

  const paginated = filtered.slice(0, page * LIMIT);

  // ── helpers ──────────────────────────────────────────────────────────────
  const lbl = (text) => (
    <span style={{
      display: 'block',
      fontFamily: 'ui-monospace, monospace',
      fontSize: 10, fontWeight: 600,
      textTransform: 'uppercase', letterSpacing: '0.08em',
      color: t.fgSubtle, marginBottom: 5,
    }}>
      {text}
    </span>
  );

  const typeColor = (mime = '') => {
    if (mime.includes('image')) return { bg: '#3b82f618', color: '#3b82f6' };
    if (mime.includes('pdf'))   return { bg: '#ef444418', color: '#ef4444' };
    if (mime.includes('word') || mime.includes('doc')) return { bg: '#8b5cf618', color: '#8b5cf6' };
    if (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv')) return { bg: '#10b98118', color: '#10b981' };
    return { bg: t.sunken, color: t.fgMuted };
  };

  // ── col headers ──────────────────────────────────────────────────────────
  const th = (label) => (
    <th style={{
      padding: '0 16px', height: 36,
      fontFamily: 'ui-monospace, monospace',
      fontSize: 10, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.08em',
      color: t.fgSubtle, textAlign: 'start',
      borderBottom: `1px solid ${t.border}`,
      backgroundColor: t.sunken, whiteSpace: 'nowrap',
    }}>
      {label}
    </th>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: t.fg, letterSpacing: '-0.02em', margin: 0 }}>
            {isAR ? 'مدير الملفات' : 'File Manager'}
          </h1>
          <p style={{ fontSize: 13, color: t.fgMuted, marginTop: 4 }}>
            {isAR
              ? 'استعرض وتحكم في جميع الملفات والمستندات المرفوعة'
              : 'View and manage all uploaded files and documents'}
          </p>
        </div>

        {/* Search + Upload */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
          {/* Search */}
          <div>
            {lbl(isAR ? 'بحث' : 'Search')}
            <div style={{ position: 'relative' }}>
              <Icon
                name="search" size={14}
                style={{
                  position: 'absolute', top: '50%', transform: 'translateY(-50%)',
                  left: 10, color: t.fgSubtle, pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={isAR ? 'بحث...' : 'Search files...'}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                style={{
                  height: 34, paddingLeft: 30, paddingRight: 10,
                  borderRadius: 4, fontSize: 13,
                  border: `1px solid ${focused ? primary : t.border}`,
                  boxShadow: focused ? `0 0 0 1px ${primary}` : 'none',
                  backgroundColor: t.canvas, color: t.fg,
                  outline: 'none', width: 220, boxSizing: 'border-box',
                  transition: 'border-color 120ms, box-shadow 120ms',
                  fontFamily: 'inherit',
                }}
              />
            </div>
          </div>

          {/* Upload button */}
          <div>
            {lbl(isAR ? 'رفع ملف' : 'Upload')}
            <label onClick={e => { if (user?.isDemo) { e.preventDefault(); showToast(isAR ? 'رفع الملفات غير متاح في وضع التجربة' : 'File uploads are disabled in Demo Mode', 'error'); } }} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              height: 34, padding: '0 14px', borderRadius: 4,
              backgroundColor: primary, color: '#fff',
              border: 'none', cursor: uploading ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 600,
              opacity: uploading ? 0.65 : 1,
              transition: 'opacity 120ms',
              whiteSpace: 'nowrap',
            }}>
              {uploading ? (
                <div style={{
                  width: 13, height: 13,
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff', borderRadius: '50%',
                  animation: 'spin 600ms linear infinite',
                }} />
              ) : (
                <Icon name="add" size={15} />
              )}
              {isAR ? 'رفع ملف' : 'Upload File'}
              <input
                type="file"
                style={{ display: 'none' }}
                accept="image/*,application/pdf"
                onChange={handleUpload}
                disabled={uploading}
              />
            </label>
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{
        backgroundColor: t.elev,
        border: `1px solid ${t.border}`,
        borderRadius: 4,
        overflow: 'hidden',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {th(isAR ? 'الملف' : 'File')}
                {th(isAR ? 'مرتبط بـ' : 'Linked To')}
                {th(isAR ? 'النوع' : 'Type')}
                {th(isAR ? 'المرفوع بواسطة' : 'Uploaded By')}
                {th(isAR ? 'التاريخ' : 'Date')}
                <th style={{
                  padding: '0 16px', height: 36, width: 44,
                  backgroundColor: t.sunken,
                  borderBottom: `1px solid ${t.border}`,
                }} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1, 2, 3, 4, 5].map(i => (
                  <tr key={i}>
                    <td style={{ padding: '12px 16px', borderBottom: `1px solid ${t.border}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Skeleton width={38} height={38} shape="rect" />
                        <div>
                          <Skeleton width={120} height={12} shape="text" style={{ marginBottom: 4 }} />
                          <Skeleton width={48} height={10} shape="text" />
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: `1px solid ${t.border}` }}>
                      <Skeleton width={72} height={20} shape="rect" />
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: `1px solid ${t.border}` }}>
                      <Skeleton width={44} height={20} shape="rect" />
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: `1px solid ${t.border}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Skeleton width={24} height={24} shape="circle" />
                        <Skeleton width={80} height={12} shape="text" />
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: `1px solid ${t.border}` }}>
                      <Skeleton width={64} height={12} shape="text" />
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: `1px solid ${t.border}` }} />
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{
                    padding: '48px 16px', textAlign: 'center',
                    color: t.fgSubtle, fontSize: 13,
                  }}>
                    {isAR ? 'لا توجد ملفات' : 'No files found'}
                  </td>
                </tr>
              ) : paginated.map((f, idx) => {
                const tc = typeColor(f.type);
                const ext = f.type?.split('/')[1]?.toUpperCase() || 'FILE';
                const isLast = idx === paginated.length - 1;
                return (
                  <FileRow
                    key={f._id}
                    f={f} t={t} primary={primary}
                    isAR={isAR} tc={tc} ext={ext} isLast={isLast}
                    onDelete={() => setConfirmDel(f)}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Count */}
      {!loading && filtered.length > 0 && (
        <div style={{
          fontFamily: 'ui-monospace, monospace',
          fontSize: 10, fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.08em',
          color: t.fgSubtle, textAlign: 'center',
        }}>
          {paginated.length} / {filtered.length} {isAR ? 'ملف' : 'files'}
        </div>
      )}

      <InfiniteScrollTrigger
        hasMore={page * LIMIT < filtered.length}
        onVisible={() => setPage(p => p + 1)}
      />

      {confirmDel && (
        <Confirm
          title={isAR ? 'تأكيد الحذف' : 'Confirm Deletion'}
          message={isAR
            ? `هل أنت متأكد من حذف الملف "${confirmDel.name}"؟`
            : `Are you sure you want to delete "${confirmDel.name}"?`}
          confirmText={isAR ? 'حذف' : 'Delete'}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDel(null)}
          variant="danger"
        />
      )}
    </div>
  );
}

// ── File row sub-component ────────────────────────────────────────────────
function FileRow({ f, t, primary, isAR, tc, ext, isLast, onDelete }) {
  const [hovered, setHovered] = useState(false);

  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: hovered ? t.sunken : 'transparent',
        transition: 'background 120ms',
      }}
    >
      {/* File name + preview */}
      <td style={{ padding: '10px 16px', borderBottom: isLast ? 'none' : `1px solid ${t.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 4, flexShrink: 0,
            backgroundColor: tc.bg, border: `1px solid ${t.border}`,
            overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {f.type?.includes('image') ? (
              <img src={f.url} alt={f.name} loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{
                fontFamily: 'ui-monospace, monospace', fontSize: 9,
                fontWeight: 800, color: tc.color, letterSpacing: '0.04em',
              }}>
                {ext.slice(0, 4)}
              </span>
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <a
              href={f.url} target="_blank" rel="noreferrer"
              style={{
                fontSize: 13, fontWeight: 600, color: t.fg,
                textDecoration: 'none', display: 'block',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                maxWidth: 260,
              }}
              onMouseEnter={e => e.currentTarget.style.color = primary}
              onMouseLeave={e => e.currentTarget.style.color = t.fg}
            >
              {f.name}
            </a>
            <span style={{
              fontSize: 10, color: t.fgSubtle,
              fontFamily: 'ui-monospace, monospace',
            }}>
              {(f.size / 1024).toFixed(1)} KB
            </span>
          </div>
        </div>
      </td>

      {/* Linked item */}
      <td style={{ padding: '10px 16px', borderBottom: isLast ? 'none' : `1px solid ${t.border}` }}>
        {f.itemId ? (
          <span style={{
            fontSize: 11, fontWeight: 600,
            backgroundColor: primary + '14', color: primary,
            padding: '3px 8px', borderRadius: 3,
            fontFamily: 'ui-monospace, monospace', whiteSpace: 'nowrap',
          }}>
            {isAR ? f.itemId.name : (f.itemId.nameEn || f.itemId.name)}
          </span>
        ) : (
          <span style={{ fontSize: 12, color: t.fgSubtle }}>—</span>
        )}
      </td>

      {/* Type badge */}
      <td style={{ padding: '10px 16px', borderBottom: isLast ? 'none' : `1px solid ${t.border}` }}>
        <span style={{
          fontSize: 10, fontWeight: 700,
          fontFamily: 'ui-monospace, monospace',
          letterSpacing: '0.06em',
          backgroundColor: tc.bg, color: tc.color,
          padding: '3px 7px', borderRadius: 3,
          textTransform: 'uppercase',
        }}>
          {ext}
        </span>
      </td>

      {/* Uploader */}
      <td style={{ padding: '10px 16px', borderBottom: isLast ? 'none' : `1px solid ${t.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 24, height: 24, borderRadius: 4, flexShrink: 0,
            backgroundColor: primary + '18',
            border: `1px solid ${primary}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 800, color: primary,
            fontFamily: 'ui-monospace, monospace',
          }}>
            {f.uploaderId?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <span style={{ fontSize: 13, fontWeight: 500, color: t.fg }}>
            {f.uploaderId?.name || (isAR ? 'مجهول' : 'Unknown')}
          </span>
        </div>
      </td>

      {/* Date */}
      <td style={{ padding: '10px 16px', borderBottom: isLast ? 'none' : `1px solid ${t.border}` }}>
        <span style={{
          fontSize: 11, color: t.fgMuted,
          fontFamily: 'ui-monospace, monospace',
        }}>
          {new Date(f.createdAt).toLocaleDateString(isAR ? 'ar-EG' : 'en-US')}
        </span>
      </td>

      {/* Delete */}
      <td style={{ padding: '10px 16px', borderBottom: isLast ? 'none' : `1px solid ${t.border}`, textAlign: 'end' }}>
        <button
          onClick={onDelete}
          title={isAR ? 'حذف' : 'Delete'}
          style={{
            width: 28, height: 28, borderRadius: 4,
            border: `1px solid ${hovered ? t.neg + '44' : 'transparent'}`,
            backgroundColor: hovered ? t.neg + '10' : 'transparent',
            color: hovered ? t.neg : t.fgSubtle,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: hovered ? 1 : 0,
            transition: 'all 120ms',
          }}
        >
          <Icon name="delete" size={14} />
        </button>
      </td>
    </tr>
  );
}
