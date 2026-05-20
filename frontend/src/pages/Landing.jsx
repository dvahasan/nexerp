import { MdInventory, MdTrendingUp, MdLanguage, MdComputer } from 'react-icons/md';

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans selection:bg-blue-500/30">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <span className="text-white font-black text-xl">N</span>
            </div>
            <span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">NexERP</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#login" className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Log In</a>
            <a href="#register" className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5">
              Start for Free
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center space-y-8 animate-in slide-in-from-bottom-8 fade-in duration-1000">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-semibold border border-blue-100 dark:border-blue-800/50">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            NexERP SaaS is now in Beta
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.1]">
            Intelligent Inventory.<br/>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600">
              Infinite Possibilities.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Manage your company's entire inventory flow, track multi-currency transactions, and empower your team with AI-driven insights—all from one beautiful workspace.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <a href="#register" className="w-full sm:w-auto bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 px-8 py-4 rounded-2xl text-lg font-bold transition-all shadow-xl hover:-translate-y-1">
              Create Company Profile
            </a>
            <a href="#login" className="w-full sm:w-auto bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 px-8 py-4 rounded-2xl text-lg font-bold transition-all hover:bg-slate-50 dark:hover:bg-slate-700">
              Sign In to Workspace
            </a>
          </div>
        </div>

        {/* Mockup / Image Area */}
        <div className="max-w-6xl mx-auto mt-20 relative animate-in fade-in zoom-in-95 duration-1000 delay-300">
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 blur-3xl -z-10 rounded-full"></div>
          <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-3xl p-4 shadow-2xl">
             <div className="w-full h-8 bg-slate-200/50 dark:bg-slate-900/50 rounded-t-xl mb-4 flex items-center px-4 gap-2">
               <div className="w-3 h-3 rounded-full bg-red-400"></div>
               <div className="w-3 h-3 rounded-full bg-amber-400"></div>
               <div className="w-3 h-3 rounded-full bg-green-400"></div>
             </div>
             {/* We can use a grid to simulate a dashboard UI as the preview */}
             <div className="grid grid-cols-12 gap-4 h-[400px] md:h-[600px] bg-slate-50 dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800 p-4">
                <div className="col-span-3 h-full border-r border-slate-200 dark:border-slate-800 hidden md:block">
                  <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded mb-8"></div>
                  <div className="space-y-4">
                    <div className="h-8 w-full bg-blue-50 dark:bg-blue-500/10 rounded-lg"></div>
                    <div className="h-8 w-3/4 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
                    <div className="h-8 w-5/6 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
                  </div>
                </div>
                <div className="col-span-12 md:col-span-9 h-full flex flex-col gap-4">
                  <div className="flex gap-4">
                    <div className="h-32 flex-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700"></div>
                    <div className="h-32 flex-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hidden sm:block"></div>
                    <div className="h-32 flex-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hidden sm:block"></div>
                  </div>
                  <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-4">
                    <div className="h-6 w-48 bg-slate-100 dark:bg-slate-700 rounded mb-6"></div>
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-12 w-full bg-slate-50 dark:bg-slate-900 rounded-xl"></div>
                      ))}
                    </div>
                  </div>
                </div>
             </div>
          </div>
        </div>

        {/* Features */}
        <div className="max-w-6xl mx-auto mt-32 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { icon: <MdInventory size={32}/>, title: "Multi-Tenant SaaS", desc: "Completely isolated environments. Each company gets its own database, users, and branding." },
            { icon: <MdTrendingUp size={32}/>, title: "AI Insights", desc: "Built-in Google Gemini integration to forecast trends and advise on low-stock items." },
            { icon: <MdLanguage size={32}/>, title: "Global Ready", desc: "Full English & Arabic (RTL) support out of the box, with per-user persistent language settings." },
            { icon: <MdComputer size={32}/>, title: "Modern Stack", desc: "Lightning fast React architecture styled with beautiful, responsive Tailwind CSS." }
          ].map((f, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-xl hover:-translate-y-2 transition-all duration-300">
              <div className="w-14 h-14 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-6">
                {f.icon}
              </div>
              <h3 className="text-xl font-bold mb-3">{f.title}</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
      
      <footer className="border-t border-slate-200 dark:border-slate-800 py-12 mt-20">
        <div className="max-w-6xl mx-auto px-6 text-center text-slate-500 dark:text-slate-400">
          <p>© 2026 NexERP. Built with ❤️ and Agentic AI.</p>
        </div>
      </footer>
    </div>
  );
}
