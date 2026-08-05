"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getImageUrl } from '../../lib/image';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api-shop.tanhdev.com';

export default function BlogList() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 12;

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/cms?type=post&page=${page}&page_size=${pageSize}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setPosts(data.data);
          if (data.pagination) setTotalPages(data.pagination.total_pages || 1);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch posts', err);
        setLoading(false);
      });
  }, [page]);

  return (
    <main>
      <section style={{ textAlign: 'center', marginBottom: '60px' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 800, background: 'linear-gradient(to right, #fff, #58a6ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '16px' }}>
          Blog
        </h1>
        <p style={{ maxWidth: '600px', margin: '0 auto', fontSize: '1.2rem', color: 'rgba(255,255,255,0.7)' }}>
          Latest news, updates, and articles.
        </p>
      </section>

      {loading ? (
        <div className="product-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass glass-card" style={{ height: '350px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ margin: '-30px -30px 20px -30px', height: '200px', background: 'rgba(255,255,255,0.05)', borderRadius: '15px 15px 0 0', animation: 'pulse 1.5s infinite' }} />
              <div style={{ height: '24px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', marginBottom: '10px', width: '80%', animation: 'pulse 1.5s infinite' }} />
              <div style={{ height: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', marginBottom: '15px', width: '40%', animation: 'pulse 1.5s infinite' }} />
              <div style={{ height: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', marginBottom: '8px', width: '100%', animation: 'pulse 1.5s infinite' }} />
              <div style={{ height: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', width: '90%', animation: 'pulse 1.5s infinite' }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="product-grid">
          {posts.map((post: any) => (
            <div key={post.slug} className="glass glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="blog-image">
                {post.featured_image_url ? (
                  <img src={getImageUrl(post.featured_image_url)} alt={post.title} />
                ) : (
                  <div className="blog-image-placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8c-1.1 0-2 .9-2 2v18Z"/>
                      <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
                    </svg>
                  </div>
                )}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--accent-color)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>
                {new Date(post.published_at ? post.published_at * 1000 : post.created_at).toLocaleDateString()}
              </div>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '1.25rem', lineHeight: 1.4, color: 'var(--text-main)' }}>{post.title}</h3>
              {post.excerpt && (
                <p style={{ color: 'var(--text-muted)', flexGrow: 1, margin: '0 0 20px 0', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {post.excerpt}
                </p>
              )}
              <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
                <Link href={`/blog/${post.slug}`} style={{ display: 'block' }}>
                  <button className="btn" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                    Read Article <span style={{ fontSize: '1.2em' }}>→</span>
                  </button>
                </Link>
              </div>
            </div>
          ))}
          {posts.length === 0 && (
            <div style={{ textAlign: 'center', width: '100%', padding: '40px', color: 'rgba(255,255,255,0.6)', gridColumn: '1 / -1' }}>
              No posts found.
            </div>
          )}
        </div>
      )}
      
      {!loading && totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '40px' }}>
          <button
            className="btn"
            disabled={page === 1}
            onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo(0, 0); }}
            style={{ padding: '8px 16px', opacity: page === 1 ? 0.5 : 1, cursor: page === 1 ? 'not-allowed' : 'pointer' }}
          >
            ← Previous
          </button>
          <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
            Page {page} of {totalPages}
          </span>
          <button
            className="btn"
            disabled={page === totalPages}
            onClick={() => { setPage(p => Math.min(totalPages, p + 1)); window.scrollTo(0, 0); }}
            style={{ padding: '8px 16px', opacity: page === totalPages ? 0.5 : 1, cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
          >
            Next →
          </button>
        </div>
      )}
    </main>
  );
}
