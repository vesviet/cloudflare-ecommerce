"use client";

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../../store/authStore';
import ChangePasswordForm from '../../../components/dashboard/ChangePasswordForm';

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'}/api`;

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

export default function ProfilePage() {
  const { isAuthenticated, customer, setAuth } = useAuthStore();
  const [profile, setProfile] = useState({
    first_name: '', last_name: '', phone: '', dob: '',
    gender: 'unspecified', company_name: '', vat_tax_id: '', accepts_marketing: 0,
  });
  const [isB2B, setIsB2B] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch(`${API_BASE}/customer/me`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          const d = data.data;
          setProfile({
            first_name: d.first_name || '', last_name: d.last_name || '',
            phone: d.phone || '', dob: d.dob || '', gender: d.gender || 'unspecified',
            company_name: d.company_name || '', vat_tax_id: d.vat_tax_id || '',
            accepts_marketing: d.accepts_marketing ?? 0,
          });
          setIsB2B(!!d.company_name);
        }
      })
      .catch(console.error);
  }, [isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setMsg(null);
    const payload = { ...profile, company_name: isB2B ? profile.company_name : '', vat_tax_id: isB2B ? profile.vat_tax_id : '' };

    try {
      const res = await fetch(`${API_BASE}/customer/me`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success && customer) {
        setMsg({ type: 'ok', text: 'Profile updated successfully!' });
        setAuth({ ...customer, ...payload });
      } else {
        setMsg({ type: 'err', text: data.error || 'Failed to save profile.' });
      }
    } catch {
      setMsg({ type: 'err', text: 'Network error. Please try again.' });
    }
    setLoading(false);
  };

  if (!customer) return null;

  return (
    <div>
      <h2 style={{ marginBottom: '6px' }}>Profile Settings</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '28px', fontSize: '0.9rem' }}>Manage your personal information and preferences.</p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Email Address</label>
          <input type="email" value={customer.email} disabled style={{ ...inputStyle, background: 'rgba(0,0,0,0.25)', color: 'var(--text-muted)', cursor: 'not-allowed' }} />
        </div>

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

        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Gender</label>
          <select style={{ ...inputStyle, cursor: 'pointer' }} value={profile.gender} onChange={e => setProfile({ ...profile, gender: e.target.value })}>
            <option value="unspecified">Prefer not to say</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', marginBottom: '15px', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <input type="checkbox" id="profile-isB2B" checked={isB2B} onChange={e => setIsB2B(e.target.checked)} style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
          <label htmlFor="profile-isB2B" style={{ color: 'var(--text-main)', fontSize: '0.95rem', cursor: 'pointer', fontWeight: 500 }}>Register as a B2B Business Account</label>
        </div>

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

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', marginBottom: '28px' }}>
          <input id="marketing-consent" type="checkbox" checked={profile.accepts_marketing === 1} onChange={e => setProfile({ ...profile, accepts_marketing: e.target.checked ? 1 : 0 })} style={{ marginTop: '3px', cursor: 'pointer', width: '16px', height: '16px', flexShrink: 0 }} />
          <label htmlFor="marketing-consent" style={{ cursor: 'pointer', lineHeight: 1.5 }}>
            <strong style={{ fontSize: '0.9rem' }}>Marketing & Newsletter Consent</strong><br/>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.83rem' }}>I agree to receive personalized promotions, product updates, and newsletters from Aura. You can withdraw consent at any time. (GDPR)</span>
          </label>
        </div>

        {msg && (
          <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', background: msg.type === 'ok' ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)', border: `1px solid ${msg.type === 'ok' ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`, color: msg.type === 'ok' ? '#4ade80' : '#f87171', fontSize: '0.9rem' }}>
            {msg.type === 'ok' ? '✓' : '✕'} {msg.text}
          </div>
        )}

        <button className="btn" type="submit" disabled={loading} style={{ padding: '13px 32px', fontSize: '1rem' }}>
          {loading ? 'Saving...' : 'Save Profile'}
        </button>
      </form>

      <ChangePasswordForm />
    </div>
  );
}
