"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCartStore } from '../store/cartStore';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export default function Home() {
  const [products, setProducts] = useState<any[]>([]);
  const { addItem, toggleCart } = useCartStore();

  useEffect(() => {
    fetch(`${API_BASE}/api/products`)
      .then(res => res.json())
      .then(data => {
        // catalog returns { success, data } shape
        setProducts(Array.isArray(data) ? data : (data.data || []))
      })
      .catch(err => console.error('Failed to fetch products', err));
  }, []);

  const formatCurrency = (minorAmountStr: string | number | null | undefined) => {
    if (minorAmountStr == null) return '—';
    const amount = parseInt(String(minorAmountStr), 10) / 100;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const handleAddToCart = (product: any) => {
    // For simple products, add the first variation to cart
    const variation = product.variations?.[0];
    if (!variation) return;
    addItem({
      id: variation.id,
      product_id: product.id,
      name: product.name ?? product.title,
      price: parseInt(String(variation.sale_price ?? variation.regular_price), 10),
      quantity: 1,
      image: product.attributes?.find((a: any) => a.image)?.image || '',
    });
    toggleCart();
  };

  return (
    <main>
      <section style={{ textAlign: 'center', marginBottom: '60px' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 800, background: 'linear-gradient(to right, #fff, #58a6ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '16px' }}>The Future of Premium Gear</h1>
        <p style={{ maxWidth: '600px', margin: '0 auto', fontSize: '1.2rem' }}>
          Discover our exclusive collection of high-end products. Built with the headless power of Cloudflare Workers and designed with beautiful glassmorphism.
        </p>
      </section>

      <div className="product-grid">
        {products.map((product: any) => {
          // prices is computed by the API; guard defensively in case of stale cache or error
          const prices = product.prices ?? {};
          const isVariable = product.type === 'variable';
          const isOnSale = prices.sale_price && prices.sale_price !== prices.regular_price;
          const displayName = product.name ?? product.title;

          return (
            <div key={product.id} className="glass glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="product-image">
                {product.attributes?.find((a: any) => a.image)?.image && (
                  <img src={`${API_BASE}${product.attributes.find((a: any) => a.image).image}`} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--accent-color)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>
                {isVariable ? 'Variable Product' : 'Simple Product'}
              </div>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem' }}>{displayName}</h3>
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
          <div style={{ textAlign: 'center', width: '100%', padding: '40px', color: 'rgba(255,255,255,0.6)' }}>
            No products found. Please add products in the Admin Dashboard.
          </div>
        )}
      </div>
    </main>
  );
}
