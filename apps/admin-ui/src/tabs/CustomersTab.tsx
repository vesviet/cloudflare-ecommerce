import React, { useState } from 'react';
import useSWR from 'swr';
import type { CustomerData } from '../types';
import { GlassCard } from '../components/ui/GlassCard';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { Users, Plus, ArrowLeft } from 'lucide-react';

interface CustomersTabProps {
  API_BASE_URL: string;
  addToast: (message: string, type: 'success' | 'error') => void;
}

export const CustomersTab: React.FC<CustomersTabProps> = ({ API_BASE_URL, addToast }) => {
  const { data: result, error, isLoading, mutate } = useSWR<{ success: boolean, data: CustomerData[] }>('/customers');
  const [viewingCustomer, setViewingCustomer] = useState<any | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);

  // Add Customer Form States
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [newCustomerFirstName, setNewCustomerFirstName] = useState('');
  const [newCustomerLastName, setNewCustomerLastName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerPassword, setNewCustomerPassword] = useState('');
  const [newCustomerDob, setNewCustomerDob] = useState('');
  const [newCustomerGender, setNewCustomerGender] = useState('unspecified');
  const [newCustomerStatus, setNewCustomerStatus] = useState('active');
  const [newCustomerIsB2B, setNewCustomerIsB2B] = useState(false);
  const [newCustomerCompanyName, setNewCustomerCompanyName] = useState('');
  const [newCustomerVatTaxId, setNewCustomerVatTaxId] = useState('');
  const [newCustomerAcceptsMarketing, setNewCustomerAcceptsMarketing] = useState(false);
  const [newCustomerTags, setNewCustomerTags] = useState('');
  const [newCustomerNote, setNewCustomerNote] = useState('');
  const [isSubmittingCustomer, setIsSubmittingCustomer] = useState(false);

  // Reset Password States
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<{ id: string; email: string } | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const customers = result?.data || [];

  const fetchCustomerDetails = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/customers/${id}`);
      const data = await res.json();
      if (data.success) {
        setViewingCustomer(data.data);
      }
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleOpenAddCustomerModal = () => {
    setNewCustomerEmail('');
    setNewCustomerFirstName('');
    setNewCustomerLastName('');
    setNewCustomerPhone('');
    setNewCustomerPassword('');
    setNewCustomerDob('');
    setNewCustomerGender('unspecified');
    setNewCustomerStatus('active');
    setNewCustomerIsB2B(false);
    setNewCustomerCompanyName('');
    setNewCustomerVatTaxId('');
    setNewCustomerAcceptsMarketing(false);
    setNewCustomerTags('');
    setNewCustomerNote('');
    setShowAddCustomerModal(true);
  };

  const handleAddCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerEmail) {
      addToast('Email is required', 'error');
      return;
    }
    if (!newCustomerEmail.includes('@')) {
      addToast('Invalid email format', 'error');
      return;
    }
    if (newCustomerPassword && newCustomerPassword.length < 8) {
      addToast('Password must be at least 8 characters', 'error');
      return;
    }

    setIsSubmittingCustomer(true);
    try {
      const res = await fetch(`${API_BASE_URL}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newCustomerEmail,
          password: newCustomerPassword || undefined,
          first_name: newCustomerFirstName || undefined,
          last_name: newCustomerLastName || undefined,
          phone: newCustomerPhone || undefined,
          status: newCustomerStatus,
          dob: newCustomerDob || undefined,
          gender: newCustomerGender || 'unspecified',
          company_name: newCustomerIsB2B ? newCustomerCompanyName : undefined,
          vat_tax_id: newCustomerIsB2B ? newCustomerVatTaxId : undefined,
          accepts_marketing: newCustomerAcceptsMarketing ? 1 : 0,
          tags_json: newCustomerTags ? JSON.stringify(newCustomerTags.split(',').map(t => t.trim()).filter(Boolean)) : '[]',
          note: newCustomerNote || undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        addToast('Customer created successfully', 'success');
        setShowAddCustomerModal(false);
        mutate();
      } else {
        addToast(data.error || 'Failed to create customer', 'error');
      }
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setIsSubmittingCustomer(false);
    }
  };

  const handleOpenResetPassword = (customer: { id: string; email: string }) => {
    setResetPasswordTarget(customer);
    setResetPasswordValue('');
    setShowResetPasswordModal(true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordTarget) return;
    if (!resetPasswordValue) {
      addToast('New password is required', 'error');
      return;
    }
    if (resetPasswordValue.length < 8) {
      addToast('Password must be at least 8 characters', 'error');
      return;
    }
    setIsResettingPassword(true);
    try {
      const res = await fetch(`${API_BASE_URL}/customers/${resetPasswordTarget.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password: resetPasswordValue }),
      });
      const data = await res.json();
      if (data.success) {
        addToast(`Password reset for ${resetPasswordTarget.email}`, 'success');
        setShowResetPasswordModal(false);
        setResetPasswordValue('');
        setResetPasswordTarget(null);
      } else {
        addToast(data.error || 'Failed to reset password', 'error');
      }
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    try {
      const res = await fetch(`${API_BASE_URL}/customers/${editingCustomer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingCustomer)
      });
      const data = await res.json();
      if (data.success) {
        addToast('Customer updated successfully', 'success');
        setEditingCustomer(null);
        mutate();
        if (viewingCustomer && viewingCustomer.customer.id === editingCustomer.id) {
          fetchCustomerDetails(editingCustomer.id);
        }
      } else {
        addToast(data.error, 'error');
      }
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  if (error) {
    addToast(error.message || 'Failed to fetch customers', 'error');
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-text-main m-0">Customers</h1>
        {!viewingCustomer && (
          <button 
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-accent hover:bg-primary-accent/80 text-white font-medium transition-colors shadow-[0_0_15px_var(--primary-glow)]"
            onClick={handleOpenAddCustomerModal}
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
        )}
      </div>
      
      {viewingCustomer ? (
        <div className="space-y-6">
          <button 
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm"
            onClick={() => setViewingCustomer(null)}
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
                <form onSubmit={handleUpdateCustomer} className="space-y-4">
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
                      id={`reset-pwd-${viewingCustomer.customer.id}`}
                      onClick={() => handleOpenResetPassword({ id: viewingCustomer.customer.id, email: viewingCustomer.customer.email })}
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
                          <td className="px-4 py-3 font-medium">{formatCurrency(o.total_amount / 100)}</td>
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
      ) : isLoading ? (
        <GlassCard className="p-6">
          <div className="space-y-4">
            <SkeletonLoader height="64px" />
            <SkeletonLoader height="64px" />
            <SkeletonLoader height="64px" />
          </div>
        </GlassCard>
      ) : customers.length === 0 ? (
        <GlassCard className="p-12 text-center flex flex-col items-center">
          <Users className="w-12 h-12 text-text-muted mb-4 opacity-50" />
          <p className="text-lg font-medium text-text-main mb-2">No customers found</p>
          <p className="text-sm text-text-muted">Customers will appear here once they register or place an order.</p>
        </GlassCard>
      ) : (
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
                    <td className="px-6 py-4 text-right font-medium">{formatCurrency(c.total_spent / 100)}</td>
                    <td className="px-6 py-4 text-text-muted">{new Date(c.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 transition-colors" 
                        onClick={() => fetchCustomerDetails(c.id)}
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
      )}

      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowAddCustomerModal(false); }}>
          <GlassCard className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 scrollbar-hide">
            <h2 className="text-2xl font-bold mb-6">Add New Customer</h2>
            <form onSubmit={handleAddCustomerSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-text-muted mb-1">Email Address *</label>
                  <input type="email" className="w-full" value={newCustomerEmail} onChange={e => setNewCustomerEmail(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-1">Password (min 8 chars)</label>
                  <input type="password" className="w-full" value={newCustomerPassword} onChange={e => setNewCustomerPassword(e.target.value)} placeholder="Leave blank to auto-generate" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-text-muted mb-1">First Name</label>
                  <input type="text" className="w-full" value={newCustomerFirstName} onChange={e => setNewCustomerFirstName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-1">Last Name</label>
                  <input type="text" className="w-full" value={newCustomerLastName} onChange={e => setNewCustomerLastName(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-text-muted mb-1">Phone Number</label>
                  <input type="text" className="w-full" value={newCustomerPhone} onChange={e => setNewCustomerPhone(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-1">Account Status</label>
                  <select className="w-full" value={newCustomerStatus} onChange={e => setNewCustomerStatus(e.target.value)}>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="verification_pending">Verification Pending</option>
                    <option value="invited">Invited</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-text-muted mb-1">Date of Birth</label>
                  <input type="date" className="w-full" value={newCustomerDob} onChange={e => setNewCustomerDob(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-1">Gender</label>
                  <select className="w-full" value={newCustomerGender} onChange={e => setNewCustomerGender(e.target.value)}>
                    <option value="unspecified">Select Gender (Optional)</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* B2B Toggle */}
              <div className="flex items-center gap-2 mt-2">
                <input 
                  type="checkbox" 
                  id="newIsB2B" 
                  className="w-4 h-4 rounded border-white/20 bg-white/5"
                  checked={newCustomerIsB2B} 
                  onChange={e => setNewCustomerIsB2B(e.target.checked)} 
                />
                <label htmlFor="newIsB2B" className="text-sm font-medium cursor-pointer">
                  Register as B2B Account
                </label>
              </div>

              {newCustomerIsB2B && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-white/5 border border-white/10 rounded-lg">
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Company Name *</label>
                    <input type="text" className="w-full text-sm" value={newCustomerCompanyName} onChange={e => setNewCustomerCompanyName(e.target.value)} required={newCustomerIsB2B} />
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1">VAT / Tax ID</label>
                    <input type="text" className="w-full text-sm" value={newCustomerVatTaxId} onChange={e => setNewCustomerVatTaxId(e.target.value)} />
                  </div>
                </div>
              )}

              {/* GDPR marketing */}
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="newAcceptsMarketing" 
                  className="w-4 h-4 rounded border-white/20 bg-white/5"
                  checked={newCustomerAcceptsMarketing} 
                  onChange={e => setNewCustomerAcceptsMarketing(e.target.checked)} 
                />
                <label htmlFor="newAcceptsMarketing" className="text-sm text-text-muted cursor-pointer">Subscribe to newsletter campaigns (GDPR consent)</label>
              </div>

              {/* CRM Tags */}
              <div>
                <label className="block text-sm text-text-muted mb-1">Customer Tags (Comma separated)</label>
                <input type="text" className="w-full" value={newCustomerTags} onChange={e => setNewCustomerTags(e.target.value)} placeholder="e.g. VIP, B2B, Affiliate" />
              </div>

              {/* Internal Note */}
              <div>
                <label className="block text-sm text-text-muted mb-1">Internal Account Notes</label>
                <textarea className="w-full min-h-[80px] resize-y" value={newCustomerNote} onChange={e => setNewCustomerNote(e.target.value)} />
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
                <button type="button" className="px-6 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors" onClick={() => setShowAddCustomerModal(false)}>Cancel</button>
                <button type="submit" className="px-6 py-2 rounded-lg bg-primary-accent hover:bg-primary-accent/80 text-white font-medium transition-colors disabled:opacity-50" disabled={isSubmittingCustomer}>
                  {isSubmittingCustomer ? 'Saving...' : 'Add Customer'}
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && resetPasswordTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowResetPasswordModal(false); }}>
          <GlassCard className="w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-2">🔑 Reset Password</h2>
            <p className="text-sm text-text-muted mb-6">
              Resetting password for <strong className="text-text-main">{resetPasswordTarget.email}</strong>
            </p>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm text-text-muted mb-1">New Password <span className="text-danger-accent">*</span></label>
                <input
                  type="password"
                  className="w-full"
                  placeholder="Min. 8 characters"
                  value={resetPasswordValue}
                  onChange={(e) => setResetPasswordValue(e.target.value)}
                  minLength={8}
                  required
                  autoFocus
                />
                {resetPasswordValue.length > 0 && resetPasswordValue.length < 8 && (
                  <span className="text-xs text-danger-accent mt-1 block">
                    Password must be at least 8 characters
                  </span>
                )}
              </div>
              <div className="flex gap-3 mt-8">
                <button
                  type="button"
                  className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                  onClick={() => { setShowResetPasswordModal(false); setResetPasswordTarget(null); }}
                  disabled={isResettingPassword}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 rounded-lg bg-danger-accent hover:bg-danger-accent/80 text-white font-medium transition-colors disabled:opacity-50 shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                  disabled={isResettingPassword || resetPasswordValue.length < 8}
                >
                  {isResettingPassword ? 'Resetting…' : 'Confirm Reset'}
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
};

