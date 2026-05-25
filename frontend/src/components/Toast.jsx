import { useAppContext } from '../context/AppContext';
import { T } from '../theme';

export default function Toast() {
  const { toasts, removeToast, theme } = useAppContext();
  const t = T[theme] || T.light;

  if (!toasts?.length) return null;

  const typeConfig = {
    success: {
      iconColor: '#16774A',
      bg: theme === 'dark' ? '#0c1f12' : '#f0fdf4',
      border: theme === 'dark' ? '#1a4228' : '#bbf7d0',
    },
    error: {
      iconColor: t.neg,
      bg: t.negTint,
      border: theme === 'dark' ? '#5c1e1e' : '#fca5a5',
    },
    info: {
      iconColor: 'var(--color-primary, #3b82f6)',
      bg: theme === 'dark' ? '#0c1a2e' : '#eff6ff',
      border: theme === 'dark' ? '#1e3a5f' : '#bfdbfe',
    },
  };

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 200,
      display: 'flex', flexDirection: 'column', gap: 8,
      maxWidth: 360, pointerEvents: 'none',
    }}>
      {toasts.map(toast => {
        const cfg = typeConfig[toast.type] || typeConfig.info;
        return (
          <div
            key={toast.id}
            className="animate-in slide-in-from-bottom-4 fade-in duration-300"
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '11px 14px', borderRadius: 4,
              border: `1px solid ${cfg.border}`,
              backgroundColor: cfg.bg,
              pointerEvents: 'auto',
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            }}
          >
            {/* Icon */}
            <div style={{ color: cfg.iconColor, flexShrink: 0, marginTop: 1 }}>
              {toast.type === 'success' && (
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
              {toast.type === 'error' && (
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              {toast.type === 'info' && (
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 18a6 6 0 100-12 6 6 0 000 12z" />
                </svg>
              )}
            </div>

            {/* Message */}
            <p style={{ fontSize: 12, color: t.fg, flex: 1, lineHeight: 1.55, fontFamily: 'inherit' }}>
              {toast.message}
            </p>

            {/* Dismiss */}
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'transparent', border: 'none',
                cursor: 'pointer', color: t.fgSubtle,
                padding: 0, flexShrink: 0, lineHeight: 1,
              }}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
