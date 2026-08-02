"use client";

import React, { useEffect, useState } from 'react';
import { useWishlistStore } from '../../store/wishlistStore';
import { useCartStore } from '../../store/cartStore';
import Link from 'next/link';
import { Trash2, ShoppingCart } from 'lucide-react';
import ImageFallback from '../../components/ImageFallback';
import { getImageUrl } from '../../lib/image';

export default function WishlistPage() {
  const { items, removeItem, fetchFromServer } = useWishlistStore();
  const { addItem: addCartItem } = useCartStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div style={{ maxWidth: '1200px', margin: '60px auto', padding: '0 30px' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '30px', color: 'var(--text-main)' }}>My Wishlist</h1>
      
      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px dashed var(--glass-border)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', marginBottom: '20px' }}>Your wishlist is empty.</p>
          <Link href="/">
            <button className="btn">Continue Shopping</button>
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '30px' }}>
          {items.map((item) => (
            <div key={item.productId} className="glass glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
              <Link href={`/product/${item.slug || item.productId}`} style={{ textDecoration: 'none' }}>
                <div style={{ position: 'relative', width: '100%', aspectRatio: '1', marginBottom: '15px', borderRadius: '8px', overflow: 'hidden' }}>
                  {item.imageUrl ? (
                    <img
                      src={getImageUrl(item.imageUrl)}
                      alt={item.name || 'Product'}
                      style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                    />
                  ) : (
                    <ImageFallback text={item.name || 'Product'} />
                  )}
                </div>
                <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '10px' }}>
                  {item.name || 'Unknown Product'}
                </h3>
              </Link>
              <div style={{ color: 'var(--accent-color)', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '20px' }}>
                {item.price ? `$${(Number(item.price) / 100).toFixed(2)}` : 'N/A'}
              </div>
              
              <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                <button 
                  className="btn" 
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  onClick={() => addCartItem({ 
                    id: item.productId,
                    product_id: item.productId, 
                    quantity: 1,
                    price: Number(item.price || 0),
                    name: item.name || '',
                    image: item.imageUrl || ''
                  })}
                >
                  <ShoppingCart size={18} /> Add to Cart
                </button>
                <button 
                  onClick={() => removeItem(item.productId)}
                  style={{ 
                    padding: '12px', 
                    background: 'rgba(255, 88, 88, 0.1)', 
                    color: '#ff5858', 
                    border: '1px solid rgba(255, 88, 88, 0.2)', 
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Remove from Wishlist"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
