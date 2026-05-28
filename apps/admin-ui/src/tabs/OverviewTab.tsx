import React from 'react';
import useSWR from 'swr';
import { GlassCard } from '../components/ui/GlassCard';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { DollarSign, ShoppingBag, RefreshCcw, AlertTriangle } from 'lucide-react';
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

export const OverviewTab: React.FC<OverviewTabProps> = ({ addToast }) => {
  const { data: metricsResult, error: metricsError, isLoading: metricsLoading } = useSWR<{ success: boolean, data: Metrics }>('/metrics');
  const { data: ordersResult, error: ordersError, isLoading: ordersLoading } = useSWR<{ success: boolean, data: OrderData[] }>('/orders');

  const metrics = metricsResult?.data;
  const recentOrders = ordersResult?.data?.slice(0, 5) || [];
  const loading = metricsLoading || ordersLoading;

  if (metricsError) addToast(metricsError.message || 'Error loading metrics', 'error');
  if (ordersError) addToast(ordersError.message || 'Error loading orders', 'error');

  const formatCurrency = (minorAmount: number | string) => {
    const amount = typeof minorAmount === 'string' ? parseFloat(minorAmount) : minorAmount;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount / 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-success-accent bg-success-accent/15 border-success-accent/30';
      case 'processing': return 'text-primary-accent bg-primary-accent/15 border-primary-accent/30';
      case 'refunded': return 'text-danger-accent bg-danger-accent/15 border-danger-accent/30';
      case 'cancelled': return 'text-text-muted bg-white/10 border-white/20';
      default: return 'text-warning-accent bg-warning-accent/15 border-warning-accent/30';
    }
  };

  return (
    <div className="w-full flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="m-0 text-3xl font-bold bg-gradient-to-r from-white to-primary-accent bg-clip-text text-transparent">
            Dashboard Overview
          </h2>
          <div className="text-text-muted text-sm mt-1">
            Welcome back to Aura Admin.
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <GlassCard className="p-6 border-t-4 border-t-primary-accent flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="text-text-muted font-medium text-sm tracking-wide uppercase">Total Sales</div>
            <div className="p-2 rounded-lg bg-primary-accent/20 text-primary-accent"><DollarSign className="w-5 h-5" /></div>
          </div>
          {loading ? <SkeletonLoader height="36px" /> : (
            <div className="text-3xl font-bold text-text-main">
              {metrics ? formatCurrency(metrics.totalSales) : '—'}
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-6 border-t-4 border-t-success-accent flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="text-text-muted font-medium text-sm tracking-wide uppercase">Total Orders</div>
            <div className="p-2 rounded-lg bg-success-accent/20 text-success-accent"><ShoppingBag className="w-5 h-5" /></div>
          </div>
          {loading ? <SkeletonLoader height="36px" /> : (
            <div className="text-3xl font-bold text-text-main">
              {metrics ? metrics.totalOrders : '—'}
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-6 border-t-4 border-t-warning-accent flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="text-text-muted font-medium text-sm tracking-wide uppercase">Refund Rate</div>
            <div className="p-2 rounded-lg bg-warning-accent/20 text-warning-accent"><RefreshCcw className="w-5 h-5" /></div>
          </div>
          {loading ? <SkeletonLoader height="36px" /> : (
            <div className="text-3xl font-bold text-text-main">
              {metrics ? `${metrics.refundRate}%` : '—'}
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-6 border-t-4 border-t-danger-accent flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="text-text-muted font-medium text-sm tracking-wide uppercase">Low Stock Alerts</div>
            <div className="p-2 rounded-lg bg-danger-accent/20 text-danger-accent"><AlertTriangle className="w-5 h-5" /></div>
          </div>
          {loading ? <SkeletonLoader height="36px" /> : (
            <div className={`text-3xl font-bold ${metrics && metrics.lowStockCount > 0 ? 'text-danger-accent' : 'text-text-main'}`}>
              {metrics ? metrics.lowStockCount : '—'}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Recent Orders Section */}
      <GlassCard className="overflow-hidden">
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
          <h3 className="m-0 text-lg font-semibold text-text-main">Recent Orders</h3>
        </div>
        
        {loading ? (
          <div className="p-6 space-y-4">
            <SkeletonLoader height="64px" />
            <SkeletonLoader height="64px" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase text-text-muted bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4 font-medium tracking-wider">Order ID</th>
                  <th className="px-6 py-4 font-medium tracking-wider">Customer / Email</th>
                  <th className="px-6 py-4 font-medium tracking-wider">Status</th>
                  <th className="px-6 py-4 font-medium tracking-wider">Total</th>
                  <th className="px-6 py-4 font-medium tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentOrders.length > 0 ? (
                  recentOrders.map(order => (
                    <tr key={order.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-mono text-text-muted">{order.id.slice(0, 8)}...</td>
                      <td className="px-6 py-4 text-text-main font-medium">{order.customer_id ? `Customer ${order.customer_id.slice(0,8)}` : order.guest_email || 'Guest'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(order.status)}`}>
                          {order.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-text-main">{formatCurrency(order.total_amount)}</td>
                      <td className="px-6 py-4 text-text-muted">{new Date(order.created_at).toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center p-12 text-text-muted">
                      <ShoppingBag className="w-12 h-12 text-text-muted mb-4 opacity-50 mx-auto" />
                      <p>No recent orders found.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
};
