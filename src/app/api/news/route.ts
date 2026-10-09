import { NextResponse } from 'next/server';
import { NEWS_REVALIDATE_SECONDS, scrapeNews } from '@/lib/news';

// Re-scraped at most once every 4 hours (served stale-while-revalidate from the edge cache).
export const revalidate = 14400;
export const maxDuration = 30;

/** GET /api/news → latest Durga Puja / Kolkata pandal news with pictures */
export async function GET() {
  const data = await scrapeNews();
  return NextResponse.json(
    { ...data, refreshEverySeconds: NEWS_REVALIDATE_SECONDS },
    { headers: { 'Cache-Control': `public, s-maxage=${NEWS_REVALIDATE_SECONDS}, stale-while-revalidate=3600` } },
  );
}
