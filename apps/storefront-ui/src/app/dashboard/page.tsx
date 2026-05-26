"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useRouter } from 'next/navigation';
import { LogOut, Package, MapPin, User as UserIcon, Plus, Pencil, Trash2, Star, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

// --- Types ---
interface ProfileData {
  first_name: string;
  last_name: string;
  phone: string;
  dob: string;
  gender: string;
  company_name: string;
  vat_tax_id: string;
  accepts_marketing: number;
}

interface Address {
  id: string;
  alias: string;
  first_name: string;
  last_name: string;
  company: string;
  address_1: string;
  address_2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  phone: string;
  vat_id: string;
  delivery_instructions: string;
  is_default_shipping: number;
  is_default_billing: number;
}

const EMPTY_ADDRESS: Omit<Address, 'id' | 'is_default_shipping' | 'is_default_billing'> = {
  alias: 'Home',
  first_name: '',
  last_name: '',
  company: '',
  address_1: '',
  address_2: '',
  city: '',
  state: '',
  postcode: '',
  country: 'VN',
  phone: '',
  vat_id: '',
  delivery_instructions: '',
};

const API_BASE = 'http://localhost:8787/api';

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

const statusColor = (status: string) => {
  switch (status) {
    case 'active': return { color: '#4ade80' };
    case 'suspended': return { color: '#f87171' };
    case 'verification_pending': return { color: '#facc15' };
    default: return { color: 'var(--text-muted)' };
  }
};

export default function Dashboard() {
  const { isAuthenticated, customer, setAuth, clearAuth } = useAuthStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'addresses'>('orders');

  // --- Orders state ---
  const [orders, setOrders] = useState<any[]>([]);

  // --- Addresses state ---
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [addressForm, setAddressForm] = useState<typeof EMPTY_ADDRESS>(EMPTY_ADDRESS);
  const [addressLoading, setAddressLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // --- Profile state ---
  const [profile, setProfile] = useState<ProfileData>({
    first_name: '', last_name: '', phone: '', dob: '',
    gender: 'unspecified', company_name: '', vat_tax_id: '', accepts_marketing: 0,
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [isB2B, setIsB2B] = useState(false);

  // --- Change Password state ---
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Show/Hide password states
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // --- Loading ---
  const [loading, setLoading] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!isAuthenticated) router.push('/my-account');
  }, [isAuthenticated, router]);

  // Fetch data on tab change
  const fetchData = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      if (activeTab === 'orders') {
        const res = await fetch(`${API_BASE}/customer/orders`, { credentials: 'include' });
        const data = await res.json();
        if (data.success) setOrders(data.data);
      } else if (activeTab === 'addresses') {
        const res = await fetch(`${API_BASE}/customer/addresses`, { credentials: 'include' });
        const data = await res.json();
        if (data.success) setAddresses(data.data);
      } else if (activeTab === 'profile') {
        const res = await fetch(`${API_BASE}/customer/me`, { credentials: 'include' });
        const data = await res.json();
        if (data.success && data.data) {
          const d = data.data;
          setProfile({
            first_name: d.first_name || '',
            last_name: d.last_name || '',
            phone: d.phone || '',
            dob: d.dob || '',
            gender: d.gender || 'unspecified',
            company_name: d.company_name || '',
            vat_tax_id: d.vat_tax_id || '',
            accepts_marketing: d.accepts_marketing ?? 0,
          });
          setIsB2B(!!d.company_name);
          // Sync basic fields to Zustand
          if (customer) setAuth({ ...customer, ...d });
        }
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [isAuthenticated, activeTab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleLogout = async () => {
    try { await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' }); } catch (e) {}
    clearAuth();
    router.push('/my-account');
  };

  // --- Profile save ---
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMsg(null);
    
    const payload = {
      ...profile,
      company_name: isB2B ? profile.company_name : '',
      vat_tax_id: isB2B ? profile.vat_tax_id : '',
    };

    try {
      const res = await fetch(`${API_BASE}/customer/me`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setProfileMsg({ type: 'ok', text: 'Profile updated successfully!' });
        if (customer) setAuth({ ...customer, ...payload });
      } else {
        setProfileMsg({ type: 'err', text: data.error || 'Failed to save profile.' });
      }
    } catch {
      setProfileMsg({ type: 'err', text: 'Network error. Please try again.' });
    }
    setProfileLoading(false);
  };

  // --- Change Password ---
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'err', text: 'Mật khẩu mới phải từ 8 ký tự trở lên.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'err', text: 'Mật khẩu xác nhận không khớp.' });
      return;
    }
    if (currentPassword === newPassword) {
      setPasswordMsg({ type: 'err', text: 'Mật khẩu mới không được trùng với mật khẩu cũ.' });
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch(`${API_BASE}/customer/me/change-password`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setPasswordMsg({ type: 'ok', text: 'Thay đổi mật khẩu thành công!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordMsg({ type: 'err', text: data.error || 'Thay đổi mật khẩu thất bại.' });
      }
    } catch {
      setPasswordMsg({ type: 'err', text: 'Lỗi mạng. Vui lòng thử lại.' });
    }
    setPasswordLoading(false);
  };

  const getPasswordStrength = (pass: string) => {
    if (!pass) return null;
    if (pass.length < 8) return { label: 'Yếu', color: '#ff5858' };
    const hasLetters = /[a-zA-Z]/.test(pass);
    const hasNumbers = /[0-9]/.test(pass);
    const hasSpecial = /[^a-zA-Z0-9]/.test(pass);
    if (hasLetters && (hasNumbers || hasSpecial)) {
      return { label: 'Mạnh', color: '#4ade80' };
    }
    return { label: 'Trung bình', color: '#facc15' };
  };

  // --- Address helpers ---
  const openAddModal = () => {
    setEditingAddress(null);
    setAddressForm(EMPTY_ADDRESS);
    setShowAddressModal(true);
  };

  const openEditModal = (addr: Address) => {
    setEditingAddress(addr);
    setAddressForm({
      alias: addr.alias, first_name: addr.first_name, last_name: addr.last_name,
      company: addr.company || '', address_1: addr.address_1, address_2: addr.address_2 || '',
      city: addr.city, state: addr.state || '', postcode: addr.postcode,
      country: addr.country, phone: addr.phone || '', vat_id: addr.vat_id || '',
      delivery_instructions: addr.delivery_instructions || '',
    });
    setShowAddressModal(true);
  };

  const handleAddressSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressLoading(true);
    try {
      const url = editingAddress
        ? `${API_BASE}/customer/addresses/${editingAddress.id}`
        : `${API_BASE}/customer/addresses`;
      const method = editingAddress ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method, credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addressForm),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddressModal(false);
        fetchData();
      }
    } catch (err) { console.error(err); }
    setAddressLoading(false);
  };

  const handleSetDefault = async (id: string) => {
    try {
      await fetch(`${API_BASE}/customer/addresses/${id}/set-default`, {
        method: 'PATCH', credentials: 'include',
      });
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      await fetch(`${API_BASE}/customer/addresses/${id}`, {
        method: 'DELETE', credentials: 'include',
      });
      setDeleteConfirmId(null);
      fetchData();
    } catch (err) { console.error(err); }
  };

  if (!isAuthenticated || !customer) return null;

  return (
    <main style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 20px' }}>

      {/* Delete Confirm Dialog */}
      {deleteConfirmId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass glass-card" style={{ padding: '36px', maxWidth: '380px', textAlign: 'center' }}>
            <Trash2 size={40} color="#f87171" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ marginBottom: '10px' }}>Delete Address?</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '28px' }}>This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={() => setDeleteConfirmId(null)} style={{ padding: '10px 24px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => handleDeleteAddress(deleteConfirmId)} style={{ padding: '10px 24px', background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.4)', borderRadius: '8px', color: '#f87171', cursor: 'pointer', fontWeight: 600 }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Address Add/Edit Modal */}
      {showAddressModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass glass-card" style={{ padding: '36px', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '24px' }}>{editingAddress ? 'Edit Address' : 'Add New Address'}</h2>
            <form onSubmit={handleAddressSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Alias */}
              <div>
                <label style={labelStyle}>Address Label (Alias)</label>
                <input style={inputStyle} value={addressForm.alias} onChange={e => setAddressForm({ ...addressForm, alias: e.target.value })} placeholder="e.g. Home, Office, Warehouse" required />
              </div>

              {/* Name row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>First Name *</label>
                  <input style={inputStyle} value={addressForm.first_name} onChange={e => setAddressForm({ ...addressForm, first_name: e.target.value })} required />
                </div>
                <div>
                  <label style={labelStyle}>Last Name *</label>
                  <input style={inputStyle} value={addressForm.last_name} onChange={e => setAddressForm({ ...addressForm, last_name: e.target.value })} required />
                </div>
              </div>

              {/* Company + VAT */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>Company Name</label>
                  <input style={inputStyle} value={addressForm.company} onChange={e => setAddressForm({ ...addressForm, company: e.target.value })} placeholder="Optional" />
                </div>
                <div>
                  <label style={labelStyle}>VAT / Tax ID</label>
                  <input style={inputStyle} value={addressForm.vat_id} onChange={e => setAddressForm({ ...addressForm, vat_id: e.target.value })} placeholder="Optional" />
                </div>
              </div>

              {/* Address lines */}
              <div>
                <label style={labelStyle}>Street Address *</label>
                <input style={inputStyle} value={addressForm.address_1} onChange={e => setAddressForm({ ...addressForm, address_1: e.target.value })} placeholder="Street, House No." required />
              </div>
              <div>
                <label style={labelStyle}>Address Line 2</label>
                <input style={inputStyle} value={addressForm.address_2} onChange={e => setAddressForm({ ...addressForm, address_2: e.target.value })} placeholder="Apartment, Floor, Unit (Optional)" />
              </div>

              {/* City / State / Postcode */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>City *</label>
                  <input style={inputStyle} value={addressForm.city} onChange={e => setAddressForm({ ...addressForm, city: e.target.value })} required />
                </div>
                <div>
                  <label style={labelStyle}>State / Province</label>
                  <input style={inputStyle} value={addressForm.state} onChange={e => setAddressForm({ ...addressForm, state: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>Postcode *</label>
                  <input style={inputStyle} value={addressForm.postcode} onChange={e => setAddressForm({ ...addressForm, postcode: e.target.value })} required />
                </div>
              </div>

              {/* Country + Phone */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>Country *</label>
                  <select style={{ ...inputStyle, cursor: 'pointer' }} value={addressForm.country} onChange={e => setAddressForm({ ...addressForm, country: e.target.value })}>
                    <option value="VN">Vietnam</option>
                    <option value="US">United States</option>
                    <option value="SG">Singapore</option>
                    <option value="JP">Japan</option>
                    <option value="KR">South Korea</option>
                    <option value="TH">Thailand</option>
                    <option value="MY">Malaysia</option>
                    <option value="AU">Australia</option>
                    <option value="GB">United Kingdom</option>
                    <option value="DE">Germany</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Phone</label>
                  <input style={inputStyle} type="tel" value={addressForm.phone} onChange={e => setAddressForm({ ...addressForm, phone: e.target.value })} />
                </div>
              </div>

              {/* Delivery Instructions */}
              <div>
                <label style={labelStyle}>Delivery Instructions</label>
                <textarea
                  style={{ ...inputStyle, resize: 'vertical', minHeight: '70px' }}
                  value={addressForm.delivery_instructions}
                  onChange={e => setAddressForm({ ...addressForm, delivery_instructions: e.target.value })}
                  placeholder="Leave at door, call upon arrival, etc."
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowAddressModal(false)} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>Cancel</button>
                <button className="btn" type="submit" disabled={addressLoading} style={{ flex: 2 }}>
                  {addressLoading ? 'Saving...' : (editingAddress ? 'Save Changes' : 'Add Address')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <h1 style={{ marginBottom: '4px' }}>Welcome, {customer.first_name || customer.email.split('@')[0]}</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>{customer.email}</p>
        </div>
        <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 88, 88, 0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}>
          <LogOut size={18} /> Log Out
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '32px' }}>

        {/* Sidebar */}
        <div className="glass glass-card" style={{ padding: '16px', height: 'fit-content' }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {([['orders', 'orders', Package, 'Order History'], ['addresses', 'addresses', MapPin, 'Address Book'], ['profile', 'profile', UserIcon, 'Profile Settings']] as const).map(([tab, , Icon, label]) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 16px', background: activeTab === tab ? 'rgba(255,255,255,0.08)' : 'transparent', border: activeTab === tab ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent', color: activeTab === tab ? '#fff' : 'var(--text-muted)', textAlign: 'left', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.95rem' }}
              >
                <Icon size={18} color={activeTab === tab ? 'var(--accent-color)' : 'inherit'} />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="glass glass-card" style={{ padding: '32px', minHeight: '480px' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--text-muted)' }}>Loading...</div>
          ) : (
            <>

              {/* ─── Orders Tab ─── */}
              {activeTab === 'orders' && (
                <div>
                  <h2 style={{ marginBottom: '24px' }}>Order History</h2>
                  {orders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                      <Package size={48} style={{ opacity: 0.15, display: 'block', margin: '0 auto 16px' }} />
                      <h3 style={{ marginBottom: '8px' }}>No orders yet</h3>
                      <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>When you buy something, it will appear here.</p>
                      <Link href="/"><button className="btn">Start Shopping</button></Link>
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          <th style={{ padding: '10px 0', textAlign: 'left' }}>Order ID</th>
                          <th style={{ padding: '10px 0', textAlign: 'left' }}>Date</th>
                          <th style={{ padding: '10px 0', textAlign: 'left' }}>Status</th>
                          <th style={{ padding: '10px 0', textAlign: 'right' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map(order => (
                          <tr key={order.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ padding: '16px 0', fontFamily: 'monospace', fontSize: '0.9rem', color: 'var(--accent-color)' }}>#{order.id.slice(0, 8).toUpperCase()}</td>
                            <td style={{ padding: '16px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{new Date(order.created_at).toLocaleDateString('vi-VN')}</td>
                            <td style={{ padding: '16px 0' }}>
                              <span style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.07)', borderRadius: '20px', fontSize: '0.82rem', textTransform: 'capitalize', border: '1px solid rgba(255,255,255,0.1)' }}>
                                {order.status.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td style={{ padding: '16px 0', textAlign: 'right', fontWeight: 600 }}>${(order.total_amount / 100).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* ─── Addresses Tab ─── */}
              {activeTab === 'addresses' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
                    <h2>Address Book</h2>
                    <button className="btn" onClick={openAddModal} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontSize: '0.9rem' }}>
                      <Plus size={16} /> Add New
                    </button>
                  </div>

                  {addresses.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                      <MapPin size={48} style={{ opacity: 0.15, display: 'block', margin: '0 auto 16px' }} />
                      <h3 style={{ marginBottom: '8px' }}>No addresses saved</h3>
                      <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Add an address to speed up checkout.</p>
                      <button className="btn" onClick={openAddModal}>Add First Address</button>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
                      {addresses.map(addr => (
                        <div key={addr.id} style={{ padding: '20px', background: addr.is_default_shipping ? 'rgba(var(--accent-rgb, 99,102,241),0.07)' : 'rgba(255,255,255,0.02)', border: `1px solid ${addr.is_default_shipping ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '10px', position: 'relative' }}>
                          {addr.is_default_shipping === 1 && (
                            <span style={{ position: 'absolute', top: '14px', right: '14px', background: 'var(--accent-color)', color: '#fff', fontSize: '0.68rem', padding: '3px 8px', borderRadius: '20px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>✓ Default</span>
                          )}
                          <h3 style={{ fontSize: '1rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <MapPin size={14} color="var(--accent-color)" />
                            {addr.alias}
                          </h3>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.7 }}>
                            <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{addr.first_name} {addr.last_name}</strong><br/>
                            {addr.company && <>{addr.company}<br/></>}
                            {addr.address_1}{addr.address_2 ? `, ${addr.address_2}` : ''}<br/>
                            {addr.city}{addr.state ? `, ${addr.state}` : ''} {addr.postcode}<br/>
                            {addr.country} {addr.phone && `· ${addr.phone}`}
                          </div>
                          <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {addr.is_default_shipping !== 1 && (
                              <button
                                onClick={() => handleSetDefault(addr.id)}
                                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.82rem' }}
                              >
                                <Star size={12} /> Set Default
                              </button>
                            )}
                            <button
                              onClick={() => openEditModal(addr)}
                              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', cursor: 'pointer', fontSize: '0.82rem' }}
                            >
                              <Pencil size={12} /> Edit
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(addr.id)}
                              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: '6px', color: '#f87171', cursor: 'pointer', fontSize: '0.82rem' }}
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ─── Profile Tab ─── */}
              {activeTab === 'profile' && (
                <div>
                  <h2 style={{ marginBottom: '6px' }}>Profile Settings</h2>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '28px', fontSize: '0.9rem' }}>Manage your personal information and preferences.</p>

                  <form onSubmit={handleProfileSave}>
                    {/* Email — read-only */}
                    <div style={{ marginBottom: '20px' }}>
                      <label style={labelStyle}>Email Address</label>
                      <input type="email" value={customer.email} disabled style={{ ...inputStyle, background: 'rgba(0,0,0,0.25)', color: 'var(--text-muted)', cursor: 'not-allowed' }} />
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '5px' }}>Contact support to change your email address.</p>
                    </div>

                    {/* Name row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                      <div>
                        <label style={labelStyle}>First Name</label>
                        <input style={inputStyle} value={profile.first_name} onChange={e => setProfile({ ...profile, first_name: e.target.value })} />
                      </div>
                      <div>
                        <label style={labelStyle}>Last Name</label>
                        <input style={inputStyle} value={profile.last_name} onChange={e => setProfile({ ...profile, last_name: e.target.value })} />
                      </div>
                    </div>

                    {/* Phone + DOB row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                      <div>
                        <label style={labelStyle}>Phone Number</label>
                        <input type="tel" style={inputStyle} value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} placeholder="+84 xxx xxx xxx" />
                      </div>
                      <div>
                        <label style={labelStyle}>Date of Birth</label>
                        <input type="date" style={inputStyle} value={profile.dob} onChange={e => setProfile({ ...profile, dob: e.target.value })} />
                      </div>
                    </div>

                    {/* Gender */}
                    <div style={{ marginBottom: '20px' }}>
                      <label style={labelStyle}>Gender</label>
                      <select style={{ ...inputStyle, cursor: 'pointer' }} value={profile.gender} onChange={e => setProfile({ ...profile, gender: e.target.value })}>
                        <option value="unspecified">Prefer not to say</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    {/* B2B Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', marginBottom: '15px', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <input 
                        type="checkbox" 
                        id="profile-isB2B" 
                        checked={isB2B} 
                        onChange={e => setIsB2B(e.target.checked)} 
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                      <label htmlFor="profile-isB2B" style={{ color: 'var(--text-main)', fontSize: '0.95rem', cursor: 'pointer', fontWeight: 500 }}>
                        Register as a B2B Business Account
                      </label>
                    </div>

                    {/* B2B Section */}
                    {isB2B && (
                      <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', marginBottom: '20px' }}>
                        <h4 style={{ marginBottom: '14px', fontSize: '0.95rem', color: 'rgba(255,255,255,0.7)' }}>🏢 Business Account (B2B)</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                          <div>
                            <label style={labelStyle}>Company Name *</label>
                            <input style={inputStyle} value={profile.company_name} onChange={e => setProfile({ ...profile, company_name: e.target.value })} placeholder="Company Name" required={isB2B} />
                          </div>
                          <div>
                            <label style={labelStyle}>VAT / Tax ID</label>
                            <input style={inputStyle} value={profile.vat_tax_id} onChange={e => setProfile({ ...profile, vat_tax_id: e.target.value })} placeholder="Optional" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* GDPR Marketing Consent */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', marginBottom: '28px' }}>
                      <input
                        id="marketing-consent"
                        type="checkbox"
                        checked={profile.accepts_marketing === 1}
                        onChange={e => setProfile({ ...profile, accepts_marketing: e.target.checked ? 1 : 0 })}
                        style={{ marginTop: '3px', cursor: 'pointer', width: '16px', height: '16px', flexShrink: 0 }}
                      />
                      <label htmlFor="marketing-consent" style={{ cursor: 'pointer', lineHeight: 1.5 }}>
                        <strong style={{ fontSize: '0.9rem' }}>Marketing & Newsletter Consent</strong><br/>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.83rem' }}>I agree to receive personalized promotions, product updates, and newsletters from Aura. You can withdraw consent at any time. (GDPR)</span>
                      </label>
                    </div>

                    {/* Status message */}
                    {profileMsg && (
                      <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', background: profileMsg.type === 'ok' ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)', border: `1px solid ${profileMsg.type === 'ok' ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`, color: profileMsg.type === 'ok' ? '#4ade80' : '#f87171', fontSize: '0.9rem' }}>
                        {profileMsg.type === 'ok' ? '✓' : '✕'} {profileMsg.text}
                      </div>
                    )}

                    <button className="btn" type="submit" disabled={profileLoading} style={{ padding: '13px 32px', fontSize: '1rem' }}>
                      {profileLoading ? 'Saving...' : 'Save Profile'}
                    </button>
                  </form>

                  {/* ─── Change Password Section ─── */}
                  <div style={{ marginTop: '40px', padding: '30px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '0 0 8px 0', fontSize: '1.25rem', color: 'var(--text-main)' }}>
                      🔑 Security & Password
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '24px' }}>
                      Update your account security credentials.
                    </p>

                    <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {/* Current Password */}
                      <div>
                        <label style={labelStyle}>Current Password *</label>
                        <div style={{ position: 'relative' }}>
                          <input 
                            type={showCurrent ? "text" : "password"} 
                            required 
                            value={currentPassword}
                            onChange={e => setCurrentPassword(e.target.value)}
                            style={{ ...inputStyle, paddingRight: '45px' }} 
                          />
                          <button 
                            type="button" 
                            onClick={() => setShowCurrent(!showCurrent)}
                            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          >
                            {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>

                      {/* New Password */}
                      <div>
                        <label style={labelStyle}>New Password *</label>
                        <div style={{ position: 'relative' }}>
                          <input 
                            type={showNew ? "text" : "password"} 
                            required 
                            minLength={8}
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            style={{ ...inputStyle, paddingRight: '45px' }} 
                          />
                          <button 
                            type="button" 
                            onClick={() => setShowNew(!showNew)}
                            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          >
                            {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                        {newPassword && (() => {
                          const strength = getPasswordStrength(newPassword);
                          return strength ? (
                            <p style={{ margin: '6px 0 0 0', fontSize: '0.8rem', color: strength.color, display: 'flex', alignItems: 'center', gap: '5px' }}>
                              Độ mạnh mật khẩu: <strong>{strength.label}</strong>
                            </p>
                          ) : null;
                        })()}
                      </div>

                      {/* Confirm Password */}
                      <div>
                        <label style={labelStyle}>Confirm New Password *</label>
                        <div style={{ position: 'relative' }}>
                          <input 
                            type={showConfirm ? "text" : "password"} 
                            required 
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            style={{ ...inputStyle, paddingRight: '45px' }} 
                          />
                          <button 
                            type="button" 
                            onClick={() => setShowConfirm(!showConfirm)}
                            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          >
                            {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                        {newPassword && confirmPassword && newPassword !== confirmPassword && (
                          <p style={{ margin: '6px 0 0 0', fontSize: '0.8rem', color: '#ff5858' }}>
                            Mật khẩu xác nhận không khớp.
                          </p>
                        )}
                      </div>

                      {/* Password message */}
                      {passwordMsg && (
                        <div style={{ padding: '12px 16px', borderRadius: '8px', background: passwordMsg.type === 'ok' ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)', border: `1px solid ${passwordMsg.type === 'ok' ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`, color: passwordMsg.type === 'ok' ? '#4ade80' : '#f87171', fontSize: '0.9rem' }}>
                          {passwordMsg.type === 'ok' ? '✓' : '✕'} {passwordMsg.text}
                        </div>
                      )}

                      <button 
                        className="btn" 
                        type="submit" 
                        disabled={passwordLoading || (newPassword !== confirmPassword) || newPassword.length < 8}
                        style={{ width: 'fit-content', padding: '12px 30px' }}
                      >
                        {passwordLoading ? 'Updating...' : 'Change Password'}
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
