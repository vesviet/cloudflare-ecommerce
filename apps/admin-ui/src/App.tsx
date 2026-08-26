import { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { apiFetch } from './lib/apiFetch';
import './App.css';
import type { Toast } from './types';
import { Sidebar } from './components/Sidebar';
import { ToastContainer } from './components/ToastContainer';
import { LoginScreen } from './components/LoginScreen';
import { GlassCard } from './components/ui/GlassCard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SkeletonLoader } from './components/ui/SkeletonLoader';
import { PageTransition } from './components/PageTransition';
import { ProtectedRoute } from './components/ProtectedRoute';

const OverviewTab = lazy(() => import('./tabs/OverviewTab').then(module => ({ default: module.OverviewTab })));
const OrdersTab = lazy(() => import('./tabs/OrdersTab').then(module => ({ default: module.OrdersTab })));
const ProductsTab = lazy(() => import('./tabs/ProductsTab').then(module => ({ default: module.ProductsTab })));
const CategoriesTab = lazy(() => import('./tabs/CategoriesTab').then(module => ({ default: module.CategoriesTab })));
const CustomersTab = lazy(() => import('./tabs/CustomersTab').then(module => ({ default: module.CustomersTab })));
const CmsTab = lazy(() => import('./tabs/CmsTab').then(module => ({ default: module.CmsTab })));
const TeamTab = lazy(() => import('./tabs/TeamTab').then(module => ({ default: module.TeamTab })));
const SettingsTab = lazy(() => import('./tabs/SettingsTab').then(module => ({ default: module.SettingsTab })));
const PromotionsTab = lazy(() => import('./tabs/PromotionsTab').then(module => ({ default: module.PromotionsTab })));
const PromotionRulesTab = lazy(() => import('./tabs/PromotionRulesTab').then(module => ({ default: module.PromotionRulesTab })));
const FlashSalesTab = lazy(() => import('./tabs/FlashSalesTab').then(module => ({ default: module.FlashSalesTab })));
const LandingPagesTab = lazy(() => import('./tabs/LandingPagesTab').then(module => ({ default: module.LandingPagesTab })));
const LandingLeadsTab = lazy(() => import('./tabs/LandingLeadsTab').then(module => ({ default: module.LandingLeadsTab })));
const ReviewModerationTab = lazy(() => import('./tabs/ReviewModerationTab').then(module => ({ default: module.ReviewModerationTab })));
const AuditLogTab = lazy(() => import('./tabs/AuditLogTab').then(module => ({ default: module.AuditLogTab })));

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

  const addToast = useCallback((message: any, type: 'success' | 'error') => {
    const id = Math.random().toString(36).slice(2, 9);
    let formattedMessage = '';
    if (typeof message === 'string') {
      formattedMessage = message;
    } else if (message && typeof message === 'object') {
      if (Array.isArray(message.issues) && message.issues.length > 0) {
        formattedMessage = message.issues.map((i: any) => `${i.path?.join('.') || 'field'}: ${i.message}`).join(', ');
      } else if (message.error) {
        formattedMessage = typeof message.error === 'string' ? message.error : JSON.stringify(message.error);
      } else {
        formattedMessage = message.message || JSON.stringify(message);
      }
    } else {
      formattedMessage = String(message || 'An error occurred');
    }
    setToasts((prev) => [...prev, { id, message: formattedMessage, type }]);
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
        // On production, Cloudflare Access handles the JWT automatically in cookies/headers
        const res = await apiFetch('/me');
        
        if (res.status === 403 || res.status === 401) {
          setAuthStatus('forbidden');
          return;
        }
        
        const data = await res.json();
        if (data.success) {
        setUser(data.data);
        setAuthStatus('authorized');
      } else {
          setAuthStatus('forbidden');
        }
      } catch (e) {
        console.error('Failed to fetch user', e);
        setAuthStatus('forbidden');
      }
    };
    fetchUser();
  }, [localEmail, navigate]);

  const handleLogin = (email: string) => {
    localStorage.setItem('admin_email', email);
    setLocalEmail(email);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_email');
    setLocalEmail(null);
    setUser(null);
    setAuthStatus('login');

    if (!import.meta.env.DEV) {
      // In production, log out from Cloudflare Access
      window.location.href = `/cdn-cgi/access/logout?returnTo=${encodeURIComponent(window.location.origin)}`;
    }
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
                <Route path="/overview" element={<ProtectedRoute userRole={user?.role} path="/overview"><PageTransition><OverviewTab API_BASE_URL={API_BASE_URL} addToast={addToast} /></PageTransition></ProtectedRoute>} />
                <Route path="/orders" element={<ProtectedRoute userRole={user?.role} path="/orders"><PageTransition><OrdersTab API_BASE_URL={API_BASE_URL} addToast={addToast} /></PageTransition></ProtectedRoute>} />
                <Route path="/products" element={<ProtectedRoute userRole={user?.role} path="/products"><PageTransition><ProductsTab API_BASE_URL={API_BASE_URL} addToast={addToast} /></PageTransition></ProtectedRoute>} />
                <Route path="/categories" element={<ProtectedRoute userRole={user?.role} path="/categories"><PageTransition><CategoriesTab API_BASE_URL={API_BASE_URL} addToast={addToast} /></PageTransition></ProtectedRoute>} />
                <Route path="/customers" element={<ProtectedRoute userRole={user?.role} path="/customers"><PageTransition><CustomersTab API_BASE_URL={API_BASE_URL} addToast={addToast} /></PageTransition></ProtectedRoute>} />
                <Route path="/cms" element={<ProtectedRoute userRole={user?.role} path="/cms"><PageTransition><CmsTab API_BASE_URL={API_BASE_URL} addToast={addToast} /></PageTransition></ProtectedRoute>} />
                <Route path="/team" element={<ProtectedRoute userRole={user?.role} path="/team"><PageTransition><TeamTab API_BASE_URL={API_BASE_URL} addToast={addToast} /></PageTransition></ProtectedRoute>} />
                <Route path="/promotions" element={<ProtectedRoute userRole={user?.role} path="/promotions"><PageTransition><PromotionsTab API_BASE_URL={API_BASE_URL} addToast={addToast} /></PageTransition></ProtectedRoute>} />
                <Route path="/promotion-rules" element={<ProtectedRoute userRole={user?.role} path="/promotion-rules"><PageTransition><PromotionRulesTab API_BASE_URL={API_BASE_URL} addToast={addToast} /></PageTransition></ProtectedRoute>} />
                <Route path="/flash-sales" element={<ProtectedRoute userRole={user?.role} path="/flash-sales"><PageTransition><FlashSalesTab API_BASE_URL={API_BASE_URL} addToast={addToast} /></PageTransition></ProtectedRoute>} />
                <Route path="/landing-pages" element={<ProtectedRoute userRole={user?.role} path="/landing-pages"><PageTransition><LandingPagesTab API_BASE_URL={API_BASE_URL} addToast={addToast} /></PageTransition></ProtectedRoute>} />
                <Route path="/landing-leads" element={<ProtectedRoute userRole={user?.role} path="/landing-leads"><PageTransition><LandingLeadsTab API_BASE_URL={API_BASE_URL} addToast={addToast} /></PageTransition></ProtectedRoute>} />
                <Route path="/review-moderation" element={<ProtectedRoute userRole={user?.role} path="/review-moderation"><PageTransition><ReviewModerationTab API_BASE_URL={API_BASE_URL} addToast={addToast} userRole={user?.role} /></PageTransition></ProtectedRoute>} />
                <Route path="/audit-logs" element={<ProtectedRoute userRole={user?.role} path="/audit-logs"><PageTransition><AuditLogTab API_BASE_URL={API_BASE_URL} addToast={addToast} /></PageTransition></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute userRole={user?.role} path="/settings"><PageTransition><SettingsTab /></PageTransition></ProtectedRoute>} />
                <Route path="*" element={<PageTransition><div style={{ padding: '40px', color: 'var(--text-muted)', textAlign: 'center' }}>Page not found</div></PageTransition>} />
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
