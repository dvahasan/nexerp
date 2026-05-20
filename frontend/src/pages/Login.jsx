import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { MdInventory } from 'react-icons/md';

export default function Login() {
  const { login, t, isAR } = useAppContext();
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(code, username, password);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px] opacity-30 animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600 rounded-full blur-[120px] opacity-30 animate-pulse delay-1000"></div>
      
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8 relative z-10">
        <div className="text-center mb-10">
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 w-16 h-16 rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-4">
            <MdInventory className="text-white text-3xl" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">NexERP SaaS</h1>
          <p className="text-slate-400 mt-2 text-sm">{isAR ? 'تسجيل الدخول للوصول إلى مساحة العمل الخاصة بك' : 'Sign in to access your workspace'}</p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 text-sm p-3 rounded-xl mb-6 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">{t.companyCode}</label>
            <input 
              type="text" 
              value={code} onChange={e => setCode(e.target.value)} required
              className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="e.g. NEX-01"
            />
          </div>
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">{t.username}</label>
            <input 
              type="text" 
              value={username} onChange={e => setUsername(e.target.value)} required
              className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">{t.password}</label>
            <input 
              type="password" 
              value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-blue-500/30 transform transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : t.login}
          </button>
        </form>
      </div>
    </div>
  );
}
