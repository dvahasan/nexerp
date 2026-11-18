import { useState, useEffect } from 'react';
import { ShieldAlert, Database, Server, Users, Box, Factory, Activity, Terminal, Globe, Code, Settings, Sun, Moon } from 'lucide-react';
import './index.css';

const API_BASE = 'http://localhost:5000/api';

export default function App() {
  const [unlocked, setUnlocked] = useState(false);
  const [devKey, setDevKey] = useState('');
  const [serverUrl, setServerUrl] = useState(API_BASE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [stats, setStats] = useState(null);
  const [details, setDetails] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isDark, setIsDark] = useState(true);

  // Personnel States
  const [users, setUsers] = useState([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [usersLoading, setUsersLoading] = useState(false);

  // DB Explorer States
  const [dbModels, setDbModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [dbDocs, setDbDocs] = useState([]);
  const [dbTotal, setDbTotal] = useState(0);
  const [dbPage, setDbPage] = useState(1);
  const [dbLoading, setDbLoading] = useState(false);
  const [jsonModal, setJsonModal] = useState({ open: false, isNew: false, docId: null, content: '' });

  // Action Logs & Settings State
  const [actionLogs, setActionLogs] = useState([]);
  const [settings, setSettings] = useState([]);

  const fetchStats = async (key, url) => {
    setLoading(true);
    setError('');
    try {
      const [resStats, resDetails, resLogs, resSettings] = await Promise.all([
        fetch(`${url}/dev/stats`, { headers: { 'x-dev-key': key } }),
        fetch(`${url}/dev/details`, { headers: { 'x-dev-key': key } }),
        fetch(`${url}/dev/action-logs`, { headers: { 'x-dev-key': key } }).catch(() => ({ json: () => ({data:[]}) })),
        fetch(`${url}/dev/settings`, { headers: { 'x-dev-key': key } }).catch(() => ({ json: () => ({data:[]}) }))
      ]);

      if (!resStats.ok) throw new Error('Invalid Master Key or Server Offline');

      const dataStats = await resStats.json();
      const dataDetails = await resDetails.json();
      
      const dataLogs = resLogs.ok ? await resLogs.json() : { data: [] };
      const dataSettings = resSettings.ok ? await resSettings.json() : { data: [] };

      setStats(dataStats.data);
      setDetails(dataDetails.data);
      setActionLogs(dataLogs.data || []);
      setSettings(dataSettings.data || []);
      
      setUnlocked(true);
      localStorage.setItem('nex_dev_key', key);
      localStorage.setItem('nex_server_url', url);

      // Fetch DB Models
      fetch(`${url}/dev/db/models`, { headers: { 'x-dev-key': key } })
        .then(r => r.json())
        .then(d => { if (d.success) setDbModels(d.data.sort()); })
        .catch(() => {});

    } catch (err) {
      setError(err.message === 'Failed to fetch' ? 'ERR: Connection Refused (Is the server running?)' : err.message);
      setUnlocked(false);
    }
    setLoading(false);
  };

  useEffect(() => {
    const savedKey = localStorage.getItem('nex_dev_key');
    const savedUrl = localStorage.getItem('nex_server_url');
    if (savedKey) {
      setDevKey(savedKey);
      if (savedUrl) setServerUrl(savedUrl);
      fetchStats(savedKey, savedUrl || API_BASE);
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const handleUnlock = (e) => {
    e.preventDefault();
    fetchStats(devKey, serverUrl);
  };

  if (!unlocked) {
    return (
      <div className="vault-overlay">
        <div className="vault-box">
          <div className="vault-logo"><ShieldAlert size={32} /></div>
          <h2 style={{ color: 'var(--text-main)', marginBottom: '10px' }}>SYSTEM BACKDOOR</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '14px', marginBottom: '20px', textAlign: 'center' }}>
            Enter Master Dev Key to access telemetry and raw database controls.
          </p>
          
          <form onSubmit={handleUnlock} style={{ width: '100%' }}>
            <input 
              type="text" 
              className="vault-input" 
              placeholder="SERVER URL (e.g. http://localhost:5000/api)" 
              value={serverUrl}
              onChange={e => setServerUrl(e.target.value)}
              style={{ marginBottom: '10px', fontSize: '12px', letterSpacing: '1px' }}
            />
            <input 
              type="password" 
              className="vault-input" 
              placeholder="MASTER KEY" 
              value={devKey}
              onChange={e => setDevKey(e.target.value)}
              autoFocus
            />
            {error && <div className="error-text">{error}</div>}
            <button type="submit" className="vault-btn" disabled={loading || !devKey}>
              {loading ? 'AUTHENTICATING...' : 'AUTHORIZE'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const fetchPersonnel = async (page = 1) => {
    setUsersLoading(true);
    setUsersPage(page);
    const limit = 50;
    const skip = (page - 1) * limit;
    try {
      const res = await fetch(`${serverUrl}/dev/db/query/User`, {
        method: 'POST',
        headers: { 'x-dev-key': devKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit, skip })
      });
      const data = await res.json();
      if (data.success) {
        setUsers(data.data.docs);
        setUsersTotal(data.data.total);
      }
    } catch (e) { console.error(e); }
    setUsersLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'personnel' && unlocked) {
      fetchPersonnel(1);
    }
  }, [activeTab, unlocked]);

  const fetchDbDocs = async (model, page = 1) => {
    setDbLoading(true);
    setSelectedModel(model);
    setDbPage(page);
    const limit = 50;
    const skip = (page - 1) * limit;
    try {
      const res = await fetch(`${serverUrl}/dev/db/query/${model}`, {
        method: 'POST',
        headers: { 'x-dev-key': devKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit, skip })
      });
      const data = await res.json();
      if (data.success) {
        setDbDocs(data.data.docs);
        setDbTotal(data.data.total);
      }
    } catch (e) {
      console.error(e);
    }
    setDbLoading(false);
  };

  const handleSaveJson = async () => {
    try {
      const payload = JSON.parse(jsonModal.content);
      const url = jsonModal.isNew 
        ? `${serverUrl}/dev/db/${selectedModel}`
        : `${serverUrl}/dev/db/${selectedModel}/${jsonModal.docId}`;
      const method = jsonModal.isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'x-dev-key': devKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setJsonModal({ open: false, isNew: false, docId: null, content: '' });
        fetchDbDocs(selectedModel, dbPage);
      } else {
        alert("Error saving: " + data.message);
      }
    } catch (e) {
      alert("Invalid JSON syntax: " + e.message);
    }
  };

  const handleDeleteDoc = async (id) => {
    if (!window.confirm("CRITICAL WARNING: This will permanently delete this record from the database. Are you absolutely sure?")) return;
    try {
      const res = await fetch(`${serverUrl}/dev/db/${selectedModel}/${id}`, {
        method: 'DELETE',
        headers: { 'x-dev-key': devKey }
      });
      const data = await res.json();
      if (data.success) fetchDbDocs(selectedModel, dbPage);
      else alert("Error deleting: " + data.message);
    } catch (e) {
      alert("Delete failed: " + e.message);
    }
  };

  const toggleUserActive = async (id) => {
    try {
      const res = await fetch(`${serverUrl}/dev/personnel/toggle-active/${id}`, {
        method: 'POST',
        headers: { 'x-dev-key': devKey }
      });
      const data = await res.json();
      if (data.success) {
        fetchPersonnel(usersPage);
      }
    } catch(e) {
      console.error(e);
    }
  };

  const tabs = [
    { id: 'overview', label: 'OVERVIEW', icon: Activity },
    { id: 'workspaces', label: 'WORKSPACES', icon: Factory },
    { id: 'personnel', label: 'PERSONNEL', icon: Users },
    { id: 'bom', label: 'BOM / MFG', icon: Box },
    { id: 'demo', label: 'DEMO TRAFFIC', icon: Globe },
    { id: 'db', label: 'DATA EXPLORER', icon: Database },
    { id: 'logs', label: 'ACTION LOGS', icon: Terminal },
    { id: 'settings', label: 'SYSTEM SETTINGS', icon: Settings }
  ];

  return (
    <div className="hud-container">
      <div className="hud-header">
        <div className="hud-title">
          <ShieldAlert color="var(--accent)" size={28} />
          NEXINV SUPERADMIN
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <button className="theme-toggle" onClick={() => setIsDark(!isDark)}>
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div className="hud-status">
            <div className="status-dot"></div>
            {stats?.dbState === 'connected' ? 'DATABASE SECURED' : 'DISCONNECTED'}
            <button 
              onClick={() => fetchStats(devKey, serverUrl)} 
              style={{ marginLeft: '15px', background: 'transparent', color: 'var(--text-dim)', fontSize: '12px' }}
            >
              [ REFRESH ]
            </button>
          </div>
        </div>
      </div>

      <div className="nav-tabs">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button 
              key={t.id} 
              className={`nav-tab ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              <Icon size={16} /> {t.label}
            </button>
          )
        })}
      </div>

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', paddingRight: '10px' }}>
            <div className="telemetry-grid">
              <div className="panel panel-clickable" onClick={() => setActiveTab('workspaces')}>
                <div className="panel-title"><Factory size={16} /> ACTIVE WORKSPACES</div>
                <div className="panel-value">{stats?.counts?.companies?.toLocaleString() || 0}</div>
              </div>
              <div className="panel panel-clickable" onClick={() => setActiveTab('personnel')}>
                <div className="panel-title"><Users size={16} /> GLOBAL PERSONNEL</div>
                <div className="panel-value">{stats?.counts?.users?.toLocaleString() || 0}</div>
              </div>
              <div className="panel panel-clickable" onClick={() => { setActiveTab('db'); fetchDbDocs('Transaction'); }}>
                <div className="panel-title"><Activity size={16} /> TRANSACTIONS</div>
                <div className="panel-value">{stats?.counts?.transactions?.toLocaleString() || 0}</div>
              </div>
              <div className="panel panel-clickable" onClick={() => { setActiveTab('db'); fetchDbDocs('Item'); }}>
                <div className="panel-title"><Box size={16} /> TOTAL ITEMS</div>
                <div className="panel-value">{stats?.counts?.items?.toLocaleString() || 0}</div>
              </div>
            </div>

            <div className="grid-2">
              <div className="panel">
                <h2 style={{ color: 'var(--text-main)', fontSize: '16px', marginBottom: '20px' }}>SERVER NODE HEALTH</h2>
                <div style={{ marginBottom: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '14px' }}>
                    <span style={{ color: 'var(--text-dim)' }}>CPU THREADS</span>
                    <span>{stats?.server?.cpus} CORES</span>
                  </div>
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '14px' }}>
                    <span style={{ color: 'var(--text-dim)' }}>MEMORY USAGE</span>
                    <span>{stats?.server?.memoryUsage} / {stats?.server?.totalMemory}</span>
                  </div>
                  <div className="progress-bg">
                    <div className="progress-fill" style={{ width: `${(parseFloat(stats?.server?.memoryUsage) / parseFloat(stats?.server?.totalMemory)) * 100}%` }}></div>
                  </div>
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '14px' }}>
                    <span style={{ color: 'var(--text-dim)' }}>UPTIME</span>
                    <span>{stats?.server?.uptime}</span>
                  </div>
                </div>
              </div>

              <div className="panel">
                <h2 style={{ color: 'var(--text-main)', fontSize: '16px', marginBottom: '20px' }}>DATABASE CLUSTER</h2>
                <table className="data-table">
                  <tbody>
                    <tr><td style={{ color: 'var(--text-dim)' }}>STATUS</td><td><span className="badge badge-green">{stats?.dbState}</span></td></tr>
                    <tr><td style={{ color: 'var(--text-dim)' }}>HOST</td><td>{stats?.dbHost}</td></tr>
                    <tr><td style={{ color: 'var(--text-dim)' }}>DATABASE NAME</td><td>{stats?.dbName}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* WORKSPACES TAB */}
        {activeTab === 'workspaces' && (
          <div className="panel" style={{ height: '100%', overflowY: 'auto' }}>
            <h2 style={{ color: 'var(--text-main)', fontSize: '16px', marginBottom: '20px' }}>ACTIVE WORKSPACES DIRECTORY</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th>NAME</th>
                  <th>CODE</th>
                  <th>INDUSTRY</th>
                  <th>THEME</th>
                  <th>CREATED</th>
                </tr>
              </thead>
              <tbody>
                {details?.workspaces?.map((w, index) => (
                  <tr key={w._id}>
                    <td style={{ color: 'var(--text-dim)', fontSize: '11px' }}>{index + 1}</td>
                    <td style={{ fontWeight: '600' }}>{w.name}</td>
                    <td>{w.code}</td>
                    <td>{w.industry || '-'}</td>
                    <td><span className="badge badge-blue">{w.theme || 'default'}</span></td>
                    <td>{new Date(w.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* PERSONNEL TAB */}
        {activeTab === 'personnel' && (
          <div className="panel" style={{ height: '100%', overflowY: 'hidden', padding: 0 }}>
            <div style={{ padding: '24px', borderBottom: '1px solid var(--border-dim)', display: 'flex', justifyContent: 'space-between' }}>
              <h2 style={{ color: 'var(--text-main)', fontSize: '16px', margin: 0 }}>ALL PERSONNEL & ENTERPRISE USERS</h2>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {usersLoading ? (
                <div style={{ padding: '24px', color: 'var(--text-dim)' }}>Loading users...</div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>#</th>
                      <th>USERNAME</th>
                      <th>TYPE</th>
                      <th>ROLE</th>
                      <th>STATUS / ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, index) => (
                      <tr key={u._id}>
                        <td style={{ color: 'var(--text-dim)', fontSize: '11px' }}>{(usersPage - 1) * 50 + index + 1}</td>
                        <td>{u.username}<br/><span style={{fontSize:'11px', color:'var(--text-dim)'}}>{u.email}</span></td>
                        <td><span className={`badge ${u.isEnterprise ? 'badge-blue' : 'badge-green'}`}>{u.isEnterprise ? 'ENTERPRISE' : 'STANDARD'}</span></td>
                        <td><span style={{ fontSize: '12px', fontWeight: '500', textTransform: 'uppercase' }}>{u.role}</span></td>
                        <td>
                          <button 
                            onClick={() => toggleUserActive(u._id)}
                            style={{ 
                              background: u.active ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', 
                              color: u.active ? 'var(--danger)' : 'var(--accent)',
                              border: `1px solid ${u.active ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
                              padding: '6px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: '600'
                            }}
                          >
                            {u.active ? 'BAN USER' : 'ACTIVATE'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            {/* Pagination Controls */}
            {!usersLoading && usersTotal > 0 && (
              <div className="pagination-controls">
                <div style={{ color: 'var(--text-dim)', fontSize: '13px' }}>
                  SHOWING {(usersPage - 1) * 50 + 1} - {Math.min(usersPage * 50, usersTotal)} OF {usersTotal} USERS
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button 
                    className="btn-edit"
                    disabled={usersPage === 1}
                    onClick={() => fetchPersonnel(usersPage - 1)}
                  >
                    PREV
                  </button>
                  <span style={{ color: 'var(--text-main)', fontSize: '13px', fontWeight: '500', padding: '0 8px' }}>PAGE {usersPage} / {Math.ceil(usersTotal / 50)}</span>
                  <button 
                    className="btn-edit"
                    disabled={usersPage >= Math.ceil(usersTotal / 50)}
                    onClick={() => fetchPersonnel(usersPage + 1)}
                  >
                    NEXT
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* BOM TAB */}
        {activeTab === 'bom' && (
          <div className="grid-2" style={{ height: '100%' }}>
            <div className="panel">
              <h2 style={{ color: 'var(--text-main)', fontSize: '16px', marginBottom: '20px' }}>MANUFACTURING AGGREGATES</h2>
              <div className="panel-value" style={{ marginBottom: '5px' }}>{details?.bom?.totalTemplates || 0}</div>
              <div className="panel-title" style={{ marginBottom: '30px' }}>TOTAL BOM TEMPLATES DEFINED</div>
            </div>
            
            <div className="panel" style={{ overflowY: 'auto' }}>
              <h2 style={{ color: 'var(--text-main)', fontSize: '16px', marginBottom: '20px' }}>RECENT PRODUCTIONS</h2>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>#</th>
                    <th>QTY PRODUCED</th>
                    <th>NOTES</th>
                    <th>DATE</th>
                  </tr>
                </thead>
                <tbody>
                  {details?.bom?.recentProductions?.map((p, index) => (
                    <tr key={p._id}>
                      <td style={{ color: 'var(--text-dim)', fontSize: '11px' }}>{index + 1}</td>
                      <td style={{ color: 'var(--accent-secondary)' }}>{p.qtyProduced}</td>
                      <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.notes || '-'}</td>
                      <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* DEMO TRAFFIC TAB */}
        {activeTab === 'demo' && (
          <div className="panel" style={{ height: '100%', overflowY: 'auto' }}>
            <h2 style={{ color: 'var(--text-main)', fontSize: '16px', marginBottom: '20px' }}>LIVE DEMO TRAFFIC & GEOLOCATION</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th>TIMESTAMP</th>
                  <th>IP ADDRESS</th>
                  <th>LOCATION (API)</th>
                </tr>
              </thead>
              <tbody>
                {details?.demoTraffic?.map((d, index) => (
                  <tr key={d._id}>
                    <td style={{ color: 'var(--text-dim)', fontSize: '11px' }}>{index + 1}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{new Date(d.createdAt).toLocaleString()}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{d.ip || 'Local/Hidden'}</td>
                    <td>{d.location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ACTION LOGS TAB */}
        {activeTab === 'logs' && (
          <div className="panel" style={{ height: '100%', overflowY: 'auto' }}>
            <h2 style={{ color: 'var(--text-main)', fontSize: '16px', marginBottom: '20px' }}>SYSTEM AUDIT TRAIL</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>TIME</th>
                  <th>USER</th>
                  <th>ACTION</th>
                  <th>IP / PATH</th>
                  <th>BODY / DETAILS</th>
                </tr>
              </thead>
              <tbody>
                {actionLogs.map((log) => (
                  <tr key={log._id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '12px' }}>{new Date(log.createdAt).toLocaleString()}</td>
                    <td style={{ fontWeight: '500' }}>
                      {log.userId ? log.userId.username : <span style={{color:'var(--text-dim)'}}>Unauth</span>}
                      {log.companyId && <div style={{fontSize: '11px', color: 'var(--text-dim)'}}>{log.companyId.name}</div>}
                    </td>
                    <td><span className={`badge ${log.method==='DELETE'?'badge-red':'badge-blue'}`}>{log.method}</span></td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                      <div style={{ color: 'var(--text-dim)' }}>{log.ip}</div>
                      {log.path}
                    </td>
                    <td style={{ maxWidth: '300px' }}>
                      <pre style={{ margin:0, fontSize:'10px', background:'var(--bg-deep)', padding:'5px', borderRadius:'4px', overflowX:'auto' }}>
                        {JSON.stringify(log.body, null, 2)}
                      </pre>
                    </td>
                  </tr>
                ))}
                {actionLogs.length === 0 && <tr><td colSpan="5">No actions logged yet. Go trigger some actions in the main app!</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* SYSTEM SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="panel" style={{ height: '100%', overflowY: 'auto' }}>
            <h2 style={{ color: 'var(--text-main)', fontSize: '16px', marginBottom: '20px' }}>GLOBAL SYSTEM VARIABLES</h2>
            <p style={{ color: 'var(--text-dim)', marginBottom: '20px', fontSize: '14px' }}>
              Use the DB Explorer to create or delete System Settings, or view them here.
            </p>
            <table className="data-table">
              <thead>
                <tr>
                  <th>COMPANY</th>
                  <th>KEY</th>
                  <th>VALUE</th>
                </tr>
              </thead>
              <tbody>
                {settings.map((s) => (
                  <tr key={s._id}>
                    <td style={{ fontWeight: '500' }}>{s.companyId ? s.companyId.name : 'GLOBAL'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{s.key}</td>
                    <td><pre style={{ margin:0, fontSize:'12px' }}>{JSON.stringify(s.value, null, 2)}</pre></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* DB EXPLORER TAB */}
        {activeTab === 'db' && (
          <div style={{ display: 'flex', height: '100%', gap: '20px' }}>
            <div className="db-sidebar">
              <div style={{ padding: '16px', borderBottom: '1px solid var(--border-dim)', fontWeight: '600', fontSize: '12px', color: 'var(--text-dim)', letterSpacing: '0.05em' }}>
                COLLECTIONS
              </div>
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {dbModels.map(m => (
                  <button 
                    key={m} 
                    className={`db-model-btn ${selectedModel === m ? 'active' : ''}`}
                    onClick={() => fetchDbDocs(m)}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="panel" style={{ flex: 1, padding: 0 }}>
              <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-dim)' }}>
                <h2 style={{ fontSize: '18px', margin: 0 }}>
                  {selectedModel ? `COLLECTION: ${selectedModel}` : 'SELECT A COLLECTION'}
                </h2>
                {selectedModel && (
                  <button className="btn-create" onClick={() => setJsonModal({ open: true, isNew: true, docId: null, content: '{\n  \n}' })}>
                    + NEW DOCUMENT
                  </button>
                )}
              </div>
              
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {dbLoading && <div style={{ color: 'var(--text-dim)', padding: '20px' }}>Loading documents...</div>}
                {!dbLoading && selectedModel && dbDocs.length === 0 && (
                  <div style={{ color: 'var(--text-dim)', padding: '20px' }}>No documents found in {selectedModel}.</div>
                )}
                {!dbLoading && selectedModel && dbDocs.length > 0 && (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}>#</th>
                        <th>ACTIONS</th>
                        <th>ID</th>
                        <th>SUMMARY DATA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dbDocs.map((doc, index) => {
                        const { _id, createdAt, updatedAt, __v, ...rest } = doc;
                        const rowNumber = (dbPage - 1) * 50 + index + 1;
                        return (
                          <tr key={doc._id}>
                            <td style={{ color: 'var(--text-dim)', fontSize: '11px', textAlign: 'center' }}>{rowNumber}</td>
                            <td style={{ width: '130px' }}>
                              <div className="db-actions">
                                <button className="btn-edit" onClick={() => setJsonModal({ open: true, isNew: false, docId: doc._id, content: JSON.stringify(doc, null, 2) })}>EDIT</button>
                                <button className="btn-delete" onClick={() => handleDeleteDoc(doc._id)}>DEL</button>
                              </div>
                            </td>
                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-dim)' }}>{doc._id}</td>
                            <td style={{ padding: '10px' }}>
                              <pre style={{ 
                                margin: 0, whiteSpace: 'pre-wrap', wordWrap: 'break-word', 
                                background: 'var(--bg-deep)', padding: '12px', borderRadius: '6px',
                                fontSize: '12px', fontFamily: 'var(--font-mono)'
                              }}>
                                {JSON.stringify(rest, null, 2)}
                              </pre>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
              
              {/* Pagination Controls */}
              {!dbLoading && selectedModel && dbTotal > 0 && (
                <div style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                  padding: '16px 20px', borderTop: '1px solid var(--border-dim)', background: 'var(--bg-deep)'
                }}>
                  <div style={{ color: 'var(--text-dim)', fontSize: '13px' }}>
                    SHOWING {(dbPage - 1) * 50 + 1} - {Math.min(dbPage * 50, dbTotal)} OF {dbTotal} RECORDS
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button 
                      className="btn-edit"
                      disabled={dbPage === 1}
                      onClick={() => fetchDbDocs(selectedModel, dbPage - 1)}
                    >
                      PREV
                    </button>
                    <span style={{ color: 'var(--text-main)', fontSize: '13px', fontWeight: '500', padding: '0 8px' }}>PAGE {dbPage} / {Math.ceil(dbTotal / 50)}</span>
                    <button 
                      className="btn-edit"
                      disabled={dbPage >= Math.ceil(dbTotal / 50)}
                      onClick={() => fetchDbDocs(selectedModel, dbPage + 1)}
                    >
                      NEXT
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* JSON EDITOR MODAL */}
      {jsonModal.open && (
        <div className="json-modal-overlay">
          <div className="json-modal">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-dim)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>
                {jsonModal.isNew ? `CREATE NEW: ${selectedModel}` : `EDIT: ${selectedModel} (${jsonModal.docId})`}
              </h3>
              <button 
                onClick={() => setJsonModal({ open: false, isNew: false, docId: null, content: '' })}
                style={{ background: 'transparent', color: 'var(--text-dim)', fontSize: '24px' }}
              >
                &times;
              </button>
            </div>
            
            <textarea 
              className="json-textarea"
              value={jsonModal.content}
              onChange={e => setJsonModal({...jsonModal, content: e.target.value})}
              spellCheck="false"
            />
            
            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-dim)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn-edit" onClick={() => setJsonModal({ open: false, isNew: false, docId: null, content: '' })}>CANCEL</button>
              <button className="btn-create" onClick={handleSaveJson}>SAVE TO DATABASE</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
