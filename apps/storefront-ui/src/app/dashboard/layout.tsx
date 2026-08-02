"use client";

import React, { useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useRouter, usePathname } from 'next/navigation';
import { LogOut, Package, MapPin, User as UserIcon, Star } from 'lucide-react';
import Link from 'next/link';

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'https://api-shop.tanhdev.com'}/api`;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, customer, setAuth, clearAuth } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [verified, setVerified] = React.useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/customer/me`, { credentials: 'include' });
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data.success && data.data) {
          setAuth(data.data);
          setVerified(true);
        } else {
          clearAuth();
          router.push('/my-account');
        }
      } catch {
        if (!cancelled) {
          clearAuth();
          router.push('/my-account');
        }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    try { await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' }); } catch (e) {}
    clearAuth();
    router.push('/my-account');
  };

  if (!verified) return <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-muted)' }}>Verifying session...</div>;
  if (!isAuthenticated || !customer) return null;

  return (
    <div style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 20px' }}>
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
            {([
              ['/dashboard/orders', Package, 'Order History'], 
              ['/dashboard/addresses', MapPin, 'Address Book'], 
              ['/dashboard/loyalty', Star, 'Loyalty Program'],
              ['/dashboard/profile', UserIcon, 'Profile Settings']
            ] as const).map(([href, Icon, label]) => {
              const isActive = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 16px', background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent', border: isActive ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent', color: isActive ? '#fff' : 'var(--text-muted)', textAlign: 'left', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.95rem', textDecoration: 'none' }}
                >
                  <Icon size={18} color={isActive ? 'var(--accent-color)' : 'inherit'} />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Content Area */}
        <div className="glass glass-card" style={{ padding: '32px', minHeight: '480px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
