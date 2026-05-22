export default function Pagination({ page, pages, total, limit, onChange, isAR }) {
  if (!pages || pages <= 1) return null;

  const from = Math.min((page - 1) * limit + 1, total);
  const to   = Math.min(page * limit, total);

  // Build number list: always include first, last, and ±1 around current
  const nums = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || (i >= page - 1 && i <= page + 1)) {
      nums.push(i);
    } else if (nums[nums.length - 1] !== '…') {
      nums.push('…');
    }
  }

  return (
    <div className="flex items-center justify-between pt-3 mt-1 border-t border-slate-100 dark:border-slate-700">
      <span className="text-xs text-slate-400 dark:text-slate-500">
        {isAR ? `${from}–${to} من ${total}` : `${from}–${to} of ${total}`}
      </span>
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="min-w-[32px] h-8 px-2 rounded-lg text-sm font-bold transition-colors disabled:text-slate-300 dark:disabled:text-slate-600 disabled:cursor-default text-slate-500 dark:text-slate-400 hover:enabled:bg-slate-100 dark:hover:enabled:bg-slate-700"
        >←</button>

        {nums.map((n, i) =>
          n === '…'
            ? <span key={`e${i}`} className="px-1 text-slate-400 text-sm select-none">…</span>
            : <button
                key={n}
                onClick={() => onChange(n)}
                className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-semibold transition-colors
                  ${n === page
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
              >{n}</button>
        )}

        <button
          onClick={() => onChange(page + 1)}
          disabled={page === pages}
          className="min-w-[32px] h-8 px-2 rounded-lg text-sm font-bold transition-colors disabled:text-slate-300 dark:disabled:text-slate-600 disabled:cursor-default text-slate-500 dark:text-slate-400 hover:enabled:bg-slate-100 dark:hover:enabled:bg-slate-700"
        >→</button>
      </div>
    </div>
  );
}
