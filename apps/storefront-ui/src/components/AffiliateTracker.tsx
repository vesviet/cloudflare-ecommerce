"use client";
import { useEffect } from 'react';

export default function AffiliateTracker() {
  useEffect(() => {
    // Trích xuất mã Affiliate từ query URL (ví dụ: ?ref=aff_123)
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    
    if (ref) {
      // Lưu Cookie sống 30 ngày (Last-Click Wins) theo lời khuyên của Architect
      const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
      document.cookie = `affiliate_id=${ref}; expires=${expires}; path=/`;
      console.log("[Affiliate Tracker] Đã lưu Cookie Affiliate ID:", ref);
    }
  }, []);

  return null;
}
