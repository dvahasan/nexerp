import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import Skeleton from '../components/Skeleton';
import { apiUrl } from '../api';

const T = {
  canvas: '#0A0A0A',
  elev: '#121212',
  border: '#27272A',
  fg: '#FAFAFA',
  fgMuted: '#A1A1AA',
  primary: '#06b6d4', // Cyan
  neg: '#ef4444'
};

export default function DeveloperDashboard() {
  const [devKey, setDevKey] = useState(localStorage.getItem('nex_dev_key') || '');
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const navigate = useNavigate();

  const fetchStats = async (key) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiUrl}/dev/stats`, {
        headers: { 'x-dev-key': key }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Unauthorized');
      
      setStats(data.data);
      setUnlocked(true);
      localStorage.setItem('nex_dev_key', key);
    } catch (err) {
      setError(err.message);
      setUnlocked(false);
      localStorage.removeItem('nex_dev_key');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (devKey) fetchStats(devKey);
  }, []); // eslint-disable-line

  const handleLogin = (e) => {
    e.preventDefault();
    if (devKey) fetchStats(devKey);
  };

  const logout = () => {
    setDevKey('');
    setUnlocked(false);
    setStats(null);
    localStorage.removeItem('nex_dev_key');
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds) => {
    const d = Math.floor(seconds / (3600*24));
    const h = Math.floor(seconds % (3600*24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    return `${d}d ${h}h ${m}m`;
  };

  if (!unlocked) {
    return (
      <div className="flex h-screen w-full items-center justify-center p-4" style={{ backgroundColor: T.canvas, color: T.fg }}>
        <form onSubmit={handleLogin} className="w-full max-w-sm p-8 rounded-xl shadow-2xl flex flex-col items-center" style={{ backgroundColor: T.elev, border: `1px solid ${T.border}` }}>
          <div className="w-12 h-12 rounded bg-cyan-900/30 flex flex-col items-center justify-center mb-4" style={{ border: `1px solid ${T.primary}40` }}>
            <Icon name="company" size={24} style={{ color: T.primary }} />
          </div>
          <h1 className="text-xl font-bold mb-1">Nex Developer</h1>
          <p className="text-xs mb-8 font-mono text-center" style={{ color: T.fgMuted }}>
            Isolated Enterprise Monitoring System
          </p>
          
          <div className="w-full relative">
            <Icon name="lock" size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: T.fgMuted }} />
            <input 
              type="password"
              placeholder="Developer Master Key"
              value={devKey}
              onChange={e => setDevKey(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-lg text-sm outline-none font-mono tracking-widest"
              style={{ backgroundColor: T.canvas, border: `1px solid ${T.border}`, color: T.fg }}
              autoFocus
            />
          </div>
          
          {error && <p className="text-xs mt-3 w-full text-center" style={{ color: T.neg }}>{error}</p>}
          
          <button 
            type="submit" 
            disabled={loading || !devKey}
            className="w-full h-10 mt-6 rounded-lg text-sm font-semibold flex justify-center items-center gap-2 transition-opacity disabled:opacity-50"
            style={{ backgroundColor: T.primary, color: '#000' }}
          >
            {loading ? 'AUTHENTICATING...' : 'ACCESS SYSTEM'}
          </button>
          
          <button 
            type="button" 
            onClick={() => navigate('/')}
            className="mt-6 text-xs transition-colors hover:text-white"
            style={{ color: T.fgMuted }}
          >
            &larr; Return to Application
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden font-sans" style={{ backgroundColor: T.canvas, color: T.fg }}>
      {/* Header */}
      <header className="h-14 flex-shrink-0 flex items-center justify-between px-6" style={{ backgroundColor: T.elev, borderBottom: `1px solid ${T.border}` }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-cyan-900/30 flex items-center justify-center" style={{ border: `1px solid ${T.primary}40` }}>
            <Icon name="company" size={16} style={{ color: T.primary }} />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wide">NEX DEVELOPER DASHBOARD</h1>
            <div className="text-[10px] font-mono uppercase tracking-widest flex items-center gap-2" style={{ color: T.primary }}>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
              Live Global Telemetry
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => fetchStats(devKey)} className="w-8 h-8 rounded flex items-center justify-center hover:bg-zinc-800 transition-colors" style={{ color: T.fgMuted }}>
            <Icon name="refresh" size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={logout} className="h-8 px-4 rounded text-xs font-semibold hover:bg-zinc-800 transition-colors" style={{ border: `1px solid ${T.border}` }}>
            LOCK SESSION
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* Platform Usage */}
          <section>
            <h2 className="text-xs font-mono uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: T.fgMuted }}>
              <Icon name="company" size={12} /> Platform Aggregates
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Workspaces', val: stats?.counts?.companies, icon: 'company' },
                { label: 'Total Users', val: stats?.counts?.users, icon: 'user' },
                { label: 'Transactions', val: stats?.counts?.transactions, icon: 'transaction' },
                { label: 'Total Items', val: stats?.counts?.items, icon: 'inventory' },
              ].map((card, i) => (
                <div key={i} className="p-5 rounded-lg flex flex-col gap-3 relative overflow-hidden" style={{ backgroundColor: T.elev, border: `1px solid ${T.border}` }}>
                  <Icon name={card.icon} size={48} className="absolute -right-2 -bottom-2 opacity-5" style={{ color: T.primary }} />
                  <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color: T.fgMuted }}>{card.label}</div>
                  <div className="text-3xl font-light tabular-nums">{card.val === undefined ? <Skeleton className="h-8 w-20 bg-zinc-800" /> : card.val.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Infrastructure */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Server Node OS */}
            <section>
              <h2 className="text-xs font-mono uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: T.fgMuted }}>
                <Icon name="analytics" size={12} /> Server Telemetry ({stats?.server?.platform || 'Unknown'})
              </h2>
              <div className="rounded-lg p-5 flex flex-col gap-5" style={{ backgroundColor: T.elev, border: `1px solid ${T.border}` }}>
                
                <div>
                  <div className="flex justify-between text-[10px] font-mono uppercase mb-2" style={{ color: T.fgMuted }}>
                    <span>Memory Usage</span>
                    <span>{formatBytes(stats?.server?.memory?.used)} / {formatBytes(stats?.server?.memory?.total)}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-zinc-900 overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-1000" 
                      style={{ 
                        width: `${stats ? (stats.server.memory.used / stats.server.memory.total) * 100 : 0}%`,
                        backgroundColor: T.primary
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded bg-zinc-900/50" style={{ border: `1px solid ${T.border}` }}>
                    <div className="text-[10px] font-mono uppercase mb-1" style={{ color: T.fgMuted }}>System Uptime</div>
                    <div className="text-sm font-semibold">{stats ? formatUptime(stats.server.uptimeSeconds) : '...'}</div>
                  </div>
                  <div className="p-3 rounded bg-zinc-900/50" style={{ border: `1px solid ${T.border}` }}>
                    <div className="text-[10px] font-mono uppercase mb-1" style={{ color: T.fgMuted }}>Node Version</div>
                    <div className="text-sm font-semibold">{stats?.server?.nodeVersion || '...'}</div>
                  </div>
                </div>

                {stats?.server?.loadAvg && (
                  <div>
                    <div className="text-[10px] font-mono uppercase mb-1" style={{ color: T.fgMuted }}>Load Averages (1m, 5m, 15m)</div>
                    <div className="flex gap-2">
                      {stats.server.loadAvg.map((load, i) => (
                        <div key={i} className="flex-1 py-1 text-center rounded bg-zinc-900/30 text-xs font-mono text-cyan-400" style={{ border: `1px solid ${T.primary}20` }}>
                          {load.toFixed(2)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Database Stats */}
            <section>
              <h2 className="text-xs font-mono uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: T.fgMuted }}>
                <Icon name="database" size={12} /> Database Cluster
              </h2>
              <div className="rounded-lg p-5 flex flex-col gap-4" style={{ backgroundColor: T.elev, border: `1px solid ${T.border}` }}>
                {stats?.database ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-mono uppercase" style={{ color: T.fgMuted }}>Data Size</span>
                        <span className="text-lg font-light">{formatBytes(stats.database.dataSize)}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-mono uppercase" style={{ color: T.fgMuted }}>Storage Size</span>
                        <span className="text-lg font-light">{formatBytes(stats.database.storageSize)}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-mono uppercase" style={{ color: T.fgMuted }}>Total Objects</span>
                        <span className="text-lg font-light">{stats.database.objects.toLocaleString()}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-mono uppercase" style={{ color: T.fgMuted }}>Total Indexes</span>
                        <span className="text-lg font-light">{stats.database.indexes.toLocaleString()}</span>
                      </div>
                    </div>
                    
                    <div className="mt-2 p-3 rounded text-xs font-mono bg-emerald-950/20 text-emerald-400 flex items-center gap-2" style={{ border: '1px solid rgba(52, 211, 153, 0.2)' }}>
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Database Connected & Healthy
                    </div>
                  </>
                ) : (
                  <div className="py-10 text-center text-xs font-mono" style={{ color: T.fgMuted }}>
                    Database stats unavailable
                  </div>
                )}
              </div>
            </section>

          </div>
        </div>
      </main>
    </div>
  );
}
