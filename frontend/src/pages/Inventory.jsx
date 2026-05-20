import { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { MdAdd, MdFilterList, MdSearch, MdEdit, MdDelete, MdSwapVert, MdImage } from 'react-icons/md';

export default function Inventory() {
  const { items, depts, cats, loading, t, isAR, company, user } = useAppContext();
  
  const [search, setSearch] = useState("");
  const [deptF, setDeptF] = useState("all");
  const [stF, setStF] = useState("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(i => {
      const matchQ = !q || i.name.toLowerCase().includes(q) || (i.nameEn || "").toLowerCase().includes(q) || (i.sku || "").toLowerCase().includes(q) || (i.barcode || "").includes(q);
      const dId = i.deptId?._id || i.deptId;
      const matchD = deptF === "all" || dId === deptF;
      const matchS = stF === "all" || (stF === "low" && i.qty > 0 && i.qty <= i.minThreshold) || (stF === "out" && i.qty === 0) || (stF === "ok" && i.qty > i.minThreshold);
      return matchQ && matchD && matchS;
    });
  }, [items, search, deptF, stF]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-10 h-10 border-4 border-slate-300 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  const getStatus = (i) => {
    if (i.qty === 0) return { label: isAR ? 'نفذت' : 'Out', color: 'bg-red-500', text: 'text-red-500', bg: 'bg-red-50 dark:bg-red-500/10' };
    if (i.minThreshold > 0 && i.qty <= i.minThreshold) return { label: isAR ? 'منخفض' : 'Low', color: 'bg-yellow-500', text: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-500/10' };
    return { label: isAR ? 'متوفر' : 'OK', color: 'bg-green-500', text: 'text-green-500', bg: 'bg-green-50 dark:bg-green-500/10' };
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">{t.inventory}</h1>
        <div className="flex gap-2">
           {user?.perms?.canAdd && (
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/30">
                <MdAdd size={20} /> {isAR ? 'إضافة صنف' : 'Add Item'}
              </button>
           )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <MdSearch className="absolute top-1/2 -translate-y-1/2 left-3 text-slate-400" size={20} />
          <input 
            type="text" 
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder={isAR ? 'ابحث بالاسم، SKU، أو الباركود...' : 'Search by name, SKU, or barcode...'}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
          />
        </div>
        
        <div className="flex gap-2 md:w-auto w-full">
          <select 
            value={deptF} onChange={e => setDeptF(e.target.value)}
            className="flex-1 md:w-40 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">{isAR ? 'جميع الأقسام' : 'All Departments'}</option>
            {depts.map(d => (
              <option key={d._id} value={d._id}>{isAR ? d.name : (d.nameEn || d.name)}</option>
            ))}
          </select>
          
          <select 
            value={stF} onChange={e => setStF(e.target.value)}
            className="flex-1 md:w-40 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">{isAR ? 'جميع الحالات' : 'All Statuses'}</option>
            <option value="ok">✅ {isAR ? 'متوفر' : 'In Stock'}</option>
            <option value="low">⚠️ {isAR ? 'منخفض' : 'Low'}</option>
            <option value="out">🔴 {isAR ? 'نفد' : 'Out'}</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filtered.length === 0 && (
          <div className="col-span-full py-20 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 border-dashed">
            {isAR ? 'لا توجد أصناف مطابقة للبحث' : 'No items match your search'}
          </div>
        )}
        
        {filtered.map(item => {
          const dept = depts.find(d => d._id === (item.deptId?._id || item.deptId));
          const cat = cats.find(c => c._id === (item.catId?._id || item.catId));
          const st = getStatus(item);

          return (
            <div key={item._id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer">
              <div className="h-40 bg-slate-100 dark:bg-slate-900 relative flex items-center justify-center overflow-hidden">
                {item.photo ? (
                  <img 
                    src={item.photo.startsWith('/') ? `http://localhost:5000${item.photo}` : item.photo} 
                    alt={item.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <MdImage className="text-slate-300 dark:text-slate-700 text-6xl" />
                )}
                
                {dept && (
                  <div className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm" style={{ backgroundColor: dept.color }}>
                    {isAR ? dept.name : (dept.nameEn || dept.name)}
                  </div>
                )}
                <div className={`absolute top-3 right-3 w-3 h-3 rounded-full shadow-sm ring-2 ring-white dark:ring-slate-800 ${st.color}`}></div>
              </div>
              
              <div className="p-5">
                <div className="mb-4">
                  <h3 className="font-bold text-slate-800 dark:text-white truncate" title={isAR ? item.name : (item.nameEn || item.name)}>
                    {isAR ? item.name : (item.nameEn || item.name)}
                  </h3>
                  {cat && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{isAR ? cat.name : (cat.nameEn || cat.name)}</p>}
                </div>
                
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className={`rounded-xl p-2 text-center ${st.bg}`}>
                    <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">{isAR ? 'الكمية' : 'Qty'}</div>
                    <div className={`text-sm font-black ${st.text}`}>{item.qty}</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-2 text-center">
                    <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">{isAR ? 'السعر' : 'Price'}</div>
                    <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{item.price}</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-2 text-center truncate px-1">
                    <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">SKU</div>
                    <div className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-0.5">{item.sku || '—'}</div>
                  </div>
                </div>

                {item.minThreshold > 0 && (
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-4">
                    <div 
                      className={`h-full rounded-full ${st.color}`} 
                      style={{ width: `${Math.min(100, (item.qty / Math.max(item.minThreshold * 3, 1)) * 100)}%` }}
                    ></div>
                  </div>
                )}

                <div className="flex items-center justify-between mt-2 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                  <div className="text-xs font-mono text-slate-400 truncate w-24">
                    {item.barcode || '—'}
                  </div>
                  <div className="flex gap-1">
                    {user?.perms?.canTx && (
                      <button className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors">
                        <MdSwapVert size={18} />
                      </button>
                    )}
                    {user?.perms?.canEdit && (
                      <button className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg transition-colors">
                        <MdEdit size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
