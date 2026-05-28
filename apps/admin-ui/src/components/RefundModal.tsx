import React, { useState } from 'react';

interface RefundModalProps {
  orderId: string;
  API_BASE_URL: string;
  onClose: () => void;
  onSuccess: () => void;
  addToast: (message: string, type: 'success' | 'error') => void;
}

export const RefundModal: React.FC<RefundModalProps> = ({ orderId, API_BASE_URL, onClose, onSuccess, addToast }) => {
  const [isRefunding, setIsRefunding] = useState(false);

  const handleRefund = async () => {
    setIsRefunding(true);
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${orderId}/refund`, { method: 'POST' });
      const result = await res.json();
      if (result.success) {
        addToast('Order refunded successfully', 'success');
        onSuccess();
        onClose();
      } else {
        addToast(result.error || 'Refund failed', 'error');
      }
    } catch (e: any) {
      addToast(e.message || 'Refund failed due to network error', 'error');
    } finally {
      setIsRefunding(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget && !isRefunding) onClose(); }}>
      <div className="modal-content" style={{ maxWidth: '440px' }}>
        <h2 style={{ marginBottom: '6px' }}>Refund Order</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '24px' }}>
          Are you sure you want to refund order <strong style={{ color: 'var(--text-main)' }}>#{orderId.slice(0, 8).toUpperCase()}</strong>? This action will mark the order as refunded and cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <button
            type="button"
            className="btn-secondary"
            style={{ flex: 1 }}
            onClick={onClose}
            disabled={isRefunding}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            style={{ flex: 1, background: 'rgba(255,88,88,0.12)', color: '#ff5858', border: '1px solid rgba(255,88,88,0.3)' }}
            onClick={handleRefund}
            disabled={isRefunding}
          >
            {isRefunding ? 'Refunding…' : 'Yes, Refund Order'}
          </button>
        </div>
      </div>
    </div>
  );
};
