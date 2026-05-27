import React, { useState, useEffect } from 'react';
import type { CustomerData } from '../types';

interface CustomersTabProps {
  API_BASE_URL: string;
  addToast: (message: string, type: 'success' | 'error') => void;
}

export const CustomersTab: React.FC<CustomersTabProps> = ({ API_BASE_URL, addToast }) => {
  const [customers, setCustomers] = useState<CustomerData[]>([]);
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

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/customers`);
      const result = await res.json();
      if (result.success) setCustomers(result.data || []);
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const fetchCustomerDetails = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/customers/${id}`);
      const result = await res.json();
      if (result.success) {
        setViewingCustomer(result.data);
      }
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

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
      const result = await res.json();
      if (result.success) {
        addToast('Customer created successfully', 'success');
        setShowAddCustomerModal(false);
        fetchCustomers();
      } else {
        addToast(result.error || 'Failed to create customer', 'error');
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
      const result = await res.json();
      if (result.success) {
        addToast(`Password reset for ${resetPasswordTarget.email}`, 'success');
        setShowResetPasswordModal(false);
        setResetPasswordValue('');
        setResetPasswordTarget(null);
      } else {
        addToast(result.error || 'Failed to reset password', 'error');
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
      const result = await res.json();
      if (result.success) {
        addToast('Customer updated successfully', 'success');
        setEditingCustomer(null);
        fetchCustomers();
        if (viewingCustomer && viewingCustomer.customer.id === editingCustomer.id) {
          fetchCustomerDetails(editingCustomer.id);
        }
      } else {
        addToast(result.error, 'error');
      }
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h1 style={{ margin: 0 }}>Customers</h1>
        </div>
        {!viewingCustomer && (
          <button className="btn-submit" style={{ margin: 0 }} onClick={handleOpenAddCustomerModal}>+ Add Customer</button>
        )}
      </div>
      
      {viewingCustomer ? (
        <div>
          <button className="btn-secondary" style={{ marginBottom: '20px' }} onClick={() => setViewingCustomer(null)}>← Back to List</button>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '30px' }}>
            <div className="form-card" style={{ height: 'fit-content' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0 }}>Profile Details</h3>
                {!editingCustomer && (
                  <span style={{ 
                    padding: '4px 10px', 
                    borderRadius: '20px', 
                    fontSize: '0.75rem', 
                    fontWeight: 'bold', 
                    textTransform: 'uppercase',
                    ...(() => {
                      switch (viewingCustomer.customer.status) {
                        case 'suspended': return { background: 'rgba(255, 88, 88, 0.15)', color: '#ff5858', border: '1px solid rgba(255, 88, 88, 0.3)' };
                        case 'verification_pending': return { background: 'rgba(255, 204, 0, 0.15)', color: '#ffcc00', border: '1px solid rgba(255, 204, 0, 0.3)' };
                        case 'invited': return { background: 'rgba(0, 153, 255, 0.15)', color: '#0099ff', border: '1px solid rgba(0, 153, 255, 0.3)' };
                        case 'active':
                        default: return { background: 'rgba(75, 210, 143, 0.15)', color: '#4bd28f', border: '1px solid rgba(75, 210, 143, 0.3)' };
                      }
                    })()
                  }}>
                    {viewingCustomer.customer.status || 'active'}
                  </span>
                )}
              </div>

              {editingCustomer ? (
                <form onSubmit={handleUpdateCustomer} className="form-inputs" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div className="form-group" style={{ flex: 1 }}><label>First Name</label><input type="text" className="input-control" value={editingCustomer.first_name || ''} onChange={e => setEditingCustomer({...editingCustomer, first_name: e.target.value})} /></div>
                    <div className="form-group" style={{ flex: 1 }}><label>Last Name</label><input type="text" className="input-control" value={editingCustomer.last_name || ''} onChange={e => setEditingCustomer({...editingCustomer, last_name: e.target.value})} /></div>
                  </div>

                  <div className="form-group"><label>Phone</label><input type="text" className="input-control" value={editingCustomer.phone || ''} onChange={e => setEditingCustomer({...editingCustomer, phone: e.target.value})} /></div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div className="form-group" style={{ flex: 1 }}><label>Date of Birth</label><input type="date" className="input-control" value={editingCustomer.dob || ''} onChange={e => setEditingCustomer({...editingCustomer, dob: e.target.value})} /></div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Gender</label>
                      <select className="input-control" value={editingCustomer.gender || 'unspecified'} onChange={e => setEditingCustomer({...editingCustomer, gender: e.target.value})}>
                        <option value="unspecified">Unspecified</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Account Status</label>
                    <select className="input-control" value={editingCustomer.status || 'active'} onChange={e => setEditingCustomer({...editingCustomer, status: e.target.value})}>
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                      <option value="verification_pending">Verification Pending</option>
                      <option value="invited">Invited</option>
                    </select>
                  </div>

                  {/* B2B fields */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '5px 0' }}>
                    <input 
                      type="checkbox" 
                      id="editIsB2B" 
                      checked={!!editingCustomer.company_name} 
                      onChange={e => setEditingCustomer({
                        ...editingCustomer, 
                        company_name: e.target.checked ? (editingCustomer.company_name || 'Business Name') : null,
                        vat_tax_id: e.target.checked ? editingCustomer.vat_tax_id : null
                      })} 
                    />
                    <label htmlFor="editIsB2B" style={{ cursor: 'pointer', margin: 0, fontSize: '0.85rem' }}>Enable B2B Profile</label>
                  </div>

                  {!!editingCustomer.company_name && (
                    <div style={{ display: 'flex', gap: '10px', background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '6px' }}>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label style={{ fontSize: '0.75rem' }}>Company Name *</label>
                        <input type="text" className="input-control" style={{ padding: '8px' }} value={editingCustomer.company_name === 'Business Name' ? '' : editingCustomer.company_name} onChange={e => setEditingCustomer({...editingCustomer, company_name: e.target.value})} required />
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label style={{ fontSize: '0.75rem' }}>VAT / Tax ID</label>
                        <input type="text" className="input-control" style={{ padding: '8px' }} value={editingCustomer.vat_tax_id || ''} onChange={e => setEditingCustomer({...editingCustomer, vat_tax_id: e.target.value})} />
                      </div>
                    </div>
                  )}

                  {/* GDPR marketing */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input 
                      type="checkbox" 
                      id="editAcceptsMarketing" 
                      checked={editingCustomer.accepts_marketing === 1} 
                      onChange={e => setEditingCustomer({...editingCustomer, accepts_marketing: e.target.checked ? 1 : 0})} 
                    />
                    <label htmlFor="editAcceptsMarketing" style={{ cursor: 'pointer', margin: 0, fontSize: '0.85rem' }}>Subscribe to newsletter (GDPR)</label>
                  </div>

                  {/* Tags */}
                  <div className="form-group">
                    <label>Customer Tags (Comma separated)</label>
                    <input 
                      type="text" 
                      className="input-control" 
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
                  <div className="form-group">
                    <label>Internal Account Notes</label>
                    <textarea 
                      className="input-control" 
                      style={{ height: '70px', resize: 'vertical' }} 
                      value={editingCustomer.note || ''} 
                      onChange={e => setEditingCustomer({...editingCustomer, note: e.target.value})}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button type="submit" className="btn-primary">Save Changes</button>
                    <button type="button" className="btn-secondary" onClick={() => setEditingCustomer(null)}>Cancel</button>
                  </div>
                </form>
              ) : (
                <div style={{ lineHeight: 1.8, fontSize: '0.95rem' }}>
                  <p><strong>Email:</strong> {viewingCustomer.customer.email}</p>
                  <p><strong>Name:</strong> {viewingCustomer.customer.first_name || '-'} {viewingCustomer.customer.last_name || '-'}</p>
                  <p><strong>Phone:</strong> {viewingCustomer.customer.phone || '-'}</p>
                  <p><strong>DOB:</strong> {viewingCustomer.customer.dob || '-'}</p>
                  <p><strong>Gender:</strong> <span style={{ textTransform: 'capitalize' }}>{viewingCustomer.customer.gender || 'unspecified'}</span></p>
                  
                  {viewingCustomer.customer.company_name && (
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', margin: '12px 0', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <strong style={{ color: 'var(--accent-color)' }}>B2B Company Profile:</strong>
                      <p style={{ margin: '4px 0 0' }}><strong>Company:</strong> {viewingCustomer.customer.company_name}</p>
                      <p style={{ margin: '2px 0 0' }}><strong>VAT / Tax ID:</strong> {viewingCustomer.customer.vat_tax_id || '-'}</p>
                    </div>
                  )}

                  <p><strong>Marketing Consent:</strong> {viewingCustomer.customer.accepts_marketing === 1 ? '✅ Subscribed' : '❌ Unsubscribed'}</p>
                  
                  {/* CRM Tags display */}
                  <div style={{ margin: '12px 0' }}>
                    <strong>Tags:</strong>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                      {(() => {
                        try {
                          const tags = JSON.parse(viewingCustomer.customer.tags_json || '[]');
                          return tags.length === 0 ? <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No tags assigned</span> : tags.map((t: string, i: number) => (
                            <span key={i} style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', border: '1px solid rgba(255,255,255,0.1)' }}>{t}</span>
                          ));
                        } catch (e) {
                          return <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No tags assigned</span>;
                        }
                      })()}
                    </div>
                  </div>

                  {viewingCustomer.customer.note && (
                    <div style={{ background: 'rgba(255,204,0,0.05)', padding: '12px', borderRadius: '8px', margin: '12px 0', border: '1px solid rgba(255,204,0,0.1)' }}>
                      <strong>Internal Notes:</strong>
                      <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>{viewingCustomer.customer.note}</p>
                    </div>
                  )}

                  <p><strong>Joined:</strong> {new Date(viewingCustomer.customer.created_at).toLocaleDateString()}</p>
                  <button className="btn-secondary" style={{ marginTop: '15px', width: '100%' }} onClick={() => setEditingCustomer(viewingCustomer.customer)}>Edit Profile</button>
                  <button
                    className="btn-secondary"
                    id={`reset-pwd-${viewingCustomer.customer.id}`}
                    style={{ marginTop: '8px', width: '100%', borderColor: 'rgba(255,100,100,0.3)', color: '#ff6b6b' }}
                    onClick={() => handleOpenResetPassword({ id: viewingCustomer.customer.id, email: viewingCustomer.customer.email })}
                  >
                    🔑 Reset Password
                  </button>
                </div>
              )}
            </div>
            
            <div className="form-card">
              <h3 style={{ marginBottom: '20px' }}>Recent Orders</h3>
              <table className="glass-table">
                <thead>
                  <tr><th>Order ID</th><th>Date</th><th>Total</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {viewingCustomer.orders.map((o: any) => (
                    <tr key={o.id}>
                      <td style={{ fontFamily: 'monospace' }}>{o.id.slice(0,8)}...</td>
                      <td>{new Date(o.created_at).toLocaleDateString()}</td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(o.total_amount / 100)}</td>
                      <td>
                        <span style={{ 
                          padding: '3px 8px', 
                          borderRadius: '4px', 
                          fontSize: '0.8rem', 
                          textTransform: 'capitalize',
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                          {o.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {viewingCustomer.orders.length === 0 && (
                    <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>No orders recorded.</td></tr>
                  )}
                </tbody>
              </table>

              <h3 style={{ marginTop: '30px', marginBottom: '20px' }}>Saved Address Book</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                {viewingCustomer.addresses.map((addr: any) => (
                  <div key={addr.id} style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '8px', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <strong style={{ color: 'var(--accent-color)' }}>{addr.alias || 'Address'}</strong>
                      {addr.is_default_shipping === 1 && <span style={{ fontSize: '0.7rem', color: '#4bd28f' }}>[Default]</span>}
                    </div>
                    <div style={{ color: 'var(--text-muted)', lineHeight: 1.4 }}>
                      {addr.first_name} {addr.last_name}<br/>
                      {addr.address_1} {addr.address_2 ? `, ${addr.address_2}` : ''}<br/>
                      {addr.city}, {addr.postcode}<br/>
                      {addr.phone}
                    </div>
                  </div>
                ))}
                {viewingCustomer.addresses.length === 0 && (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No addresses registered.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : customers.length === 0 ? (
        <div className="empty-state-card" style={{ padding: '40px', textAlign: 'center', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px' }}>
          <p style={{ color: 'var(--text-main)', fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>No customers found</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>Customers will appear here once they register or place an order.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="glass-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Status</th>
                <th>Total Orders</th>
                <th>Total Spent</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id}>
                  <td>{c.email}</td>
                  <td>{c.first_name || '-'} {c.last_name || '-'}</td>
                  <td>
                    <span style={{ 
                      padding: '3px 8px', 
                      borderRadius: '12px', 
                      fontSize: '0.75rem', 
                      fontWeight: 600, 
                      textTransform: 'uppercase',
                      ...(() => {
                        switch (c.status) {
                          case 'suspended': return { background: 'rgba(255, 88, 88, 0.15)', color: '#ff5858', border: '1px solid rgba(255, 88, 88, 0.3)' };
                          case 'verification_pending': return { background: 'rgba(255, 204, 0, 0.15)', color: '#ffcc00', border: '1px solid rgba(255, 204, 0, 0.3)' };
                          case 'invited': return { background: 'rgba(0, 153, 255, 0.15)', color: '#0099ff', border: '1px solid rgba(0, 153, 255, 0.3)' };
                          case 'active':
                          default: return { background: 'rgba(75, 210, 143, 0.15)', color: '#4bd28f', border: '1px solid rgba(75, 210, 143, 0.3)' };
                        }
                      })()
                    }}>
                      {c.status || 'active'}
                    </span>
                  </td>
                  <td>{c.total_orders}</td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(c.total_spent / 100)}</td>
                  <td>{new Date(c.created_at).toLocaleDateString()}</td>
                  <td>
                    <button className="btn-secondary" onClick={() => fetchCustomerDetails(c.id)}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddCustomerModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-title">Add New Customer</div>
            <form onSubmit={handleAddCustomerSubmit} className="form-inputs" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', gap: '15px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Email Address *</label>
                  <input type="email" className="input-control" value={newCustomerEmail} onChange={e => setNewCustomerEmail(e.target.value)} required />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Password (min 8 chars)</label>
                  <input type="password" className="input-control" value={newCustomerPassword} onChange={e => setNewCustomerPassword(e.target.value)} placeholder="Leave blank to auto-generate" />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>First Name</label>
                  <input type="text" className="input-control" value={newCustomerFirstName} onChange={e => setNewCustomerFirstName(e.target.value)} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Last Name</label>
                  <input type="text" className="input-control" value={newCustomerLastName} onChange={e => setNewCustomerLastName(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Phone Number</label>
                  <input type="text" className="input-control" value={newCustomerPhone} onChange={e => setNewCustomerPhone(e.target.value)} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Account Status</label>
                  <select className="input-control" value={newCustomerStatus} onChange={e => setNewCustomerStatus(e.target.value)}>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="verification_pending">Verification Pending</option>
                    <option value="invited">Invited</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Date of Birth</label>
                  <input type="date" className="input-control" value={newCustomerDob} onChange={e => setNewCustomerDob(e.target.value)} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Gender</label>
                  <select className="input-control" value={newCustomerGender} onChange={e => setNewCustomerGender(e.target.value)}>
                    <option value="unspecified">Select Gender (Optional)</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* B2B Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '5px 0' }}>
                <input 
                  type="checkbox" 
                  id="newIsB2B" 
                  checked={newCustomerIsB2B} 
                  onChange={e => setNewCustomerIsB2B(e.target.checked)} 
                />
                <label htmlFor="newIsB2B" style={{ cursor: 'pointer', margin: 0, fontSize: '0.9rem', fontWeight: 500 }}>
                  Register as B2B Account
                </label>
              </div>

              {newCustomerIsB2B && (
                <div style={{ display: 'flex', gap: '15px', background: 'rgba(0,0,0,0.15)', padding: '12px', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.8rem' }}>Company Name *</label>
                    <input type="text" className="input-control" style={{ padding: '8px' }} value={newCustomerCompanyName} onChange={e => setNewCustomerCompanyName(e.target.value)} required={newCustomerIsB2B} />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.8rem' }}>VAT / Tax ID</label>
                    <input type="text" className="input-control" style={{ padding: '8px' }} value={newCustomerVatTaxId} onChange={e => setNewCustomerVatTaxId(e.target.value)} />
                  </div>
                </div>
              )}

              {/* GDPR marketing */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox" 
                  id="newAcceptsMarketing" 
                  checked={newCustomerAcceptsMarketing} 
                  onChange={e => setNewCustomerAcceptsMarketing(e.target.checked)} 
                />
                <label htmlFor="newAcceptsMarketing" style={{ cursor: 'pointer', margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Subscribe to newsletter campaigns (GDPR consent)</label>
              </div>

              {/* CRM Tags */}
              <div className="form-group">
                <label>Customer Tags (Comma separated)</label>
                <input type="text" className="input-control" value={newCustomerTags} onChange={e => setNewCustomerTags(e.target.value)} placeholder="e.g. VIP, B2B, Affiliate" />
              </div>

              {/* Internal Note */}
              <div className="form-group">
                <label>Internal Account Notes</label>
                <textarea className="input-control" style={{ height: '60px', resize: 'vertical' }} value={newCustomerNote} onChange={e => setNewCustomerNote(e.target.value)} />
              </div>

              <div className="modal-actions" style={{ marginTop: '20px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowAddCustomerModal(false)}>Cancel</button>
                <button type="submit" className="btn-submit" style={{ margin: 0 }} disabled={isSubmittingCustomer}>
                  {isSubmittingCustomer ? 'Saving...' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && resetPasswordTarget && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowResetPasswordModal(false); }}>
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <h2 style={{ marginBottom: '6px' }}>🔑 Reset Password</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '24px' }}>
              Resetting password for <strong style={{ color: 'var(--text-main)' }}>{resetPasswordTarget.email}</strong>
            </p>
            <form onSubmit={handleResetPassword}>
              <div className="form-group">
                <label htmlFor="reset-new-password">New Password <span style={{ color: '#ff6b6b' }}>*</span></label>
                <input
                  id="reset-new-password"
                  type="password"
                  className="form-input"
                  placeholder="Min. 8 characters"
                  value={resetPasswordValue}
                  onChange={(e) => setResetPasswordValue(e.target.value)}
                  minLength={8}
                  required
                  autoFocus
                />
                {resetPasswordValue.length > 0 && resetPasswordValue.length < 8 && (
                  <span style={{ fontSize: '0.78rem', color: '#ff6b6b', marginTop: '4px', display: 'block' }}>
                    Password must be at least 8 characters
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => { setShowResetPasswordModal(false); setResetPasswordTarget(null); }}
                  disabled={isResettingPassword}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  id="confirm-reset-password"
                  style={{ flex: 1, background: 'linear-gradient(135deg, #ff6b6b, #ee5a24)', borderColor: 'rgba(255,107,107,0.3)' }}
                  disabled={isResettingPassword || resetPasswordValue.length < 8}
                >
                  {isResettingPassword ? 'Resetting…' : 'Confirm Reset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
