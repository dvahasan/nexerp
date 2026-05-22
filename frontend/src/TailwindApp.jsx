import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import Layout from './components/Layout';

// Lazy loaded pages
const Landing = lazy(() => import('./pages/Landing'));
const Register = lazy(() => import('./pages/Register'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Transactions = lazy(() => import('./pages/Transactions'));
const Users = lazy(() => import('./pages/Users'));
const Permissions = lazy(() => import('./pages/Permissions'));
const CompanyProfile = lazy(() => import('./pages/CompanyProfile'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const FileManager = lazy(() => import('./pages/FileManager'));
const EnterpriseDashboard = lazy(() => import('./pages/EnterpriseDashboard'));
const Settings = lazy(() => import('./pages/Settings'));

/* ── Loading spinner ─────────────────────────────────────────────────────── */
function Spinner() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

/* ── Route guard: redirects to /login if not authed ─────────────────────── */
function Protected({ children }) {
  const { authed, loading } = useAppContext();
  if (loading) return <Spinner />;
  if (!authed) return <Navigate to="/login" replace />;
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
  const { user, isAR } = useAppContext();
  // Owner always passes — role check is the source of truth, not resolved perms
  if (user?.role !== 'owner' && !user?.perms?.[perm]) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center p-8 max-w-sm">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5 text-4xl">
            🚫
          </div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">
            {isAR ? 'غير مصرح' : 'Access Denied'}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            {isAR
              ? 'ليس لديك صلاحية للوصول إلى هذه الصفحة. تواصل مع مسؤول النظام إذا كنت تعتقد أن هذا خطأ.'
              : "You don't have permission to access this page. Contact your system administrator if you believe this is a mistake."}
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-sm font-bold transition-colors"
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
        <Route path="/"         element={<Guest><Landing /></Guest>} />
        <Route path="/login"    element={<Guest><Login /></Guest>} />
        <Route path="/register" element={<Guest><Register /></Guest>} />

        {/* ── Protected (inside Layout) ────────────────────── */}
        <Route path="/dashboard"    element={<Protected><Layout><Dashboard /></Layout></Protected>} />
        <Route path="/inventory"    element={<Protected><Layout><Inventory /></Layout></Protected>} />
        <Route path="/transactions" element={<Protected><Layout><Transactions /></Layout></Protected>} />
        <Route path="/users"        element={<Protected><Layout><PermGuard perm="canManageUsers"><Users /></PermGuard></Layout></Protected>} />
        <Route path="/permissions"  element={<Protected><Layout><PermGuard perm="canManageUsers"><Permissions /></PermGuard></Layout></Protected>} />
        <Route path="/settings"     element={<Protected><Layout><Settings /></Layout></Protected>} />
        <Route path="/files"        element={<Protected><Layout><FileManager /></Layout></Protected>} />
        <Route path="/profile"      element={<Protected><Layout><PermGuard perm="canManageCompany"><CompanyProfile /></PermGuard></Layout></Protected>} />
        <Route path="/myprofile"    element={<Protected><Layout><UserProfile /></Layout></Protected>} />

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
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  );
}
