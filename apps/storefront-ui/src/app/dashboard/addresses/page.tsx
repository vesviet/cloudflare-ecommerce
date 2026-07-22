"use client";

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { MapPin, Plus, Star, Pencil, Trash2 } from 'lucide-react';
import AddressFormModal, { EMPTY_ADDRESS } from '../../../components/dashboard/AddressFormModal';

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'https://api-shop.tanhdev.com'}/api`;

export default function AddressesPage() {
  const { isAuthenticated } = useAuthStore();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchAddresses = () => {
    if (!isAuthenticated) return;
    setLoading(true);
    fetch(`${API_BASE}/customer/addresses`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.success) setAddresses(data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAddresses();
  }, [isAuthenticated]);

  const handleSetDefault = async (id: string) => {
    try {
      await fetch(`${API_BASE}/customer/addresses/${id}/set-default`, { method: 'PATCH', credentials: 'include' });
      fetchAddresses();
    } catch (err) { console.error(err); }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      await fetch(`${API_BASE}/customer/addresses/${id}`, { method: 'DELETE', credentials: 'include' });
      setDeleteConfirmId(null);
      fetchAddresses();
    } catch (err) { console.error(err); }
  };

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--text-muted)' }}>Loading...</div>;

  return (
    <div>
      {showAddressModal && (
        <AddressFormModal 
          initialData={editingAddress || EMPTY_ADDRESS} 
          onClose={() => setShowAddressModal(false)} 
          onSuccess={() => {
            setShowAddressModal(false);
            fetchAddresses();
          }} 
        />
      )}

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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <h2>Address Book</h2>
        <button className="btn" onClick={() => { setEditingAddress(null); setShowAddressModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontSize: '0.9rem' }}>
          <Plus size={16} /> Add New
        </button>
      </div>

      {addresses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px' }}>
          <MapPin size={48} style={{ opacity: 0.15, display: 'block', margin: '0 auto 16px' }} />
          <h3 style={{ marginBottom: '8px' }}>No addresses saved</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Add an address to speed up checkout.</p>
          <button className="btn" onClick={() => { setEditingAddress(null); setShowAddressModal(true); }}>Add First Address</button>
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
                  <button onClick={() => handleSetDefault(addr.id)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.82rem' }}>
                    <Star size={12} /> Set Default
                  </button>
                )}
                <button onClick={() => { setEditingAddress(addr); setShowAddressModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', cursor: 'pointer', fontSize: '0.82rem' }}>
                  <Pencil size={12} /> Edit
                </button>
                <button onClick={() => setDeleteConfirmId(addr.id)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: '6px', color: '#f87171', cursor: 'pointer', fontSize: '0.82rem' }}>
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
