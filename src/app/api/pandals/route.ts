import { NextResponse } from 'next/server';
import { PANDALS } from '@/data/pandals';
import { suggestByZone } from '@/lib/planner';
import type { Zone } from '@/types/pandal';

/**
 * GET /api/pandals                    → all pandals
 * GET /api/pandals?zone=South         → filter by zone
 * GET /api/pandals?lat=..&lng=..&hour=19 → zone-clustered suggestions for a start point
 */
export function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get('lat'));
  const lng = Number(searchParams.get('lng'));
  const zone = searchParams.get('zone') as Zone | null;

  if (searchParams.has('lat') && searchParams.has('lng')) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: 'lat/lng must be numbers' }, { status: 400 });
    }
    const hour = Number(searchParams.get('hour') ?? 18);
    return NextResponse.json({ suggestions: suggestByZone({ lat, lng }, hour) });
  }

  const pandals = zone ? PANDALS.filter((p) => p.zone === zone) : PANDALS;
  return NextResponse.json({ pandals });
}
