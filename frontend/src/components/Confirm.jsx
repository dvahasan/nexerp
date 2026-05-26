import Modal from './Modal';
import { useAppContext } from '../context/AppContext';
import { T } from '../theme';

/**
 * Confirm.jsx — DMMAS-styled "Are you sure?" dialog
 * Props:
 *   open      boolean
 *   onClose   () => void
 *   onConfirm () => void
 *   title     string
 *   message   string
 *   danger    boolean  – confirm button is red (default: true)
 *   loading   boolean  – shows spinner on confirm button
 */
export default function Confirm({
  open, onClose, onConfirm, title, message, danger = true, loading = false,
}) {
  const { t: tr, theme, company } = useAppContext();
  const t = T[theme] || T.light;
  const primary = company?.primaryColor || '#3b82f6';

  return (
    <Modal open={open} onClose={onClose} title={title || tr.deleteConfirmTitle}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <p style={{ fontSize: 13, color: t.fgMuted, lineHeight: 1.65 }}>
          {message || tr.deleteConfirmMsg}
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {/* Cancel */}
          <button
            onClick={onClose}
            style={{
              height: 32, padding: '0 14px', borderRadius: 4,
              backgroundColor: 'transparent', color: t.fgMuted,
              border: `1px solid ${t.border}`, cursor: 'pointer',
              fontSize: 13, fontWeight: 500,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              transition: 'background 120ms',
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = t.sunken}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            {tr.cancel}
          </button>

          {/* Confirm */}
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              height: 32, padding: '0 14px', borderRadius: 4,
              backgroundColor: danger ? t.neg : primary,
              color: '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 600,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              transition: 'opacity 120ms', opacity: loading ? 0.65 : 1,
            }}
          >
            {loading && (
              <div style={{
                width: 14, height: 14,
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: '#fff', borderRadius: '50%',
                animation: 'spin 600ms linear infinite',
              }} />
            )}
            {tr.confirm}
          </button>
        </div>
      </div>
    </Modal>
  );
}
