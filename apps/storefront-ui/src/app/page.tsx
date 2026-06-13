import React from 'react';
import Link from 'next/link';
import AddToCartButton from '../components/AddToCartButton';

// Using the same API_BASE resolution as before.
// In Next.js SSR, we might need a absolute URL, so NEXT_PUBLIC_API_URL must be an absolute URL.
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

async function getProducts() {
  try {
    const res = await fetch(`${API_BASE}/api/products`, {
      next: { revalidate: 60 } // ISR every 60s
    });
    if (!res.ok) {
      console.error('Failed to fetch products, status:', res.status);
      return [];
    }
    const data = await res.json();
    return Array.isArray(data) ? data : (data.data || []);
  } catch (err) {
    console.error('Error fetching products:', err);
    return [];
  }
}

export default async function Home() {
  const products = await getProducts();

  const formatCurrency = (minorAmountStr: string | number | null | undefined) => {
    if (minorAmountStr == null) return '—';
    const amount = parseInt(String(minorAmountStr), 10) / 100;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
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
        {products.map((product: any, index: number) => {
          const prices = product.prices ?? {};
          const isVariable = product.type === 'variable';
          const isOnSale = prices.sale_price && prices.sale_price !== prices.regular_price;
          const displayName = product.name ?? product.title;

          return (
            <div key={product.id} className="glass glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="product-image">
                {product.images && product.images.length > 0 && (
                  <img 
                    src={product.images[0].startsWith('http') ? product.images[0] : `${API_BASE}${product.images[0]}`} 
                    alt={displayName} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    fetchPriority={index < 4 ? "high" : "auto"}
                    loading={index < 4 ? "eager" : "lazy"}
                  />
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
                  <AddToCartButton product={product} isVariable={isVariable} />
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
