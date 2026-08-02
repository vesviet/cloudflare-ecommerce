"use client";

import React, { useState } from 'react';
import { Star, X } from 'lucide-react';

interface ReviewFormModalProps {
  productId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReviewFormModal({ productId, isOpen, onClose, onSuccess }: ReviewFormModalProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Posting a review requires the session cookie, which belongs to the API
      // origin, so call it directly instead of going through the Next rewrite.
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://api-shop.tanhdev.com';
      const res = await fetch(`${apiBase}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ product_id: productId, rating, comment })
      });
      const data = await res.json();
      if (data.success) {
        onSuccess();
      } else {
        setError(data.error || 'Failed to submit review');
      }
    } catch (err) {
      setError('An error occurred while submitting the review');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }}>
      <div className="glass-card" style={{
        background: 'var(--bg-surface)', padding: '30px', borderRadius: '16px',
        width: '100%', maxWidth: '500px', position: 'relative'
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none',
          color: 'var(--text-muted)', cursor: 'pointer'
        }}>
          <X size={24} />
        </button>
        
        <h2 style={{ marginTop: 0, marginBottom: '24px' }}>Write a Review</h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && (
            <div style={{ padding: '10px 14px', background: 'rgba(248,113,113,0.1)', color: '#f87171', borderRadius: '8px', border: '1px solid rgba(248,113,113,0.25)', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>Rating</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                >
                  <Star size={32} fill={star <= rating ? "var(--accent-color)" : "transparent"} color={star <= rating ? "var(--accent-color)" : "var(--glass-border)"} />
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>Comment</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell others what you think about this product..."
              required
              rows={4}
              style={{
                width: '100%', padding: '12px', borderRadius: '8px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)',
                color: '#fff', outline: 'none', resize: 'vertical'
              }}
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', marginTop: '10px' }}
          >
            {loading ? 'Submitting...' : 'Submit Review'}
          </button>
        </form>
      </div>
    </div>
  );
}
