import React, { useState } from 'react';
import { GlassCard } from '../ui/GlassCard';

interface AddCustomerModalProps {
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}

export const AddCustomerModal: React.FC<AddCustomerModalProps> = ({ onClose, onSubmit }) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCustomer(true);
    try {
      await onSubmit({
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
      });
    } finally {
      setIsSubmittingCustomer(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <GlassCard className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 scrollbar-hide">
        <h2 className="text-2xl font-bold mb-6">Add New Customer</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <button type="button" className="px-6 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors" onClick={onClose}>Cancel</button>
            <button type="submit" className="px-6 py-2 rounded-lg bg-primary-accent hover:bg-primary-accent/80 text-white font-medium transition-colors disabled:opacity-50" disabled={isSubmittingCustomer}>
              {isSubmittingCustomer ? 'Saving...' : 'Add Customer'}
            </button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
};
