import { useState, useEffect } from 'react';
import './App.css';
import type { Toast } from './types';
import { Sidebar } from './components/Sidebar';
import { ToastContainer } from './components/ToastContainer';
import { OverviewTab } from './tabs/OverviewTab';
import { OrdersTab } from './tabs/OrdersTab';
import { ProductsTab } from './tabs/ProductsTab';
import { CategoriesTab } from './tabs/CategoriesTab';
import { CustomersTab } from './tabs/CustomersTab';

const API_BASE_URL = 'http://localhost:8788';

function App() {
  const [tab, setTab] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') || 'overview';
  });

  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: 'success' | 'error') => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleTabChange = (newTab: string) => {
    setTab(newTab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', newTab);
    window.history.pushState({}, '', url.toString());
  };

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setTab(params.get('tab') || 'overview');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <div className="admin-layout">
      <Sidebar tab={tab} onTabChange={handleTabChange} />

      <main className="main-content">
        {tab === 'overview' && <OverviewTab />}
        {tab === 'orders' && <OrdersTab API_BASE_URL={API_BASE_URL} addToast={addToast} />}
        {tab === 'products' && <ProductsTab API_BASE_URL={API_BASE_URL} addToast={addToast} />}
        {tab === 'categories' && <CategoriesTab API_BASE_URL={API_BASE_URL} addToast={addToast} />}
        {tab === 'customers' && <CustomersTab API_BASE_URL={API_BASE_URL} addToast={addToast} />}
      </main>

      <ToastContainer toasts={toasts} />
    </div>
  );
}

export default App;
