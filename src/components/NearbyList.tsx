'use client';

import { BedDouble, Loader2, Soup, Star, UtensilsCrossed } from 'lucide-react';
import { useState } from 'react';
import { useNearby } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import type { LatLng, PlaceKind } from '@/types/pandal';

const TABS: Array<{ kind: PlaceKind; label: string; icon: typeof Soup }> = [
  { kind: 'restaurant', label: 'Restaurants', icon: UtensilsCrossed },
  { kind: 'street-food', label: 'Street food', icon: Soup },
  { kind: 'hotel', label: 'Stays', icon: BedDouble },
];

export default function NearbyList({ at, pandalId, compact = false }: { at: LatLng; pandalId?: string; compact?: boolean }) {
  const [kind, setKind] = useState<PlaceKind>('street-food');
  const query = pandalId ? `pandalId=${pandalId}` : `lat=${at.lat}&lng=${at.lng}`;
  const { places, source, loading } = useNearby(query, query);
  const shown = places.filter((p) => p.kind === kind).slice(0, compact ? 4 : 8);

  return (
    <div data-testid="nearby">
      <div className="mb-2 flex flex-wrap items-center gap-1">
        {TABS.map(({ kind: k, label, icon: Icon }) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={cn('flex items-center gap-1 rounded-lg px-2 py-1 text-xs', k === kind ? 'bg-marigold-500/20 text-marigold-300' : 'text-stone-400 hover:bg-white/5')}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
        {!loading && (
          <span className="ml-auto text-[10px] text-stone-500">{source === 'openstreetmap' ? '● Live from OpenStreetMap' : '● Curated list (OSM busy)'}</span>
        )}
      </div>
      {loading ? (
        <p className="flex items-center gap-1 text-xs text-stone-500"><Loader2 className="h-3 w-3 animate-spin" /> Finding places nearby…</p>
      ) : shown.length === 0 ? (
        <p className="text-xs text-stone-500">Nothing found within walking distance.</p>
      ) : (
        <ul className="space-y-1.5">
          {shown.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs">
              <div className="min-w-0">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${p.coordinates.lat},${p.coordinates.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate font-medium text-stone-100 hover:text-marigold-300"
                >
                  {p.name}
                </a>
                <div className="truncate capitalize text-stone-400">{p.speciality || p.address}</div>
              </div>
              <div className="shrink-0 text-right">
                {p.rating > 0 ? (
                  <div className="flex items-center justify-end gap-0.5 text-marigold-300"><Star className="h-3 w-3 fill-current" />{p.rating}</div>
                ) : (
                  <div className="text-[10px] text-sky-300">OSM</div>
                )}
                <div className="text-stone-500">{p.walkMins} min walk</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
