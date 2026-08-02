import type { Metadata } from 'next';
import { EventClient } from './EventClient';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api-shop.tanhdev.com';

async function getEvent(slug: string) {
  try {
    const res = await fetch(`${API_BASE}/api/cms/${slug}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.data : null;
  } catch (err) {
    console.error('Failed to fetch event', err);
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) return { title: 'Event Not Found' };
  return { title: event.title, description: event.excerpt || event.title };
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEvent(slug);

  return <EventClient event={event} />;
}

export const runtime = 'edge';
