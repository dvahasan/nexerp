import { useState, useEffect } from 'react';
import { MdInventory, MdTrendingUp, MdComputer, MdCheckCircle, MdBusiness, MdDomainAdd, MdPerson, MdMenu, MdClose } from 'react-icons/md';
import LazyScroll from '../components/LazyScroll';

// ── Animated demo screens ──────────────────────────────────────────────────

const SCREENS = [
  {
    id: 'dash',
    label: 'Dashboard',
    color: '#3b82f6',
    render: () => (
      <div className="flex flex-col gap-3 h-full">
        {/* Greeting */}
        <div className="flex items-center justify-between">
          <div>
            <div className="h-4 w-40 bg-white/20 rounded mb-1.5" />
            <div className="h-2.5 w-24 bg-white/10 rounded" />
          </div>
          <div className="w-9 h-9 rounded bg-blue-500 flex items-center justify-center text-white text-sm font-black">A</div>
        </div>
        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { label: 'Total Items', val: '1,284', color: 'border-l-blue-500',   icon: '📦', sub: '+12 today' },
            { label: 'Low Stock',   val: '23',    color: 'border-l-amber-400',  icon: '⚠️', sub: 'Need reorder' },
            { label: 'Txs Today',   val: '47',    color: 'border-l-emerald-500',icon: '🔄', sub: 'Last: 2m ago' },
            { label: 'Stock Value', val: '$84k',  color: 'border-l-purple-500', icon: '💰', sub: '+3.2% week' },
          ].map((c, i) => (
            <div key={i} className={`bg-slate-800/80 rounded border-l-4 ${c.color} p-3 flex flex-col gap-1`}
              style={{ animation: `fadeSlideUp 0.4s ease ${i * 0.08}s both` }}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">{c.label}</span>
                <span className="text-base">{c.icon}</span>
              </div>
              <div className="text-xl font-black text-white">{c.val}</div>
              <div className="text-[10px] text-slate-500">{c.sub}</div>
            </div>
          ))}
        </div>
        {/* Stock health and Trend */}
        <div className="grid grid-cols-2 gap-2" style={{ animation: 'fadeSlideUp 0.4s ease 0.3s both' }}>
          <div className="bg-slate-800/80 rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300">Stock Health</span>
              <span className="text-[10px] text-slate-500">1,284 items total</span>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden flex gap-0.5">
              <div className="h-full bg-emerald-500 rounded-l-full" style={{ width: '67%', animation: 'growWidth 1s ease 0.5s both' }} />
              <div className="h-full bg-amber-400" style={{ width: '18%', animation: 'growWidth 1s ease 0.6s both' }} />
              <div className="h-full bg-red-500 rounded-r-full" style={{ width: '15%', animation: 'growWidth 1s ease 0.7s both' }} />
            </div>
            <div className="flex gap-4 mt-2 text-[9px] font-bold">
              <span className="text-emerald-400">● 67% Healthy</span>
              <span className="text-amber-400">● 18% Low</span>
              <span className="text-red-400">● 15% Out</span>
            </div>
          </div>
          <div className="bg-slate-800/80 rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300">Value Trend</span>
              <span className="text-[10px] text-blue-400">+4.2%</span>
            </div>
            <div className="flex items-end gap-1 h-6 mt-1">
              {[40, 50, 45, 60, 55, 70, 65, 80, 75, 100].map((h, i) => (
                <div key={i} className="flex-1 bg-blue-500/40 rounded-t-sm transition-colors hover:bg-blue-400" style={{ height: `${h}%`, animation: `fadeSlideUp 0.5s ease ${0.4 + i * 0.05}s both` }} />
              ))}
            </div>
          </div>
        </div>
        {/* Recent transactions */}
        <div className="flex-1 bg-slate-800/80 rounded p-3 overflow-hidden mt-1" style={{ animation: 'fadeSlideUp 0.4s ease 0.4s both' }}>
          <div className="text-xs font-bold text-slate-300 mb-2">Recent Transactions</div>
          <div className="space-y-1.5">
            {[
              { type:'IN',  item:'Hydraulic Pump',   qty:'+12', user:'Ahmed',  time:'2m ago',  color:'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
              { type:'OUT', item:'Control Panel',    qty:'-3',  user:'Sara',   time:'15m ago', color:'bg-red-500/20 text-red-400 border-red-500/30' },
              { type:'IN',  item:'Electric Motor',   qty:'+50', user:'Ahmed',  time:'1h ago',  color:'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
              { type:'OUT', item:'Gearbox Industrial',qty:'-2', user:'Khaled', time:'2h ago',  color:'bg-red-500/20 text-red-400 border-red-500/30' },
            ].map((tx, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded bg-slate-700/30"
                style={{ animation: `fadeSlideUp 0.3s ease ${0.5 + i * 0.07}s both` }}>
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border ${tx.color}`}>{tx.type}</span>
                <span className="text-xs text-slate-300 flex-1 truncate">{tx.item}</span>
                <span className="text-xs font-bold text-white">{tx.qty}</span>
                <span className="text-[10px] text-slate-500 hidden md:block">{tx.user} · {tx.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'inv',
    label: 'Inventory',
    color: '#10b981',
    render: () => (
      <div className="flex flex-col gap-3 h-full">
        {/* Header */}
        <div className="flex items-center justify-between" style={{ animation: 'fadeSlideUp 0.4s ease 0s both' }}>
          <div>
            <div className="text-base font-black text-white">Inventory <span className="text-slate-500 font-normal text-sm">(1,284)</span></div>
            <div className="text-[11px] text-slate-400 mt-0.5">Real-time stock levels</div>
          </div>
          <div className="flex gap-2">
            <div className="h-7 w-24 bg-slate-700 rounded" />
            <div className="h-7 w-20 bg-emerald-600 rounded flex items-center justify-center">
              <span className="text-[10px] text-white font-bold">+ Add Item</span>
            </div>
          </div>
        </div>
        {/* Search */}
        <div className="h-8 bg-slate-800/80 rounded border border-slate-700 flex items-center px-3 gap-2"
          style={{ animation: 'fadeSlideUp 0.4s ease 0.1s both' }}>
          <div className="w-3 h-3 rounded-full border border-slate-500" />
          <div className="h-2 w-32 bg-slate-600 rounded" />
        </div>
        {/* Items list */}
        <div className="flex-1 bg-slate-800/80 rounded overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-12 gap-2 px-3 py-2 border-b border-slate-700/50 bg-slate-900/40"
            style={{ animation: 'fadeSlideUp 0.4s ease 0.15s both' }}>
            {['Item', 'SKU', 'Qty', 'Status'].map((h, i) => (
              <div key={i} className={`text-[9px] font-black uppercase tracking-wider text-slate-500 ${i===0?'col-span-5':i===1?'col-span-3':'col-span-2'}`}>{h}</div>
            ))}
          </div>
          <div className="divide-y divide-slate-700/30">
            {[
              { name:'Hydraulic Pump A',   sku:'HYD-001', qty:34,  max:100, status:'active',  statusColor:'bg-emerald-500' },
              { name:'Control Panel 220V', sku:'ELC-042', qty:8,   max:50,  status:'low',     statusColor:'bg-amber-400'  },
              { name:'Electric Motor 5HP', sku:'MTR-015', qty:0,   max:30,  status:'out',     statusColor:'bg-red-500'    },
              { name:'Gearbox Industrial', sku:'GB-006',  qty:7,   max:20,  status:'active',  statusColor:'bg-emerald-500'},
              { name:'Pressure Gauge',     sku:'PG-033',  qty:3,   max:40,  status:'low',     statusColor:'bg-amber-400'  },
            ].map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 px-3 py-2.5 hover:bg-slate-700/20 items-center"
                style={{ animation: `fadeSlideUp 0.3s ease ${0.2 + i * 0.07}s both` }}>
                <div className="col-span-5 flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-slate-700 flex items-center justify-center text-[10px]">📦</div>
                  <span className="text-xs text-slate-200 truncate">{item.name}</span>
                </div>
                <div className="col-span-3 text-[10px] text-slate-500 font-mono">{item.sku}</div>
                <div className="col-span-2">
                  <div className="text-xs font-bold text-white mb-0.5">{item.qty}</div>
                  <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${item.statusColor}`}
                      style={{ width: `${Math.min(100, (item.qty / item.max) * 100)}%`, transition: 'width 1s ease' }} />
                  </div>
                </div>
                <div className="col-span-2">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold capitalize ${
                    item.status==='active' ? 'bg-emerald-500/20 text-emerald-400' :
                    item.status==='low'    ? 'bg-amber-400/20 text-amber-400' :
                                            'bg-red-500/20 text-red-400'}`}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'tx',
    label: 'Transactions',
    color: '#8b5cf6',
    render: () => (
      <div className="flex flex-col gap-3 h-full">
        {/* Header */}
        <div className="flex items-center justify-between" style={{ animation: 'fadeSlideUp 0.4s ease 0s both' }}>
          <div>
            <div className="text-base font-black text-white">Transactions</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Every stock movement tracked</div>
          </div>
          <div className="h-7 w-28 bg-violet-600 rounded flex items-center justify-center">
            <span className="text-[10px] text-white font-bold">+ Record TX</span>
          </div>
        </div>
        {/* Summary strip */}
        <div className="grid grid-cols-3 gap-2" style={{ animation: 'fadeSlideUp 0.4s ease 0.1s both' }}>
          {[
            { label: 'Today',   val: '47',  color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20' },
            { label: 'IN',      val: '+312', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
            { label: 'OUT',     val: '-128', color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20' },
          ].map((s, i) => (
            <div key={i} className={`rounded border p-2.5 text-center ${s.bg}`}>
              <div className={`text-lg font-black ${s.color}`}>{s.val}</div>
              <div className="text-[10px] text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>
        {/* TX log */}
        <div className="flex-1 bg-slate-800/80 rounded overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-700/50 bg-slate-900/40 grid grid-cols-12 gap-2"
            style={{ animation: 'fadeSlideUp 0.4s ease 0.2s both' }}>
            {['Type','Item','Qty','User','Date'].map((h,i) => (
              <div key={i} className={`text-[9px] font-black uppercase tracking-wider text-slate-500 ${i===0?'col-span-1':i===1?'col-span-4':i===2?'col-span-2':i===3?'col-span-3':'col-span-2'}`}>{h}</div>
            ))}
          </div>
          <div className="divide-y divide-slate-700/30">
            {[
              { type:'IN',  item:'Hydraulic Pump A',   qty:'+12', user:'Ahmed',  date:'Today 14:32', dot:'bg-emerald-500' },
              { type:'OUT', item:'Control Panel 220V', qty:'-3',  user:'Sara',   date:'Today 13:15', dot:'bg-red-500' },
              { type:'IN',  item:'Electric Motor 5HP', qty:'+50', user:'Ahmed',  date:'Today 11:02', dot:'bg-emerald-500' },
              { type:'OUT', item:'Gearbox Industrial', qty:'-2',  user:'Khaled', date:'Today 09:47', dot:'bg-red-500' },
              { type:'IN',  item:'Pressure Gauge',     qty:'+20', user:'Sara',   date:'Yesterday',   dot:'bg-emerald-500' },
            ].map((tx, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 px-3 py-2.5 hover:bg-slate-700/20 items-center"
                style={{ animation: `fadeSlideUp 0.3s ease ${0.25 + i * 0.07}s both` }}>
                <div className="col-span-1">
                  <span className={`text-[9px] font-black px-1 py-0.5 rounded border ${
                    tx.type==='IN'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                    {tx.type}
                  </span>
                </div>
                <div className="col-span-4 flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${tx.dot}`} />
                  <span className="text-xs text-slate-300 truncate">{tx.item}</span>
                </div>
                <div className={`col-span-2 text-xs font-bold ${tx.type==='IN' ? 'text-emerald-400' : 'text-red-400'}`}>{tx.qty}</div>
                <div className="col-span-3 text-[10px] text-slate-400">{tx.user}</div>
                <div className="col-span-2 text-[10px] text-slate-500">{tx.date}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'users',
    label: 'Team',
    color: '#f59e0b',
    render: () => (
      <div className="flex flex-col gap-3 h-full">
        <div className="flex items-center justify-between" style={{ animation: 'fadeSlideUp 0.4s ease 0s both' }}>
          <div>
            <div className="text-base font-black text-white">Team Members <span className="text-slate-500 font-normal text-sm">(4)</span></div>
            <div className="text-[11px] text-slate-400 mt-0.5">Roles & permissions management</div>
          </div>
          <div className="h-7 w-24 bg-amber-600 rounded flex items-center justify-center">
            <span className="text-[10px] text-white font-bold">+ Add User</span>
          </div>
        </div>
        {/* Role stats */}
        <div className="grid grid-cols-4 gap-2" style={{ animation: 'fadeSlideUp 0.4s ease 0.1s both' }}>
          {[
            { role:'Admin',     count:1, color:'bg-purple-500/20 border-purple-500/30 text-purple-400', dot:'bg-purple-500' },
            { role:'Manager',   count:1, color:'bg-blue-500/20 border-blue-500/30 text-blue-400',       dot:'bg-blue-500' },
            { role:'Warehouse', count:1, color:'bg-emerald-500/20 border-emerald-500/30 text-emerald-400', dot:'bg-emerald-500' },
            { role:'Viewer',    count:1, color:'bg-slate-700 border-slate-600 text-slate-400',           dot:'bg-slate-400' },
          ].map((r, i) => (
            <div key={i} className={`rounded border p-2 flex items-center gap-2 ${r.color}`}>
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${r.dot}`} />
              <div>
                <div className="text-sm font-black">{r.count}</div>
                <div className="text-[9px] opacity-70">{r.role}</div>
              </div>
            </div>
          ))}
        </div>
        {/* User cards */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2 content-start">
          {[
            { name:'مدير النظام', en:'System Admin', role:'admin',     roleColor:'bg-purple-500/20 text-purple-400', grad:'from-purple-500 to-violet-600',   perms:['Add','Edit','Delete','TX','Users'] },
            { name:'أحمد محمد',   en:'Ahmed Mohamed', role:'manager',  roleColor:'bg-blue-500/20 text-blue-400',    grad:'from-blue-500 to-indigo-600',     perms:['Add','Edit','TX'] },
            { name:'سارة علي',    en:'Sara Ali',       role:'warehouse',roleColor:'bg-emerald-500/20 text-emerald-400',grad:'from-emerald-500 to-teal-600', perms:['TX'] },
            { name:'خالد عمر',    en:'Khaled Omar',    role:'viewer',   roleColor:'bg-slate-700 text-slate-400',     grad:'from-slate-500 to-slate-600',     perms:[] },
          ].map((u, i) => (
            <div key={i} className="bg-slate-800/80 rounded border border-slate-700/50 p-3 flex items-center gap-3"
              style={{ animation: `fadeSlideUp 0.3s ease ${0.2 + i * 0.08}s both` }}>
              <div className={`w-10 h-10 rounded bg-gradient-to-br ${u.grad} flex items-center justify-center text-white font-black text-base flex-shrink-0`}>
                {u.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white truncate">{u.en}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold capitalize flex-shrink-0 ${u.roleColor}`}>{u.role}</span>
                </div>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {u.perms.slice(0,3).map(p => (
                    <span key={p} className="text-[8px] px-1.5 py-0.5 bg-slate-700 rounded-md text-slate-400 font-medium">{p}</span>
                  ))}
                  {u.perms.length === 0 && <span className="text-[8px] text-slate-600">View only</span>}
                </div>
              </div>
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${i < 3 ? 'bg-emerald-500' : 'bg-slate-600'}`} />
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'files',
    label: 'Files',
    color: '#06b6d4', // Cyan
    render: () => (
      <div className="flex flex-col gap-3 h-full">
        {/* Header */}
        <div className="flex items-center justify-between" style={{ animation: 'fadeSlideUp 0.4s ease 0s both' }}>
          <div>
            <div className="text-base font-black text-white">File Manager</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Documents, images, and attachments</div>
          </div>
          <div className="h-7 w-24 bg-cyan-600 hover:bg-cyan-500 transition-colors cursor-pointer rounded flex items-center justify-center">
            <span className="text-[10px] text-white font-bold">+ Upload</span>
          </div>
        </div>
        
        {/* Folders */}
        <div className="flex gap-2" style={{ animation: 'fadeSlideUp 0.4s ease 0.1s both' }}>
          {['Invoices', 'Manuals', 'Receipts', 'Images'].map((f, i) => (
            <div key={i} className="flex-1 bg-slate-800/80 rounded border border-slate-700/50 p-2 flex flex-col items-center justify-center gap-1 hover:bg-slate-700 transition-colors cursor-pointer">
              <div className="text-xl">📁</div>
              <div className="text-[10px] font-medium text-slate-300">{f}</div>
            </div>
          ))}
        </div>

        {/* File Grid */}
        <div className="flex-1 grid grid-cols-2 gap-2 content-start overflow-hidden">
          {[
            { name:'Invoice-Q3.pdf', type:'PDF', size:'2.4 MB', icon:'📄', color:'bg-rose-500/20 text-rose-400 border-rose-500/30' },
            { name:'Pump_Manual.pdf', type:'PDF', size:'8.1 MB', icon:'📄', color:'bg-rose-500/20 text-rose-400 border-rose-500/30' },
            { name:'warehouse_map.png', type:'IMG', size:'1.2 MB', icon:'🖼️', color:'bg-blue-500/20 text-blue-400 border-blue-500/30' },
            { name:'supplier_list.csv', type:'CSV', size:'450 KB', icon:'📊', color:'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
          ].map((f, i) => (
            <div key={i} className="bg-slate-800/50 rounded border border-slate-700/50 p-2 flex items-center gap-3 hover:bg-slate-700/80 transition-colors cursor-pointer"
              style={{ animation: `fadeSlideUp 0.3s ease ${0.2 + i * 0.05}s both` }}>
              <div className={`w-8 h-8 rounded flex items-center justify-center text-sm border flex-shrink-0 ${f.color}`}>
                {f.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold text-slate-200 truncate">{f.name}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[9px] text-slate-500">{f.size}</span>
                  <span className="text-[8px] px-1 py-0.5 bg-slate-700 rounded text-slate-400 font-bold">{f.type}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'ai',
    label: 'AI Assist',
    color: '#ec4899', // Pink
    render: () => (
      <div className="flex flex-col h-full bg-slate-900 rounded border border-slate-700 overflow-hidden" style={{ animation: 'fadeSlideUp 0.4s ease 0s both' }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-3 py-2 bg-slate-950 border-b border-slate-800">
          <div className="w-6 h-6 rounded bg-pink-500/20 text-pink-400 flex items-center justify-center text-xs border border-pink-500/30">✨</div>
          <div>
            <div className="text-[11px] font-bold text-white">AI Assistant</div>
            <div className="text-[9px] text-slate-400">Powered by NexINV</div>
          </div>
        </div>
        {/* Chat */}
        <div className="flex-1 p-3 flex flex-col gap-3 overflow-hidden">
          <div className="self-end bg-pink-600 text-white p-2 rounded rounded-tr-sm text-[11px] max-w-[85%] shadow-sm" style={{ animation: 'fadeSlideUp 0.3s ease 0.1s both' }}>
            What is low on stock today?
          </div>
          <div className="self-start bg-slate-800 border border-slate-700 text-slate-300 p-2 rounded rounded-tl-sm text-[11px] max-w-[90%] leading-relaxed shadow-sm" style={{ animation: 'fadeSlideUp 0.3s ease 0.3s both' }}>
            You have 2 items running low:<br/>
            • <strong className="text-white">Control Panel 220V</strong> (8 left, min: 50)<br/>
            • <strong className="text-white">Pressure Gauge</strong> (3 left, min: 40)<br/><br/>
            Would you like me to generate a purchase order?
          </div>
          <div className="self-end bg-pink-600 text-white p-2 rounded rounded-tr-sm text-[11px] max-w-[85%] shadow-sm" style={{ animation: 'fadeSlideUp 0.3s ease 0.7s both' }}>
            Yes, please!
          </div>
          <div className="self-start bg-slate-800 border border-slate-700 text-slate-300 p-2 rounded rounded-tl-sm text-[11px] max-w-[90%] flex items-center gap-2 shadow-sm" style={{ animation: 'fadeSlideUp 0.3s ease 0.9s both' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse" />
            Generating PO document...
          </div>
        </div>
        {/* Input */}
        <div className="p-2 border-t border-slate-800 bg-slate-950">
          <div className="bg-slate-900 border border-slate-700 rounded h-7 flex items-center px-2">
            <div className="flex-1 text-[10px] text-slate-500">Ask something...</div>
            <div className="w-5 h-5 bg-pink-600 rounded flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </div>
          </div>
        </div>
      </div>
    ),
  }
];

function DemoMockup() {
  const [active, setActive]   = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setActive(prev => (prev + 1) % SCREENS.length);
        setVisible(true);
      }, 350);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  const screen = SCREENS[active];

  return (
    <div className="max-w-6xl mx-auto mt-20 relative select-none">
      {/* Glow */}
      <div className="absolute inset-x-1/4 top-1/2 -translate-y-1/2 h-40 rounded-full blur-3xl opacity-20 pointer-events-none transition-colors duration-700"
        style={{ backgroundColor: screen.color }} />

      {/* Browser chrome */}
      <div className="relative bg-slate-800 border border-slate-700 rounded p-3 shadow-2xl shadow-black/60">
        {/* Title bar */}
        <div className="h-9 flex items-center px-3 gap-3 mb-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          {/* Tabs */}
          <div className="flex gap-1 flex-1 overflow-hidden">
            {SCREENS.map((s, i) => (
              <button
                key={s.id}
                onClick={() => { setVisible(false); setTimeout(() => { setActive(i); setVisible(true); }, 300); }}
                className={`px-3 py-1 rounded text-[11px] font-semibold transition-all flex-shrink-0 ${
                  i === active
                    ? 'text-white'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/50'
                }`}
                style={i === active ? { backgroundColor: screen.color + '33', color: screen.color } : {}}
              >
                {s.label}
              </button>
            ))}
          </div>
          {/* URL bar */}
          <div className="hidden md:flex flex-1 max-w-[220px] h-6 bg-slate-700/60 rounded items-center px-3 gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
            <span className="text-[10px] text-slate-400 font-mono truncate">nexerp.app/#{screen.id}</span>
          </div>
        </div>

        {/* App shell */}
        <div className="flex h-[400px] md:h-[520px] bg-slate-900 rounded overflow-hidden border border-slate-700/50">
          {/* Sidebar */}
          <div className="hidden md:flex w-[180px] flex-shrink-0 flex-col border-r border-slate-700/50 bg-slate-900/80 p-3 gap-1">
            {/* Brand */}
            <div className="flex items-center gap-2 px-2 py-2 mb-2">
              <div className="w-7 h-7 rounded flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                style={{ backgroundColor: screen.color }}>N</div>
              <span className="text-sm font-black text-white">NexINV</span>
            </div>
            <div className="text-[9px] font-black uppercase tracking-wider text-slate-600 px-2 mb-1">Overview</div>
            {SCREENS.map((s, i) => (
              <div key={s.id}
                className={`flex items-center gap-2 px-2 py-2 rounded transition-colors ${i === active ? 'text-white' : 'text-slate-500'}`}
                style={i === active ? { backgroundColor: screen.color } : {}}>
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${i === active ? 'bg-white' : 'bg-slate-600'}`} />
                <span className="text-[11px] font-semibold">{s.label}</span>
              </div>
            ))}
            <div className="mt-auto pt-2 border-t border-slate-700/50">
              <div className="flex items-center gap-2 px-2 py-2 rounded text-slate-500">
                <div className="w-6 h-6 rounded bg-slate-700 flex items-center justify-center text-[10px]">A</div>
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold leading-tight">compadmin</div>
                  <div className="text-[9px] text-slate-600">admin</div>
                </div>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 overflow-hidden p-4">
            <div
              className="h-full transition-all duration-300"
              style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(12px)' }}
            >
              {screen.render()}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-2 h-0.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            key={active}
            className="h-full rounded-full transition-none"
            style={{ backgroundColor: screen.color, animation: 'progressBar 4s linear forwards' }}
          />
        </div>
      </div>

      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-2 mt-5">
        {SCREENS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => { setVisible(false); setTimeout(() => { setActive(i); setVisible(true); }, 300); }}
            className="transition-all duration-300 rounded-full"
            style={{
              width: i === active ? '28px' : '8px',
              height: '8px',
              backgroundColor: i === active ? screen.color : '#334155',
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes growWidth {
          from { width: 0; }
        }
        @keyframes progressBar {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>
    </div>
  );
}

const ENTERPRISE_SCREENS = [
  {
    id: 'portfolio',
    label: 'Portfolio',
    color: '#3b82f6', // Blue
    render: () => (
      <div className="flex flex-col gap-3 h-full">
        {/* Header */}
        <div className="flex items-center justify-between" style={{ animation: 'fadeSlideUp 0.4s ease 0s both' }}>
          <div>
            <div className="text-base font-black text-white">Enterprise Portfolio</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Manage all your companies</div>
          </div>
          <div className="h-7 w-28 bg-blue-600 rounded flex items-center justify-center">
            <span className="text-[10px] text-white font-bold">+ New Company</span>
          </div>
        </div>
        {/* Company Cards Grid */}
        <div className="flex-1 grid grid-cols-2 gap-2 content-start overflow-hidden pt-1">
          {[
            { name: 'TechFlow Inc.', code: 'TFI-10', ind: 'Software', stock: '2.4M', tx: 450, emp: 12, alerts: 0, color: 'bg-blue-500' },
            { name: 'Global Logistics', code: 'GL-88', ind: 'Transport', stock: '890K', tx: 120, emp: 45, alerts: 3, color: 'bg-emerald-500' },
            { name: 'Nexus Retail', code: 'NXR-2', ind: 'Retail', stock: '1.2M', tx: 890, emp: 104, alerts: 12, color: 'bg-rose-500' },
            { name: 'Apex Manufacturing', code: 'AM-99', ind: 'Manufacturing', stock: '5.6M', tx: 230, emp: 210, alerts: 0, color: 'bg-amber-500' },
          ].map((c, i) => (
            <div key={i} className="bg-slate-800/80 rounded border border-slate-700/50 p-2 flex flex-col hover:border-blue-500/50 transition-colors" style={{ animation: `fadeSlideUp 0.3s ease ${0.1 + i * 0.05}s both` }}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded ${c.color} flex items-center justify-center text-[10px] font-black text-white`}>
                    {c.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-200 truncate max-w-[80px]">{c.name}</div>
                    <div className="text-[8px] text-slate-500">{c.code}</div>
                  </div>
                </div>
                {c.alerts > 0 && (
                  <div className="bg-red-500/20 text-red-400 px-1 py-0.5 rounded flex items-center gap-1 text-[8px] font-bold">
                    ⚠️ {c.alerts}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1 mt-auto">
                <div className="bg-slate-900/50 p-1.5 rounded border border-slate-700/30">
                  <div className="text-[8px] text-slate-500">Value</div>
                  <div className="text-[10px] font-bold text-slate-300">${c.stock}</div>
                </div>
                <div className="bg-slate-900/50 p-1.5 rounded border border-slate-700/30">
                  <div className="text-[8px] text-slate-500">Team</div>
                  <div className="text-[10px] font-bold text-slate-300">{c.emp}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'analytics',
    label: 'Global Analytics',
    color: '#8b5cf6', // Violet
    render: () => (
      <div className="flex flex-col gap-3 h-full">
        <div className="flex items-center justify-between" style={{ animation: 'fadeSlideUp 0.4s ease 0s both' }}>
          <div>
            <div className="text-base font-black text-white">Global Analytics</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Enterprise-wide insights</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2" style={{ animation: 'fadeSlideUp 0.4s ease 0.1s both' }}>
          {[
            { label: 'Total Value', val: '$10.09M', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
            { label: 'Total Items', val: '124.5K', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
            { label: 'Total Team', val: '371', color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
          ].map((s, i) => (
            <div key={i} className={`rounded border p-2 text-center ${s.bg}`}>
              <div className={`text-sm font-black ${s.color}`}>{s.val}</div>
              <div className="text-[9px] text-slate-400">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="flex-1 bg-slate-800/80 rounded border border-slate-700/50 p-3 flex flex-col mt-2" style={{ animation: 'fadeSlideUp 0.4s ease 0.2s both' }}>
          <div className="text-[10px] text-slate-400 mb-2 font-bold uppercase tracking-wider">Value Trend (30 Days)</div>
          <div className="flex-1 flex items-end gap-1.5 pt-2">
            {[40, 45, 30, 60, 75, 50, 80, 95, 85, 100].map((h, i) => (
              <div key={i} className="flex-1 bg-violet-500/40 rounded-t-sm hover:bg-violet-400 transition-colors relative group" style={{ height: `${h}%`, animation: `fadeSlideUp 0.5s ease ${0.2 + i * 0.05}s both` }}>
                 <div className="opacity-0 group-hover:opacity-100 absolute -top-5 left-1/2 -translate-x-1/2 text-[8px] bg-slate-900 text-white px-1.5 py-0.5 rounded transition-opacity">
                   ${h}K
                 </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  }
];

function EnterpriseDemoMockup() {
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setActive(prev => (prev + 1) % ENTERPRISE_SCREENS.length);
        setVisible(true);
      }, 350);
    }, 4500); // slightly different timing so they don't sync completely
    return () => clearInterval(id);
  }, []);

  const screen = ENTERPRISE_SCREENS[active];

  return (
    <div className="max-w-6xl mx-auto mt-10 relative select-none">
      {/* Glow */}
      <div className="absolute inset-x-1/4 top-1/2 -translate-y-1/2 h-40 rounded-full blur-3xl opacity-20 pointer-events-none transition-colors duration-700"
        style={{ backgroundColor: screen.color }} />

      {/* Browser chrome */}
      <div className="relative bg-slate-800 border border-slate-700 rounded p-3 shadow-2xl shadow-black/60">
        {/* Title bar */}
        <div className="h-9 flex items-center px-3 gap-3 mb-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          {/* Tabs */}
          <div className="flex gap-1 flex-1 overflow-hidden">
            {ENTERPRISE_SCREENS.map((s, i) => (
              <button
                key={s.id}
                onClick={() => { setVisible(false); setTimeout(() => { setActive(i); setVisible(true); }, 300); }}
                className={`px-3 py-1 rounded text-[11px] font-semibold transition-all flex-shrink-0 ${
                  i === active
                    ? 'text-white'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/50'
                }`}
                style={i === active ? { backgroundColor: screen.color + '33', color: screen.color } : {}}
              >
                {s.label}
              </button>
            ))}
          </div>
          {/* URL bar */}
          <div className="hidden md:flex flex-1 max-w-[220px] h-6 bg-slate-700/60 rounded items-center px-3 gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
            <span className="text-[10px] text-slate-400 font-mono truncate">nexerp.app/enterprise</span>
          </div>
        </div>

        {/* App shell */}
        <div className="flex h-[400px] md:h-[520px] bg-slate-900 rounded overflow-hidden border border-slate-700/50">
          {/* Sidebar */}
          <div className="hidden md:flex w-[180px] flex-shrink-0 flex-col border-r border-slate-700/50 bg-slate-900/80 p-3 gap-1">
            {/* Brand */}
            <div className="flex items-center gap-2 px-2 py-2 mb-2">
              <div className="w-7 h-7 rounded flex items-center justify-center text-white text-xs font-black flex-shrink-0 bg-blue-600">N</div>
              <span className="text-sm font-black text-white">Enterprise</span>
            </div>
            <div className="text-[9px] font-black uppercase tracking-wider text-slate-600 px-2 mb-1">Management</div>
            {ENTERPRISE_SCREENS.map((s, i) => (
              <div key={s.id}
                className={`flex items-center gap-2 px-2 py-2 rounded transition-colors ${i === active ? 'text-white' : 'text-slate-500'}`}
                style={i === active ? { backgroundColor: screen.color } : {}}>
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${i === active ? 'bg-white' : 'bg-slate-600'}`} />
                <span className="text-[11px] font-semibold">{s.label}</span>
              </div>
            ))}
            <div className="mt-auto pt-2 border-t border-slate-700/50">
              <div className="flex items-center gap-2 px-2 py-2 rounded text-slate-500">
                <div className="w-6 h-6 rounded bg-slate-700 flex items-center justify-center text-[10px]">E</div>
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold leading-tight">ent_owner</div>
                  <div className="text-[9px] text-slate-600">owner</div>
                </div>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 overflow-hidden p-4">
            <div
              className="h-full transition-all duration-300"
              style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(12px)' }}
            >
              {screen.render()}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-2 h-0.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            key={active}
            className="h-full rounded-full transition-none"
            style={{ backgroundColor: screen.color, animation: 'progressBar 4.5s linear forwards' }}
          />
        </div>
      </div>

      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-2 mt-5">
        {ENTERPRISE_SCREENS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => { setVisible(false); setTimeout(() => { setActive(i); setVisible(true); }, 300); }}
            className="transition-all duration-300 rounded-full"
            style={{
              width: i === active ? '28px' : '8px',
              height: '8px',
              backgroundColor: i === active ? screen.color : '#334155',
            }}
          />
        ))}
      </div>
    </div>
  );
}

// Landing is ALWAYS dark — ignore the app-level theme
export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500/30">

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded flex items-center justify-center shadow-lg shadow-blue-500/30">
              <span className="text-white font-black text-xl">N</span>
            </div>
            <span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-indigo-400">NexINV</span>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <a href="/login" className="text-sm font-semibold text-slate-400 hover:text-blue-400 transition-colors">Log In</a>
            <a href="/register" className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded text-sm font-bold transition-colors border border-blue-500">
              Start for Free
            </a>
          </div>
          
          <button 
            className="md:hidden text-slate-400 hover:text-white transition-colors"
            onClick={() => setMobileMenuOpen(true)}
          >
            <MdMenu size={28} />
          </button>
        </div>
      </nav>

      {/* Mobile Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] flex md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative ml-auto w-64 bg-slate-900 h-full border-l border-slate-800 flex flex-col p-6 animate-in slide-in-from-right-full duration-300">
            <button 
              className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              <MdClose size={28} />
            </button>
            
            <div className="mt-16 flex flex-col gap-4">
              <a href="/login" className="w-full text-center py-3 text-lg font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors border border-slate-700">Log In</a>
              <a href="/register" className="w-full text-center bg-blue-600 hover:bg-blue-500 text-white py-3 rounded text-lg font-bold transition-colors border border-blue-500">
                Start for Free
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center space-y-8 animate-in slide-in-from-bottom-8 fade-in duration-1000">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-900/30 text-blue-400 text-sm font-semibold border border-blue-800/50">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
            </span>
            NexINV SaaS — Now in Beta
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white leading-[1.1]">
            Intelligent Inventory.<br/>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-indigo-400 to-purple-500">
              Infinite Possibilities.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Manage your entire inventory flow, track multi-currency transactions, and empower your team
            with comprehensive insights — all from one beautiful workspace designed for modern businesses.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <a href="/register" className="w-full sm:w-auto bg-white text-slate-900 hover:bg-slate-100 px-8 py-4 rounded text-lg font-bold transition-colors border border-slate-200">
              Create Company Workspace
            </a>
            <a href="/demo-select" className="w-full sm:w-auto bg-slate-800 text-white border border-slate-700 hover:border-slate-600 px-8 py-4 rounded text-lg font-bold transition-colors hover:bg-slate-700">
              Try it
            </a>
          </div>
        </div>

        {/* Animated Demo */}
        <LazyScroll className="mt-16 sm:mt-24 w-full" minHeight="500px">
          <DemoMockup />
        </LazyScroll>

        {/* Modules */}
        <div className="max-w-6xl mx-auto mt-32">
          <LazyScroll alwaysRender rootMargin="150px">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-black text-white mb-4">Core System Modules</h2>
              <p className="text-slate-400 max-w-2xl mx-auto">NexINV is built from the ground up to offer a complete, end-to-end management experience.</p>
            </div>
          </LazyScroll>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: <MdInventory size={32}/>, title: 'Inventory Control', desc: 'Track stock levels, manage warehouses, categorize items, and generate real-time barcodes.' },
              { icon: <MdTrendingUp size={32}/>, title: 'Transactions & Logs', desc: 'Monitor INs and OUTs with precision. Revert mistakes and track every product lifecycle.' },
              { icon: <MdPerson size={32}/>, title: 'User Access Control', desc: 'Create dedicated roles for admins, managers, and viewers. Control who sees what.' },
              { icon: <MdComputer size={32}/>, title: 'Company Customization', desc: 'Tailor the platform to your brand. Logo, colors, currency, and icon packs.' },
            ].map((f, i) => (
              <LazyScroll key={i} alwaysRender rootMargin="150px">
                <div className="bg-slate-800 p-8 rounded border border-slate-700 hover:border-slate-600 hover:-translate-y-1 transition-all duration-300 h-full">
                  <div className="w-14 h-14 bg-blue-500/10 text-blue-400 rounded flex items-center justify-center mb-6">
                    {f.icon}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{f.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              </LazyScroll>
            ))}
          </div>
        </div>

        {/* Enterprise Mockup Section */}
        <LazyScroll className="max-w-6xl mx-auto mt-32 pt-20 border-t border-slate-800" minHeight="600px">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-900/30 text-violet-400 text-[11px] font-bold border border-violet-800/50 mb-6 tracking-wide uppercase">
              ✨ Enterprise Ready
            </div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-4">Scale Across Your Entire Portfolio</h2>
            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Don't just manage one company. Manage dozens. The Enterprise Dashboard gives you a 10,000-foot view of your entire business empire with real-time global analytics.
            </p>
          </div>
          <EnterpriseDemoMockup />
        </LazyScroll>

        {/* Plans for every scale */}
        <div className="max-w-6xl mx-auto mt-32 py-12 md:py-16 px-4 sm:px-8 rounded bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <LazyScroll alwaysRender rootMargin="150px">
            <div className="text-center mb-12 md:mb-16 relative z-10">
              <h2 className="text-3xl md:text-4xl font-black mb-4 tracking-tight text-white">Built for Every Scale</h2>
              <p className="text-slate-400 max-w-xl mx-auto text-sm md:text-base">Whether you run a single storefront or an enterprise conglomerate, NexINV adapts perfectly to your structure.</p>
            </div>
          </LazyScroll>
          <div className="grid md:grid-cols-2 gap-8 relative z-10">
            <LazyScroll alwaysRender rootMargin="150px">
              <div className="bg-white/5 border border-white/10 rounded p-5 md:p-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0"><MdBusiness size={28} className="md:w-[32px] md:h-[32px] w-[28px] h-[28px]" /></div>
                  <div>
                    <h3 className="text-xl md:text-2xl font-bold text-white">Single Company</h3>
                    <p className="text-slate-400 text-xs md:text-sm mt-1">Perfect for growing businesses</p>
                  </div>
                </div>
                <ul className="space-y-4">
                  {['Dedicated standalone workspace','Unique company login code for your staff','Custom logo, currency, and theme colors','Unlimited inventory items and categories'].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <MdCheckCircle className="text-blue-400 shrink-0 mt-1" />
                      <span className="text-slate-300 leading-relaxed text-sm md:text-base">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </LazyScroll>
            <LazyScroll alwaysRender rootMargin="150px">
              <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded p-5 md:p-8 relative mt-4 md:mt-0">
                <div className="absolute -top-3 right-2 md:-right-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-[10px] md:text-xs font-bold px-3 py-1 rounded-full shadow-lg">ULTIMATE CONTROL</div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0"><MdDomainAdd size={28} className="md:w-[32px] md:h-[32px] w-[28px] h-[28px]" /></div>
                  <div>
                    <h3 className="text-xl md:text-2xl font-bold text-white">Enterprise Manager</h3>
                    <p className="text-blue-200 text-xs md:text-sm mt-1">For agencies &amp; holding groups</p>
                  </div>
                </div>
                <ul className="space-y-4">
                  {['Manage infinite companies from one master account','Master Enterprise Dashboard for quick switching','Create completely isolated subsidiaries on the fly','Centralized billing and priority support'].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <MdCheckCircle className="text-blue-400 shrink-0 mt-1" />
                      <span className="text-blue-100 leading-relaxed text-sm md:text-base">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </LazyScroll>
          </div>
        </div>

        {/* Pricing */}
        <div className="max-w-6xl mx-auto mt-32 mb-20">
          <LazyScroll alwaysRender rootMargin="150px">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-black text-white mb-4">Simple, Transparent Pricing</h2>
              <p className="text-slate-400 max-w-xl mx-auto">Choose the plan that fits your business. Upgrade anytime as you scale. <span className="text-slate-500">(Upcoming)</span></p>
            </div>
          </LazyScroll>
          <div className="grid md:grid-cols-3 gap-8 items-center">
            {/* Starter */}
            <LazyScroll alwaysRender rootMargin="150px">
              <div className="bg-slate-800 border border-slate-700 rounded p-8 text-center">
                <h3 className="text-xl font-bold text-white mb-2">Starter</h3>
                <p className="text-slate-500 text-sm mb-6">For small shops getting started</p>
                <div className="mb-8"><span className="text-4xl font-black text-white">$19</span><span className="text-slate-500">/mo</span></div>
                <ul className="space-y-4 text-sm text-slate-400 mb-8 text-left">
                  <li className="flex items-center gap-3"><MdCheckCircle className="text-green-500" /> 1 Company Workspace</li>
                  <li className="flex items-center gap-3"><MdCheckCircle className="text-green-500" /> Up to 3 Staff Accounts</li>
                  <li className="flex items-center gap-3"><MdCheckCircle className="text-green-500" /> Core Inventory Modules</li>
                  <li className="flex items-center gap-3 text-slate-600"><span className="w-4 h-px bg-slate-700 mr-2 inline-block" /> No Advanced AI</li>
                </ul>
                <button disabled className="w-full py-3 rounded font-bold bg-slate-700 text-slate-500 cursor-not-allowed">Coming Soon</button>
              </div>
            </LazyScroll>
            {/* Professional */}
            <LazyScroll alwaysRender rootMargin="150px">
              <div className="bg-gradient-to-b from-blue-600 to-indigo-700 rounded p-8 shadow-xl shadow-blue-600/20 text-center scale-105 relative z-10">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-black px-4 py-1.5 rounded-full shadow-lg">MOST POPULAR</div>
                <h3 className="text-xl font-bold text-white mb-2">Professional</h3>
                <p className="text-blue-200 text-sm mb-6">For established growing teams</p>
                <div className="mb-8"><span className="text-4xl font-black text-white">$49</span><span className="text-blue-200">/mo</span></div>
                <ul className="space-y-4 text-sm text-blue-50 mb-8 text-left">
                  <li className="flex items-center gap-3"><MdCheckCircle className="text-white" /> 1 Company Workspace</li>
                  <li className="flex items-center gap-3"><MdCheckCircle className="text-white" /> Up to 10 Staff Accounts</li>
                  <li className="flex items-center gap-3"><MdCheckCircle className="text-white" /> Advanced AI Insights</li>
                  <li className="flex items-center gap-3"><MdCheckCircle className="text-white" /> Multi-Currency Support</li>
                </ul>
                <button disabled className="w-full py-3 rounded font-bold bg-white text-blue-600 cursor-not-allowed">Coming Soon</button>
              </div>
            </LazyScroll>
            {/* Enterprise */}
            <LazyScroll alwaysRender rootMargin="150px">
              <div className="bg-slate-800 border border-slate-700 rounded p-8 text-center">
                <h3 className="text-xl font-bold text-white mb-2">Enterprise</h3>
                <p className="text-slate-500 text-sm mb-6">For multi-company organizations</p>
                <div className="mb-8"><span className="text-4xl font-black text-white">$149</span><span className="text-slate-500">/mo</span></div>
                <ul className="space-y-4 text-sm text-slate-400 mb-8 text-left">
                  <li className="flex items-center gap-3"><MdCheckCircle className="text-blue-500" /> Infinite Company Workspaces</li>
                  <li className="flex items-center gap-3"><MdCheckCircle className="text-blue-500" /> Infinite Staff Accounts</li>
                  <li className="flex items-center gap-3"><MdCheckCircle className="text-blue-500" /> Master Enterprise Dashboard</li>
                  <li className="flex items-center gap-3"><MdCheckCircle className="text-blue-500" /> 24/7 Priority Support</li>
                </ul>
                <button disabled className="w-full py-3 rounded font-bold bg-slate-700 text-slate-500 cursor-not-allowed">Coming Soon</button>
              </div>
            </LazyScroll>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800 py-12 mt-20">
        <div className="max-w-6xl mx-auto px-6 text-center text-slate-500">
          <p>© 2026 NexINV. Built with ❤️ and Agentic AI.</p>
        </div>
      </footer>
    </div>
  );
}
