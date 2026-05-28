import { useState, useEffect, useCallback } from 'react';
import './App.css';
import type { Toast } from './types';
import { Sidebar } from './components/Sidebar';
import { ToastContainer } from './components/ToastContainer';
import { OverviewTab } from './tabs/OverviewTab';
import { OrdersTab } from './tabs/OrdersTab';
import { ProductsTab } from './tabs/ProductsTab';
import { CategoriesTab } from './tabs/CategoriesTab';
import { CustomersTab } from './tabs/CustomersTab';
import { CmsTab } from './tabs/CmsTab';
import { TeamTab } from './tabs/TeamTab';
import { LoginScreen } from './components/LoginScreen';

const API_BASE_URL = 'http://localhost:8788';

function App() {
  const [localEmail, setLocalEmail] = useState<string | null>(localStorage.getItem('admin_email'));
  const [user, setUser] = useState<{ id: string, name: string, email: string, role: string } | null>(null);
  const [authStatus, setAuthStatus] = useState<'loading' | 'authorized' | 'forbidden' | 'login'>('loading');
  const [tab, setTab] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') || 'overview';
  });

  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const handleTabChange = (newTab: string) => {
    setTab(newTab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', newTab);
    window.history.pushState({}, '', url.toString());
  };

  useEffect(() => {
    const fetchUser = async () => {
      // If no local email is set and we're in local dev, show login screen
      if (!localEmail) {
        setAuthStatus('login');
        return;
      }

      setAuthStatus('loading');
      try {
        const res = await fetch(`${API_BASE_URL}/me`, {
          headers: {
            'X-Local-Admin-Email': localEmail
          }
        });
        if (res.status === 403 || res.status === 401) {
          setAuthStatus('forbidden');
          return;
        }
        const data = await res.json();
        if (data.success) {
          setUser(data.data);
          setAuthStatus('authorized');
          // If default tab is not allowed, redirect to allowed tab
          const role = data.data.role;
          if (role === 'editor' && !['cms', 'categories'].includes(tab)) {
             handleTabChange('cms');
          } else if (role === 'support' && !['orders', 'customers'].includes(tab)) {
             handleTabChange('orders');
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
  }, [localEmail]);

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

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setTab(params.get('tab') || 'overview');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (authStatus === 'loading') {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Loading...</div>;
  }

  if (authStatus === 'login' || authStatus === 'forbidden') {
    return <LoginScreen onLogin={handleLogin} status={authStatus} />;
  }

  return (
    <div className="admin-layout">
      <Sidebar tab={tab} onTabChange={handleTabChange} userRole={user?.role} onLogout={handleLogout} />

      <main className="main-content">
        {tab === 'overview' && <OverviewTab API_BASE_URL={API_BASE_URL} addToast={addToast} />}
        {tab === 'orders' && <OrdersTab API_BASE_URL={API_BASE_URL} addToast={addToast} />}
        {tab === 'products' && <ProductsTab API_BASE_URL={API_BASE_URL} addToast={addToast} />}
        {tab === 'categories' && <CategoriesTab API_BASE_URL={API_BASE_URL} addToast={addToast} />}
        {tab === 'customers' && <CustomersTab API_BASE_URL={API_BASE_URL} addToast={addToast} />}
        {tab === 'cms' && <CmsTab API_BASE_URL={API_BASE_URL} addToast={addToast} />}
        {tab === 'team' && <TeamTab API_BASE_URL={API_BASE_URL} addToast={addToast} />}
      </main>

      <ToastContainer toasts={toasts} />
    </div>
  );
}

export default App;
