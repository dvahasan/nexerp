import Modal from './Modal';
import { useAppContext } from '../context/AppContext';

/**
 * Confirm.jsx — "Are you sure?" dialog
 * Props:
 *   open      boolean
 *   onClose   () => void
 *   onConfirm () => void
 *   title     string   (optional, falls back to t.deleteConfirmTitle)
 *   message   string   (optional, falls back to t.deleteConfirmMsg)
 *   danger    boolean  – if true, confirm button is red (default: true)
 *   loading   boolean  – shows spinner on confirm button
 */
export default function Confirm({
  open,
  onClose,
  onConfirm,
  title,
  message,
  danger = true,
  loading = false,
}) {
  const { t } = useAppContext();

  return (
    <Modal open={open} onClose={onClose} title={title || t.deleteConfirmTitle}>
      <div className="space-y-6">
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
          {message || t.deleteConfirmMsg}
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            {t.cancel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors flex items-center gap-2 disabled:opacity-70 ${
              danger
                ? 'bg-red-600 hover:bg-red-700 border border-red-500'
                : 'bg-blue-600 hover:bg-blue-700 border border-blue-500'
            }`}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : null}
            {t.confirm}
          </button>
        </div>
      </div>
    </Modal>
  );
}
