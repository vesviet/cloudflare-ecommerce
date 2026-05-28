import React from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

async function getCmsPage(slug: string) {
  try {
    const res = await fetch(`${API_BASE}/api/cms/${slug}`, { cache: 'no-store' });
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
    notFound();
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

      {/* Render Markdown or HTML content */}
      {/* Assuming metadata_json has content, or if there's a dedicated content column. Wait, cmsEntries has metadata_json but the API returns excerpt and metadata_json. Content is usually in metadata_json.content */}
      <div 
        className="cms-content" 
        style={{ lineHeight: 1.8, fontSize: '1.1rem', color: '#e0e0e0' }}
        dangerouslySetInnerHTML={{ 
          __html: page.metadata_json 
            ? JSON.parse(page.metadata_json).content || page.excerpt 
            : page.excerpt 
        }} 
      />
    </main>
  );
}
