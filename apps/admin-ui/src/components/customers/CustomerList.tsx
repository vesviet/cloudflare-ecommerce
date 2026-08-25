import React from 'react';
import type { CustomerData } from '../../types';
import { GlassCard } from '../ui/GlassCard';
import { Users } from 'lucide-react';

interface CustomerListProps {
  customers: CustomerData[];
  onViewCustomer: (id: string) => void;
}

export const CustomerList: React.FC<CustomerListProps> = ({ customers, onViewCustomer }) => {
  const formatCurrency = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

  if (customers.length === 0) {
    return (
      <GlassCard className="p-12 text-center flex flex-col items-center">
        <Users className="w-12 h-12 text-text-muted mb-4 opacity-50" />
        <p className="text-lg font-medium text-text-main mb-2">No customers found</p>
        <p className="text-sm text-text-muted">Customers will appear here once they register or place an order.</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase text-text-muted bg-white/5 border-b border-white/10">
            <tr>
              <th className="px-6 py-4 font-medium tracking-wider">Email</th>
              <th className="px-6 py-4 font-medium tracking-wider">Name</th>
              <th className="px-6 py-4 font-medium tracking-wider">Status</th>
              <th className="px-6 py-4 font-medium tracking-wider">Total Orders</th>
              <th className="px-6 py-4 font-medium tracking-wider text-right">Total Spent</th>
              <th className="px-6 py-4 font-medium tracking-wider">Joined</th>
              <th className="px-6 py-4 font-medium tracking-wider text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {customers.map((c: CustomerData) => (
              <tr key={c.id} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 font-medium">{c.email}</td>
                <td className="px-6 py-4 text-text-muted">{c.first_name || '-'} {c.last_name || '-'}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ 
                    ...(() => {
                      switch (c.status) {
                        case 'suspended': return { background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' };
                        case 'verification_pending': return { background: 'rgba(250,204,21,0.15)', color: '#facc15', border: '1px solid rgba(250,204,21,0.3)' };
                        case 'invited': return { background: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)' };
                        case 'active':
                        default: return { background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' };
                      }
                    })()
                  }}>
                    {c.status || 'active'}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">{c.total_orders}</td>
                <td className="px-6 py-4 text-right font-medium">{formatCurrency(c.total_spent)}</td>
                <td className="px-6 py-4 text-text-muted">{new Date(c.created_at).toLocaleDateString()}</td>
                <td className="px-6 py-4 text-center">
                  <button 
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 transition-colors" 
                    onClick={() => onViewCustomer(c.id)}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
};
