"use client";

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useRouter } from 'next/navigation';
import { LogOut, Package, MapPin, User as UserIcon } from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
  const { isAuthenticated, customer, clearAuth } = useAuthStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'addresses'>('orders');
  
  const [orders, setOrders] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/my-account');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'orders') {
        const res = await fetch('http://localhost:8788/customer/orders', { credentials: 'include' });
        const data = await res.json();
        if (data.success) setOrders(data.data);
      } else if (activeTab === 'addresses') {
        const res = await fetch('http://localhost:8788/customer/addresses', { credentials: 'include' });
        const data = await res.json();
        if (data.success) setAddresses(data.data);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:8788/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {}
    clearAuth();
    router.push('/my-account');
  };

  if (!isAuthenticated || !customer) return null;

  return (
    <main style={{ maxWidth: '1200px', margin: '40px auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <h1>Welcome, {customer.first_name || customer.email.split('@')[0]}</h1>
        <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 88, 88, 0.1)', color: '#ff5858', border: '1px solid rgba(255, 88, 88, 0.3)', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer' }}>
          <LogOut size={18} /> Log Out
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '40px' }}>
        
        {/* Sidebar Nav */}
        <div className="glass glass-card" style={{ padding: '20px', height: 'fit-content' }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button 
              onClick={() => setActiveTab('orders')} 
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: activeTab === 'orders' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: '#fff', textAlign: 'left', borderRadius: '8px', cursor: 'pointer' }}
            >
              <Package size={20} color={activeTab === 'orders' ? 'var(--accent-color)' : 'var(--text-muted)'} /> Order History
            </button>
            <button 
              onClick={() => setActiveTab('addresses')} 
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: activeTab === 'addresses' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: '#fff', textAlign: 'left', borderRadius: '8px', cursor: 'pointer' }}
            >
              <MapPin size={20} color={activeTab === 'addresses' ? 'var(--accent-color)' : 'var(--text-muted)'} /> Address Book
            </button>
            <button 
              onClick={() => setActiveTab('profile')} 
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: activeTab === 'profile' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: '#fff', textAlign: 'left', borderRadius: '8px', cursor: 'pointer' }}
            >
              <UserIcon size={20} color={activeTab === 'profile' ? 'var(--accent-color)' : 'var(--text-muted)'} /> Profile Settings
            </button>
          </nav>
        </div>

        {/* Content Area */}
        <div className="glass glass-card" style={{ padding: '30px' }}>
          {loading ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>Loading...</div>
          ) : (
            <>
              {/* Orders Tab */}
              {activeTab === 'orders' && (
                <div>
                  <h2 style={{ marginBottom: '24px' }}>Order History</h2>
                  {orders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', border: '1px dashed var(--glass-border)', borderRadius: '12px' }}>
                      <Package size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
                      <h3 style={{ marginBottom: '8px' }}>No orders yet</h3>
                      <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>When you buy something, it will appear here.</p>
                      <Link href="/"><button className="btn">Start Shopping</button></Link>
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}>
                          <th style={{ padding: '12px 0' }}>Order ID</th>
                          <th style={{ padding: '12px 0' }}>Date</th>
                          <th style={{ padding: '12px 0' }}>Status</th>
                          <th style={{ padding: '12px 0', textAlign: 'right' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map(order => (
                          <tr key={order.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '16px 0', fontFamily: 'monospace' }}>{order.id.slice(0, 8)}...</td>
                            <td style={{ padding: '16px 0', color: 'var(--text-muted)' }}>{new Date(order.created_at).toLocaleDateString()}</td>
                            <td style={{ padding: '16px 0' }}><span style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', fontSize: '0.85rem', textTransform: 'capitalize' }}>{order.status.replace('_', ' ')}</span></td>
                            <td style={{ padding: '16px 0', textAlign: 'right', fontWeight: 600 }}>${(order.total_amount / 100).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Addresses Tab */}
              {activeTab === 'addresses' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2>Address Book</h2>
                    <button className="btn" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>+ Add New</button>
                  </div>
                  
                  {addresses.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', border: '1px dashed var(--glass-border)', borderRadius: '12px' }}>
                      <MapPin size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
                      <h3 style={{ marginBottom: '8px' }}>No addresses found</h3>
                      <p style={{ color: 'var(--text-muted)' }}>Add an address to make checkout faster.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      {addresses.map(addr => (
                        <div key={addr.id} style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '8px', position: 'relative' }}>
                          {addr.is_default_shipping === 1 && (
                            <span style={{ position: 'absolute', top: '12px', right: '12px', background: 'var(--accent-color)', color: '#fff', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>DEFAULT</span>
                          )}
                          <h3 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>{addr.alias}</h3>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.5 }}>
                            {addr.first_name} {addr.last_name}<br/>
                            {addr.address_1} {addr.address_2 ? `, ${addr.address_2}` : ''}<br/>
                            {addr.city}, {addr.state} {addr.postcode}<br/>
                            {addr.phone}
                          </div>
                          <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
                            <button style={{ background: 'none', border: 'none', color: '#fff', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.9rem', padding: 0 }}>Edit</button>
                            <button style={{ background: 'none', border: 'none', color: '#ff5858', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.9rem', padding: 0 }}>Delete</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div>
                  <h2 style={{ marginBottom: '24px' }}>Profile Settings</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '400px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Email</label>
                      <input type="email" value={customer.email} disabled style={{ width: '100%', padding: '12px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', color: 'var(--text-muted)', border: '1px solid transparent' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>First Name</label>
                      <input type="text" defaultValue={customer.first_name} style={{ width: '100%', padding: '12px', borderRadius: '6px', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--glass-border)', outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Last Name</label>
                      <input type="text" defaultValue={customer.last_name} style={{ width: '100%', padding: '12px', borderRadius: '6px', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--glass-border)', outline: 'none' }} />
                    </div>
                    <button className="btn" style={{ marginTop: '10px' }}>Save Changes</button>
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
