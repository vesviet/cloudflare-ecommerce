'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface BannerProps {
  placement: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api-shop.tanhdev.com';

export default function Banner({ placement }: BannerProps) {
  const [banner, setBanner] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBanner() {
      try {
        const res = await fetch(`${API_BASE}/api/cms?type=banner&placement=${placement}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && data.data && data.data.length > 0) {
          const entry = data.data[0];
          
          // Client-side expiration logic
          if (entry.expires_at) {
            if (Date.now() > entry.expires_at) {
              setBanner(null);
              return;
            }
          }
          setBanner(entry);
        }
      } catch (err) {
        console.error('Failed to fetch banner', err);
      } finally {
        setLoading(false);
      }
    }
    fetchBanner();
  }, [placement]);

  if (loading || !banner) {
    return null;
  }

  const meta = (() => {
    try {
      return JSON.parse(banner.metadata_json || '{}');
    } catch {
      return {};
    }
  })();

  const linkUrl = meta.link_url || '#';

  return (
    <div style={{ marginBottom: '40px', borderRadius: '16px', overflow: 'hidden', position: 'relative' }}>
      <Link href={linkUrl} style={{ display: 'block', width: '100%', height: '100%' }}>
        {banner.featured_image_url ? (
          <img 
            src={banner.featured_image_url} 
            alt={banner.title} 
            style={{ width: '100%', maxHeight: '400px', objectFit: 'cover', display: 'block' }} 
          />
        ) : (
          <div style={{ width: '100%', padding: '60px 20px', background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))', backdropFilter: 'blur(10px)', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '10px' }}>{banner.title}</h2>
            {banner.excerpt && <p style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.8)' }}>{banner.excerpt}</p>}
          </div>
        )}
      </Link>
    </div>
  );
}
