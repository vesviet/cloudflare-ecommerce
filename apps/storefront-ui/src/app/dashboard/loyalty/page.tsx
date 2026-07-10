"use client";

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../../store/authStore';

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'}/api`;

export default function LoyaltyPage() {
  const { isAuthenticated } = useAuthStore();
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchLoyaltyData = async () => {
      try {
        const res = await fetch(`${API_BASE}/customer/loyalty`, { credentials: 'include' });
        const data = await res.json();
        if (data.success) {
          setBalance(data.data.balance);
          setHistory(data.data.history);
        } else {
          setError(data.error || 'Failed to load loyalty data.');
        }
      } catch (err: any) {
        setError(err.message || 'Network error.');
      } finally {
        setLoading(false);
      }
    };

    fetchLoyaltyData();
  }, [isAuthenticated]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount / 100);

  if (loading) {
    return <p style={{ color: 'var(--text-muted)' }}>Loading loyalty data...</p>;
  }

  if (error) {
    return (
      <div style={{ padding: '12px', background: 'rgba(255, 88, 88, 0.1)', color: '#ff5858', borderRadius: '8px', border: '1px solid rgba(255, 88, 88, 0.2)' }}>
        {error}
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ marginBottom: '8px' }}>Loyalty Program</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
        Earn points with every purchase and redeem them for discounts. 1 point = 1¢ ($0.01) discount.
      </p>

      {/* Balance Card */}
      <div style={{ 
        background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.15) 0%, rgba(56, 189, 248, 0.05) 100%)', 
        border: '1px solid rgba(56, 189, 248, 0.3)', 
        borderRadius: '12px', 
        padding: '24px', 
        marginBottom: '32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center'
      }}>
        <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Balance</span>
        <div style={{ fontSize: '3.5rem', fontWeight: 800, color: '#38bdf8', lineHeight: 1.2, marginTop: '8px' }}>
          {balance.toLocaleString()} <span style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-main)' }}>pts</span>
        </div>
        <p style={{ marginTop: '8px', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Value: {formatCurrency(balance)}
        </p>
      </div>

      <h3 style={{ marginBottom: '16px', fontSize: '1.1rem' }}>Points History</h3>
      {history.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>You don't have any points history yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {history.map((entry) => {
            const isEarned = entry.points > 0;
            return (
              <div key={entry.id} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '16px', 
                background: 'rgba(255,255,255,0.03)', 
                border: '1px solid rgba(255,255,255,0.08)', 
                borderRadius: '8px' 
              }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                    {entry.description || (isEarned ? 'Points Earned' : 'Points Redeemed')}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>
                    {new Date(entry.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div style={{ 
                  fontWeight: 700, 
                  fontSize: '1.1rem', 
                  color: isEarned ? '#4ade80' : '#f87171',
                  background: isEarned ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
                  padding: '6px 12px',
                  borderRadius: '20px'
                }}>
                  {isEarned ? '+' : ''}{entry.points}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
