import { useEffect } from 'react';
import Icon from './Icon';

/**
 * Modal.jsx — reusable overlay + panel
 * Props:
 *   open     boolean     – whether modal is shown
 *   onClose  () => void  – called on backdrop click or Escape
 *   title    string      – header text
 *   wide     boolean     – max-w-3xl instead of max-w-lg
 *   children ReactNode
 */
export default function Modal({ open, onClose, title, children, wide = false }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full ${
          wide ? 'max-w-3xl' : 'max-w-lg'
        } max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 shrink-0">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label="Close"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  );
}
