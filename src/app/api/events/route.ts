import { NextResponse } from 'next/server';
import { findEvents } from '@/lib/events';
import { NEWS_REVALIDATE_SECONDS } from '@/lib/news';

// LLM search + per-event news scrape. Computed per request but cached at the CDN for 4 hours (s-maxage below).
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** GET /api/events → West Bengal Mahalaya→Dashami events found by an LLM search, each with scraped news + picture */
export async function GET() {
  const data = await findEvents();
  return NextResponse.json(data, { headers: { 'Cache-Control': `public, s-maxage=${NEWS_REVALIDATE_SECONDS}, stale-while-revalidate=3600` } });
}
