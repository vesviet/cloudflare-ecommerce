"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, X, Loader2 } from 'lucide-react';

interface SearchResult {
  id: string;
  slug: string;
  name: string;
  images: { url: string; alt_text: string }[];
  prices: { base_price_cents: number; sale_price_cents: number; currency: string };
}

export function SearchAutocomplete() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Click outside to close
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const fetchSearch = async () => {
      setLoading(true);
      setIsOpen(true);
      try {
        const res = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const json = await res.json();
        if (json.success) {
          setResults(json.data || []);
        }
      } catch (e) {
        console.error('Search failed', e);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchSearch, 300);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="search-autocomplete-wrapper" style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
      <div className="search-input-container" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Search size={18} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="Search for products..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (query) setIsOpen(true); }}
          style={{
            width: '100%',
            padding: '10px 36px',
            borderRadius: '20px',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.05)',
            color: 'var(--text-primary)',
            outline: 'none',
            fontSize: '14px'
          }}
        />
        {query && (
          <button onClick={clearSearch} style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 0 }}>
            <X size={16} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="search-dropdown glass-card" style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '8px',
          background: 'var(--bg-surface)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          overflow: 'hidden',
          zIndex: 50,
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          {loading ? (
            <div style={{ padding: '20px', display: 'flex', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <Loader2 size={24} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : results.length > 0 ? (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {results.map((product) => (
                <li key={product.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <Link href={`/product/${product.slug}`} onClick={() => setIsOpen(false)} style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 16px',
                    textDecoration: 'none',
                    color: 'var(--text-primary)',
                    gap: '12px',
                    transition: 'background 0.2s'
                  }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden', flexShrink: 0 }}>
                      {product.images?.[0] ? (
                        <img src={product.images[0].url} alt={product.images[0].alt_text || product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : null}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '14px', fontWeight: 500 }}>{product.name}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        ${(product.prices.sale_price_cents / 100).toFixed(2)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
              No products found for "{query}"
            </div>
          )}
        </div>
      )}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .search-dropdown li a:hover { background: rgba(255,255,255,0.05); }
      `}} />
    </div>
  );
}
