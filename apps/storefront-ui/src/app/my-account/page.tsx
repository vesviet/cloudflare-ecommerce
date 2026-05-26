"use client";

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useRouter } from 'next/navigation';

export default function MyAccount() {
  const { isAuthenticated, setAuth, customer } = useAuthStore();
  const router = useRouter();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  
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
        : { email, password, firstName, lastName };

      const res = await fetch(`http://localhost:8788${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (data.success) {
        setAuth(data.customer);
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
    <div className="glass glass-card" style={{ maxWidth: '500px', margin: '60px auto', padding: '40px' }}>
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
          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Email Address</label>
          <input 
            type="email" 
            required 
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: '6px', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--glass-border)', outline: 'none' }} 
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Password</label>
          <input 
            type="password" 
            required 
            minLength={8}
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: '6px', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--glass-border)', outline: 'none' }} 
          />
        </div>

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
  )
}
