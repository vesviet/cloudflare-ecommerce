import React, { useState } from 'react';
import useSWR from 'swr';
import { GlassCard } from '../components/ui/GlassCard';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { Plus, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';
import type { CouponData } from '../types';
import { apiFetch } from '../lib/apiFetch';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useEscapeKey } from '../lib/useEscapeKey';

interface PromotionsTabProps {
  API_BASE_URL: string;
  addToast: (message: string, type: 'success' | 'error') => void;
}

export const PromotionsTab: React.FC<PromotionsTabProps> = ({ API_BASE_URL, addToast }) => {
  const { data: result, error, isLoading, mutate } = useSWR<{ success: boolean, data: CouponData[] }>('/coupons');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEscapeKey(() => { if (isModalOpen && !isSaving) setIsModalOpen(false); }, isModalOpen);
  const [editingCoupon, setEditingCoupon] = useState<CouponData | null>(null);

  const [formData, setFormData] = useState<Partial<CouponData>>({
    code: '', type: 'percent', value: 0, min_order_amount: 0,
    max_uses: null, is_active: 1, description: '', starts_at: null, expires_at: null
  });

  const coupons = result?.data || [];

  const handleOpenNew = () => {
    setEditingCoupon(null);
    setFormData({
      code: '', type: 'percent', value: 0, min_order_amount: 0,
      max_uses: null, is_active: 1, description: '', starts_at: null, expires_at: null
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: CouponData) => {
    setEditingCoupon(c);
    setFormData(c);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setConfirmDeleteId(id);
  };

  const performDelete = async (id: string) => {
    setConfirmDeleteId(null);
    try {
      const res = await apiFetch(`/coupons/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        addToast('Coupon deleted', 'success');
        mutate();
      } else {
        addToast(data.error || 'Failed to delete', 'error');
      }
    } catch (e) {
      addToast('Error deleting coupon', 'error');
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const res = await apiFetch(`/coupons/${id}/toggle`, { method: 'PATCH' });
      const data = await res.json();
      if (data.success) {
        mutate();
      } else {
        addToast(data.error || 'Failed to toggle', 'error');
      }
    } catch (e) {
      addToast('Error toggling coupon', 'error');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingCoupon ? 'PUT' : 'POST';
      const url = editingCoupon ? `/coupons/${editingCoupon.id}` : '/coupons';
      
      const payload = {
        ...formData,
        value: Number(formData.value),
        min_order_amount: Number(formData.min_order_amount),
        max_uses: formData.max_uses ? Number(formData.max_uses) : null,
        starts_at: formData.starts_at ? Number(formData.starts_at) : null,
        expires_at: formData.expires_at ? Number(formData.expires_at) : null,
      };

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include' // relying on JWT/cf access headers externally or if using standard fetch
      });
      const data = await res.json();
      if (data.success) {
        addToast(`Coupon ${editingCoupon ? 'updated' : 'created'}`, 'success');
        setIsModalOpen(false);
        mutate();
      } else {
        addToast(data.error || 'Save failed', 'error');
      }
    } catch (e) {
      addToast('Save error', 'error');
    }
  };

  const renderContent = () => {
    if (isLoading) return <div className="p-6"><SkeletonLoader height="400px" /></div>;
    if (error) return <div className="p-6 text-red-400">Failed to load coupons</div>;

    return (
      <GlassCard className="p-0 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-black/20">
              <th className="p-4 font-medium text-white/60">Code</th>
              <th className="p-4 font-medium text-white/60">Type</th>
              <th className="p-4 font-medium text-white/60">Value</th>
              <th className="p-4 font-medium text-white/60">Uses</th>
              <th className="p-4 font-medium text-white/60">Status</th>
              <th className="p-4 font-medium text-white/60 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="p-4 font-bold text-green-400">{c.code}</td>
                <td className="p-4 capitalize">{c.type}</td>
                <td className="p-4">{c.type === 'percent' ? `${c.value}%` : c.type === 'freeship' ? 'Free Shipping' : `$${(c.value / 100).toFixed(2)}`}</td>
                <td className="p-4">{c.uses} / {c.max_uses || '∞'}</td>
                <td className="p-4">
                  <button onClick={() => handleToggle(c.id)} className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity">
                    {c.is_active ? <CheckCircle size={16} className="text-green-400" /> : <XCircle size={16} className="text-red-400" />}
                    {c.is_active ? 'Active' : 'Disabled'}
                  </button>
                </td>
                <td className="p-4 flex justify-end gap-3">
                  <button aria-label="Edit coupon" onClick={() => handleOpenEdit(c)} className="text-white/60 hover:text-white transition-colors">
                    <Edit2 size={18} />
                  </button>
                  <button aria-label="Delete coupon" onClick={() => handleDelete(c.id)} className="text-red-400/60 hover:text-red-400 transition-colors">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {coupons.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-white/50">No coupons found.</td></tr>
            )}
          </tbody>
        </table>
      </GlassCard>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Promotions & Coupons</h2>
        <button className="btn btn-primary flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 text-white font-medium hover:bg-green-600 transition-colors" onClick={handleOpenNew}>
          <Plus size={18} /> New Coupon
        </button>
      </div>

      {renderContent()}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <GlassCard className="w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto relative" role="dialog" aria-modal="true" aria-label="Coupon form">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-white/50 hover:text-white">
              <XCircle size={24} />
            </button>
            <h3 className="text-xl font-bold mb-6">{editingCoupon ? 'Edit Coupon' : 'New Coupon'}</h3>
            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label className="block text-sm text-white/60 mb-1.5">Coupon Code (e.g., SUMMER2024)</label>
                <input required className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-green-400" 
                  value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/60 mb-1.5">Discount Type</label>
                  <select className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-green-400" 
                    value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                    <option value="percent">Percentage (%)</option>
                    <option value="fixed">Fixed Amount</option>
                    <option value="freeship">Free Shipping</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-1.5">Value ({formData.type === 'percent' ? '%' : 'cents'})</label>
                  <input type="number" required={formData.type !== 'freeship'} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-green-400 disabled:opacity-50" 
                    value={formData.value} disabled={formData.type === 'freeship'} onChange={e => setFormData({...formData, value: Number(e.target.value)})} />
                </div>
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1.5">Internal Description</label>
                <input className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-green-400" 
                  value={formData.description || ''} placeholder="e.g., Summer Sale Campaign" onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/60 mb-1.5">Min Order Amount (cents)</label>
                  <input type="number" className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-green-400" 
                    value={formData.min_order_amount} onChange={e => setFormData({...formData, min_order_amount: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-1.5">Max Global Uses</label>
                  <input type="number" placeholder="Unlimited" className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-green-400" 
                    value={formData.max_uses || ''} onChange={e => setFormData({...formData, max_uses: e.target.value ? Number(e.target.value) : null})} />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-white/10">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors font-medium">Cancel</button>
                <button type="submit" className="px-5 py-2.5 rounded-lg bg-green-500 text-white font-medium hover:bg-green-600 transition-colors">Save Coupon</button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Delete coupon?"
        message="Delete this coupon?"
        confirmLabel="Delete"
        danger
        onConfirm={() => confirmDeleteId && performDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
};
