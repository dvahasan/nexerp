import { useAppContext } from '../context/AppContext';
import { useTour } from '../hooks/useTour';
import Icon from './Icon';
import Toast from './Toast';
import AiChat from './AiChat';
import BarcodeScanner from './BarcodeScanner';
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { api } from '../api';

// ── Design tokens (DMMAS-inspired) ───────────────────────────────────────────
const T = {
  light: {
    canvas:   '#FAFAF7',
    elev:     '#FFFFFF',
    sunken:   '#F4F3EE',
    border:   '#E5E4DE',
    borderSoft:'#F1F0EB',
    fg:       '#0A0A0A',
    fgMuted:  '#525252',
    fgSubtle: '#9A9A9A',
    neg:      '#B91C1C',
    negTint:  '#FBEAEA',
  },
  dark: {
    canvas:   '#0E0F11',
    elev:     '#16181B',
    sunken:   '#1C1F23',
    border:   '#2A2D32',
    borderSoft:'#22252A',
    fg:       '#F1F0EB',
    fgMuted:  '#9CA0A6',
    fgSubtle: '#5E626A',
    neg:      '#F26F6F',
    negTint:  '#2B1818',
  },
};

export default function Layout({ children }) {
  const {
    user, company, logout, lang, setLang,
    theme, setTheme, t, isAR,
    lastSync, syncing, loginWithToken,
  } = useAppContext();

  const { startSystemTour, startPageTour } = useTour();

  const navigate   = useNavigate();
  const { pathname } = useLocation();

  const [aiOpen,      setAiOpen]      = useState(false);
  const [aiPulsed,    setAiPulsed]    = useState(() => !localStorage.getItem('nexinv_ai_seen'));
  const [collapsed,   setCollapsed]   = useState(() => localStorage.getItem('nexinv_sidebar') === 'collapsed');
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const [clock,       setClock]       = useState('');
  const [scannerOpen,     setScannerOpen]     = useState(false);
  const [searchVal,       setSearchVal]       = useState('');
  const [searchItems,     setSearchItems]     = useState([]);  // inventory hits
  const [searchDropdown,  setSearchDropdown]  = useState(false);
  const [searchLoading,   setSearchLoading]   = useState(false);
  const [tourDropdownOpen, setTourDropdownOpen] = useState(false);
  const searchRef = useRef(null);
  const tourRef = useRef(null);
  // Transactions group: auto-expand if on a tx route
  const [txOpen, setTxOpen] = useState(() =>
    ['/stock-in', '/stock-out'].includes(window.location.pathname)
  );

  // Live clock for status bar
  useEffect(() => {
    const fmt = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setClock(fmt());
    const id = setInterval(() => setClock(fmt()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    localStorage.setItem('nexinv_sidebar', collapsed ? 'collapsed' : 'expanded');
  }, [collapsed]);

  // AI chat open event (fired by child pages, e.g. Dashboard)
  useEffect(() => {
    const handler = () => {
      setAiOpen(true);
      setAiPulsed(false);
      localStorage.setItem('nexinv_ai_seen', '1');
    };
    window.addEventListener('open-ai-chat', handler);
    return () => window.removeEventListener('open-ai-chat', handler);
  }, []);

  // Debounced inventory search
  useEffect(() => {
    if (!searchVal.trim()) { setSearchItems([]); setSearchDropdown(false); return; }
    setSearchDropdown(true);
    setSearchLoading(true);
    const t = setTimeout(async () => {
      try {
        const data = await api.getItemsPaged({ search: searchVal.trim(), limit: 6 });
        setSearchItems(data.items || []);
      } catch { setSearchItems([]); }
      setSearchLoading(false);
    }, 280);
    return () => clearTimeout(t);
  }, [searchVal]);

  // Close search and tour dropdowns
  useEffect(() => {
    const handleOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchDropdown(false);
      if (tourRef.current && !tourRef.current.contains(e.target)) setTourDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const toggleLang  = () => setLang(lang === 'en' ? 'ar' : 'en');
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  // ── Nav tree ────────────────────────────────────────────────────────────────
  const isOwner          = user?.role === 'owner';
  const canManageUsers   = isOwner || user?.perms?.canManageUsers;
  const canManageCompany = isOwner || user?.perms?.canManageCompany;
  const canManageDepts   = isOwner || user?.perms?.canManageDepts;

  const canTxIn  = isOwner || user?.perms?.canTxIn;
  const canTxOut = isOwner || user?.perms?.canTxOut;
  const canTx    = canTxIn || canTxOut;

  const txChildren = [
    ...(canTxIn  ? [{ path: '/stock-in',  icon: 'arrow_down', label: isAR ? '↓ وارد (IN)'    : '↓ Stock In'  }] : []),
    ...(canTxOut ? [{ path: '/stock-out', icon: 'arrow_up',   label: isAR ? '↑ صادر (OUT)'   : '↑ Stock Out' }] : []),
  ];

  const warehouseItems = [
    { path: '/inventory',  icon: 'inventory',  label: t.inventory },
    // Transactions group (rendered specially in SidebarContent)
    ...(canTx ? [{ type: 'group', id: 'tx', icon: 'transactions', label: isAR ? 'الحركات' : 'Transactions', children: txChildren }] : []),
    { path: '/warehouses', icon: 'warehouse',  label: isAR ? 'المستودعات' : 'Warehouses' },
    { path: '/bom',        icon: 'bom',        label: isAR ? 'بيانات المواد' : 'Bill of Materials' },
    { path: '/files',      icon: 'copy',       label: isAR ? 'الملفات' : 'Files' },
    ...(isOwner ? [{ path: '/import', icon: 'import_data', label: isAR ? 'استيراد البيانات' : 'Import Data' }] : []),
  ];

  const adminItems = [
    ...(canManageUsers        ? [{ path: '/users',           icon: 'users',       label: t.users }]                                       : []),
    ...(isOwner || user?.perms?.canManagePermissions
                              ? [{ path: '/permissions',     icon: 'lock',        label: isAR ? 'الصلاحيات' : 'Permissions' }]            : []),
    ...(canManageCompany      ? [{ path: '/profile',         icon: 'company',     label: isAR ? 'ملف الشركة' : 'Company Profile' }]       : []),
    { path: '/barcode-lookup', icon: 'globe',    label: isAR ? 'البحث بالباركود' : 'Barcode Lookup' },
    { path: '/settings',       icon: 'settings', label: t.settings },
    { path: '/myprofile',      icon: 'user',     label: isAR ? 'حسابي' : 'My Profile' },
  ];

  const classificationItems = [
    ...(canManageDepts ? [
      { path: '/departments', icon: 'company', label: isAR ? 'الأقسام' : 'Departments' },
      { path: '/categories',  icon: 'category', label: isAR ? 'التصنيفات' : 'Categories' }
    ] : [])
  ];

  const navSections = [
    { title: isAR ? 'عام'       : 'Overview',  items: [{ path: '/dashboard', icon: 'dashboard', label: t.dashboard }] },
    { title: isAR ? 'المستودع'  : 'Warehouse', items: warehouseItems },
    ...(canManageDepts ? [{ title: isAR ? 'التصنيف' : 'Classification', items: classificationItems }] : []),
    { title: isAR ? (canManageUsers || canManageCompany ? 'الإدارة' : 'حسابي')
                  : (canManageUsers || canManageCompany ? 'Administration' : 'Account'),
      items: adminItems },
  ];

  const primaryColor = company?.primaryColor || '#3b82f6';
  const tok = T[theme] || T.light;

  // Flatten including group children for active-label lookup
  const allNavItems = navSections.flatMap(s =>
    s.items.flatMap(item => item.type === 'group' ? item.children : [item])
  );
  const currentPage = allNavItems.find(n => n.path === pathname)
    || navSections.flatMap(s => s.items).find(n => n.type === 'group' && n.children?.some(c => c.path === pathname));
  const currentLabel = currentPage?.type === 'group'
    ? (currentPage.children?.find(c => c.path === pathname)?.label || currentPage.label)
    : currentPage?.label;

  // ── Sidebar content (shared desktop + mobile) ────────────────────────────
  const SidebarContent = ({ mobile = false }) => {
    const wide = !collapsed || mobile;
    const activeLinkRef = useRef(null);

    useEffect(() => {
      const t = setTimeout(() => {
        if (activeLinkRef.current) {
          activeLinkRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      }, 50);
      return () => clearTimeout(t);
    }, [pathname, drawerOpen, wide]);

    // Render a single nav item (link or group)
    const renderItem = (item) => {
      // ── Group item (e.g., Transactions) ────────────────────────────────
      if (item.type === 'group') {
        const anyChildActive = item.children.some(c => pathname === c.path);
        const isOpen         = txOpen || anyChildActive;

        if (!wide) {
          // Collapsed: show icon only, highlight if any child active
          return (
            <li key={item.id}>
              <button
                className={`tour-${item.id}-link`}
                onClick={() => setTxOpen(o => !o)}
                title={item.label}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', padding: '8px 0',
                  background: 'none', border: 'none', cursor: 'pointer',
                  borderInlineEnd: anyChildActive ? `2px solid ${primaryColor}` : '2px solid transparent',
                  backgroundColor: anyChildActive ? tok.sunken : 'transparent',
                  transition: 'background 120ms ease-out',
                }}
                onMouseEnter={e => { if (!anyChildActive) e.currentTarget.style.backgroundColor = tok.sunken; }}
                onMouseLeave={e => { if (!anyChildActive) e.currentTarget.style.backgroundColor = anyChildActive ? tok.sunken : 'transparent'; }}
              >
                <Icon name={item.icon} size={15} style={{ color: anyChildActive ? primaryColor : tok.fgSubtle }} />
              </button>
            </li>
          );
        }

        return (
          <li key={item.id}>
            {/* Group header */}
            <button
              className={`tour-${item.id}-link`}
              onClick={() => setTxOpen(o => !o)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center',
                gap: 10, padding: '7px 16px',
                background: 'none', border: 'none', cursor: 'pointer',
                color: anyChildActive ? primaryColor : tok.fgMuted,
                backgroundColor: 'transparent',
                borderInlineEnd: '2px solid transparent',
                transition: 'background 120ms ease-out, color 120ms ease-out',
                fontSize: 13, fontWeight: anyChildActive ? 500 : 400,
                textAlign: 'start',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = tok.sunken; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <Icon name={item.icon} size={15} style={{ color: anyChildActive ? primaryColor : tok.fgSubtle, flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{item.label}</span>
              <Icon name={isOpen ? 'collapse' : 'expand'} size={13} style={{ color: tok.fgSubtle, flexShrink: 0 }} />
            </button>

            {/* Children */}
            {isOpen && (
              <ul style={{ paddingInlineStart: 28 }}>
                {item.children.map(child => {
                  const active = pathname === child.path;
                  return (
                    <li key={child.path}>
                      <Link
                        to={child.path}
                        className={`tour-${child.path.replace('/', '')}-link`}
                        ref={active ? activeLinkRef : null}
                        onClick={() => setDrawerOpen(false)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '6px 16px 6px 8px',
                          fontSize: 12, fontWeight: active ? 600 : 400,
                          color: active ? primaryColor : tok.fgMuted,
                          backgroundColor: active ? tok.sunken : 'transparent',
                          borderInlineEnd: active ? `2px solid ${primaryColor}` : '2px solid transparent',
                          textDecoration: 'none',
                          transition: 'background 120ms ease-out, color 120ms ease-out',
                        }}
                        onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor = tok.sunken; }}
                        onMouseLeave={e => { if (!active) e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <Icon name={child.icon} size={13} style={{ color: active ? primaryColor : tok.fgSubtle, flexShrink: 0 }} />
                        <span>{child.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      }

      // ── Regular link item ────────────────────────────────────────────────
      const active = pathname === item.path;
      return (
        <li key={item.path}>
          <Link
            to={item.path}
            className={`tour-${item.path.replace('/', '')}-link`}
            ref={active ? activeLinkRef : null}
            onClick={() => setDrawerOpen(false)}
            title={!wide ? item.label : undefined}
            style={{
              display: 'flex', alignItems: 'center',
              gap: wide ? 10 : 0,
              justifyContent: wide ? 'flex-start' : 'center',
              padding: wide ? '7px 16px' : '8px 0',
              fontSize: 13, fontWeight: active ? 500 : 400,
              color: active ? primaryColor : tok.fgMuted,
              backgroundColor: active ? tok.sunken : 'transparent',
              borderInlineEnd: active ? `2px solid ${primaryColor}` : '2px solid transparent',
              transition: 'background 120ms ease-out, color 120ms ease-out',
              textDecoration: 'none',
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor = tok.sunken; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <Icon name={item.icon} size={15} style={{ color: active ? primaryColor : tok.fgSubtle, flexShrink: 0 }} />
            {wide && <span>{item.label}</span>}
          </Link>
        </li>
      );
    };

    return (
      <div className="flex flex-col h-full overflow-hidden">

        {/* Brand header */}
        <div
          className="h-12 flex items-center gap-2.5 flex-shrink-0 border-b"
          style={{ borderColor: tok.border, padding: wide ? '0 16px' : '0 14px', justifyContent: wide ? 'flex-start' : 'center' }}
        >
          {company?.logo ? (
            <img src={company.logo} alt="" loading="lazy"
              className="w-6 h-6 object-contain flex-shrink-0" style={{ borderRadius: 4 }} />
          ) : (
            <div className="w-6 h-6 flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: primaryColor, borderRadius: 4 }}>
              <Icon name="inventory" style={{ color: '#fff' }} size={13} />
            </div>
          )}
          {wide && (
            <span className="text-[13px] font-semibold truncate" style={{ color: tok.fg }}>
              {company?.name || 'NexINV'}
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 slim-scroll">
          <div className="space-y-3">
            {navSections.map((section, idx) => (
              <div key={idx}>
                {wide && (
                  <div className="px-4 pt-2 pb-1">
                    <span style={{
                      fontFamily: 'ui-monospace, monospace',
                      fontSize: 10, fontWeight: 600,
                      textTransform: 'uppercase', letterSpacing: '0.08em',
                      color: tok.fgSubtle,
                    }}>
                      {section.title}
                    </span>
                  </div>
                )}
                {!wide && idx > 0 && (
                  <div className="mx-auto mb-2" style={{ width: 24, height: 1, backgroundColor: tok.border }} />
                )}
                <ul className="space-y-px">
                  {section.items.map(item => renderItem(item))}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        {/* Bottom controls */}
        <div className="flex-shrink-0 border-t" style={{ borderColor: tok.border }}>
          {!wide ? (
            /* Collapsed icon column */
            <div className="flex flex-col items-center gap-1 p-2">
              {[
                ...(mobile ? [
                  { onClick: toggleTheme, icon: theme === 'dark' ? 'light' : 'dark',  title: theme === 'dark' ? (isAR ? 'فاتح' : 'Light') : (isAR ? 'داكن' : 'Dark') },
                  { onClick: toggleLang,  icon: 'translate', title: lang === 'en' ? 'AR' : 'EN' }
                ] : []),
                { onClick: () => { logout(); navigate('/'); }, icon: 'logout', title: t.logout, danger: true },
              ].map((btn, i) => (
                <button key={i} onClick={btn.onClick} title={btn.title}
                  style={{
                    width: 34, height: 34, borderRadius: 4,
                    border: `1px solid ${tok.border}`,
                    background: 'transparent',
                    color: btn.danger ? tok.neg : tok.fgMuted,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', fontSize: 11, fontWeight: 700,
                    transition: 'background 120ms ease-out',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = btn.danger ? tok.negTint : tok.sunken; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <Icon name={btn.icon} size={14} />
                </button>
              ))}
            </div>
          ) : (
            /* Expanded controls */
            <div className="p-3 space-y-2">
              {/* User row */}
              {mobile && (
                <div className="flex items-center gap-2.5 px-1 py-1.5">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-semibold flex-shrink-0"
                    style={{ backgroundColor: primaryColor }}>
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-medium truncate leading-tight" style={{ color: tok.fg }}>{user?.name}</div>
                    <div className="text-[10px] capitalize leading-tight" style={{ color: tok.fgSubtle, fontFamily: 'ui-monospace, monospace', letterSpacing: '0.04em' }}>{user?.role}</div>
                  </div>
                </div>
              )}

              {/* Theme + lang row */}
              {mobile && (
                <div className="flex gap-1.5">
                  {[
                    { onClick: toggleTheme, icon: theme === 'dark' ? 'light' : 'dark', label: theme === 'dark' ? (isAR ? 'فاتح' : 'Light') : (isAR ? 'داكن' : 'Dark') },
                    { onClick: toggleLang,  label: lang === 'en' ? 'AR' : 'EN' },
                  ].map((btn, i) => (
                  <button key={i} onClick={btn.onClick}
                    style={{
                      flex: 1, height: 28, borderRadius: 4,
                      border: `1px solid ${tok.border}`,
                      background: 'transparent',
                      color: tok.fgMuted,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      gap: 6, cursor: 'pointer',
                      fontSize: 11, fontWeight: 500,
                      fontFamily: 'ui-sans-serif, sans-serif',
                      transition: 'background 120ms ease-out',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = tok.sunken; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    {btn.icon && <Icon name={btn.icon} size={12} />}
                    {btn.label}
                  </button>
                ))}
              </div>
              )}

              {/* Enterprise workspaces */}
              {user?.isEnterprise && (
                <button onClick={async () => {
                  try { const res = await api.exitEnterpriseCompany(); await loginWithToken(res.token); }
                  catch (e) { alert(e.message); }
                }}
                  style={{
                    width: '100%', height: 28, borderRadius: 4,
                    border: `1px solid ${tok.border}`,
                    background: 'transparent', color: tok.fgMuted,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    gap: 6, cursor: 'pointer', fontSize: 11, fontWeight: 500,
                    transition: 'background 120ms ease-out',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = tok.sunken; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <Icon name="company" size={12} />
                  {isAR ? 'مساحات العمل' : 'Workspaces'}
                </button>
              )}

              {/* Logout */}
              <button onClick={() => { logout(); navigate('/'); }}
                style={{
                  width: '100%', height: 28, borderRadius: 4,
                  border: `1px solid ${tok.border}`,
                  background: 'transparent', color: tok.neg,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  gap: 6, cursor: 'pointer', fontSize: 11, fontWeight: 500,
                  transition: 'background 120ms ease-out',
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = tok.negTint; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <Icon name="logout" size={12} />
                {t.logout}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen" style={{ '--color-primary': primaryColor, backgroundColor: tok.canvas }}>

      {/* ════════════════════════════════════════════════════════════════════
          TOP BAR  (h-12 = 48 px, like DMMAS)
          ════════════════════════════════════════════════════════════════════ */}
      <header
        className="h-12 flex items-center gap-2 flex-shrink-0 z-10"
        style={{
          backgroundColor: tok.elev,
          borderBottom: `1px solid ${tok.border}`,
          padding: '0 12px',
        }}
      >
        {/* Sidebar toggle — collapses on desktop, opens drawer on mobile */}
        <button
          className="tour-sidebar-toggle"
          onClick={() => window.innerWidth >= 768 ? setCollapsed(c => !c) : setDrawerOpen(true)}
          style={iconBtn(tok)}
          title={collapsed ? (isAR ? 'توسيع' : 'Expand') : (isAR ? 'طي' : 'Collapse')}
        >
          <Icon name="menu" size={15} />
        </button>

        {/* Page title */}
        <span className="hidden sm:block text-[13px] font-semibold" style={{ color: tok.fg }}>
          {currentLabel || ''}
        </span>

        {/* ── Smart search bar with dropdown ── */}
        <div
          ref={searchRef}
          className="hidden sm:flex items-center gap-1.5 flex-1 max-w-sm"
          style={{ marginInlineStart: 'auto', position: 'relative' }}
        >
          <div style={{ position: 'relative', flex: 1 }}>
            <Icon name="search" size={12} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', insetInlineStart: 8, color: tok.fgSubtle, pointerEvents: 'none' }} />
            <input
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
              onKeyDown={e => {
                const looksLikeBarcode = /^\d{6,14}$/.test(searchVal.trim());
                if (e.key === 'Escape') { setSearchDropdown(false); return; }
                if (e.key === 'Enter' && searchVal.trim()) {
                  setSearchDropdown(false);
                  if (looksLikeBarcode && searchItems.length === 0 && !searchLoading) {
                    navigate(`/barcode-lookup?q=${encodeURIComponent(searchVal.trim())}`);
                  } else {
                    navigate(`/inventory?search=${encodeURIComponent(searchVal.trim())}`);
                  }
                  setSearchVal('');
                }
              }}
              placeholder={isAR ? 'ابحث في النظام...' : 'Search system…'}
              style={{
                width: '100%', height: 26,
                paddingInlineStart: 28, paddingInlineEnd: 8,
                backgroundColor: tok.canvas,
                border: `1px solid ${tok.border}`,
                borderRadius: 4,
                fontFamily: 'inherit', fontSize: 12,
                color: tok.fg, outline: 'none',
              }}
              onFocus={e => { 
                e.target.style.borderColor = primaryColor;
                if (searchVal.trim()) setSearchDropdown(true); 
              }}
              onBlur={e => { 
                e.target.style.borderColor = tok.border; 
              }}
            />
          </div>

          {/* Camera / barcode scan button */}
          <button
            onClick={() => setScannerOpen(true)}
            title={isAR ? 'مسح الباركود بالكاميرا' : 'Scan barcode with camera'}
            style={{
              ...iconBtn(tok),
              border: `1px solid ${tok.border}`,
              borderRadius: 4, width: 26, height: 26,
              flexShrink: 0,
            }}
          >
            <Icon name="camera" size={13} />
          </button>

          {/* ── Search dropdown ── */}
          {searchDropdown && searchVal.trim() && (
            <div style={{
              position: 'absolute', top: 32, insetInlineStart: 0,
              width: '100%', minWidth: 280,
              backgroundColor: tok.elev,
              border: `1px solid ${tok.border}`,
              borderRadius: 4, zIndex: 200,
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              overflow: 'hidden',
            }}>
              {/* Inventory results */}
              {searchLoading ? (
                <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8, color: tok.fgSubtle, fontSize: 12 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', border: `2px solid ${tok.border}`, borderTopColor: primaryColor, animation: 'spin 600ms linear infinite', flexShrink: 0 }} />
                  {isAR ? 'جاري البحث...' : 'Searching…'}
                </div>
              ) : searchItems.length > 0 ? (
                <>
                  <div style={{ padding: '6px 12px 4px', fontSize: 10, fontWeight: 600, fontFamily: 'ui-monospace,monospace', textTransform: 'uppercase', letterSpacing: '0.06em', color: tok.fgSubtle, borderBottom: `1px solid ${tok.border}` }}>
                    {isAR ? 'المخزون' : 'Inventory'}
                  </div>
                  {searchItems.map(item => (
                    <button
                      key={item._id}
                      onMouseDown={() => {
                        setSearchDropdown(false);
                        setSearchVal('');
                        navigate(`/inventory?search=${encodeURIComponent(item.name || item.nameEn || '')}`);
                      }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '7px 12px', background: 'none', border: 'none',
                        cursor: 'pointer', textAlign: 'start',
                        borderBottom: `1px solid ${tok.borderSoft}`,
                        transition: 'background 100ms',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = tok.sunken; }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      {item.photo ? (
                        <img src={item.photo} alt="" style={{ width: 24, height: 24, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 24, height: 24, borderRadius: 3, backgroundColor: `${primaryColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon name="inventory" size={12} style={{ color: primaryColor }} />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: tok.fg, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.name || item.nameEn}
                        </div>
                        {(item.sku || item.barcode) && (
                          <div style={{ fontSize: 10, color: tok.fgSubtle, fontFamily: 'ui-monospace,monospace', marginTop: 1 }}>
                            {item.sku || item.barcode}
                          </div>
                        )}
                      </div>
                      {item.qty != null && (
                        <span style={{ fontSize: 11, color: item.qty === 0 ? tok.neg : item.qty <= (item.minThreshold || 0) ? '#f59e0b' : '#10b981', fontFamily: 'ui-monospace,monospace', fontWeight: 700, flexShrink: 0 }}>
                          {item.qty}
                        </span>
                      )}
                    </button>
                  ))}
                </>
              ) : (
                <div style={{ padding: '10px 12px', fontSize: 12, color: tok.fgSubtle }}>
                  {isAR ? 'لا توجد نتائج في المخزون' : 'No inventory matches'}
                </div>
              )}

              {/* Footer actions */}
              <div style={{ borderTop: `1px solid ${tok.border}`, display: 'flex', flexDirection: 'column' }}>
                {/* Search all in inventory */}
                <button
                  onMouseDown={() => {
                    setSearchDropdown(false);
                    setSearchVal('');
                    navigate(`/inventory?search=${encodeURIComponent(searchVal.trim())}`);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 12px', background: 'none', border: 'none',
                    cursor: 'pointer', textAlign: 'start',
                    color: tok.fgMuted, fontSize: 12,
                    transition: 'background 100ms',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = tok.sunken; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <Icon name="search" size={13} style={{ color: tok.fgSubtle }} />
                  {isAR ? `بحث في المخزون عن "${searchVal}"` : `Search inventory for "${searchVal}"`}
                </button>

                {/* Barcode lookup — show when query looks like a numeric barcode */}
                {/^\d{6,14}$/.test(searchVal.trim()) && (
                  <button
                    onMouseDown={() => {
                      setSearchDropdown(false);
                      setSearchVal('');
                      navigate(`/barcode-lookup?q=${encodeURIComponent(searchVal.trim())}`);
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '7px 12px', background: 'none', border: 'none',
                      borderTop: `1px solid ${tok.borderSoft}`,
                      cursor: 'pointer', textAlign: 'start',
                      color: primaryColor, fontSize: 12,
                      transition: 'background 100ms',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = tok.sunken; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <Icon name="globe" size={13} style={{ color: primaryColor }} />
                    {isAR ? `بحث في قواعد الباركود العالمية` : `Look up in barcode databases`}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Right controls ── */}
        <div className="flex items-center gap-1.5">

          {/* Live indicator */}
          <div className="hidden lg:flex items-center gap-1.5 px-2"
            style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, color: tok.fgSubtle, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {syncing
              ? <div className="w-2.5 h-2.5 rounded-full border border-blue-400 border-t-transparent animate-spin" />
              : <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: '#16774A' }} />
            }
            {syncing ? 'SYNC' : 'LIVE'}
          </div>

          {/* Tour Dropdown */}
          <div ref={tourRef} style={{ position: 'relative' }} className="tour-navbar">
            <button
              onClick={() => setTourDropdownOpen(prev => !prev)}
              style={{
                ...iconBtn(tok),
                color: tourDropdownOpen ? primaryColor : tok.fgMuted,
                position: 'relative',
              }}
              title={isAR ? 'بدء جولة إرشادية' : 'Start Tour'}
              onMouseEnter={e => {
                e.currentTarget.style.color = primaryColor;
                e.currentTarget.style.backgroundColor = tok.sunken;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = tourDropdownOpen ? primaryColor : tok.fgMuted;
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Icon name="info" size={17} />
            </button>
            {tourDropdownOpen && (
              <div style={{
                position: 'absolute', top: 32, right: 0, width: 180,
                backgroundColor: tok.elev, border: `1px solid ${tok.border}`,
                borderRadius: 4, padding: 4, zIndex: 50,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}>
                <button
                  onClick={() => { setTourDropdownOpen(false); startPageTour(); }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'start', padding: '8px 12px',
                    fontSize: 12, color: tok.fg, background: 'none', border: 'none', cursor: 'pointer', borderRadius: 4,
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = tok.sunken}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {isAR ? 'جولة في هذه الصفحة' : 'Tour Current Page'}
                </button>
                <button
                  onClick={() => { setTourDropdownOpen(false); startSystemTour(); }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'start', padding: '8px 12px',
                    fontSize: 12, color: tok.fg, background: 'none', border: 'none', cursor: 'pointer', borderRadius: 4,
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = tok.sunken}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {isAR ? 'جولة في النظام بأكمله' : 'Tour Whole System'}
                </button>
              </div>
            )}
          </div>

          {/* Theme toggle */}
          <button className="tour-theme-toggle" onClick={toggleTheme} style={iconBtn(tok)} title="Toggle theme">
            <Icon name={theme === 'dark' ? 'light' : 'dark'} size={14} />
          </button>

          {/* Language switcher */}
          <div style={{
            display: 'inline-flex', height: 26,
            border: `1px solid ${tok.border}`,
            borderRadius: 4, overflow: 'hidden',
            fontFamily: 'ui-monospace, monospace', fontSize: 11,
          }}>
            {['EN', 'AR'].map(L => (
              <button key={L} onClick={() => setLang(L.toLowerCase())}
                style={{
                  padding: '0 10px',
                  display: 'inline-flex', alignItems: 'center',
                  cursor: 'pointer',
                  backgroundColor: lang === L.toLowerCase() ? primaryColor : 'transparent',
                  color:           lang === L.toLowerCase() ? '#fff' : tok.fgSubtle,
                  border: 'none',
                  transition: 'background 120ms ease-out, color 120ms ease-out',
                }}>
                {L}
              </button>
            ))}
          </div>

          {/* Separator */}
          <span style={{ width: 1, height: 14, backgroundColor: tok.border, margin: '0 4px', display: 'inline-block' }} />

          {/* User badge */}
          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <div className="text-[12px] font-medium leading-tight" style={{ color: tok.fg }}>{user?.name}</div>
              <div className="text-[10px] leading-tight" style={{ color: tok.fgSubtle, fontFamily: 'ui-monospace, monospace', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {user?.role}
              </div>
            </div>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-semibold"
              style={{ backgroundColor: primaryColor }}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
          </div>

          {/* AI button (top-bar variant — no floating button overlap with status bar) */}
          <button
            onClick={() => {
              setAiOpen(o => !o);
              if (aiPulsed) { setAiPulsed(false); localStorage.setItem('nexinv_ai_seen', '1'); }
            }}
            title={isAR ? 'مساعد الذكاء الاصطناعي' : 'AI Assistant'}
            className="relative"
            style={{
              ...iconBtn(tok),
              backgroundColor: aiOpen ? primaryColor : 'transparent',
              color:           aiOpen ? '#fff' : tok.fgMuted,
            }}
          >
            <Icon name={aiOpen ? 'close' : 'ai'} size={15} />
            {aiPulsed && !aiOpen && (
              <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full animate-ping"
                style={{ backgroundColor: primaryColor, opacity: 0.7 }} />
            )}
          </button>
        </div>
      </header>

      {/* ════════════════════════════════════════════════════════════════════
          MIDDLE ROW: sidebar + content
          ════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-1 min-h-0">

        {/* Desktop sidebar */}
        <aside
          className="hidden md:flex flex-col flex-shrink-0"
          style={{
            width: collapsed ? 56 : 240,
            backgroundColor: tok.elev,
            borderInlineEnd: `1px solid ${tok.border}`,
            transition: 'width 120ms ease-out',
            overflow: 'hidden',
          }}
        >
          <SidebarContent />
        </aside>

        {/* Mobile drawer backdrop */}
        {drawerOpen && (
          <div
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 40 }}
            onClick={() => setDrawerOpen(false)}
          />
        )}

        {/* Mobile drawer */}
        <aside
          className="fixed inset-y-0 z-50 flex flex-col md:hidden"
          style={{
            width: 240,
            backgroundColor: tok.elev,
            borderInlineEnd: `1px solid ${tok.border}`,
            insetInlineStart: 0,
            transform: drawerOpen ? 'translateX(0)' : isAR ? 'translateX(100%)' : 'translateX(-100%)',
            transition: 'transform 120ms ease-out',
          }}
        >
          <SidebarContent mobile />
        </aside>

        {/* Page content */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 overflow-auto p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </div>
        </main>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          STATUS BAR  (h-6 = 24 px, like DMMAS)
          ════════════════════════════════════════════════════════════════════ */}
      <div
        className="h-6 flex-shrink-0 flex items-center overflow-hidden"
        style={{
          backgroundColor: tok.elev,
          borderTop: `1px solid ${tok.border}`,
          padding: '0 14px',
          gap: 16,
          fontFamily: 'ui-monospace, monospace',
          fontSize: 10,
          color: tok.fgSubtle,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          direction: 'ltr',
        }}
      >
        <span>
          {syncing
            ? '● SYNCING'
            : '● CONNECTED · MONGODB'}
        </span>
        {company?.code && <span>{company.code}</span>}
        {clock && <span className="hidden sm:inline">{clock}</span>}
        {lastSync && (
          <span className="hidden md:inline">
            {isAR ? 'آخر مزامنة' : 'LAST SYNC'}{' '}
            {new Date(lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        <span style={{ marginInlineStart: 'auto' }}>NexINV v2.0</span>
      </div>

      <Toast />
      <AiChat open={aiOpen} onClose={() => setAiOpen(false)} />
      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={async code => {
          setScannerOpen(false);
          // Check inventory first; fall back to barcode lookup if not found
          try {
            const item = await api.getByBarcode(code);
            if (item?._id) {
              navigate(`/inventory?search=${encodeURIComponent(code)}`);
            } else {
              navigate(`/barcode-lookup?q=${encodeURIComponent(code)}`);
            }
          } catch {
            navigate(`/barcode-lookup?q=${encodeURIComponent(code)}`);
          }
        }}
      />
    </div>
  );
}

// ── Helper ─────────────────────────────────────────────────────────────────
function iconBtn(tok) {
  return {
    background: 'transparent',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    color: tok.fgMuted,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    transition: 'background 120ms ease-out',
  };
}
