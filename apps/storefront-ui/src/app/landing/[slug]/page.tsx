import React from 'react';
import LandingClient from './LandingClient';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api-shop.tanhdev.com';

export default async function LandingPage({ params }: { params: any }) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug;

  return (
    <main style={{ backgroundColor: '#fff', color: '#000', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <LandingClient initialSlug={slug} apiUrl={API_BASE} />
    </main>
  );
}

export const runtime = 'edge';
