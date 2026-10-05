'use client';

import { BedDouble, Soup, Star, UtensilsCrossed } from 'lucide-react';
import { useMemo, useState } from 'react';
import { nearbyPlaces } from '@/lib/nearby';
import { cn } from '@/lib/utils';
import type { LatLng, PlaceKind } from '@/types/pandal';

const TABS: Array<{ kind: PlaceKind; label: string; icon: typeof Soup }> = [
  { kind: 'restaurant', label: 'Restaurants', icon: UtensilsCrossed },
  { kind: 'street-food', label: 'Street food', icon: Soup },
  { kind: 'hotel', label: 'Stays', icon: BedDouble },
];

export default function NearbyList({ at, compact = false }: { at: LatLng; compact?: boolean }) {
  const [kind, setKind] = useState<PlaceKind>('street-food');
  const places = useMemo(() => nearbyPlaces(at, { kinds: [kind], radiusKm: 3, limit: compact ? 3 : 6 }), [at, kind, compact]);

  return (
    <div>
      <div className="mb-2 flex gap-1">
        {TABS.map(({ kind: k, label, icon: Icon }) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={cn(
              'flex items-center gap-1 rounded-lg px-2 py-1 text-xs',
              k === kind ? 'bg-marigold-500/20 text-marigold-300' : 'text-stone-400 hover:bg-white/5',
            )}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>
      {places.length === 0 ? (
        <p className="text-xs text-stone-500">Nothing curated within 3 km yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {places.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs">
              <div className="min-w-0">
                <div className="truncate font-medium text-stone-100">{p.name}</div>
                <div className="truncate text-stone-400">{p.speciality} · {'₹'.repeat(p.priceLevel)}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="flex items-center justify-end gap-0.5 text-marigold-300"><Star className="h-3 w-3 fill-current" />{p.rating}</div>
                <div className="text-stone-500">{p.walkMins} min walk</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
