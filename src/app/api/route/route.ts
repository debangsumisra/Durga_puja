import { NextResponse } from 'next/server';
import { PANDALS } from '@/data/pandals';
import { planItinerary } from '@/lib/planner';
import type { RouteRequest, TravelMode } from '@/types/pandal';

const MODES: TravelMode[] = ['walk', 'drive', 'metro-mix'];

/** POST /api/route — body: RouteRequest → optimized Itinerary */
export async function POST(req: Request) {
  let body: RouteRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { start, pandalIds, startHour, mode } = body;
  if (!start || !Number.isFinite(start.lat) || !Number.isFinite(start.lng)) {
    return NextResponse.json({ error: 'start {lat,lng} required' }, { status: 400 });
  }
  if (!Array.isArray(pandalIds) || pandalIds.length === 0) {
    return NextResponse.json({ error: 'pandalIds must be a non-empty array' }, { status: 400 });
  }
  if (pandalIds.length > 15) {
    return NextResponse.json({ error: 'Pick at most 15 pandals per route' }, { status: 400 });
  }
  const selected = PANDALS.filter((p) => pandalIds.includes(p.id));
  if (selected.length === 0) {
    return NextResponse.json({ error: 'No known pandal ids supplied' }, { status: 400 });
  }
  const itinerary = planItinerary(
    start,
    selected,
    Number.isFinite(startHour) ? startHour : 18,
    MODES.includes(mode) ? mode : 'drive',
  );
  return NextResponse.json(itinerary);
}
