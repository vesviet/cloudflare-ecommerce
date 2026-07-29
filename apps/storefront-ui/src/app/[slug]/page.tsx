import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ReactMarkdown from 'react-markdown';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api-shop.tanhdev.com';

async function getCmsPage(slug: string) {
  try {
    const res = await fetch(`${API_BASE}/api/cms/${slug}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch (err) {
    console.error('Failed to fetch CMS page:', err);
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await getCmsPage(slug);
  if (!page) return { title: 'Page Not Found' };

  return {
    title: page.title,
    description: page.excerpt || page.title,
    openGraph: {
      title: page.title,
      description: page.excerpt || page.title,
      images: page.featured_image_url ? [page.featured_image_url] : [],
    }
  };
}

export default async function DynamicCmsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  console.log('DynamicCmsPage called for slug:', slug);
  const page = await getCmsPage(slug);

  if (!page) {
    return (
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', color: '#ef4444', marginBottom: '10px' }}>404</h1>
        <p style={{ fontSize: '1.2rem', color: '#4b5563', marginBottom: '20px' }}>Trang CMS không tồn tại hoặc đã bị xóa.</p>
        <Link href="/" style={{ color: '#2563eb', textDecoration: 'underline', fontWeight: 'bold' }}>Trở về trang chủ</Link>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '20px', color: 'var(--accent-color)' }}>{page.title}</h1>
      
      {page.featured_image_url && (
        <div style={{ marginBottom: '40px', width: '100%', height: '400px', overflow: 'hidden', borderRadius: '16px' }}>
          <img 
            src={page.featured_image_url} 
            alt={page.title} 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
        </div>
      )}

      {/* Render CMS content as Markdown. react-markdown does NOT render embedded
          raw HTML by default, which neutralizes stored-XSS from CMS content. */}
      <div 
        className="cms-content" 
        style={{ lineHeight: 1.8, fontSize: '1.1rem', color: '#e0e0e0' }}
      >
        <ReactMarkdown>
          {(page.metadata_json
            ? (() => { try { return JSON.parse(page.metadata_json).content; } catch { return null; } })() || page.excerpt
            : page.excerpt) || ''}
        </ReactMarkdown>
      </div>
    </main>
  );
}
export const runtime = 'edge';
