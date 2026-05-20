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
        <div className="max-w-6xl mx-auto mt-20 relative">
          {/* Glow */}
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/30 to-purple-500/20 blur-3xl -z-10 rounded-full scale-75"></div>

          {/* Browser chrome */}
          <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-600/60 rounded-3xl p-3 shadow-2xl shadow-black/40">
            {/* Traffic lights */}
            <div className="h-8 flex items-center px-3 gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-amber-400"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <div className="flex-1 mx-4 h-5 bg-slate-700 rounded-lg flex items-center justify-center">
                <div className="h-2 w-32 bg-slate-500 rounded"></div>
              </div>
            </div>

            {/* Dashboard UI */}
            <div className="grid grid-cols-12 gap-3 h-[380px] md:h-[540px] bg-slate-900 rounded-2xl overflow-hidden border border-slate-700/50 p-3">

              {/* Sidebar */}
              <div className="col-span-3 hidden md:flex flex-col gap-2 border-r border-slate-700/50 pr-3">
                <div className="flex items-center gap-2 mb-3 mt-1">
                  <div className="w-6 h-6 rounded-lg bg-blue-500"></div>
                  <div className="h-3 w-16 bg-slate-500 rounded"></div>
                </div>
                {[
                  { color: 'bg-blue-500/30 border-blue-500/40', active: true },
                  { color: 'bg-slate-700/40 border-transparent', active: false },
                  { color: 'bg-slate-700/40 border-transparent', active: false },
                  { color: 'bg-slate-700/40 border-transparent', active: false },
                ].map((item, i) => (
                  <div key={i} className={`h-8 rounded-lg border flex items-center px-2 gap-2 ${item.color}`}>
                    <div className={`w-2 h-2 rounded-sm ${item.active ? 'bg-blue-400' : 'bg-slate-500'}`}></div>
                    <div className={`h-2 w-14 rounded ${item.active ? 'bg-blue-300/60' : 'bg-slate-600'}`}></div>
                  </div>
                ))}
              </div>

              {/* Main content */}
              <div className="col-span-12 md:col-span-9 flex flex-col gap-3">
                {/* Stat cards */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { bg: 'bg-blue-500/20', border: 'border-blue-500/30', bar: 'bg-blue-500', label: 'bg-blue-300/40', val: 'bg-blue-400', w: 'w-8' },
                    { bg: 'bg-green-500/20', border: 'border-green-500/30', bar: 'bg-green-500', label: 'bg-green-300/40', val: 'bg-green-400', w: 'w-6' },
                    { bg: 'bg-purple-500/20', border: 'border-purple-500/30', bar: 'bg-purple-500', label: 'bg-purple-300/40', val: 'bg-purple-400', w: 'w-10' },
                  ].map((c, i) => (
                    <div key={i} className={`rounded-xl border p-3 ${c.bg} ${c.border}`}>
                      <div className={`h-2 w-14 rounded mb-2 ${c.label}`}></div>
                      <div className={`h-6 rounded ${c.w} ${c.val}`}></div>
                      <div className="mt-2 h-1 w-full bg-slate-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${c.bar}`} style={{ width: `${[65, 40, 80][i]}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Table */}
                <div className="flex-1 bg-slate-800/60 rounded-xl border border-slate-700/50 p-3 overflow-hidden">
                  <div className="flex justify-between items-center mb-3">
                    <div className="h-3 w-32 bg-slate-400 rounded"></div>
                    <div className="h-6 w-20 rounded-lg bg-blue-500/30 border border-blue-500/30"></div>
                  </div>
                  {/* Table header */}
                  <div className="flex gap-3 px-2 mb-2">
                    {['w-24', 'w-16', 'w-12', 'w-20'].map((w, i) => (
                      <div key={i} className={`h-2 rounded bg-slate-600 ${w}`}></div>
                    ))}
                  </div>
                  {/* Table rows */}
                  <div className="space-y-2">
                    {[
                      ['bg-green-500', 'w-28', 'w-10', 'w-16'],
                      ['bg-yellow-400', 'w-20', 'w-12', 'w-24'],
                      ['bg-blue-400',  'w-32', 'w-8',  'w-16'],
                      ['bg-red-400',   'w-16', 'w-14', 'w-20'],
                      ['bg-green-500', 'w-24', 'w-10', 'w-28'],
                    ].map(([dot, ...cols], i) => (
                      <div key={i} className="flex items-center gap-3 h-9 bg-slate-700/30 rounded-lg px-2">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${dot}`}></div>
                        {cols.map((w, j) => (
                          <div key={j} className={`h-2 rounded bg-slate-600 ${w}`}></div>
                        ))}
                      </div>
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
