import { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';
import type { Toast } from './types';
import { Sidebar } from './components/Sidebar';
import { ToastContainer } from './components/ToastContainer';
import { LoginScreen } from './components/LoginScreen';
import { GlassCard } from './components/ui/GlassCard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SkeletonLoader } from './components/ui/SkeletonLoader';

const OverviewTab = lazy(() => import('./tabs/OverviewTab').then(module => ({ default: module.OverviewTab })));
const OrdersTab = lazy(() => import('./tabs/OrdersTab').then(module => ({ default: module.OrdersTab })));
const ProductsTab = lazy(() => import('./tabs/ProductsTab').then(module => ({ default: module.ProductsTab })));
const CategoriesTab = lazy(() => import('./tabs/CategoriesTab').then(module => ({ default: module.CategoriesTab })));
const CustomersTab = lazy(() => import('./tabs/CustomersTab').then(module => ({ default: module.CustomersTab })));
const CmsTab = lazy(() => import('./tabs/CmsTab').then(module => ({ default: module.CmsTab })));
const TeamTab = lazy(() => import('./tabs/TeamTab').then(module => ({ default: module.TeamTab })));
const SettingsTab = lazy(() => import('./tabs/SettingsTab').then(module => ({ default: module.SettingsTab })));
const PromotionsTab = lazy(() => import('./tabs/PromotionsTab').then(module => ({ default: module.PromotionsTab })));
const LandingPagesTab = lazy(() => import('./tabs/LandingPagesTab').then(module => ({ default: module.LandingPagesTab })));

// Use environment variable if available, fallback to localhost for dev
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8788/api';

// Global SWR configuration could be moved here later

function App() {
  const [localEmail, setLocalEmail] = useState<string | null>(localStorage.getItem('admin_email'));
  const [user, setUser] = useState<{ id: string, name: string, email: string, role: string } | null>(null);
  const [authStatus, setAuthStatus] = useState<'loading' | 'authorized' | 'forbidden' | 'login'>('loading');
  const navigate = useNavigate();
  const location = useLocation();

  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      // In a real Zero Trust environment, Cloudflare handles the login screen.
      // This local logic is strictly for Local Development fallback.
      const isLocalDev = import.meta.env.DEV; // Vite exposes this

      if (isLocalDev && !localEmail) {
        setAuthStatus('login');
        return;
      }

      setAuthStatus('loading');
      try {
        const headers: Record<string, string> = {};
        if (isLocalDev && localEmail) {
          headers['X-Local-Admin-Email'] = localEmail;
        }

        // On production, Cloudflare Access handles the JWT automatically in cookies/headers
        const res = await fetch(`${API_BASE_URL}/me`, { 
          headers,
          credentials: 'include' // Must include credentials for cross-domain CF cookies
        });
        
        if (res.status === 403 || res.status === 401) {
          setAuthStatus('forbidden');
          return;
        }
        
        const data = await res.json();
        if (data.success) {
          setUser(data.data);
          setAuthStatus('authorized');
          
          // RBAC Route Protection
          const role = data.data.role;
          const currentPath = location.pathname;
          
          if (role === 'editor' && !['/cms', '/categories'].includes(currentPath)) {
             navigate('/cms', { replace: true });
          } else if (role === 'support' && !['/orders', '/customers'].includes(currentPath)) {
             navigate('/orders', { replace: true });
          }
        } else {
          setAuthStatus('forbidden');
        }
      } catch (e) {
        console.error('Failed to fetch user', e);
        setAuthStatus('forbidden');
      }
    };
    fetchUser();
  }, [localEmail, navigate, location.pathname]);

  const handleLogin = (email: string) => {
    localStorage.setItem('admin_email', email);
    setLocalEmail(email);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_email');
    setLocalEmail(null);
    setUser(null);
    setAuthStatus('login');
  };

  if (authStatus === 'loading') {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <GlassCard className="p-8">
          <div style={{ color: 'var(--text-muted)' }}>Authenticating...</div>
        </GlassCard>
      </div>
    );
  }

  // Only show Mock Login screen in Dev mode. On production, if we get here, they bypassed CF Access but failed RBAC.
  if (authStatus === 'login' || authStatus === 'forbidden') {
    if (import.meta.env.DEV) {
      return <LoginScreen onLogin={handleLogin} status={authStatus} />;
    } else {
      return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <GlassCard className="p-8" glowColor="danger">
            <h2 style={{ color: 'var(--danger-accent)' }}>Access Denied</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
              You do not have the required permissions to access the Admin Panel.
            </p>
          </GlassCard>
        </div>
      );
    }
  }

  return (
    <div className="admin-layout">
      {/* We no longer need to pass tab state to Sidebar, it uses NavLink now */}
      <Sidebar userRole={user?.role} onLogout={handleLogout} />

      <main className="main-content">
        <ErrorBoundary>
          <Suspense fallback={<div style={{ padding: '24px' }}><SkeletonLoader height="400px" /></div>}>
            <AnimatePresence mode="wait">
              <Routes location={location} key={location.pathname}>
                <Route path="/" element={<Navigate to="/overview" replace />} />
                <Route path="/overview" element={
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                    <OverviewTab API_BASE_URL={API_BASE_URL} addToast={addToast} />
                  </motion.div>
                } />
                <Route path="/orders" element={
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                    <OrdersTab API_BASE_URL={API_BASE_URL} addToast={addToast} />
                  </motion.div>
                } />
                <Route path="/products" element={
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                    <ProductsTab API_BASE_URL={API_BASE_URL} addToast={addToast} />
                  </motion.div>
                } />
                <Route path="/categories" element={
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                    <CategoriesTab API_BASE_URL={API_BASE_URL} addToast={addToast} />
                  </motion.div>
                } />
                <Route path="/customers" element={
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                    <CustomersTab API_BASE_URL={API_BASE_URL} addToast={addToast} />
                  </motion.div>
                } />
                <Route path="/cms" element={
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                    <CmsTab API_BASE_URL={API_BASE_URL} addToast={addToast} />
                  </motion.div>
                } />
                <Route path="/team" element={
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                    <TeamTab API_BASE_URL={API_BASE_URL} addToast={addToast} />
                  </motion.div>
                } />
                <Route path="/promotions" element={
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                    <PromotionsTab API_BASE_URL={API_BASE_URL} addToast={addToast} />
                  </motion.div>
                } />
                <Route path="/landing-pages" element={
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                    <LandingPagesTab API_BASE_URL={API_BASE_URL} addToast={addToast} />
                  </motion.div>
                } />
                <Route path="/settings" element={
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                    <SettingsTab />
                  </motion.div>
                } />
                <Route path="*" element={
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                    <div style={{ padding: '40px', color: 'var(--text-muted)', textAlign: 'center' }}>Page not found</div>
                  </motion.div>
                } />
              </Routes>
            </AnimatePresence>
          </Suspense>
        </ErrorBoundary>
      </main>

      <ToastContainer toasts={toasts} />
    </div>
  );
}

export default App;
