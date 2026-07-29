"use client";
import { useEffect } from 'react';

export default function AffiliateTracker() {
  useEffect(() => {
    // Trích xuất mã Affiliate từ query URL (ví dụ: ?ref=aff_123)
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    
    if (ref && /^[A-Za-z0-9_-]{1,64}$/.test(ref)) {
      // Lưu Cookie sống 30 ngày (Last-Click Wins) theo lời khuyên của Architect.
      // ref is validated to a safe token charset so it cannot inject extra cookie
      // attributes; add SameSite=Lax and Secure (on https) for CSRF/transport safety.
      const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
      const secure = window.location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `affiliate_id=${ref}; expires=${expires}; path=/; SameSite=Lax${secure}`;
      console.log("[Affiliate Tracker] Đã lưu Cookie Affiliate ID:", ref);
    }
  }, []);

  return null;
}
