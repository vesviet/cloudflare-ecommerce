import type { Metadata, ResolvingMetadata } from 'next';
import React from 'react';
import { notFound } from 'next/navigation';
import LandingClient from './LandingClient';
import Script from 'next/script';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api-shop.tanhdev.com';

async function getLandingPageBySlug(slug: string) {
  try {
    const res = await fetch(`${API_BASE}/api/landing-pages/${slug}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data;
  } catch (err) {
    console.error('Failed to fetch landing page', err);
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }, parent: ResolvingMetadata): Promise<Metadata> {
  const { slug } = await params;
  const lp = await getLandingPageBySlug(slug);
  if (!lp) return { title: 'Not Found' };
  
  return {
    title: lp.seo_title || lp.title || 'Special Offer',
  };
}

export default async function LandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lp = await getLandingPageBySlug(slug);

  if (!lp) {
    notFound();
  }

  // Parse combo rules safely
  let comboRules: any[] = [];
  if (lp.combo_rules_json) {
    try {
      comboRules = typeof lp.combo_rules_json === 'string'
        ? JSON.parse(lp.combo_rules_json)
        : (Array.isArray(lp.combo_rules_json) ? lp.combo_rules_json : []);
    } catch(e) {}
  }

  return (
    <main style={{ backgroundColor: '#fff', color: '#000', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      {/* Dynamic Pixels Injection */}
      {lp.facebook_pixel_id && (
        <Script id="fb-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${lp.facebook_pixel_id}');
            fbq('track', 'PageView');
          `}
        </Script>
      )}
      
      {lp.tiktok_pixel_id && (
        <Script id="tt-pixel" strategy="afterInteractive">
          {`
            !function (w, d, t) {
              w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
              ttq.load('${lp.tiktok_pixel_id}');
              ttq.page();
            }(window, document, 'ttq');
          `}
        </Script>
      )}

      {/* Provide LP Data to Client Component */}
      <LandingClient lp={lp} comboRules={comboRules} apiUrl={API_BASE} />
    </main>
  );
}
export const runtime = 'edge';
