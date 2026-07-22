"use client";

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useWishlistStore } from '../../store/wishlistStore';
import { useRouter } from 'next/navigation';

export default function MyAccount() {
  const { isAuthenticated, setAuth, customer } = useAuthStore();
  const router = useRouter();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  
  // Extra fields for Registration
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('unspecified');
  const [isB2B, setIsB2B] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [vatTaxId, setVatTaxId] = useState('');
  const [acceptsMarketing, setAcceptsMarketing] = useState(false);

  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin 
        ? { email, password } 
        : { 
            email, 
            password, 
            firstName, 
            lastName,
            phone: phone || undefined,
            dob: dob || undefined,
            gender: gender || 'unspecified',
            companyName: isB2B ? companyName : undefined,
            vatTaxId: isB2B ? vatTaxId : undefined,
            acceptsMarketing
          };

      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://api-shop.tanhdev.com';
      const res = await fetch(`${apiBase}/api${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });

      const data = await res.json();

      if (data.success) {
        setAuth(data.customer);
        useWishlistStore.getState().syncWithServer();
        router.push('/dashboard');
      } else {
        setStatus('error');
        setErrorMessage(data.error || 'Authentication failed');
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'Network error');
    }
  };

  if (isAuthenticated) return null; // Let the effect redirect

  return (
    <div className="glass glass-card" style={{ maxWidth: '600px', margin: '60px auto', padding: '40px' }}>
      <h1 style={{ color: 'var(--text-main)', textAlign: 'center', marginBottom: '10px' }}>
        {isLogin ? 'Welcome Back' : 'Create Account'}
      </h1>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '30px' }}>
        {isLogin ? 'Log in to access your premium account.' : 'Join Aura to manage orders and addresses.'}
      </p>
      
      {status === 'error' && (
        <div style={{ padding: '12px', background: 'rgba(255, 88, 88, 0.1)', color: '#ff5858', borderRadius: '8px', marginBottom: '20px', border: '1px solid rgba(255, 88, 88, 0.2)', textAlign: 'center' }}>
          {errorMessage}
        </div>
      )}
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {!isLogin && (
          <div style={{ display: 'flex', gap: '15px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>First Name</label>
              <input 
                type="text" 
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '6px', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--glass-border)', outline: 'none' }} 
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Last Name</label>
              <input 
                type="text" 
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '6px', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--glass-border)', outline: 'none' }} 
              />
            </div>
          </div>
        )}
        
        <div>
          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Email Address *</label>
          <input 
            type="email" 
            required 
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: '6px', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--glass-border)', outline: 'none' }} 
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Password *</label>
          <input 
            type="password" 
            required 
            minLength={8}
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: '6px', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--glass-border)', outline: 'none' }} 
          />
        </div>

        {!isLogin && (
          <>
            <div style={{ display: 'flex', gap: '15px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Phone Number</label>
                <input 
                  type="text" 
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '6px', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--glass-border)', outline: 'none' }} 
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Date of Birth</label>
                <input 
                  type="date" 
                  value={dob}
                  onChange={e => setDob(e.target.value)}
                  style={{ width: '100%', padding: '11px', borderRadius: '6px', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--glass-border)', outline: 'none' }} 
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Gender</label>
              <select 
                value={gender}
                onChange={e => setGender(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '6px', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--glass-border)', outline: 'none' }}
              >
                <option value="unspecified">Select Gender (Optional)</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* B2B toggle switch */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <input 
                type="checkbox" 
                id="isB2B" 
                checked={isB2B} 
                onChange={e => setIsB2B(e.target.checked)} 
                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
              />
              <label htmlFor="isB2B" style={{ color: 'var(--text-main)', fontSize: '0.95rem', cursor: 'pointer', fontWeight: 500 }}>
                Register as a B2B Business Account
              </label>
            </div>

            {isB2B && (
              <div style={{ display: 'flex', gap: '15px', background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Company Name *</label>
                  <input 
                    type="text" 
                    required={isB2B}
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--glass-border)', outline: 'none' }} 
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>VAT / Tax ID</label>
                  <input 
                    type="text" 
                    value={vatTaxId}
                    onChange={e => setVatTaxId(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--glass-border)', outline: 'none' }} 
                  />
                </div>
              </div>
            )}

            {/* GDPR Newsletter Consent */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginTop: '5px' }}>
              <input 
                type="checkbox" 
                id="acceptsMarketing" 
                checked={acceptsMarketing} 
                onChange={e => setAcceptsMarketing(e.target.checked)} 
                style={{ cursor: 'pointer', marginTop: '4px' }}
              />
              <label htmlFor="acceptsMarketing" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer', lineHeight: 1.4 }}>
                I agree to receive personalized newsletters and product updates from Aura E-Commerce. (GDPR consent)
              </label>
            </div>
          </>
        )}

        <button 
          className="btn" 
          type="submit" 
          disabled={status === 'loading'}
          style={{ width: '100%', padding: '14px', marginTop: '10px' }}
        >
          {status === 'loading' ? 'Processing...' : (isLogin ? 'Log In' : 'Create Account')}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: '24px' }}>
        <button 
          type="button" 
          onClick={() => { setIsLogin(!isLogin); setErrorMessage(''); }}
          style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', fontSize: '0.9rem', textDecoration: 'underline' }}
        >
          {isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in"}
        </button>
      </div>
    </div>
  );
}
