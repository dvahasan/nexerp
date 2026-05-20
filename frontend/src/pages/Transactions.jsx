import { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { MdAdd, MdSearch, MdSwapVert, MdEdit, MdDelete } from 'react-icons/md';

export default function Transactions() {
  const { txs, items, loading, t, isAR, user } = useAppContext();
  
  const [search, setSearch] = useState("");
  const [typeF, setTypeF] = useState("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return [...txs].sort((a,b) => new Date(b.date) - new Date(a.date)).filter(tx => {
      const name = (tx.itemId?.name || "").toLowerCase();
      const nameEn = (tx.itemId?.nameEn || "").toLowerCase();
      const matchQ = !q || name.includes(q) || nameEn.includes(q) || (tx.source || "").toLowerCase().includes(q) || (tx.dest || "").toLowerCase().includes(q);
      const matchT = typeF === "all" || tx.type === typeF;
      return matchQ && matchT;
    });
  }, [txs, typeF, search]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-10 h-10 border-4 border-slate-300 border-t-purple-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">{t.transactions}</h1>
        {user?.perms?.canTx && (
          <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 shadow-lg shadow-purple-500/30">
            <MdAdd size={20} /> {isAR ? 'تسجيل حركة' : 'Record Transaction'}
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <MdSearch className="absolute top-1/2 -translate-y-1/2 left-3 text-slate-400" size={20} />
          <input 
            type="text" 
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder={isAR ? 'ابحث عن الصنف، المصدر، أو الوجهة...' : 'Search item, source, or destination...'}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-sm"
          />
        </div>
        
        <select 
          value={typeF} onChange={e => setTypeF(e.target.value)}
          className="w-full md:w-48 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
        >
          <option value="all">{isAR ? 'جميع الحركات' : 'All Types'}</option>
          <option value="IN">↓ {isAR ? 'وارد' : 'Stock IN'}</option>
          <option value="OUT">↑ {isAR ? 'صادر' : 'Stock OUT'}</option>
        </select>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-4 px-6 font-semibold">{isAR ? 'التاريخ' : 'Date'}</th>
                <th className="py-4 px-6 font-semibold">{isAR ? 'النوع' : 'Type'}</th>
                <th className="py-4 px-6 font-semibold">{isAR ? 'الصنف' : 'Item'}</th>
                <th className="py-4 px-6 font-semibold">{isAR ? 'الكمية' : 'Qty'}</th>
                <th className="py-4 px-6 font-semibold hidden md:table-cell">{isAR ? 'المصدر/الوجهة' : 'Source/Dest'}</th>
                <th className="py-4 px-6 font-semibold hidden lg:table-cell">{isAR ? 'المستخدم' : 'User'}</th>
                {user?.perms?.canManageUsers && <th className="py-4 px-6 font-semibold text-right">{isAR ? 'إجراءات' : 'Actions'}</th>}
              </tr>
            </thead>
            <tbody className="text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-500 dark:text-slate-400">
                    {isAR ? 'لا توجد حركات مطابقة للبحث' : 'No transactions match your search'}
                  </td>
                </tr>
              ) : (
                filtered.slice(0, 50).map(tx => (
                  <tr key={tx._id} className="border-t border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-4 px-6 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(tx.date).toLocaleDateString(isAR ? 'ar-EG' : 'en-US', {
                        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                        tx.type === 'IN' 
                          ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                      }`}>
                        {tx.type === 'IN' ? '↓ IN' : '↑ OUT'}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-medium text-slate-800 dark:text-slate-200">
                      {isAR ? (tx.itemId?.name || '—') : (tx.itemId?.nameEn || tx.itemId?.name || '—')}
                    </td>
                    <td className="py-4 px-6 font-black text-slate-700 dark:text-slate-300">
                      {tx.qty}
                    </td>
                    <td className="py-4 px-6 text-slate-500 dark:text-slate-400 hidden md:table-cell">
                      <div className="flex flex-col gap-1">
                        {tx.source && <span className="text-xs">From: {tx.source}</span>}
                        {tx.dest && <span className="text-xs">To: {tx.dest}</span>}
                        {!tx.source && !tx.dest && '—'}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-500 dark:text-slate-400 hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                          {tx.userName?.charAt(0)}
                        </div>
                        {tx.userName}
                      </div>
                    </td>
                    {user?.perms?.canManageUsers && (
                      <td className="py-4 px-6 text-right">
                        <div className="flex justify-end gap-2">
                          <button className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded transition-colors">
                            <MdEdit size={16} />
                          </button>
                          <button className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors">
                            <MdDelete size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
