import React from 'react';
import { notFound } from 'next/navigation';
import ProductClient from './ProductClient';
import Link from 'next/link';

async function getProductBySlug(slug: string) {
  try {
    const res = await fetch('http://localhost:8788/store/products', { cache: 'no-store' });
    if (!res.ok) return null;
    const products = await res.json();
    return products.find((p: any) => p.slug === slug);
  } catch (err) {
    console.error('Failed to fetch product', err);
    return null;
  }
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug);

  if (!product) {
    notFound();
  }

  return (
    <main>
      <Link href="/" style={{ color: 'var(--text-muted)', display: 'inline-block', marginBottom: '20px' }}>
        ← Back to Catalog
      </Link>
      <ProductClient product={product} />
    </main>
  );
}
