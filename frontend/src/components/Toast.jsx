import { useAppContext } from '../context/AppContext';

const icons = {
  success: (
    <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 18a6 6 0 100-12 6 6 0 000 12z" />
    </svg>
  ),
};

const styles = {
  success: 'border-green-500/30 bg-green-50/90 dark:bg-green-900/30',
  error:   'border-red-500/30 bg-red-50/90 dark:bg-red-900/30',
  info:    'border-blue-500/30 bg-blue-50/90 dark:bg-blue-900/30',
};

const textStyles = {
  success: 'text-green-800 dark:text-green-200',
  error:   'text-red-800 dark:text-red-200',
  info:    'text-blue-800 dark:text-blue-200',
};

export default function Toast() {
  const { toasts, removeToast } = useAppContext();
  if (!toasts?.length) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-xl border backdrop-blur-sm pointer-events-auto
            ${styles[toast.type] || styles.info}
            animate-in slide-in-from-bottom-4 fade-in duration-300`}
        >
          <div className="shrink-0 mt-0.5">{icons[toast.type] || icons.info}</div>
          <p className={`text-sm font-medium flex-1 ${textStyles[toast.type] || textStyles.info}`}>
            {toast.message}
          </p>
          <button
            onClick={() => removeToast(toast.id)}
            className="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
