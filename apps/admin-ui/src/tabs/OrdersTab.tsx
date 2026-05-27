import React, { useState, useEffect } from 'react';

interface OrdersTabProps {
  API_BASE_URL: string;
  addToast: (message: string, type: 'success' | 'error') => void;
}

export const OrdersTab: React.FC<OrdersTabProps> = ({ API_BASE_URL, addToast }) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Fulfill States
  const [showFulfillModal, setShowFulfillModal] = useState(false);
  const [fulfillOrderId, setFulfillOrderId] = useState<string | null>(null);
  const [fulfillTrackingNumber, setFulfillTrackingNumber] = useState('');
  const [fulfillCarrierName, setFulfillCarrierName] = useState('');
  const [isFulfilling, setIsFulfilling] = useState(false);

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await fetch(`${API_BASE_URL}/orders`);
      const result = await res.json();
      if (result.success) setOrders(result.data || []);
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleOpenFulfillModal = (orderId: string) => {
    setFulfillOrderId(orderId);
    setFulfillTrackingNumber('');
    setFulfillCarrierName('');
    setShowFulfillModal(true);
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
          carrier_name: fulfillCarrierName
        })
      });
      const result = await res.json();
      if (result.success) {
        addToast('Order fulfilled successfully', 'success');
        setShowFulfillModal(false);
        fetchOrders();
      } else {
        addToast(result.error || 'Failed to fulfill order', 'error');
      }
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setIsFulfilling(false);
    }
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1 style={{ margin: 0 }}>Orders</h1>
        <button className="btn-secondary" onClick={fetchOrders} disabled={loadingOrders}>
          {loadingOrders ? 'Refreshing...' : '↻ Refresh'}
        </button>
      </div>

      {loadingOrders ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading orders...</div>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '1.1rem' }}>No orders yet.</p>
          <p style={{ fontSize: '0.9rem', marginTop: '8px' }}>Orders will appear here once customers complete checkout.</p>
        </div>
      ) : (
        <div className="form-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
                <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Order ID</th>
                <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Customer</th>
                <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Date</th>
                <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Status</th>
                <th style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Total</th>
                <th style={{ padding: '14px 20px', textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order: any, i: number) => {
                const statusColors: Record<string, { bg: string; color: string; border: string }> = {
                  pending_payment: { bg: 'rgba(255,204,0,0.12)', color: '#ffcc00', border: 'rgba(255,204,0,0.3)' },
                  processing:      { bg: 'rgba(88,166,255,0.12)', color: '#58a6ff', border: 'rgba(88,166,255,0.3)' },
                  completed:       { bg: 'rgba(75,210,143,0.12)', color: '#4bd28f', border: 'rgba(75,210,143,0.3)' },
                  cancelled:       { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', border: 'rgba(255,255,255,0.1)' },
                  refunded:        { bg: 'rgba(255,88,88,0.12)', color: '#ff5858', border: 'rgba(255,88,88,0.3)' },
                  failed:          { bg: 'rgba(255,88,88,0.08)', color: '#ff8888', border: 'rgba(255,88,88,0.2)' },
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
                  <tr key={order.id} style={{ borderBottom: i < orders.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--accent-color)' }}>
                        #{order.id.slice(0, 8).toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{customer}</td>
                    <td style={{ padding: '14px 20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{date}</td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'capitalize',
                        background: sc.bg,
                        color: sc.color,
                        border: `1px solid ${sc.border}`,
                      }}>
                        {order.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 700 }}>{totalDisplay}</td>
                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                      {order.status === 'processing' || order.status === 'completed' ? (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          {order.status === 'processing' && (
                            <button
                              className="btn-secondary"
                              style={{ fontSize: '0.75rem', padding: '5px 12px', borderColor: 'rgba(75, 210, 143, 0.3)', color: '#4bd28f' }}
                              onClick={() => handleOpenFulfillModal(order.id)}
                            >
                              Fulfill
                            </button>
                          )}
                          <button
                            className="btn-secondary"
                            style={{ fontSize: '0.75rem', padding: '5px 12px', borderColor: 'rgba(255,88,88,0.3)', color: '#ff5858' }}
                            onClick={async () => {
                              if (!window.confirm(`Refund order #${order.id.slice(0, 8).toUpperCase()}?`)) return;
                              try {
                                const res = await fetch(`${API_BASE_URL}/orders/${order.id}/refund`, { method: 'POST' });
                                const result = await res.json();
                                if (result.success) { addToast('Order refunded', 'success'); fetchOrders(); }
                                else addToast(result.error || 'Refund failed', 'error');
                              } catch (e: any) { addToast(e.message, 'error'); }
                            }}
                          >Refund</button>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Fulfill Modal */}
      {showFulfillModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowFulfillModal(false); }}>
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <h2 style={{ marginBottom: '6px' }}>📦 Fulfill Order</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '24px' }}>
              Fulfilling order <strong style={{ color: 'var(--text-main)' }}>#{fulfillOrderId?.slice(0, 8).toUpperCase()}</strong>
            </p>
            <form onSubmit={handleFulfillSubmit}>
              <div className="form-group">
                <label htmlFor="carrier-name">Carrier Name <span style={{ color: '#ff6b6b' }}>*</span></label>
                <input
                  id="carrier-name"
                  type="text"
                  className="form-input"
                  placeholder="e.g. FedEx, USPS, GHTK"
                  value={fulfillCarrierName}
                  onChange={(e) => setFulfillCarrierName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="form-group" style={{ marginTop: '16px' }}>
                <label htmlFor="tracking-number">Tracking Number <span style={{ color: '#ff6b6b' }}>*</span></label>
                <input
                  id="tracking-number"
                  type="text"
                  className="form-input"
                  placeholder="Enter tracking number"
                  value={fulfillTrackingNumber}
                  onChange={(e) => setFulfillTrackingNumber(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setShowFulfillModal(false)}
                  disabled={isFulfilling}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1, background: 'linear-gradient(135deg, #4bd28f, #20bf55)', borderColor: 'rgba(75,210,143,0.3)' }}
                  disabled={isFulfilling || !fulfillTrackingNumber || !fulfillCarrierName}
                >
                  {isFulfilling ? 'Fulfilling…' : 'Fulfill Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
