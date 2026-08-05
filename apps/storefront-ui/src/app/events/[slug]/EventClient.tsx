"use client";

import React from 'react';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import Link from 'next/link';
import { getImageUrl } from '@/lib/image';

export function EventClient({ event }: { event: any }) {
  if (!event) {
    return (
      <main style={{ padding: '60px 0', textAlign: 'center' }}>
        <h1 style={{ marginBottom: '20px' }}>Event Not Found</h1>
        <div style={{ marginTop: '30px' }}>
          <Link href="/events">
            <button className="btn">← Back to Events</button>
          </Link>
        </div>
      </main>
    );
  }

  let metadata: any = {};
  try {
    metadata = JSON.parse(event.metadata_json || '{}');
  } catch (e) {
    // Ignore JSON parse errors
  }

  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
      <Link href="/events" style={{ color: 'var(--accent-color)', textDecoration: 'none', display: 'inline-block', marginBottom: '30px' }}>
        ← Back to Events
      </Link>

      {event.featured_image_url && (
        <div style={{ width: '100%', height: '400px', borderRadius: '20px', overflow: 'hidden', marginBottom: '40px' }}>
          <img src={getImageUrl(event.featured_image_url)} alt={event.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}

      <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '20px', lineHeight: 1.2 }}>{event.title}</h1>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', color: 'rgba(255,255,255,0.8)', marginBottom: '40px', paddingBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        {metadata.event_date && (
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '10px 20px', borderRadius: '10px' }}>
            📅 <span style={{ fontWeight: 'bold' }}>Date:</span> {new Date(metadata.event_date).toLocaleDateString()}
          </div>
        )}
        {metadata.location && (
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '10px 20px', borderRadius: '10px' }}>
            📍 <span style={{ fontWeight: 'bold' }}>Location:</span> {metadata.location}
          </div>
        )}
      </div>

      <div className="markdown-content" style={{ fontSize: '1.1rem', lineHeight: 1.8, color: 'rgba(255,255,255,0.8)' }}>
        <MarkdownRenderer>{event.content || ''}</MarkdownRenderer>
      </div>
    </main>
  );
}
