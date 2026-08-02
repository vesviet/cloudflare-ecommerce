import type { Metadata, ResolvingMetadata } from 'next';
import React from 'react';
import { notFound } from 'next/navigation';
import ProductClient from './ProductClient';
import Link from 'next/link';
import { getImageUrl } from '../../../lib/image';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api-shop.tanhdev.com';

async function getProductBySlug(slug: string) {
  try {
    const res = await fetch(`${API_BASE}/api/products/${slug}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data;
  } catch (err) {
    console.error('Failed to fetch product', err);
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }, parent: ResolvingMetadata): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: 'Product Not Found' };
  
  const title = product.name || product.title;
  const description = product.description || 'Premium product from Aura Store';
  const images = product.images?.length > 0 && product.images[0]?.url ? [getImageUrl(product.images[0].url)] : [];

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images,
    }
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  // Generate basic JSON-LD
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name || product.title,
    image: product.images?.length > 0 && product.images[0]?.url ? getImageUrl(product.images[0].url) : '',
    description: product.description,
    sku: product.variations?.[0]?.sku || '',
    offers: {
      '@type': 'Offer',
      price: (product.prices?.sale_price || product.prices?.regular_price || 0) / 100,
      priceCurrency: 'USD',
      availability: product.stock_quantity > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    }
  };

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div style={{ marginBottom: '20px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
        <Link href="/" style={{ color: 'var(--accent-color)', textDecoration: 'none' }}>Home</Link>
        <span style={{ margin: '0 8px' }}>/</span>
        <span style={{ color: '#fff' }}>{product.name || product.title}</span>
      </div>
      <ProductClient product={product} />
    </main>
  );
}
export const runtime = 'edge';
