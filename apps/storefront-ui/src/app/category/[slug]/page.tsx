"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCartStore } from '../../../store/cartStore';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export default function CategoryPage({ params }: { params: { slug: string } }) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { addItem, toggleCart } = useCartStore();

  useEffect(() => {
    // Fetch products filtered by category
    fetch(`${API_BASE}/api/products?category=${params.slug}`)
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch category products', err);
        setLoading(false);
      });
  }, [params.slug]);

  const formatCurrency = (minorAmountStr: string) => {
    const amount = parseInt(minorAmountStr, 10) / 100;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const handleAddToCart = (product: any) => {
    const variation = product.variations[0];
    addItem({
      id: variation.id,
      product_id: product.id,
      name: product.name,
      price: parseInt(variation.sale_price || variation.regular_price, 10),
      quantity: 1,
      image: product.attributes?.find((a: any) => a.image)?.image || '',
    });
    toggleCart();
  };

  return (
    <main>
      <section style={{ textAlign: 'center', marginBottom: '60px' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 800, background: 'linear-gradient(to right, #fff, #58a6ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '16px', textTransform: 'capitalize' }}>
          {params.slug.replace(/-/g, ' ')}
        </h1>
        <p style={{ maxWidth: '600px', margin: '0 auto', fontSize: '1.2rem', color: 'var(--text-muted)' }}>
          Explore products in this category.
        </p>
      </section>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading products...</div>
      ) : (
        <div className="product-grid">
          {products.map((product: any) => {
            const prices = product.prices;
            const isVariable = product.type === 'variable';
            const isOnSale = prices.sale_price && prices.sale_price !== prices.regular_price;

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
      )}
    </main>
  );
}
