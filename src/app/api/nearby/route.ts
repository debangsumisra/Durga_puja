import { NextResponse } from 'next/server';
import { getPandal } from '@/data/pandals';
import { nearbyPlaces } from '@/lib/nearby';
import type { PlaceKind } from '@/types/pandal';

/** GET /api/nearby?pandalId=bagbazar  or  ?lat=..&lng=..  [&kind=hotel,restaurant&radius=2] */
export function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const pandal = searchParams.get('pandalId') ? getPandal(searchParams.get('pandalId')!) : undefined;
  const at = pandal
    ? pandal.coordinates
    : { lat: Number(searchParams.get('lat')), lng: Number(searchParams.get('lng')) };
  if (!Number.isFinite(at.lat) || !Number.isFinite(at.lng)) {
    return NextResponse.json({ error: 'Provide pandalId or lat/lng' }, { status: 400 });
  }
  const kinds = searchParams.get('kind')?.split(',') as PlaceKind[] | undefined;
  const radiusKm = Number(searchParams.get('radius') ?? 2.5);
  return NextResponse.json({ places: nearbyPlaces(at, { kinds, radiusKm, limit: 12 }) });
}
