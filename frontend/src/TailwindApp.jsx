import { AppProvider, useAppContext } from './context/AppContext';
import Landing from './pages/Landing';
import Register from './pages/Register';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Transactions from './pages/Transactions';
import Users from './pages/Users';
import Settings from './pages/Settings';
import { useState, useEffect } from 'react';

function AppContent() {
  const { authed, loading } = useAppContext();
  const [page, setPage] = useState('dash');

  useEffect(() => {
    const handleHash = () => {
      const h = window.location.hash.replace('#', '') || 'dash';
      setPage(h);
    };
    window.addEventListener('hashchange', handleHash);
    handleHash();
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!authed) {
    if (page === 'login') return <Login />;
    if (page === 'register') return <Register />;
    return <Landing />;
  }

  return (
    <Layout>
      {page === 'dash' && <Dashboard />}
      {page === 'inv' && <Inventory />}
      {page === 'tx' && <Transactions />}
      {page === 'users' && <Users />}
      {page === 'settings' && <Settings />}
      {page !== 'dash' && page !== 'inv' && page !== 'tx' && page !== 'users' && page !== 'settings' && (
        <div className="text-center py-20 text-slate-500 dark:text-slate-400">
          <h2 className="text-2xl font-bold mb-4">SaaS Component Under Construction</h2>
          <p>The layout and Dashboard are complete. We are migrating {page} now.</p>
        </div>
      )}
    </Layout>
  );
}

export default function TailwindApp() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
