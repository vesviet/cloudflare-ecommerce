import React from 'react';
import Link from 'next/link';
import { MapPin } from 'lucide-react';

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', borderRadius: '8px',
  background: 'rgba(0,0,0,0.45)', color: 'white',
  border: '1px solid rgba(255,255,255,0.12)', outline: 'none',
  fontSize: '0.95rem', boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: '7px',
  color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500,
};

export interface GuestAddress {
  first_name: string; last_name: string; company: string;
  address_1: string; address_2: string; city: string;
  state: string; postcode: string; country: string; phone: string;
}

interface AddressSelectorProps {
  isAuthenticated: boolean;
  savedAddresses: any[];
  selectedAddressId: string | null;
  guestAddress: GuestAddress;
  onChangeSelectedAddressId: (id: string) => void;
  onChangeGuestAddress: (address: GuestAddress) => void;
}

export const AddressSelector: React.FC<AddressSelectorProps> = ({
  isAuthenticated,
  savedAddresses,
  selectedAddressId,
  guestAddress,
  onChangeSelectedAddressId,
  onChangeGuestAddress
}) => {
  return (
    <>
      <h2 style={{ marginBottom: '20px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ width: '28px', height: '28px', background: 'var(--accent-color)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>2</span>
        <MapPin size={18} /> Shipping Address
      </h2>

      {isAuthenticated && savedAddresses.length > 0 ? (
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {savedAddresses.map(addr => (
              <label
                key={addr.id}
                style={{ display: 'flex', gap: '14px', padding: '16px', background: selectedAddressId === addr.id ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.02)', border: `1px solid ${selectedAddressId === addr.id ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                <input
                  type="radio" name="address"
                  value={addr.id}
                  checked={selectedAddressId === addr.id}
                  onChange={() => onChangeSelectedAddressId(addr.id)}
                  style={{ marginTop: '2px', cursor: 'pointer', accentColor: 'var(--accent-color)' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '0.95rem' }}>{addr.alias}</strong>
                    {addr.is_default_shipping === 1 && (
                      <span style={{ background: 'var(--accent-color)', color: '#fff', fontSize: '0.65rem', padding: '2px 7px', borderRadius: '20px', fontWeight: 700 }}>DEFAULT</span>
                    )}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.6 }}>
                    {addr.first_name} {addr.last_name}{addr.company ? ` · ${addr.company}` : ''}<br />
                    {addr.address_1}{addr.address_2 ? `, ${addr.address_2}` : ''}<br />
                    {addr.city}{addr.state ? `, ${addr.state}` : ''} {addr.postcode}, {addr.country}
                  </div>
                </div>
              </label>
            ))}
          </div>
          <Link href="/dashboard" style={{ display: 'inline-block', marginTop: '12px', color: 'var(--accent-color)', fontSize: '0.85rem', textDecoration: 'underline' }}>
            + Manage addresses
          </Link>
        </div>
      ) : isAuthenticated && savedAddresses.length === 0 ? (
        <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '10px', marginBottom: '28px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '12px', fontSize: '0.9rem' }}>No saved addresses yet.</p>
          <Link href="/dashboard/addresses"><button type="button" className="btn" style={{ padding: '8px 20px', fontSize: '0.85rem' }}>Add Address</button></Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '28px' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '4px' }}>
            <Link href="/my-account" style={{ color: 'var(--accent-color)', textDecoration: 'underline' }}>Sign in</Link> to use saved addresses, or fill in below as guest.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div><label style={labelStyle}>First Name *</label><input style={inputStyle} required value={guestAddress.first_name} onChange={e => onChangeGuestAddress({ ...guestAddress, first_name: e.target.value })} /></div>
            <div><label style={labelStyle}>Last Name *</label><input style={inputStyle} required value={guestAddress.last_name} onChange={e => onChangeGuestAddress({ ...guestAddress, last_name: e.target.value })} /></div>
          </div>
          <div><label style={labelStyle}>Street Address *</label><input style={inputStyle} required value={guestAddress.address_1} onChange={e => onChangeGuestAddress({ ...guestAddress, address_1: e.target.value })} placeholder="Street, House No." /></div>
          <div><label style={labelStyle}>Address Line 2</label><input style={inputStyle} value={guestAddress.address_2} onChange={e => onChangeGuestAddress({ ...guestAddress, address_2: e.target.value })} placeholder="Apartment, Floor (Optional)" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div><label style={labelStyle}>City *</label><input style={inputStyle} required value={guestAddress.city} onChange={e => onChangeGuestAddress({ ...guestAddress, city: e.target.value })} /></div>
            <div><label style={labelStyle}>State</label><input style={inputStyle} value={guestAddress.state} onChange={e => onChangeGuestAddress({ ...guestAddress, state: e.target.value })} /></div>
            <div><label style={labelStyle}>Postcode *</label><input style={inputStyle} required value={guestAddress.postcode} onChange={e => onChangeGuestAddress({ ...guestAddress, postcode: e.target.value })} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Country *</label>
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={guestAddress.country} onChange={e => onChangeGuestAddress({ ...guestAddress, country: e.target.value })}>
                <option value="VN">Vietnam</option>
                <option value="US">United States</option>
                <option value="SG">Singapore</option>
                <option value="JP">Japan</option>
                <option value="AU">Australia</option>
                <option value="GB">United Kingdom</option>
                <option value="DE">Germany</option>
              </select>
            </div>
            <div><label style={labelStyle}>Phone</label><input type="tel" style={inputStyle} value={guestAddress.phone} onChange={e => onChangeGuestAddress({ ...guestAddress, phone: e.target.value })} /></div>
          </div>
        </div>
      )}
    </>
  );
};
