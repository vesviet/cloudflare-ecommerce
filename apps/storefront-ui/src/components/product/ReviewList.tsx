"use client";

import React, { useEffect, useState } from 'react';
import { Star, CheckCircle } from 'lucide-react';

interface Review {
  id: string;
  rating: number;
  comment: string;
  verified_purchase: number;
  created_at: string;
}

export function ReviewList({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/reviews/${productId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setReviews(data.data);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [productId]);

  if (loading) {
    return <div style={{ color: 'var(--text-muted)' }}>Loading reviews...</div>;
  }

  if (reviews.length === 0) {
    return <div style={{ color: 'var(--text-muted)' }}>No reviews yet. Be the first to review!</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {reviews.map((r) => (
        <div key={r.id} style={{ 
          padding: '20px', 
          background: 'rgba(255,255,255,0.02)', 
          border: '1px solid rgba(255,255,255,0.05)', 
          borderRadius: '12px' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={16} fill={i < r.rating ? "var(--accent-color)" : "transparent"} color={i < r.rating ? "var(--accent-color)" : "var(--glass-border)"} />
              ))}
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {new Date(r.created_at).toLocaleDateString()}
            </span>
          </div>
          
          <p style={{ margin: '0 0 12px 0', fontSize: '15px', lineHeight: 1.5 }}>{r.comment}</p>
          
          {r.verified_purchase === 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4ade80', fontSize: '12px', fontWeight: 500 }}>
              <CheckCircle size={14} />
              Verified Buyer
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
