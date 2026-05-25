import { useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { T } from '../theme';
import Icon from './Icon';

/**
 * Modal.jsx — DMMAS-styled overlay + panel
 * Props:
 *   open     boolean     – whether modal is shown
 *   onClose  () => void  – called on backdrop click or Escape
 *   title    string      – header text
 *   wide     boolean     – wider panel (768px instead of 520px)
 *   children ReactNode
 */
export default function Modal({ open, onClose, title, children, wide = false }) {
  const { theme } = useAppContext();
  const t = T[theme] || T.light;

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      {/* Backdrop */}
      <div
        style={{
          position: 'absolute', inset: 0,
          backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0.38)',
        }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="animate-in fade-in zoom-in-95 duration-150"
        style={{
          position: 'relative',
          backgroundColor: t.elev,
          border: `1px solid ${t.border}`,
          borderRadius: 4,
          width: '100%',
          maxWidth: wide ? 768 : 520,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: theme === 'dark' ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.12)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px',
          borderBottom: `1px solid ${t.border}`,
          flexShrink: 0,
        }}>
          <span style={{
            fontFamily: 'ui-monospace, monospace', fontSize: 11, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.08em', color: t.fg,
          }}>
            {title}
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent', border: 'none', borderRadius: 4,
              cursor: 'pointer', color: t.fgMuted,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 6, transition: 'background 120ms', width: 30, height: 30,
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = t.sunken}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '20px 20px 24px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
