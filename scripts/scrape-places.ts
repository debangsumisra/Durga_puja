/**
 * Refresh nearby restaurants, street food and hotels around each pandal using
 * the Google Places API (New) Nearby Search.
 *
 *   GOOGLE_PLACES_API_KEY=... npm run scrape:food
 *
 * Output: scripts/output/places.json (Place[]), ready to replace src/data/places.ts entries.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PANDALS } from '../src/data/pandals';
import type { Place, PlaceKind } from '../src/types/pandal';

const KEY = process.env.GOOGLE_PLACES_API_KEY;
const KINDS: Record<PlaceKind, string[]> = {
  restaurant: ['restaurant'],
  'street-food': ['fast_food_restaurant', 'snack_bar', 'dessert_shop'],
  hotel: ['hotel', 'guest_house'],
};
const PRICE: Record<string, Place['priceLevel']> = {
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

interface GPlace {
  id: string;
  displayName?: { text: string };
  location: { latitude: number; longitude: number };
  rating?: number;
  priceLevel?: string;
  formattedAddress?: string;
  primaryTypeDisplayName?: { text: string };
}

async function nearby(lat: number, lng: number, types: string[]): Promise<GPlace[]> {
  const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': KEY!,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.rating,places.priceLevel,places.formattedAddress,places.primaryTypeDisplayName',
    },
    body: JSON.stringify({
      includedTypes: types,
      maxResultCount: 8,
      rankPreference: 'POPULARITY',
      locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius: 1500 } },
    }),
  });
  if (!res.ok) throw new Error(`Places API ${res.status}: ${await res.text()}`);
  return ((await res.json()).places ?? []) as GPlace[];
}

async function main() {
  if (!KEY) {
    console.error('Set GOOGLE_PLACES_API_KEY (see .env.example)');
    process.exit(1);
  }
  const all = new Map<string, Place>();
  for (const p of PANDALS) {
    for (const [kind, types] of Object.entries(KINDS) as Array<[PlaceKind, string[]]>) {
      const results = await nearby(p.coordinates.lat, p.coordinates.lng, types);
      for (const r of results) {
        if (all.has(r.id) || (r.rating ?? 0) < 3.8) continue;
        all.set(r.id, {
          id: r.id,
          name: r.displayName?.text ?? 'Unknown',
          kind,
          coordinates: { lat: r.location.latitude, lng: r.location.longitude },
          rating: r.rating ?? 0,
          priceLevel: PRICE[r.priceLevel ?? ''] ?? 2,
          speciality: r.primaryTypeDisplayName?.text ?? kind,
          address: r.formattedAddress ?? '',
        });
      }
      await new Promise((r) => setTimeout(r, 150)); // be gentle with quota
    }
    console.log(`✓ ${p.name}`);
  }
  const outDir = path.join(process.cwd(), 'scripts', 'output');
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'places.json'), JSON.stringify([...all.values()], null, 2));
  console.log(`Saved ${all.size} places`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
