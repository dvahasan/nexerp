import { useAppContext } from '../context/AppContext';
import { MdInventory, MdWarning, MdError, MdAttachMoney, MdTrendingUp } from 'react-icons/md';

export default function Dashboard() {
  const { stats, loading, t, isAR, company } = useAppContext();

  if (loading || !stats) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-10 h-10 border-4 border-slate-300 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  const primaryColor = company?.primaryColor || '#3b82f6';
  
  const statCards = [
    { title: isAR ? 'إجمالي الأصناف' : 'Total Items', value: stats.totalItems || 0, icon: MdInventory, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
    { title: isAR ? 'مخزون منخفض' : 'Low Stock', value: stats.lowStock || 0, icon: MdWarning, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-500/10' },
    { title: isAR ? 'نفذت الكمية' : 'Out of Stock', value: stats.outOfStock || 0, icon: MdError, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-500/10' },
    { title: isAR ? 'قيمة المخزون' : 'Inventory Value', value: `${(stats.valAgg || 0).toLocaleString()} ${company?.baseCurrency || 'USD'}`, icon: MdAttachMoney, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-500/10' },
    { title: isAR ? 'حركات اليوم' : 'Today\'s Transactions', value: stats.todayTx || 0, icon: MdTrendingUp, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">{t.dashboard}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((s, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${s.bg}`}>
              <s.icon className={`text-3xl ${s.color}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{s.title}</p>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{s.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Transactions & AI Insights placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">{isAR ? 'آخر الحركات' : 'Recent Transactions'}</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400">
                  <th className="py-3 font-medium">{isAR ? 'الصنف' : 'Item'}</th>
                  <th className="py-3 font-medium">{isAR ? 'النوع' : 'Type'}</th>
                  <th className="py-3 font-medium">{isAR ? 'الكمية' : 'Qty'}</th>
                  <th className="py-3 font-medium">{isAR ? 'التاريخ' : 'Date'}</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {stats.recentTx?.length > 0 ? stats.recentTx.map(tx => (
                  <tr key={tx._id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="py-3 text-slate-800 dark:text-slate-200">
                      {tx.itemId?.name || 'Unknown'}
                    </td>
                    <td className="py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        tx.type === 'IN' ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' :
                        tx.type === 'OUT' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' :
                        'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
                      }`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-3 text-slate-800 dark:text-slate-200 font-medium">{tx.qty}</td>
                    <td className="py-3 text-slate-500 dark:text-slate-400">
                      {new Date(tx.date).toLocaleDateString(lang)}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-slate-500 dark:text-slate-400">
                      {isAR ? 'لا توجد حركات حديثة' : 'No recent transactions'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
          <div className="absolute top-[-20%] right-[-20%] w-[60%] h-[60%] bg-blue-500 rounded-full blur-[80px] opacity-20"></div>
          
          <h2 className="text-lg font-bold mb-2 flex items-center gap-2 relative z-10">
            <span className="bg-blue-500 p-1.5 rounded-lg text-white">✨</span> 
            {isAR ? 'رؤى الذكاء الاصطناعي' : 'AI Insights'}
          </h2>
          <p className="text-slate-300 text-sm mb-6 relative z-10 leading-relaxed">
            {isAR ? 'الذكاء الاصطناعي الخاص بنا يقوم بتحليل بيانات المخزون الخاص بك.' : 'Our AI is currently analyzing your inventory data to find actionable insights.'}
          </p>

          {/* AI Chat Placeholder */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10 relative z-10">
             <div className="flex gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold flex-shrink-0">AI</div>
                <div className="bg-white/10 rounded-2xl rounded-tl-sm p-3 text-sm">
                  {isAR ? "بناءً على نشاطك الأخير، أوصي بإعادة طلب العناصر من قسم 'الكهربائيات' قريباً." : "Based on your recent activity, I recommend reordering items from the 'Electrical' department soon."}
                </div>
             </div>
             
             <button className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors border border-white/5">
                {isAR ? 'تحدث مع الذكاء الاصطناعي' : 'Chat with AI Assistant'}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
