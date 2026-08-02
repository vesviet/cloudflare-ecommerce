"use client";

import React from 'react';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import Link from 'next/link';

export function BlogPostClient({ post }: { post: any }) {
  if (!post) {
    return (
      <main style={{ padding: '60px 0', textAlign: 'center' }}>
        <h1 style={{ marginBottom: '20px' }}>Post Not Found</h1>
        <div style={{ marginTop: '30px' }}>
          <Link href="/blog">
            <button className="btn">← Back to Blog</button>
          </Link>
        </div>
      </main>
    );
  }

  let metadata: any = {};
  try {
    metadata = JSON.parse(post.metadata_json || '{}');
  } catch (e) {
    // Ignore JSON parse errors
  }

  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
      <Link href="/blog" style={{ color: 'var(--accent-color)', textDecoration: 'none', display: 'inline-block', marginBottom: '30px' }}>
        ← Back to Blog
      </Link>

      {post.featured_image_url && (
        <div style={{ width: '100%', height: '400px', borderRadius: '20px', overflow: 'hidden', marginBottom: '40px' }}>
          <img src={post.featured_image_url} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}

      <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '20px', lineHeight: 1.2 }}>{post.title}</h1>

      <div style={{ display: 'flex', gap: '20px', color: 'rgba(255,255,255,0.6)', marginBottom: '40px', paddingBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <span>Published: {new Date(post.published_at ? post.published_at * 1000 : post.created_at).toLocaleDateString()}</span>
        {metadata.author_name && (
          <span>By: {metadata.author_name}</span>
        )}
      </div>

      <div className="markdown-content" style={{ fontSize: '1.1rem', lineHeight: 1.8, color: 'rgba(255,255,255,0.8)' }}>
        <MarkdownRenderer>{post.content || ''}</MarkdownRenderer>
      </div>
    </main>
  );
}
