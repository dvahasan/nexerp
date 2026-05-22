import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { MdInventory } from 'react-icons/md';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const { login, t, isAR } = useAppContext();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginType, setLoginType] = useState("standard");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(loginType === 'enterprise' ? '' : code, username, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative">
      {/* Subtle top accent */}
      <div className="fixed top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent pointer-events-none" />

      {/* Back to Home Link */}
      <Link to="/" className="absolute top-6 left-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium bg-slate-800/50 hover:bg-slate-800 px-4 py-2 rounded-full border border-slate-700/50">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        {isAR ? 'الرئيسية' : 'Home'}
      </Link>

      <div className="w-full max-w-md z-10">
        {/* Solid card — no backdrop-blur */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
          <div className="text-center mb-8">
            <div className="bg-blue-600 w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4">
              <MdInventory className="text-white text-3xl" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">NexINV SaaS</h1>
            <p className="text-slate-400 mt-1.5 text-sm">
              {isAR ? 'تسجيل الدخول للوصول إلى مساحة العمل الخاصة بك' : 'Sign in to access your workspace'}
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-xl mb-5 text-center">
              {error}
            </div>
          )}

          {/* Login Type Tabs */}
          <div className="flex bg-slate-800 p-1 rounded-xl mb-6">
            <button
              onClick={() => setLoginType('standard')}
              className={`flex-1 text-sm font-semibold py-2 rounded-lg transition-colors ${
                loginType === 'standard' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              {isAR ? 'مساحة العمل' : 'Workspace'}
            </button>
            <button
              onClick={() => setLoginType('enterprise')}
              className={`flex-1 text-sm font-semibold py-2 rounded-lg transition-colors ${
                loginType === 'enterprise' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              {isAR ? 'المؤسسة' : 'Enterprise'}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {loginType === 'standard' && (
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
            )}
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
              <Link to="/register" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                {isAR ? 'إنشاء حساب' : 'Create one'}
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">© 2025 NexINV SaaS. All rights reserved.</p>
      </div>
    </div>
  );
}
