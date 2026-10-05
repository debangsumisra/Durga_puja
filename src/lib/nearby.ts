import { PLACES } from '@/data/places';
import { roadKm } from '@/lib/geo';
import type { LatLng, NearbyPlace, PlaceKind } from '@/types/pandal';

export function nearbyPlaces(
  at: LatLng,
  opts: { kinds?: PlaceKind[]; radiusKm?: number; limit?: number } = {},
): NearbyPlace[] {
  const { kinds, radiusKm = 2.5, limit = 6 } = opts;
  return PLACES.filter((p) => !kinds || kinds.includes(p.kind))
    .map((p) => {
      const d = roadKm(at, p.coordinates);
      return { ...p, distanceKm: Math.round(d * 100) / 100, walkMins: Math.max(1, Math.round((d / 4.2) * 60)) };
    })
    .filter((p) => p.distanceKm <= radiusKm)
    // closeness matters, but a great spot slightly further away still wins
    .sort((a, b) => b.rating * 2 - b.distanceKm - (a.rating * 2 - a.distanceKm))
    .slice(0, limit);
}
