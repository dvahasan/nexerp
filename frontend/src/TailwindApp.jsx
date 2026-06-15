import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import { TourProvider } from './context/TourContext';
import Layout from './components/Layout';
import { T } from './theme';

// Lazy loaded pages
const Landing = lazy(() => import('./pages/Landing'));
const DemoSelect = lazy(() => import('./pages/DemoSelect'));
const Register = lazy(() => import('./pages/Register'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Transactions = lazy(() => import('./pages/Transactions'));
const StockIn = lazy(() => import('./pages/StockIn'));
const StockOut = lazy(() => import('./pages/StockOut'));
const Users = lazy(() => import('./pages/Users'));
const Permissions = lazy(() => import('./pages/Permissions'));
const CompanyProfile = lazy(() => import('./pages/CompanyProfile'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const FileManager = lazy(() => import('./pages/FileManager'));
const DeveloperDashboard = lazy(() => import('./pages/DeveloperDashboard'));
const EnterpriseDashboard = lazy(() => import('./pages/EnterpriseDashboard'));
const Settings = lazy(() => import('./pages/Settings'));
const Import = lazy(() => import('./pages/Import'));
const ItemPage = lazy(() => import('./pages/ItemPage'));
const BarcodeLookup = lazy(() => import('./pages/BarcodeLookup'));
const Departments = lazy(() => import('./pages/Departments'));
const Categories  = lazy(() => import('./pages/Categories'));
const Warehouses  = lazy(() => import('./pages/Warehouses'));
const BOM         = lazy(() => import('./pages/BOM'));
const Sources     = lazy(() => import('./pages/Sources'));
const Destinations = lazy(() => import('./pages/Destinations'));
const Projects    = lazy(() => import('./pages/Projects'));
const Reasons     = lazy(() => import('./pages/Reasons'));

/* ── Loading spinner ─────────────────────────────────────────────────────── */
function Spinner() {
  // Peek at localStorage so the spinner matches the saved theme before context is ready
  const saved  = typeof localStorage !== 'undefined' ? localStorage.getItem('nexinv_theme') : null;
  const tok    = T[saved] || T.light;
  return (
    <div style={{ minHeight: '100vh', backgroundColor: tok.canvas, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        width: 44, height: 44, borderRadius: '50%',
        border: `3px solid ${tok.border}`,
        borderTopColor: '#3b82f6',
        animation: 'spin 600ms linear infinite',
      }} />
    </div>
  );
}

/* ── Route guard: redirects to /login if not authed ─────────────────────── */
function Protected({ children }) {
  const { authed, loading } = useAppContext();
  if (loading) return <Spinner />;
  if (!authed) return <Navigate to="/" replace />;
  return children;
}

/* ── Route guard: redirects to /dashboard if already authed ─────────────── */
function Guest({ children }) {
  const { authed, loading } = useAppContext();
  if (loading) return <Spinner />;
  if (authed) return <Navigate to="/dashboard" replace />;
  return children;
}

/* ── Permission guard: renders Access Denied inside the layout ───────────── */
function PermGuard({ perm, children }) {
  const { user, isAR, theme, company } = useAppContext();
  const tok     = T[theme] || T.light;
  const primary = company?.primaryColor || '#3b82f6';

  // Owner always passes — role check is the source of truth, not resolved perms
  if (user?.role !== 'owner' && !user?.perms?.[perm]) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', padding: '32px 24px', maxWidth: 340 }}>
          {/* Icon block */}
          <div style={{
            width: 72, height: 72, borderRadius: 8,
            backgroundColor: `${tok.neg}14`,
            border: `1px solid ${tok.neg}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px', fontSize: 32,
          }}>
            🚫
          </div>

          {/* Title */}
          <h2 style={{ fontSize: 22, fontWeight: 900, color: tok.fg, margin: '0 0 8px' }}>
            {isAR ? 'غير مصرح' : 'Access Denied'}
          </h2>

          {/* Body */}
          <p style={{ fontSize: 13, color: tok.fgMuted, lineHeight: 1.6, margin: '0 0 24px' }}>
            {isAR
              ? 'ليس لديك صلاحية للوصول إلى هذه الصفحة. تواصل مع مسؤول النظام إذا كنت تعتقد أن هذا خطأ.'
              : "You don't have permission to access this page. Contact your system administrator if you believe this is a mistake."}
          </p>

          {/* CTA */}
          <Link
            to="/dashboard"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              backgroundColor: primary, color: '#fff',
              padding: '9px 20px', borderRadius: 4,
              fontSize: 13, fontWeight: 600, textDecoration: 'none',
              transition: 'opacity 120ms ease-out',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
          >
            {isAR ? '← العودة للوحة القيادة' : '← Back to Dashboard'}
          </Link>
        </div>
      </div>
    );
  }
  return children;
}

/* ── App routes ──────────────────────────────────────────────────────────── */
function AppRoutes() {
  const { authed, loading, user, company } = useAppContext();
  if (loading) return <Spinner />;

  // Enterprise user without a selected company → enterprise picker
  if (authed && user?.isEnterprise && !company) {
    return <EnterpriseDashboard />;
  }

  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        {/* ── Public ──────────────────────────────────────────── */}
        <Route path="/"             element={<Guest><Landing /></Guest>} />
        <Route path="/demo-select"  element={<Guest><DemoSelect /></Guest>} />
        <Route path="/login"        element={<Guest><Login /></Guest>} />
        <Route path="/register"     element={<Guest><Register /></Guest>} />
        
        {/* ── Developer ───────────────────────────────────────── */}
        <Route path="/dev-dashboard" element={<DeveloperDashboard />} />

        {/* ── Protected (inside Layout) ────────────────────── */}
        <Route path="/dashboard"    element={<Protected><Layout><Dashboard /></Layout></Protected>} />
        <Route path="/inventory"    element={<Protected><Layout><Inventory /></Layout></Protected>} />
        <Route path="/item/new"     element={<Protected><Layout><ItemPage /></Layout></Protected>} />
        <Route path="/item/:id"     element={<Protected><Layout><ItemPage /></Layout></Protected>} />
        {/* Legacy redirect — old /transactions link lands on stock-in */}
        <Route path="/transactions" element={<Protected><Layout><Transactions /></Layout></Protected>} />
        <Route path="/stock-in"     element={<Protected><Layout><PermGuard perm="canTxIn"><StockIn /></PermGuard></Layout></Protected>} />
        <Route path="/stock-out"    element={<Protected><Layout><PermGuard perm="canTxOut"><StockOut /></PermGuard></Layout></Protected>} />
        <Route path="/bom"             element={<Protected><Layout><PermGuard perm="canManageBOM"><BOM /></PermGuard></Layout></Protected>} />
        
        {/* Modular Features */}
        <Route path="/sources"         element={<Protected><Layout><Sources /></Layout></Protected>} />
        <Route path="/destinations"    element={<Protected><Layout><Destinations /></Layout></Protected>} />
        <Route path="/projects"        element={<Protected><Layout><Projects /></Layout></Protected>} />
        <Route path="/reasons"         element={<Protected><Layout><Reasons /></Layout></Protected>} />
        
        {/* Settings & Profile */}
        <Route path="/users"        element={<Protected><Layout><PermGuard perm="canManageUsers"><Users /></PermGuard></Layout></Protected>} />
        <Route path="/permissions"  element={<Protected><Layout><PermGuard perm="canManageUsers"><Permissions /></PermGuard></Layout></Protected>} />
        <Route path="/settings"        element={<Protected><Layout><Settings /></Layout></Protected>} />
        <Route path="/departments"     element={<Protected><Layout><PermGuard perm="canManageDepts"><Departments /></PermGuard></Layout></Protected>} />
        <Route path="/categories"      element={<Protected><Layout><PermGuard perm="canManageDepts"><Categories /></PermGuard></Layout></Protected>} />
        <Route path="/files"           element={<Protected><Layout><FileManager /></Layout></Protected>} />
        <Route path="/profile"         element={<Protected><Layout><PermGuard perm="canManageCompany"><CompanyProfile /></PermGuard></Layout></Protected>} />
        <Route path="/myprofile"       element={<Protected><Layout><UserProfile /></Layout></Protected>} />
        <Route path="/import"          element={<Protected><Layout><Import /></Layout></Protected>} />
        <Route path="/barcode-lookup"  element={<Protected><Layout><BarcodeLookup /></Layout></Protected>} />
        <Route path="/warehouses"      element={<Protected><Layout><Warehouses /></Layout></Protected>} />
        <Route path="/bom"             element={<Protected><Layout><BOM /></Layout></Protected>} />

        {/* ── Catch all ───────────────────────────────────────── */}
        <Route path="*" element={authed ? <Navigate to="/dashboard" replace /> : <Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function TailwindApp() {
  return (
    <BrowserRouter>
      <AppProvider>
        <TourProvider>
          <AppRoutes />
        </TourProvider>
      </AppProvider>
    </BrowserRouter>
  );
}
