import React, { useEffect, useState } from 'react';
import useSWR from 'swr';
import type { OrderData } from '../types';
import { OrderDetailModal } from '../components/OrderDetailModal';
import { RefundModal } from '../components/RefundModal';
import { GlassCard } from '../components/ui/GlassCard';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { RefreshCw, Package, RotateCcw } from 'lucide-react';

interface OrdersTabProps {
  API_BASE_URL: string;
  addToast: (message: string, type: 'success' | 'error') => void;
}

export const OrdersTab: React.FC<OrdersTabProps> = ({ API_BASE_URL, addToast }) => {
  const { data: result, error, isLoading, mutate } = useSWR<{ success: boolean, data: OrderData[] }>('/orders');

  // Fulfill States
  const [showFulfillModal, setShowFulfillModal] = useState(false);
  const [fulfillOrderId, setFulfillOrderId] = useState<string | null>(null);
  const [fulfillTrackingNumber, setFulfillTrackingNumber] = useState('');
  const [fulfillCarrierName, setFulfillCarrierName] = useState('');
  const [isFulfilling, setIsFulfilling] = useState(false);
  const [fulfillItemsOptions, setFulfillItemsOptions] = useState<any[]>([]);
  const [selectedFulfillItems, setSelectedFulfillItems] = useState<any[]>([]);

  // Detail State
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Refund State
  const [refundOrderId, setRefundOrderId] = useState<string | null>(null);

  const orders = result?.data || [];

  const handleOpenFulfillModal = async (orderId: string) => {
    setFulfillOrderId(orderId);
    setFulfillTrackingNumber('');
    setFulfillCarrierName('');
    setFulfillItemsOptions([]);
    setSelectedFulfillItems([]);
    setShowFulfillModal(true);

    try {
      const res = await fetch(`${API_BASE_URL}/orders/${orderId}`);
      const data = await res.json();
      if (data.success && data.data.items) {
        const opts = data.data.items.map((i: any) => ({
          order_item_id: i.id,
          product_title: i.product_title,
          maxQuantity: i.quantity,
          quantity: i.quantity
        }));
        setFulfillItemsOptions(opts);
        setSelectedFulfillItems(opts);
      }
    } catch (e) {
      console.error('Failed to fetch items for fulfillment:', e);
    }
  };

  const handleFulfillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fulfillOrderId) return;
    if (!fulfillTrackingNumber || !fulfillCarrierName) {
      addToast('Tracking number and carrier name are required', 'error');
      return;
    }
    setIsFulfilling(true);
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${fulfillOrderId}/fulfill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tracking_number: fulfillTrackingNumber,
          carrier_name: fulfillCarrierName,
          items: selectedFulfillItems.filter(i => i.quantity > 0).map(i => ({
            order_item_id: i.order_item_id,
            quantity: i.quantity
          }))
        })
      });
      const data = await res.json();
      if (data.success) {
        addToast('Order fulfilled successfully', 'success');
        setShowFulfillModal(false);
        mutate();
      } else {
        addToast(data.error || 'Failed to fulfill order', 'error');
      }
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setIsFulfilling(false);
    }
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  useEffect(() => {
    if (error) addToast(error.message || 'Failed to fetch orders', 'error');
  }, [error, addToast]);

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-text-main m-0">Orders</h1>
        <button 
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          onClick={() => mutate()} 
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {isLoading ? (
        <GlassCard className="p-6">
          <div className="space-y-4">
            <SkeletonLoader height="64px" />
            <SkeletonLoader height="64px" />
            <SkeletonLoader height="64px" />
          </div>
        </GlassCard>
      ) : orders.length === 0 ? (
        <GlassCard className="p-12 text-center flex flex-col items-center">
          <Package className="w-12 h-12 text-text-muted mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-text-main mb-2">No orders yet</h3>
          <p className="text-sm text-text-muted">Orders will appear here once customers complete checkout.</p>
        </GlassCard>
      ) : (
        <GlassCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase text-text-muted bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4 font-medium tracking-wider">Order ID</th>
                  <th className="px-6 py-4 font-medium tracking-wider">Customer</th>
                  <th className="px-6 py-4 font-medium tracking-wider">Date</th>
                  <th className="px-6 py-4 font-medium tracking-wider">Status</th>
                  <th className="px-6 py-4 font-medium tracking-wider text-right">Total</th>
                  <th className="px-6 py-4 font-medium tracking-wider text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {orders.map((order: OrderData) => {
                  const statusColors: Record<string, { bg: string; color: string; border: string }> = {
                    pending_payment: { bg: 'rgba(255,204,0,0.12)', color: '#ffcc00', border: 'rgba(255,204,0,0.3)' },
                    processing:      { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', border: 'rgba(59,130,246,0.3)' },
                    completed:       { bg: 'rgba(16,185,129,0.12)', color: '#10b981', border: 'rgba(16,185,129,0.3)' },
                    cancelled:       { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', border: 'rgba(255,255,255,0.1)' },
                    refunded:        { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', border: 'rgba(239,68,68,0.3)' },
                    failed:          { bg: 'rgba(239,68,68,0.08)', color: '#fca5a5', border: 'rgba(239,68,68,0.2)' },
                  };
                  const sc = statusColors[order.status] ?? statusColors['pending_payment'];
                  const totalDisplay = order.total_amount != null
                    ? formatCurrency(Number(order.total_amount) / 100)
                    : '—';
                  const customer = order.guest_email || order.customer_id || 'Guest';
                  const date = order.created_at
                    ? new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '—';

                  return (
                    <tr 
                      key={order.id} 
                      className="hover:bg-white/5 cursor-pointer transition-colors"
                      onClick={() => setSelectedOrderId(order.id)}
                    >
                      <td className="px-6 py-4">
                        <span className="font-mono text-primary-accent">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </span>
                        {(order as any).source === 'landing_page' && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold" style={{ background: '#3b82f6', color: '#fff' }}>
                            Landing Page
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-text-muted">{customer}</td>
                      <td className="px-6 py-4 text-text-muted">{date}</td>
                      <td className="px-6 py-4">
                        <span 
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize"
                          style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}
                        >
                          {order.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium">{totalDisplay}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {order.status === 'processing' ? (
                            <button
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-success-accent border border-success-accent/30 hover:bg-success-glow/10 transition-colors"
                              onClick={(e) => { e.stopPropagation(); handleOpenFulfillModal(order.id); }}
                            >
                              <Package className="w-3.5 h-3.5" />
                              Fulfill
                            </button>
                          ) : null}
                          
                          {(order.status === 'processing' || order.status === 'completed') ? (
                            <button
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-danger-accent border border-danger-accent/30 hover:bg-danger-glow/10 transition-colors"
                              onClick={(e) => { e.stopPropagation(); setRefundOrderId(order.id); }}
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Refund
                            </button>
                          ) : (
                            <span className="text-text-muted">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* Fulfill Modal */}
      {showFulfillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setShowFulfillModal(false); }}>
          <GlassCard className="w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-1">📦 Fulfill Order</h2>
            <p className="text-sm text-text-muted mb-6">
              Fulfilling order <strong className="text-text-main">#{fulfillOrderId?.slice(0, 8).toUpperCase()}</strong>
            </p>
            <form onSubmit={handleFulfillSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">
                  Carrier Name <span className="text-danger-accent">*</span>
                </label>
                <input
                  type="text"
                  className="w-full"
                  placeholder="e.g. FedEx, USPS, GHTK"
                  value={fulfillCarrierName}
                  onChange={(e) => setFulfillCarrierName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">
                  Tracking Number <span className="text-danger-accent">*</span>
                </label>
                <input
                  type="text"
                  className="w-full"
                  placeholder="Enter tracking number"
                  value={fulfillTrackingNumber}
                  onChange={(e) => setFulfillTrackingNumber(e.target.value)}
                  required
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-text-muted mb-2">Items to Fulfill</label>
                {fulfillItemsOptions.length === 0 ? (
                  <div className="text-sm text-text-muted">Loading items...</div>
                ) : (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                    {fulfillItemsOptions.map((item) => {
                      const selected = selectedFulfillItems.find(i => i.order_item_id === item.order_item_id);
                      return (
                        <div key={item.order_item_id} className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/10">
                          <input 
                            type="checkbox" 
                            checked={!!selected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedFulfillItems([...selectedFulfillItems, { ...item, quantity: item.maxQuantity }]);
                              } else {
                                setSelectedFulfillItems(selectedFulfillItems.filter(i => i.order_item_id !== item.order_item_id));
                              }
                            }}
                            className="accent-success-accent w-4 h-4 cursor-pointer"
                          />
                          <span className="flex-1 text-sm text-text-main line-clamp-1" title={item.product_title}>{item.product_title}</span>
                          {selected && (
                            <input
                              type="number"
                              min={1}
                              max={item.maxQuantity}
                              value={selected.quantity}
                              onChange={(e) => {
                                const q = parseInt(e.target.value) || 1;
                                setSelectedFulfillItems(selectedFulfillItems.map(i => 
                                  i.order_item_id === item.order_item_id ? { ...i, quantity: Math.min(q, item.maxQuantity) } : i
                                ));
                              }}
                              className="w-16 px-2 py-1 text-sm bg-black/40 text-text-main border border-white/10 rounded outline-none focus:border-success-accent"
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  type="button"
                  className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                  onClick={() => setShowFulfillModal(false)}
                  disabled={isFulfilling}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 rounded-lg bg-success-accent hover:bg-success-accent/80 text-white font-medium transition-colors disabled:opacity-50 shadow-[0_0_15px_var(--success-glow)]"
                  disabled={isFulfilling || !fulfillTrackingNumber || !fulfillCarrierName}
                >
                  {isFulfilling ? 'Fulfilling…' : 'Fulfill Order'}
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {selectedOrderId && (
        <OrderDetailModal
          orderId={selectedOrderId}
          API_BASE_URL={API_BASE_URL}
          onClose={() => setSelectedOrderId(null)}
          addToast={addToast}
        />
      )}

      {refundOrderId && (
        <RefundModal
          orderId={refundOrderId}
          API_BASE_URL={API_BASE_URL}
          onClose={() => setRefundOrderId(null)}
          onSuccess={() => mutate()}
          addToast={addToast}
        />
      )}
    </div>
  );
};

