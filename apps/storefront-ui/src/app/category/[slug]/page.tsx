import React from 'react';
import type { Metadata, ResolvingMetadata } from 'next';
import { CategoryClient } from './CategoryClient';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

async function getCategoryProducts(slug: string) {
  try {
    const res = await fetch(`${API_BASE}/api/products?category=${slug}`, { cache: 'no-store' });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch category products', err);
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }, parent: ResolvingMetadata): Promise<Metadata> {
  const { slug } = await params;
  const title = `Shop ${slug.replace(/-/g, ' ')}`;
  return { title };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const products = await getCategoryProducts(slug);

  return (
    <main>
      <section style={{ textAlign: 'center', marginBottom: '60px' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 800, background: 'linear-gradient(to right, #fff, #58a6ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '16px', textTransform: 'capitalize' }}>
          {slug.replace(/-/g, ' ')}
        </h1>
        <p style={{ maxWidth: '600px', margin: '0 auto', fontSize: '1.2rem', color: 'var(--text-muted)' }}>
          Explore products in this category.
        </p>
      </section>

      <CategoryClient products={products} />
    </main>
  );
}

export const runtime = 'edge';
