'use client';

import * as Slider from '@radix-ui/react-slider';
import { motion } from 'framer-motion';
import { Car, Crosshair, Footprints, Loader2, Route, Sparkles, TrainFront, Trash2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useCallback, useMemo, useState } from 'react';
import { PANDALS, ZONE_META } from '@/data/pandals';
import { formatClock, START_PRESETS } from '@/lib/geo';
import { crowdAt, suggestByZone } from '@/lib/planner';
import { CROWD_STYLE, cn } from '@/lib/utils';
import type { Itinerary, LatLng, Pandal, TravelMode } from '@/types/pandal';
import ItineraryPanel from './ItineraryPanel';

const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-stone-500">Loading map…</div>,
});

const MODES: Array<{ id: TravelMode; label: string; icon: typeof Car }> = [
  { id: 'metro-mix', label: 'Metro + walk', icon: TrainFront },
  { id: 'drive', label: 'Cab / car', icon: Car },
  { id: 'walk', label: 'Walk only', icon: Footprints },
];

interface Props {
  selected: string[];
  setSelected: (fn: (s: string[]) => string[]) => void;
  hour: number;
  setHour: (h: number) => void;
  onOpen: (p: Pandal) => void;
}

export default function Planner({ selected, setSelected, hour, setHour, onOpen }: Props) {
  const [start, setStart] = useState<LatLng>(START_PRESETS[2].coordinates);
  const [startName, setStartName] = useState(START_PRESETS[2].name);
  const [mode, setMode] = useState<TravelMode>('metro-mix');
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestions = useMemo(() => suggestByZone(start, hour), [start, hour]);

  const toggle = useCallback(
    (id: string) => {
      setItinerary(null);
      setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    },
    [setSelected],
  );

  const dropStart = useCallback((c: LatLng) => {
    setStart(c);
    setStartName('Dropped pin');
    setItinerary(null);
  }, []);

  const locate = () => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setStart({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStartName('My location');
        setItinerary(null);
      },
      () => setError('Could not read your location — drop a pin on the map instead.'),
    );
  };

  const autoPick = (zone: string) => {
    const s = suggestions.find((z) => z.zone === zone);
    if (!s) return;
    setItinerary(null);
    setSelected(() => s.pandals.slice(0, 5).map((p) => p.id));
  };

  const plan = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start, pandalIds: selected, startHour: hour, mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Route planning failed');
      setItinerary(data as Itinerary);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
      {/* ------------ Controls ------------ */}
      <aside className="space-y-4">
        <div className="card space-y-3 p-4">
          <h3 className="text-sm font-semibold">1 · Where are you starting?</h3>
          <div className="flex flex-wrap gap-1.5">
            {START_PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => {
                  setStart(p.coordinates);
                  setStartName(p.name);
                  setItinerary(null);
                }}
                className={cn('rounded-lg px-2 py-1 text-xs', startName === p.name ? 'bg-emerald-600 text-white' : 'bg-white/5 text-stone-300 hover:bg-white/10')}
              >
                {p.name}
              </button>
            ))}
            <button onClick={locate} className="flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1 text-xs text-stone-300 hover:bg-white/10">
              <Crosshair className="h-3 w-3" /> Use my location
            </button>
          </div>
          <p className="text-[11px] text-stone-500">Or click / drag the ★ on the map. Current: <b className="text-stone-300">{startName}</b></p>
        </div>

        <div className="card space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">2 · When do you leave?</h3>
            <span className="font-display text-lg font-bold text-marigold-300">{formatClock(hour)}</span>
          </div>
          <Slider.Root
            className="relative flex h-5 w-full touch-none select-none items-center"
            min={6}
            max={26}
            step={0.5}
            value={[hour < 6 ? hour + 24 : hour]}
            onValueChange={([v]) => {
              setHour(v % 24);
              setItinerary(null);
            }}
          >
            <Slider.Track className="relative h-1.5 grow rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-red-600">
              <Slider.Range className="absolute h-full" />
            </Slider.Track>
            <Slider.Thumb aria-label="Start time" className="block h-5 w-5 rounded-full border-2 border-white bg-sindoor-500 shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-marigold-400" />
          </Slider.Root>
          <div className="flex justify-between text-[10px] text-stone-500"><span>6 AM</span><span>Noon</span><span>6 PM</span><span>2 AM</span></div>
          <div className="grid grid-cols-3 gap-1.5">
            {MODES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => {
                  setMode(id);
                  setItinerary(null);
                }}
                className={cn('flex flex-col items-center gap-1 rounded-xl py-2 text-[11px]', mode === id ? 'bg-sindoor-600 text-white' : 'bg-white/5 text-stone-300 hover:bg-white/10')}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
        </div>

        <div className="card p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">3 · Pick pandals by zone</h3>
            {selected.length > 0 && (
              <button onClick={() => { setSelected(() => []); setItinerary(null); }} className="flex items-center gap-1 text-[11px] text-stone-400 hover:text-red-300">
                <Trash2 className="h-3 w-3" /> Clear ({selected.length})
              </button>
            )}
          </div>
          <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1 scrollbar-thin">
            {suggestions.map((z) => (
              <div key={z.zone}>
                <div className="sticky top-0 z-10 flex items-center justify-between bg-ink-800 py-1">
                  <div>
                    <span className="text-sm font-semibold" style={{ color: ZONE_META[z.zone].color }}>{ZONE_META[z.zone].label}</span>
                    <span className="ml-2 text-[11px] text-stone-500">{z.distanceKm} km away</span>
                  </div>
                  <button onClick={() => autoPick(z.zone)} className="flex items-center gap-1 rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-marigold-300 hover:bg-white/10">
                    <Sparkles className="h-3 w-3" /> Best 5
                  </button>
                </div>
                <p className="mb-1 text-[11px] text-stone-500">{ZONE_META[z.zone].blurb}</p>
                <ul className="space-y-1">
                  {z.pandals.map((p) => {
                    const crowd = crowdAt(p, hour);
                    const isSel = selected.includes(p.id);
                    return (
                      <li key={p.id} className={cn('flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs', isSel ? 'bg-marigold-500/15' : 'hover:bg-white/5')}>
                        <input type="checkbox" checked={isSel} onChange={() => toggle(p.id)} className="accent-orange-500" aria-label={`Select ${p.name}`} />
                        <button onClick={() => onOpen(p)} className="min-w-0 flex-1 truncate text-left hover:text-marigold-300">{p.name}</button>
                        <span className="text-stone-500">{p.distanceKm}km</span>
                        <span className={cn('chip', CROWD_STYLE[crowd])}>{crowd}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <button onClick={plan} disabled={selected.length === 0 || loading} className="btn-primary w-full !py-3">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Route className="h-4 w-4" />}
          Optimise route for {selected.length} pandal{selected.length === 1 ? '' : 's'}
        </button>
        {error && <p className="text-xs text-red-300">{error}</p>}
      </aside>

      {/* ------------ Map + itinerary ------------ */}
      <section className="space-y-4">
        <div className="card h-[460px] overflow-hidden lg:h-[560px]">
          <MapView
            pandals={PANDALS}
            start={start}
            selected={selected}
            itinerary={itinerary}
            onDropStart={dropStart}
            onToggle={toggle}
            onOpen={onOpen}
          />
        </div>
        {itinerary ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <ItineraryPanel itinerary={itinerary} onOpen={onOpen} />
          </motion.div>
        ) : (
          <div className="card p-6 text-center text-sm text-stone-400">
            Select pandals (or tap <b className="text-marigold-300">Best 5</b> on a zone) and hit <b>Optimise route</b> to get a crowd-aware,
            time-stamped itinerary with metro, bus and taxi costs.
          </div>
        )}
      </section>
    </div>
  );
}
