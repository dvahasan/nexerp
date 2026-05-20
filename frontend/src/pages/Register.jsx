import { useState } from 'react';
import { api } from '../api';
import { useAppContext } from '../context/AppContext';
import { MdBusiness, MdPerson, MdEmail, MdLock, MdArrowForward } from 'react-icons/md';

export default function Register() {
  const { loginWithToken } = useAppContext();

  const [form, setForm] = useState({ companyName: '', adminUsername: '', adminEmail: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [entering, setEntering] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.register(form);
      setSuccessData({ token: res.token, code: res.companyCode });
    } catch (err) {
      setError(err.message || "Failed to register");
    } finally {
      setLoading(false);
    }
  };

  const handleEnterWorkspace = async () => {
    if (!successData?.token) return;
    setEntering(true);
    try {
      await loginWithToken(successData.token);
    } catch {
      setError("Failed to enter workspace. Please log in manually.");
    } finally {
      setEntering(false);
    }
  };

  if (successData) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4 selection:bg-blue-500/30 font-sans">
        <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 border border-slate-100 dark:border-slate-700 text-center animate-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
            🎉
          </div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Welcome to NexERP!</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-8">
            Your company workspace has been created.
          </p>
          
          <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl mb-8 border border-slate-100 dark:border-slate-700">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-2 uppercase font-bold tracking-wider">Your Company Code</p>
            <p className="text-3xl font-mono font-black text-blue-600 dark:text-blue-400 tracking-widest">{successData.code}</p>
            <p className="text-xs text-slate-500 mt-4">Save this code! Your employees will need it to log in.</p>
          </div>

          <button
            onClick={handleEnterWorkspace}
            disabled={entering}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-4 font-bold text-lg transition-colors border border-blue-500 flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {entering
              ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Entering...</>
              : 'Enter Workspace'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col md:flex-row font-sans selection:bg-blue-500/30">
      
      {/* Left Banner */}
      <div className="hidden md:flex flex-1 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-12 text-white flex-col justify-between relative overflow-hidden">
        <div className="relative z-10">
          <a href="#landing" className="flex items-center gap-3 w-max">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center border border-white/30 shadow-xl">
              <span className="text-white font-black text-2xl">N</span>
            </div>
            <span className="text-2xl font-black tracking-tight">NexERP</span>
          </a>
        </div>
        
        <div className="relative z-10 max-w-md">
          <h1 className="text-5xl font-black mb-6 leading-tight">Scale your operations instantly.</h1>
          <p className="text-blue-100 text-lg leading-relaxed">Join NexERP's multi-tenant platform to organize your inventory and boost your team's productivity with AI.</p>
        </div>
        
        <div className="relative z-10 flex items-center gap-4 text-sm font-medium text-blue-200">
          <div className="flex -space-x-3">
            <div className="w-8 h-8 rounded-full bg-white/20 border border-white/30"></div>
            <div className="w-8 h-8 rounded-full bg-white/30 border border-white/30"></div>
            <div className="w-8 h-8 rounded-full bg-white/40 border border-white/30"></div>
          </div>
          Join hundreds of companies
        </div>
      </div>

      {/* Right Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 relative">
        <a href="#landing" className="md:hidden absolute top-6 left-6 text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">NexERP</a>
        
        <div className="w-full max-w-md animate-in slide-in-from-right-8 fade-in duration-700">
          <div className="mb-10">
            <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-2 tracking-tight">Create Company</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Set up your workspace and admin account.</p>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl mb-6 text-sm font-bold flex items-center gap-2">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Company Name</label>
              <div className="relative">
                <MdBusiness className="absolute top-1/2 -translate-y-1/2 left-4 text-slate-400" size={20} />
                <input 
                  type="text" required
                  value={form.companyName} onChange={e => setForm({...form, companyName: e.target.value})}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl pl-12 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow shadow-sm"
                  placeholder="Acme Corp"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Admin Username</label>
              <div className="relative">
                <MdPerson className="absolute top-1/2 -translate-y-1/2 left-4 text-slate-400" size={20} />
                <input 
                  type="text" required
                  value={form.adminUsername} onChange={e => setForm({...form, adminUsername: e.target.value})}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl pl-12 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow shadow-sm"
                  placeholder="admin"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Admin Email (Optional)</label>
              <div className="relative">
                <MdEmail className="absolute top-1/2 -translate-y-1/2 left-4 text-slate-400" size={20} />
                <input 
                  type="email" 
                  value={form.adminEmail} onChange={e => setForm({...form, adminEmail: e.target.value})}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl pl-12 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow shadow-sm"
                  placeholder="admin@acme.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Password</label>
              <div className="relative">
                <MdLock className="absolute top-1/2 -translate-y-1/2 left-4 text-slate-400" size={20} />
                <input 
                  type="password" required
                  value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl pl-12 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow shadow-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-4 font-bold text-lg transition-colors border border-blue-500 mt-4 flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>Sign Up <MdArrowForward size={20}/></>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
              Already have a workspace? <a href="#login" className="text-blue-600 dark:text-blue-400 font-bold hover:underline">Log in here</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
