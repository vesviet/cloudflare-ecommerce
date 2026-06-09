"use client";

import React, { useState, useRef } from 'react';
import { useCartStore } from '../../../store/cartStore';
import { ProductSwatches } from './ProductSwatches';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export default function ProductClient({ product }: { product: any }) {
  const [selectedVariationId, setSelectedVariationId] = useState<string>('');
  const { addItem, toggleCart } = useCartStore();
  const galleryRef = useRef<HTMLDivElement>(null);

  const scrollGallery = (dir: 'left' | 'right') => {
    if (galleryRef.current) {
      const scrollAmount = galleryRef.current.clientWidth;
      galleryRef.current.scrollBy({ left: dir === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

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
      image: product.images?.[0] || '',
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
      
      {/* Left: Image Gallery */}
      <div className="product-gallery" style={{ width: '100%', overflow: 'hidden' }}>
        {product.images && product.images.length > 0 ? (
          <div style={{ position: 'relative' }}>
            <div ref={galleryRef} style={{ display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', gap: '20px', paddingBottom: '10px', scrollbarWidth: 'none' }}>
              {product.images.map((img: string, idx: number) => (
                <div key={idx} className="glass" style={{ flex: '0 0 100%', scrollSnapAlign: 'start', padding: '20px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '500px', boxSizing: 'border-box' }}>
                  <img 
                    src={img.startsWith('http') ? img : `${API_BASE}${img}`} 
                    alt={`${product.name} ${idx + 1}`} 
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px' }} 
                  />
                </div>
              ))}
            </div>
            {product.images.length > 1 && (
              <>
                <button onClick={() => scrollGallery('left')} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>
                <button onClick={() => scrollGallery('right')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="glass" style={{ padding: '20px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '500px' }}>
            <div style={{ color: 'var(--text-muted)' }}>No image available</div>
          </div>
        )}
      </div>

      {/* Right: Details */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>{product.name}</h1>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '15px', marginBottom: '20px' }}>
          {(selectedVariation ? selectedVariation.sale_price : product.prices.sale_price) ? (
            <>
              <span style={{ fontSize: '1.2rem', textDecoration: 'line-through', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
                {formatCurrency(selectedVariation ? selectedVariation.regular_price : product.prices.regular_price)}
              </span>
              <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent-color)' }}>
                {formatCurrency(displayPrice)}
              </span>
            </>
          ) : (
            <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent-color)' }}>
              {formatCurrency(displayPrice)}
            </span>
          )}
        </div>
        
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '30px', fontSize: '1.1rem' }}>
          {product.description || 'Premium product designed with the highest quality standards.'}
        </p>

        {isVariable && (
          <ProductSwatches 
            variations={variations} 
            selectedVariationId={selectedVariationId} 
            onSelectVariation={setSelectedVariationId} 
          />
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
