import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function GlobalAnalytics({ companies, isAR }) {
  const chartData = companies.map(c => ({
    name: c.name,
    stockValue: c.stats?.stockValue || 0,
    txIn: c.stats?.txIn || 0,
    txOut: c.stats?.txOut || 0,
    employees: c.stats?.employees || 0
  }));

  const totalValue = chartData.reduce((acc, curr) => acc + curr.stockValue, 0);
  const totalEmployees = chartData.reduce((acc, curr) => acc + curr.employees, 0);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-6xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center">
           <h3 className="text-slate-500 dark:text-slate-400 font-bold mb-2">{isAR ? 'إجمالي قيمة المحفظة' : 'Total Portfolio Value'}</h3>
           <p className="text-4xl lg:text-5xl font-black text-slate-800 dark:text-white">${totalValue.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center">
           <h3 className="text-slate-500 dark:text-slate-400 font-bold mb-2">{isAR ? 'إجمالي القوى العاملة' : 'Total Workforce'}</h3>
           <p className="text-4xl lg:text-5xl font-black text-slate-800 dark:text-white">{totalEmployees}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 h-[400px] flex flex-col shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">{isAR ? 'قيمة المخزون حسب الشركة' : 'Stock Value by Company'}</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
              <XAxis dataKey="name" stroke="#94a3b8" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
              <YAxis stroke="#94a3b8" tick={{fontSize: 12}} axisLine={false} tickLine={false} tickFormatter={value => `$${value}`} />
              <Tooltip cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 'bold' }} />
              <Bar dataKey="stockValue" fill="#3b82f6" radius={[6, 6, 0, 0]} name={isAR ? 'قيمة المخزون' : 'Stock Value'} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 h-[400px] flex flex-col shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">{isAR ? 'حجم الحركات' : 'Transactions Volume'}</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
              <XAxis dataKey="name" stroke="#94a3b8" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
              <YAxis stroke="#94a3b8" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 'bold' }} />
              <Legend wrapperStyle={{ paddingTop: '10px' }} />
              <Bar dataKey="txIn" fill="#10b981" radius={[6, 6, 0, 0]} name={isAR ? 'وارد' : 'IN'} />
              <Bar dataKey="txOut" fill="#ef4444" radius={[6, 6, 0, 0]} name={isAR ? 'صادر' : 'OUT'} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
