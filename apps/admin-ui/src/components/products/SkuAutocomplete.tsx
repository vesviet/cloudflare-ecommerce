import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../../lib/apiFetch';

interface SkuAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (item: any) => void;
  API_BASE_URL: string;
}

export const SkuAutocomplete: React.FC<SkuAutocompleteProps> = ({ value, onChange, onSelect }) => {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!value || value.length < 2 || !isOpen) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`/products/search-sku?q=${encodeURIComponent(value)}`);
        const result = await res.json();
        if (result.success) {
          setSuggestions(result.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch SKUs', err);
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [value, isOpen]);

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <input
        type="text"
        placeholder="SKU"
        className="input-control"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
      />
      {isOpen && (suggestions.length > 0 || loading) && (
        <ul style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'var(--surface-color, #1e1e2d)',
          border: '1px solid var(--glass-border)',
          borderRadius: '4px',
          listStyle: 'none',
          padding: 0,
          margin: '4px 0 0 0',
          maxHeight: '200px',
          overflowY: 'auto',
          zIndex: 100,
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
        }}>
          {loading ? (
            <li style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>Searching...</li>
          ) : (
            suggestions.map(item => (
              <li
                key={item.id}
                style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                onClick={() => {
                  onChange(item.sku);
                  onSelect(item);
                  setIsOpen(false);
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ fontWeight: 'bold' }}>{item.sku}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.title}</div>
                <div style={{ fontSize: '12px', color: 'var(--primary-color)' }}>Stock: {item.stock}</div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};
