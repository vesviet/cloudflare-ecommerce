import React, { useState, useEffect } from 'react';
import type { OrderData } from '../types';

interface OverviewTabProps {
  API_BASE_URL: string;
  addToast: (message: string, type: 'success' | 'error') => void;
}

interface Metrics {
  totalSales: number;
  totalOrders: number;
  refundRate: number;
  lowStockCount: number;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ API_BASE_URL, addToast }) => {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [recentOrders, setRecentOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [metricsRes, ordersRes] = await Promise.all([
          fetch(`${API_BASE_URL}/metrics`),
          fetch(`${API_BASE_URL}/orders`)
        ]);

        if (!metricsRes.ok || !ordersRes.ok) {
          throw new Error('Failed to fetch dashboard data');
        }

        const metricsData = await metricsRes.json();
        const ordersData = await ordersRes.json();

        if (metricsData.success) {
          setMetrics(metricsData.data);
        }
        
        if (ordersData.success) {
          // Take top 5 recent orders
          setRecentOrders(ordersData.data.slice(0, 5));
        }
      } catch (err: any) {
        addToast(err.message || 'Error loading dashboard data', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [API_BASE_URL, addToast]);

  const formatCurrency = (minorAmount: number | string) => {
    const amount = typeof minorAmount === 'string' ? parseFloat(minorAmount) : minorAmount;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount / 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#2ea043';
      case 'processing': return '#58a6ff';
      case 'refunded': return '#f85149';
      case 'cancelled': return '#8b949e';
      default: return '#d2a8ff';
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)' }}>
        <div className="spinner"></div> Loading Dashboard...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: 700, background: 'linear-gradient(to right, #fff, #58a6ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Dashboard Overview
        </h2>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Welcome back to Aura Admin.
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="stats-grid">
        <div className="stat-card" style={{ borderTop: '4px solid #58a6ff' }}>
          <div className="stat-label">Total Sales</div>
          <div className="stat-value">
            {metrics ? formatCurrency(metrics.totalSales) : '—'}
          </div>
        </div>

        <div className="stat-card" style={{ borderTop: '4px solid #3fb950' }}>
          <div className="stat-label">Total Orders</div>
          <div className="stat-value">
            {metrics ? metrics.totalOrders : '—'}
          </div>
        </div>

        <div className="stat-card" style={{ borderTop: '4px solid #d2a8ff' }}>
          <div className="stat-label">Refund Rate</div>
          <div className="stat-value">
            {metrics ? `${metrics.refundRate}%` : '—'}
          </div>
        </div>

        <div className="stat-card" style={{ borderTop: '4px solid #f85149' }}>
          <div className="stat-label">Low Stock Alerts</div>
          <div className="stat-value" style={{ color: metrics && metrics.lowStockCount > 0 ? '#f85149' : '#fff' }}>
            {metrics ? metrics.lowStockCount : '—'}
          </div>
        </div>
      </div>

      {/* Recent Orders Section */}
      <div className="table-container">
        <div style={{ padding: '20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>Recent Orders</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="glass-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer / Email</th>
                <th>Status</th>
                <th>Total</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length > 0 ? (
                recentOrders.map(order => (
                  <tr key={order.id}>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{order.id.slice(0, 8)}...</td>
                    <td>{order.customer_id ? `Customer ${order.customer_id.slice(0,8)}` : order.guest_email || 'Guest'}</td>
                    <td>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        backgroundColor: `${getStatusColor(order.status)}20`,
                        color: getStatusColor(order.status),
                        textTransform: 'capitalize'
                      }}>
                        {order.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(order.total_amount)}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{new Date(order.created_at).toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No recent orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
