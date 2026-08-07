import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import LandingClient from './LandingClient';
import type { LandingPageData, ComboRule } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api-shop.tanhdev.com';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  if (!slug) {
    return { title: 'Landing Page' };
  }

  try {
    const res = await fetch(`${API_BASE}/api/landing-pages/${slug}`, {
      next: { revalidate: 60 },
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      return { title: 'Landing Page' };
    }

    const data = await res.json();
    if (!data.success || !data.data) {
      return { title: 'Landing Page' };
    }

    const lp: LandingPageData = data.data;
    return {
      title: lp.seo_title || lp.title || 'Landing Page',
      description: lp.seo_description || undefined,
    };
  } catch {
    return { title: 'Landing Page' };
  }
}

export default async function LandingPage({ params }: PageProps) {
  const { slug } = await params;

  if (!slug) {
    notFound();
  }

  let lpData: LandingPageData | null = null;
  let comboRules: ComboRule[] = [];

  try {
    const res = await fetch(`${API_BASE}/api/landing-pages/${slug}`, {
      next: { revalidate: 60 },
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      notFound();
    }

    const data = await res.json();
    if (!data.success || !data.data) {
      notFound();
    }

    lpData = data.data;

    if (lpData?.combo_rules_json) {
      try {
        comboRules = typeof lpData.combo_rules_json === 'string'
          ? JSON.parse(lpData.combo_rules_json)
          : (Array.isArray(lpData.combo_rules_json) ? lpData.combo_rules_json : []);
      } catch {
        comboRules = [];
      }
    }
  } catch {
    notFound();
  }

  return (
    <main data-landing="true" style={{ backgroundColor: '#fff', color: '#000', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <LandingClient lp={lpData} comboRules={comboRules} initialSlug={slug} apiUrl={API_BASE} />
    </main>
  );
}

export const runtime = 'edge';
