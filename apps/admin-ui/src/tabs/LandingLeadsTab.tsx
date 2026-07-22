import React from 'react';
import useSWR from 'swr';
import { Users, CheckCircle, XCircle, Phone, Tag } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';

interface LandingLeadsTabProps {
  API_BASE_URL: string;
  addToast: (message: string, type: 'success' | 'error') => void;
}

export const LandingLeadsTab: React.FC<LandingLeadsTabProps> = ({ API_BASE_URL, addToast }) => {
  const { data, mutate } = useSWR('/landing-leads');

  const handleApprove = async (orderId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${orderId}/approve`, {
        method: 'POST',
        credentials: 'include',
      });
      const result = await res.json();
      if (result.success) {
        addToast('Đã xác nhận đơn hàng!', 'success');
        mutate();
      } else {
        addToast(result.error || 'Duyệt đơn thất bại', 'error');
      }
    } catch (e: any) {
      addToast(e.message, 'error');
    }
  };

  const handleCancel = async (orderId: string) => {
    if (!confirm('Bạn có chắc chắn muốn hủy đơn hàng này không?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${orderId}/cancel`, {
        method: 'POST',
        credentials: 'include',
      });
      const result = await res.json();
      if (result.success) {
        addToast('Đã hủy đơn hàng', 'success');
        mutate();
      } else {
        addToast(result.error || 'Hủy đơn thất bại', 'error');
      }
    } catch (e: any) {
      addToast(e.message, 'error');
    }
  };

  return (
    <div className="tab-container">
      <div className="tab-header">
        <div>
          <h2><Users className="inline-block mr-2" /> Landing Leads (Telesale)</h2>
          <p className="text-muted">Quản lý Lead & Chốt đơn từ các trang Landing Page bán hàng</p>
        </div>
      </div>

      <GlassCard>
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Khách hàng</th>
                <th>SĐT / Địa chỉ</th>
                <th>Trang Landing</th>
                <th>Tổng tiền</th>
                <th>UTM Source</th>
                <th>Trạng thái Đơn</th>
                <th className="text-right">Hành động Telesale</th>
              </tr>
            </thead>
            <tbody>
              {data?.data?.map((lead: any) => (
                <tr key={lead.id}>
                  <td>
                    <div style={{ fontWeight: '600' }}>{lead.customer_name}</div>
                    {lead.customer_note && <div style={{ fontSize: '0.8rem', color: '#8b949e' }}>Ghi chú: {lead.customer_note}</div>}
                  </td>
                  <td>
                    <div style={{ fontWeight: 'bold' }}>
                      <Phone className="w-3 h-3 inline mr-1" />
                      <a href={`tel:${lead.customer_phone}`} style={{ color: 'var(--primary-accent)' }}>{lead.customer_phone}</a>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#c9d1d9' }}>{lead.customer_address}</div>
                  </td>
                  <td>
                    <span className="status-badge" style={{ background: '#3b82f6', color: '#fff' }}>
                      {lead.landing_page_title || lead.landing_page_id}
                    </span>
                  </td>
                  <td style={{ fontWeight: 'bold', color: '#e11d48' }}>
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(lead.total_amount || 0)}
                  </td>
                  <td>
                    {lead.utm_source ? (
                      <span className="status-badge" style={{ background: '#374151', color: '#9ca3af' }}>
                        <Tag className="w-3 h-3 inline mr-1" />
                        {lead.utm_source} {lead.utm_campaign ? `/ ${lead.utm_campaign}` : ''}
                      </span>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td>
                    <span className={`status-badge ${lead.order_status === 'processing' ? 'published' : lead.order_status === 'cancelled' ? 'text-danger' : 'draft'}`}>
                      {lead.order_status === 'pending' ? 'Chờ Telesale Duyệt' : lead.order_status || 'pending'}
                    </span>
                  </td>
                  <td className="text-right">
                    {lead.order_id && lead.order_status === 'pending' ? (
                      <div className="flex gap-2 justify-end">
                        <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.85rem', background: '#10b981' }} onClick={() => handleApprove(lead.order_id)}>
                          <CheckCircle className="w-4 h-4 mr-1 inline" /> Duyệt đơn
                        </button>
                        <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem', color: '#ef4444', borderColor: '#ef4444' }} onClick={() => handleCancel(lead.order_id)}>
                          <XCircle className="w-4 h-4 mr-1 inline" /> Hủy
                        </button>
                      </div>
                    ) : (
                      <span className="text-muted" style={{ fontSize: '0.85rem' }}>Đã xử lý</span>
                    )}
                  </td>
                </tr>
              ))}
              {!data?.data?.length && (
                <tr><td colSpan={7} className="text-center text-muted py-8">Chưa có Lead nào từ Landing Page.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};
