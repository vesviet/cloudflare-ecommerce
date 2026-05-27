"use client";

import React, { useState } from 'react';
import { useCartStore } from '../../../store/cartStore';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export default function ProductClient({ product }: { product: any }) {
  const [selectedVariationId, setSelectedVariationId] = useState<string>('');
  const { addItem, toggleCart } = useCartStore();

  const isVariable = product.type === 'variable';
  const variations = product.variations || [];

  const formatCurrency = (minorAmountStr: string | number) => {
    const amount = parseInt(minorAmountStr.toString(), 10) / 100;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const handleAddToCart = () => {
    let selectedVar = variations[0];
    
    if (isVariable) {
      if (!selectedVariationId) return; // User must select a variation
      selectedVar = variations.find((v: any) => v.id === selectedVariationId);
    }

    if (!selectedVar) return;

    addItem({
      id: selectedVar.id,
      product_id: product.id,
      name: product.name,
      price: parseInt(selectedVar.sale_price || selectedVar.regular_price, 10),
      quantity: 1,
      image: product.attributes?.find((a: any) => a.image)?.image || '',
      attributes: selectedVar.attributes || {}
    });
    
    toggleCart();
  };

  const selectedVariation = variations.find((v: any) => v.id === selectedVariationId);
  const displayPrice = selectedVariation 
    ? (selectedVariation.sale_price || selectedVariation.regular_price) 
    : (product.prices.sale_price || product.prices.regular_price);
  
  const inStock = selectedVariation ? selectedVariation.stock > 0 : product.in_stock;

  return (
    <div className="product-detail-container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginTop: '40px' }}>
      
      {/* Left: Image */}
      <div className="glass" style={{ padding: '20px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '500px' }}>
        {product.attributes?.find((a: any) => a.image)?.image ? (
          <img 
            src={`${API_BASE}${product.attributes.find((a: any) => a.image).image}`} 
            alt={product.name} 
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px' }} 
          />
        ) : (
          <div style={{ color: 'var(--text-muted)' }}>No image available</div>
        )}
      </div>

      {/* Right: Details */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>{product.name}</h1>
        <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent-color)', marginBottom: '20px' }}>
          {formatCurrency(displayPrice)}
        </div>
        
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '30px', fontSize: '1.1rem' }}>
          {product.description || 'Premium product designed with the highest quality standards.'}
        </p>

        {isVariable && (
          <div style={{ marginBottom: '30px' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 600 }}>Select Option:</label>
            <select 
              value={selectedVariationId} 
              onChange={(e) => setSelectedVariationId(e.target.value)}
              style={{
                width: '100%',
                padding: '16px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--glass-border)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '1rem',
                outline: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                appearance: 'none',
              }}
              onFocus={(e) => e.target.style.boxShadow = '0 0 15px var(--accent-glow)'}
              onBlur={(e) => e.target.style.boxShadow = 'none'}
            >
              <option value="" disabled style={{ background: 'var(--bg-color)' }}>-- Choose an option --</option>
              {variations.map((v: any) => (
                <option key={v.id} value={v.id} disabled={v.stock <= 0} style={{ background: 'var(--bg-color)' }}>
                  {v.attributes?.name || v.sku} - {formatCurrency(v.sale_price || v.regular_price)} {v.stock <= 0 ? '(Out of Stock)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        <button 
          className="btn" 
          disabled={!inStock || (isVariable && !selectedVariationId)}
          onClick={handleAddToCart}
          style={{ padding: '20px', fontSize: '1.2rem', marginTop: 'auto' }}
        >
          {!inStock ? 'Out of Stock' : (isVariable && !selectedVariationId ? 'Select an Option' : 'Add to Cart')}
        </button>
      </div>
    </div>
  );
}
