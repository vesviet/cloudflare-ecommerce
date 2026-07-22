import React, { useState } from 'react';

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'https://api-shop.tanhdev.com'}/api`;

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', borderRadius: '8px',
  background: 'rgba(0,0,0,0.45)', color: 'white',
  border: '1px solid rgba(255,255,255,0.12)', outline: 'none',
  fontSize: '0.95rem', boxSizing: 'border-box'
};

const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: '7px',
  color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500
};

export const EMPTY_ADDRESS = {
  alias: 'Home',
  first_name: '', last_name: '', company: '', address_1: '', address_2: '',
  city: '', state: '', postcode: '', country: 'VN', phone: '', vat_id: '',
  delivery_instructions: '',
};

interface AddressFormModalProps {
  initialData?: typeof EMPTY_ADDRESS & { id?: string };
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddressFormModal({ initialData, onClose, onSuccess }: AddressFormModalProps) {
  const [form, setForm] = useState<typeof EMPTY_ADDRESS & { id?: string }>(initialData || EMPTY_ADDRESS);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = form.id
        ? `${API_BASE}/customer/addresses/${form.id}`
        : `${API_BASE}/customer/addresses`;
      const method = form.id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method, credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        onSuccess();
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="glass glass-card" style={{ padding: '36px', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ marginBottom: '24px' }}>{form.id ? 'Edit Address' : 'Add New Address'}</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          <div>
            <label style={labelStyle}>Address Label (Alias)</label>
            <input style={inputStyle} value={form.alias} onChange={e => setForm({ ...form, alias: e.target.value })} placeholder="e.g. Home, Office" required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={labelStyle}>First Name *</label>
              <input style={inputStyle} value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} required />
            </div>
            <div>
              <label style={labelStyle}>Last Name *</label>
              <input style={inputStyle} value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Company Name</label>
              <input style={inputStyle} value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="Optional" />
            </div>
            <div>
              <label style={labelStyle}>VAT / Tax ID</label>
              <input style={inputStyle} value={form.vat_id} onChange={e => setForm({ ...form, vat_id: e.target.value })} placeholder="Optional" />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Street Address *</label>
            <input style={inputStyle} value={form.address_1} onChange={e => setForm({ ...form, address_1: e.target.value })} placeholder="Street, House No." required />
          </div>
          <div>
            <label style={labelStyle}>Address Line 2</label>
            <input style={inputStyle} value={form.address_2} onChange={e => setForm({ ...form, address_2: e.target.value })} placeholder="Apartment, Floor, Unit (Optional)" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
            <div>
              <label style={labelStyle}>City *</label>
              <input style={inputStyle} value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} required />
            </div>
            <div>
              <label style={labelStyle}>State / Province</label>
              <input style={inputStyle} value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Postcode *</label>
              <input style={inputStyle} value={form.postcode} onChange={e => setForm({ ...form, postcode: e.target.value })} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Country *</label>
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.country} onChange={e => setForm({ ...form, country: e.target.value })}>
                <option value="VN">Vietnam</option>
                <option value="US">United States</option>
                <option value="SG">Singapore</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <input style={inputStyle} type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Delivery Instructions</label>
            <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '70px' }} value={form.delivery_instructions} onChange={e => setForm({ ...form, delivery_instructions: e.target.value })} />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>Cancel</button>
            <button className="btn" type="submit" disabled={loading} style={{ flex: 2 }}>{loading ? 'Saving...' : (form.id ? 'Save Changes' : 'Add Address')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
