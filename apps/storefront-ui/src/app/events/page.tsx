"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api-shop.tanhdev.com';

export default function EventsList() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 12;

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/cms?type=event&page=${page}&page_size=${pageSize}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setEvents(data.data);
          if (data.pagination) setTotalPages(data.pagination.total_pages || 1);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch events', err);
        setLoading(false);
      });
  }, [page]);

  return (
    <main>
      <section style={{ textAlign: 'center', marginBottom: '60px' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 800, background: 'linear-gradient(to right, #fff, #58a6ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '16px' }}>
          Upcoming Events
        </h1>
        <p style={{ maxWidth: '600px', margin: '0 auto', fontSize: '1.2rem', color: 'rgba(255,255,255,0.7)' }}>
          Join our community events, product launches, and exclusive meetups.
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
        <div className="product-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
          {events.map((event: any) => {
            let meta: any = {};
            try { meta = JSON.parse(event.metadata_json || '{}'); } catch(e) {}
            
            return (
              <Link key={event.slug} href={`/events/${event.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="glass glass-card hover-lift" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  {event.featured_image_url && (
                    <div style={{ margin: '-30px -30px 20px -30px', height: '200px', overflow: 'hidden', borderRadius: '15px 15px 0 0' }}>
                      <img src={event.featured_image_url} alt={event.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '1.4rem' }}>{event.title}</h3>
                  <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', marginBottom: '15px' }}>
                    {meta.event_date ? (
                      <span style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}>📅 {new Date(meta.event_date).toLocaleDateString()}</span>
                    ) : (
                      <span>Published: {new Date(event.published_at ? event.published_at * 1000 : event.created_at).toLocaleDateString()}</span>
                    )}
                  </div>
                  {event.excerpt && (
                    <p style={{ color: 'rgba(255,255,255,0.8)', flexGrow: 1 }}>{event.excerpt}</p>
                  )}
                  <div style={{ marginTop: '20px', color: 'var(--accent-color)', fontWeight: 'bold' }}>
                    View Event Details →
                  </div>
                </div>
              </Link>
            )
          })}
          {events.length === 0 && (
            <div style={{ textAlign: 'center', width: '100%', padding: '40px', color: 'rgba(255,255,255,0.6)', gridColumn: '1 / -1' }}>
              No upcoming events found.
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
