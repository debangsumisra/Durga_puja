'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Orbit, Palette, Sparkles } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useCallback, useState } from 'react';
import { PANDALS, ZONE_META } from '@/data/pandals';
import type { Pandal } from '@/types/pandal';
import CoverflowSlider from './CoverflowSlider';

const PanoramaViewer = dynamic(() => import('./PanoramaViewer'), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-stone-500">Preparing 360° view…</div>,
});

export default function VirtualTour({ focus, onOpen }: { focus: Pandal | null; onOpen: (p: Pandal) => void }) {
  const [index, setIndex] = useState(() => Math.max(0, PANDALS.findIndex((p) => p.id === focus?.id)));
  const current = PANDALS[index];
  const pano = current.photos.find((ph) => ph.isPanorama360)!;
  const onSelect = useCallback((i: number) => setIndex(i), []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold">Virtual darshan</h2>
        <p className="text-sm text-stone-400">Skip the queues — swipe through pandals and step inside a 360° mandap.</p>
      </div>

      <CoverflowSlider
        items={PANDALS}
        onSelect={onSelect}
        render={(p, active) => (
          <article className={`overflow-hidden rounded-3xl border bg-ink-800 ${active ? 'border-marigold-400/60 shadow-2xl shadow-sindoor-900/70' : 'border-white/10'}`}>
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.photos[0].url} alt={p.name} className="aspect-[4/3] w-full object-cover" loading="lazy" />
              <span className="chip absolute left-3 top-3 bg-black/60 ring-white/20" style={{ color: ZONE_META[p.zone].color }}>
                {ZONE_META[p.zone].label}
              </span>
            </div>
            <div className="space-y-1 p-4">
              <h3 className="font-display text-lg font-bold">{p.name}</h3>
              <p className="line-clamp-2 text-xs text-stone-400">{p.theme2025_2026}</p>
              <div className="flex flex-wrap gap-1 pt-1">
                <span className="chip ring-marigold-400/30 text-marigold-300"><Palette className="h-3 w-3" />{p.artisan}</span>
              </div>
            </div>
          </article>
        )}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="grid gap-4 lg:grid-cols-[1fr_340px]"
        >
          <div className="card h-[420px] overflow-hidden p-1 sm:h-[520px]">
            <PanoramaViewer url={pano.url} caption={`${current.name} — ${pano.caption}`} />
          </div>
          <div className="card space-y-3 p-5 text-sm">
            <div className="flex items-center gap-2 text-marigold-300"><Orbit className="h-4 w-4" /> Drag to look around · scroll to zoom</div>
            <h3 className="font-display text-2xl font-bold">{current.name}</h3>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-stone-500">Theme</div>
              <p>{current.theme2025_2026}</p>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-stone-500">Deity</div>
              <p>{current.deityDescription}</p>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-stone-500">Heritage</div>
              <p className="text-stone-300">{current.historicalSignificance}</p>
            </div>
            <button className="btn-primary w-full" onClick={() => onOpen(current)}>
              <Sparkles className="h-4 w-4" /> Gallery, crowd forecast & food nearby
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
