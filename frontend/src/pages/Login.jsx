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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Subtle top accent — no GPU cost */}
      <div className="fixed top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent pointer-events-none" />

      <div className="w-full max-w-md">
        {/* Solid card — no backdrop-blur */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
          <div className="text-center mb-8">
            <div className="bg-blue-600 w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4">
              <MdInventory className="text-white text-3xl" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">NexERP SaaS</h1>
            <p className="text-slate-400 mt-1.5 text-sm">
              {isAR ? 'تسجيل الدخول للوصول إلى مساحة العمل الخاصة بك' : 'Sign in to access your workspace'}
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-xl mb-5 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5">
                {t.companyCode}
              </label>
              <input
                type="text"
                value={code} onChange={e => setCode(e.target.value)} required
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm placeholder:text-slate-500"
                placeholder="e.g. NEX-01"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5">
                {t.username}
              </label>
              <input
                type="text"
                value={username} onChange={e => setUsername(e.target.value)} required
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm placeholder:text-slate-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5">
                {t.password}
              </label>
              <input
                type="password"
                value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm placeholder:text-slate-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : t.login}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-500 text-sm">
              {isAR ? 'ليس لديك مساحة عمل؟' : "Don't have a workspace?"}{' '}
              <a href="#register" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                {isAR ? 'إنشاء حساب' : 'Create one'}
              </a>
            </p>
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">© 2025 NexERP SaaS. All rights reserved.</p>
      </div>
    </div>
  );
}
