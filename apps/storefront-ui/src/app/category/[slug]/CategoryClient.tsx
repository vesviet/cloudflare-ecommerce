"use client";

import React from 'react';
import Link from 'next/link';
import { useCartStore } from '../../../store/cartStore';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export const CategoryClient = ({ products }: { products: any[] }) => {
  const { addItem, toggleCart } = useCartStore();

  const formatCurrency = (minorAmountStr: string) => {
    const amount = parseInt(minorAmountStr, 10) / 100;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const handleAddToCart = (product: any) => {
    if (product.type === 'variable') {
      const variation = product.variations?.[0];
      if (!variation) return;
      addItem({
        id: variation.id,
        product_id: product.id,
        name: product.name,
        price: parseInt(variation.sale_price || variation.regular_price, 10),
        quantity: 1,
        image: product.images?.[0] || '',
      });
    } else {
      const variation = product.variations?.[0];
      if (!variation) return;

      addItem({
        id: variation.id,
        product_id: product.id,
        name: product.name,
        price: parseInt(String(product.prices?.sale_price || product.prices?.regular_price), 10),
        quantity: 1,
        image: product.images?.[0] || '',
      });
    }
    toggleCart();
  };

  return (
    <div className="product-grid">
      {products.map((product: any) => {
        const prices = product.prices;
        const isVariable = product.type === 'variable';
        const isOnSale = prices.sale_price && prices.sale_price !== prices.regular_price;

        return (
          <div key={product.id} className="glass glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="product-image">
              {product.images && product.images.length > 0 && (
                <img src={product.images[0].startsWith('http') ? product.images[0] : `${API_BASE}${product.images[0]}`} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--accent-color)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>
              {isVariable ? 'Variable Product' : 'Simple Product'}
            </div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem' }}>{product.name}</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {isVariable && prices.price_range ? (
                  <span style={{ fontSize: '1.4rem', fontWeight: 700 }}>
                    {formatCurrency(prices.price_range.min_amount)} - {formatCurrency(prices.price_range.max_amount)}
                  </span>
                ) : isOnSale ? (
                  <>
                    <span style={{ fontSize: '0.9rem', textDecoration: 'line-through', color: 'rgba(255,255,255,0.5)' }}>
                      {formatCurrency(prices.regular_price)}
                    </span>
                    <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-color)' }}>
                      {formatCurrency(prices.sale_price)}
                    </span>
                  </>
                ) : (
                  <span style={{ fontSize: '1.4rem', fontWeight: 700 }}>
                    {formatCurrency(prices.regular_price)}
                  </span>
                )}
              </div>
              {isVariable ? (
                <Link href={`/product/${product.slug}`} style={{ display: 'block' }}>
                  <button className="btn">Select Options</button>
                </Link>
              ) : (
                <button className="btn" disabled={!product.in_stock} onClick={() => handleAddToCart(product)}>
                  {product.in_stock ? 'Add to Cart' : 'Out of Stock'}
                </button>
              )}
            </div>
          </div>
        );
      })}
      {products.length === 0 && (
        <div style={{ textAlign: 'center', width: '100%', padding: '40px', color: 'rgba(255,255,255,0.6)', gridColumn: '1 / -1' }}>
          No products found in this category.
        </div>
      )}
    </div>
  );
};
