"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export default function BlogPostDetail() {
  const { slug } = useParams();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;
    
    fetch(`${API_BASE}/api/cms/${slug}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setPost(data.data);
        } else {
          setError(data.error || 'Post not found');
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch post', err);
        setError('Error loading post');
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <main style={{ padding: '60px 0', textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
        Loading post...
      </main>
    );
  }

  if (error || !post) {
    return (
      <main style={{ padding: '60px 0', textAlign: 'center' }}>
        <h1 style={{ marginBottom: '20px' }}>Post Not Found</h1>
        <p style={{ color: 'rgba(255,255,255,0.6)' }}>{error}</p>
        <div style={{ marginTop: '30px' }}>
          <Link href="/blog">
            <button className="btn">← Back to Blog</button>
          </Link>
        </div>
      </main>
    );
  }

  let metadata = {};
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
        {(metadata as any).author_name && (
          <span>By: {(metadata as any).author_name}</span>
        )}
      </div>

      <div className="markdown-content" style={{ fontSize: '1.1rem', lineHeight: 1.8, color: 'rgba(255,255,255,0.8)' }}>
        <ReactMarkdown>{post.content || ''}</ReactMarkdown>
      </div>
    </main>
  );
}
export const runtime = 'edge';
