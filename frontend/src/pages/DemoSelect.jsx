import React, { useState } from 'react';
import { MdBusiness, MdDomainAdd, MdArrowBack } from 'react-icons/md';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

export default function DemoSelect() {
  const { loginDemo } = useAppContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(null);

  const handleSelect = async (type) => {
    try {
      await fetch(import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/dev/track-demo` : "http://localhost:5000/api/dev/track-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type })
      }).catch(() => {}); // silently fail if backend is down
    } catch(e) {}

    setLoading(type);
    try {
      await loginDemo(type);
      navigate(type === 'enterprise' ? '/enterprise' : '/dashboard');
    } catch (err) {
      console.error(err);
      alert('Demo login failed. Please ensure the backend is running and seeded.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background aesthetics */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/10 blur-[120px]" />
      </div>

      <div className="w-full max-w-5xl z-10">
        <Link to="/" className="inline-flex items-center text-slate-400 hover:text-white transition-colors mb-12 group font-medium">
          <MdArrowBack className="mr-2 group-hover:-translate-x-1 transition-transform" /> Back to Home
        </Link>

        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
            Choose Your Experience
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Test drive the system with our interactive demo. You can view all features and reports, but data modifications and uploads are disabled.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Standard Demo Card */}
          <div 
            onClick={() => !loading && handleSelect('standard')}
            className={`group bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 hover:border-blue-500/50 rounded p-10 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 relative overflow-hidden ${loading === 'standard' ? 'opacity-70 pointer-events-none' : ''}`}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-colors" />
            
            <div className="w-16 h-16 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
              <MdBusiness size={32} />
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-4">Standard Demo</h2>
            <p className="text-slate-400 mb-8 leading-relaxed">
              Perfect for single businesses. Explore the core inventory management, transaction logging, barcode scanning, and user roles.
            </p>

            <button className="w-full py-4 rounded font-bold bg-white text-slate-900 group-hover:bg-blue-500 group-hover:text-white transition-colors flex items-center justify-center">
              {loading === 'standard' ? (
                <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
              ) : 'Launch Standard Demo'}
            </button>
          </div>

          {/* Enterprise Demo Card */}
          <div 
            onClick={() => !loading && handleSelect('enterprise')}
            className={`group bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-purple-500/30 hover:border-purple-500/60 rounded p-10 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20 hover:-translate-y-1 relative overflow-hidden ${loading === 'enterprise' ? 'opacity-70 pointer-events-none' : ''}`}
          >
            <div className="absolute -top-4 -right-4 bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg transform rotate-12">
              ENTERPRISE
            </div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-colors" />

            <div className="w-16 h-16 rounded bg-purple-500/20 text-purple-400 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
              <MdDomainAdd size={32} />
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-4">Enterprise Demo</h2>
            <p className="text-purple-200/70 mb-8 leading-relaxed">
              Designed for holding groups and agencies. View the master dashboard, manage infinite companies, and switch between isolated workspaces.
            </p>

            <button className="w-full py-4 rounded font-bold bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-400 hover:to-indigo-400 transition-colors shadow-lg shadow-purple-500/25 flex items-center justify-center">
              {loading === 'enterprise' ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : 'Launch Enterprise Demo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
