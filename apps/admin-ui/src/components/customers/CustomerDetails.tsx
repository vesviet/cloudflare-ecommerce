import React, { useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { ArrowLeft } from 'lucide-react';

interface CustomerDetailsProps {
  viewingCustomer: any;
  onBack: () => void;
  onUpdateCustomer: (updatedCustomer: any) => Promise<void>;
  onOpenResetPassword: (customer: { id: string; email: string }) => void;
}

export const CustomerDetails: React.FC<CustomerDetailsProps> = ({ 
  viewingCustomer, 
  onBack, 
  onUpdateCustomer, 
  onOpenResetPassword 
}) => {
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);

  const formatCurrency = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    await onUpdateCustomer(editingCustomer);
    setEditingCustomer(null);
  };

  return (
    <div className="space-y-6">
      <button 
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm"
        onClick={onBack}
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to List</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-1 h-fit p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">Profile Details</h3>
            {!editingCustomer && (
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase" style={{ 
                ...(() => {
                  switch (viewingCustomer.customer.status) {
                    case 'suspended': return { background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' };
                    case 'verification_pending': return { background: 'rgba(250,204,21,0.15)', color: '#facc15', border: '1px solid rgba(250,204,21,0.3)' };
                    case 'invited': return { background: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)' };
                    case 'active':
                    default: return { background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' };
                  }
                })()
              }}>
                {viewingCustomer.customer.status || 'active'}
              </span>
            )}
          </div>

          {editingCustomer ? (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-text-muted mb-1">First Name</label>
                  <input type="text" className="w-full" value={editingCustomer.first_name || ''} onChange={e => setEditingCustomer({...editingCustomer, first_name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-1">Last Name</label>
                  <input type="text" className="w-full" value={editingCustomer.last_name || ''} onChange={e => setEditingCustomer({...editingCustomer, last_name: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="block text-sm text-text-muted mb-1">Phone</label>
                <input type="text" className="w-full" value={editingCustomer.phone || ''} onChange={e => setEditingCustomer({...editingCustomer, phone: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-text-muted mb-1">Date of Birth</label>
                  <input type="date" className="w-full" value={editingCustomer.dob || ''} onChange={e => setEditingCustomer({...editingCustomer, dob: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-1">Gender</label>
                  <select className="w-full" value={editingCustomer.gender || 'unspecified'} onChange={e => setEditingCustomer({...editingCustomer, gender: e.target.value})}>
                    <option value="unspecified">Unspecified</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-text-muted mb-1">Account Status</label>
                <select className="w-full" value={editingCustomer.status || 'active'} onChange={e => setEditingCustomer({...editingCustomer, status: e.target.value})}>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="verification_pending">Verification Pending</option>
                  <option value="invited">Invited</option>
                </select>
              </div>

              {/* B2B fields */}
              <div className="flex items-center gap-2 mt-4">
                <input 
                  type="checkbox" 
                  id="editIsB2B" 
                  className="w-4 h-4 rounded border-white/20 bg-white/5"
                  checked={!!editingCustomer.company_name} 
                  onChange={e => setEditingCustomer({
                    ...editingCustomer, 
                    company_name: e.target.checked ? (editingCustomer.company_name || 'Business Name') : null,
                    vat_tax_id: e.target.checked ? editingCustomer.vat_tax_id : null
                  })} 
                />
                <label htmlFor="editIsB2B" className="text-sm cursor-pointer">Enable B2B Profile</label>
              </div>

              {!!editingCustomer.company_name && (
                <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-white/5 border border-white/10 mt-2">
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Company Name *</label>
                    <input type="text" className="w-full text-sm" value={editingCustomer.company_name === 'Business Name' ? '' : editingCustomer.company_name} onChange={e => setEditingCustomer({...editingCustomer, company_name: e.target.value})} required />
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1">VAT / Tax ID</label>
                    <input type="text" className="w-full text-sm" value={editingCustomer.vat_tax_id || ''} onChange={e => setEditingCustomer({...editingCustomer, vat_tax_id: e.target.value})} />
                  </div>
                </div>
              )}

              {/* GDPR marketing */}
              <div className="flex items-center gap-2 mt-4">
                <input 
                  type="checkbox" 
                  id="editAcceptsMarketing" 
                  className="w-4 h-4 rounded border-white/20 bg-white/5"
                  checked={editingCustomer.accepts_marketing === 1} 
                  onChange={e => setEditingCustomer({...editingCustomer, accepts_marketing: e.target.checked ? 1 : 0})} 
                />
                <label htmlFor="editAcceptsMarketing" className="text-sm cursor-pointer">Subscribe to newsletter (GDPR)</label>
              </div>

              {/* Tags */}
              <div className="mt-4">
                <label className="block text-sm text-text-muted mb-1">Customer Tags (Comma separated)</label>
                <input 
                  type="text" 
                  className="w-full" 
                  value={(() => {
                    try {
                      const tags = JSON.parse(editingCustomer.tags_json || '[]');
                      return Array.isArray(tags) ? tags.join(', ') : '';
                    } catch (e) {
                      return '';
                    }
                  })()} 
                  onChange={e => setEditingCustomer({
                    ...editingCustomer, 
                    tags_json: JSON.stringify(e.target.value.split(',').map(t => t.trim()).filter(Boolean))
                  })} 
                  placeholder="e.g. VIP, B2B, Affiliate"
                />
              </div>

              {/* Internal Note */}
              <div className="mt-4">
                <label className="block text-sm text-text-muted mb-1">Internal Account Notes</label>
                <textarea 
                  className="w-full min-h-[80px] resize-y" 
                  value={editingCustomer.note || ''} 
                  onChange={e => setEditingCustomer({...editingCustomer, note: e.target.value})}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 px-4 py-2 rounded-lg bg-primary-accent hover:bg-primary-accent/80 text-white font-medium transition-colors">Save Changes</button>
                <button type="button" className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors" onClick={() => setEditingCustomer(null)}>Cancel</button>
              </div>
            </form>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-1 border-b border-white/5"><span className="text-text-muted">Email:</span> <span>{viewingCustomer.customer.email}</span></div>
              <div className="flex justify-between py-1 border-b border-white/5"><span className="text-text-muted">Name:</span> <span>{viewingCustomer.customer.first_name || '-'} {viewingCustomer.customer.last_name || '-'}</span></div>
              <div className="flex justify-between py-1 border-b border-white/5"><span className="text-text-muted">Phone:</span> <span>{viewingCustomer.customer.phone || '-'}</span></div>
              <div className="flex justify-between py-1 border-b border-white/5"><span className="text-text-muted">DOB:</span> <span>{viewingCustomer.customer.dob || '-'}</span></div>
              <div className="flex justify-between py-1 border-b border-white/5"><span className="text-text-muted">Gender:</span> <span className="capitalize">{viewingCustomer.customer.gender || 'unspecified'}</span></div>
              
              {viewingCustomer.customer.company_name && (
                <div className="p-3 rounded-lg bg-white/5 border border-white/10 mt-4">
                  <strong className="text-primary-accent block mb-2 text-xs uppercase tracking-wider">B2B Profile</strong>
                  <div className="space-y-1">
                    <div className="flex justify-between"><span className="text-text-muted">Company:</span> <span>{viewingCustomer.customer.company_name}</span></div>
                    <div className="flex justify-between"><span className="text-text-muted">VAT ID:</span> <span>{viewingCustomer.customer.vat_tax_id || '-'}</span></div>
                  </div>
                </div>
              )}

              <div className="flex justify-between py-1 border-b border-white/5 mt-4"><span className="text-text-muted">Marketing:</span> <span>{viewingCustomer.customer.accepts_marketing === 1 ? '✅ Subscribed' : '❌ Unsubscribed'}</span></div>
              
              {/* CRM Tags display */}
              <div className="pt-2">
                <strong className="block text-text-muted mb-2">Tags:</strong>
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    try {
                      const tags = JSON.parse(viewingCustomer.customer.tags_json || '[]');
                      return tags.length === 0 ? <span className="text-text-muted text-xs italic">No tags</span> : tags.map((t: string, i: number) => (
                        <span key={i} className="px-2.5 py-1 rounded-md text-xs bg-white/10 border border-white/20">{t}</span>
                      ));
                    } catch (e) {
                      return <span className="text-text-muted text-xs italic">No tags</span>;
                    }
                  })()}
                </div>
              </div>

              {viewingCustomer.customer.note && (
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 mt-4">
                  <strong className="text-yellow-500 text-xs uppercase tracking-wider block mb-1">Internal Notes</strong>
                  <p className="text-text-muted whitespace-pre-wrap text-xs">{viewingCustomer.customer.note}</p>
                </div>
              )}

              <div className="flex justify-between py-1 pt-4"><span className="text-text-muted">Joined:</span> <span>{new Date(viewingCustomer.customer.created_at).toLocaleDateString()}</span></div>
              
              <div className="flex flex-col gap-2 pt-4">
                <button className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors" onClick={() => setEditingCustomer(viewingCustomer.customer)}>Edit Profile</button>
                <button
                  className="w-full px-4 py-2 rounded-lg bg-danger-accent/10 border border-danger-accent/30 text-danger-accent hover:bg-danger-accent/20 transition-colors"
                  onClick={() => onOpenResetPassword({ id: viewingCustomer.customer.id, email: viewingCustomer.customer.email })}
                >
                  🔑 Reset Password
                </button>
              </div>
            </div>
          )}
        </GlassCard>
        
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="p-6">
            <h3 className="text-xl font-bold mb-6">Recent Orders</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase text-text-muted border-b border-white/10">
                  <tr>
                    <th className="px-4 py-3 font-medium">Order ID</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Total</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {viewingCustomer.orders.map((o: any) => (
                    <tr key={o.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 font-mono text-primary-accent">{o.id.slice(0,8)}...</td>
                      <td className="px-4 py-3 text-text-muted">{new Date(o.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 font-medium">{formatCurrency(o.total_amount)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize bg-white/10 border border-white/20">
                          {o.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {viewingCustomer.orders.length === 0 && (
                    <tr><td colSpan={4} className="text-center text-text-muted py-8">No orders recorded.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="text-xl font-bold mb-6">Saved Address Book</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {viewingCustomer.addresses.map((addr: any) => (
                <div key={addr.id} className="p-4 rounded-lg bg-white/5 border border-white/10 relative">
                  <div className="flex justify-between items-start mb-2">
                    <strong className="text-primary-accent">{addr.alias || 'Address'}</strong>
                    {addr.is_default_shipping === 1 && <span className="text-[10px] uppercase font-bold text-success-accent bg-success-accent/10 px-2 py-0.5 rounded">Default</span>}
                  </div>
                  <div className="text-sm text-text-muted leading-relaxed">
                    {addr.first_name} {addr.last_name}<br/>
                    {addr.address_1} {addr.address_2 ? `, ${addr.address_2}` : ''}<br/>
                    {addr.city}, {addr.postcode}<br/>
                    {addr.phone}
                  </div>
                </div>
              ))}
              {viewingCustomer.addresses.length === 0 && (
                <div className="col-span-full text-center text-text-muted py-6">No addresses registered.</div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};
