import { NextResponse } from 'next/server';
import { getPandal } from '@/data/pandals';
import { osmNearby } from '@/lib/live';
import { nearbyPlaces } from '@/lib/nearby';
import type { PlaceKind } from '@/types/pandal';

export const dynamic = 'force-dynamic';

/**
 * GET /api/nearby?pandalId=bagbazar  or  ?lat=..&lng=..  [&kind=hotel,restaurant]
 * Live data from OpenStreetMap (Overpass). Falls back to the curated list
 * (which carries ratings) if every Overpass mirror is down.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const pandal = searchParams.get('pandalId') ? getPandal(searchParams.get('pandalId')!) : undefined;
  const at = pandal ? pandal.coordinates : { lat: Number(searchParams.get('lat')), lng: Number(searchParams.get('lng')) };
  if (!Number.isFinite(at.lat) || !Number.isFinite(at.lng)) {
    return NextResponse.json({ error: 'Provide pandalId or lat/lng' }, { status: 400 });
  }
  const kinds = searchParams.get('kind')?.split(',') as PlaceKind[] | undefined;
  const curated = nearbyPlaces(at, { kinds, radiusKm: 3, limit: 12 });

  try {
    const live = (await osmNearby(at)).filter((p) => !kinds || kinds.includes(p.kind));
    // Curated favourites (with ratings) first, then live OSM places not already listed.
    const names = new Set(curated.map((c) => c.name.toLowerCase()));
    const merged = [...curated.map((c) => ({ ...c, source: 'curated' })), ...live.filter((l) => !names.has(l.name.toLowerCase())).map((l) => ({ ...l, source: 'openstreetmap' }))];
    return NextResponse.json({ source: 'openstreetmap', places: merged.slice(0, 30) });
  } catch (e) {
    return NextResponse.json({ source: 'curated', warning: `Live OSM lookup failed: ${(e as Error).message}`, places: curated.map((c) => ({ ...c, source: 'curated' })) });
  }
}
