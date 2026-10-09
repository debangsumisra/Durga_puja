'use client';

import * as Tabs from '@radix-ui/react-tabs';
import { motion } from 'framer-motion';
import { Map, Newspaper, Orbit } from 'lucide-react';
import { useState } from 'react';
import { PANDALS } from '@/data/pandals';
import type { Pandal } from '@/types/pandal';
import PandalDialog from './PandalDialog';
import LiveFeed from './LiveFeed';
import Planner from './Planner';
import VirtualTour from './VirtualTour';
import { useLive } from '@/lib/hooks';

export default function PujoPulseApp() {
  const [tab, setTab] = useState('live');
  const [selected, setSelected] = useState<string[]>([]);
  const [hour, setHour] = useState(17);
  const [open, setOpen] = useState<Pandal | null>(null);
  const [virtualFocus, setVirtualFocus] = useState<Pandal | null>(null);
  const live = useLive();

  return (
    <main className="mx-auto max-w-7xl px-4 pb-16">
      <header className="flex flex-col gap-6 py-8 sm:py-12 md:flex-row md:items-end md:justify-between">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-marigold-400">Kolkata · Sharodotsav 2026</p>
          <h1 className="mt-2 font-display text-5xl font-extrabold leading-none sm:text-6xl">
            Pujo<span className="bg-gradient-to-r from-sindoor-500 to-marigold-400 bg-clip-text text-transparent">Pulse</span> 2026
          </h1>
          <p className="mt-3 max-w-xl text-stone-400">
            Plan your pandal hopping across {PANDALS.length} iconic pujas — crowd-aware timings, the smartest route, metro/bus/taxi costs, food on the way,
            and 360° virtual darshan when the queues get wild.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px]" data-testid="live-status">
            <span className="chip text-emerald-300 ring-emerald-500/40"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> LIVE</span>
            {live ? (
              <>
                <span className="chip text-stone-300 ring-white/20">Kolkata {live.now}</span>
                <span className="chip text-sky-300 ring-sky-500/40">
                  {live.weather.description}
                  {Number.isFinite(live.weather.temperatureC) && ` · ${Math.round(live.weather.temperatureC)}°C · rain ${live.weather.rainProbability}%`}
                </span>
              </>
            ) : (
              <span className="chip text-stone-400 ring-white/10">Fetching live conditions…</span>
            )}
          </div>
        </motion.div>
        <motion.div
          initial={{ scale: 0.8, opacity: 0, rotate: -20 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ duration: 0.8, type: 'spring' }}
          aria-hidden
          className="hidden h-28 w-28 shrink-0 rounded-full bg-[conic-gradient(from_0deg,#e0301e,#ffbf3c,#e0301e,#ffbf3c,#e0301e)] p-1 md:block"
        >
          <div className="grid h-full w-full place-items-center rounded-full bg-ink-900 font-display text-4xl">🪔</div>
        </motion.div>
      </header>

      <Tabs.Root value={tab} onValueChange={setTab}>
        <Tabs.List className="mb-6 inline-flex rounded-2xl border border-white/10 bg-ink-800 p-1" aria-label="PujoPulse sections">
          {[
            { v: 'live', label: 'Live Mahalaya feed', icon: Newspaper },
            { v: 'plan', label: 'Route planner', icon: Map },
            { v: 'virtual', label: '3D virtual darshan', icon: Orbit },
          ].map(({ v, label, icon: Icon }) => (
            <Tabs.Trigger
              key={v}
              value={v}
              className="relative flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-stone-400 data-[state=active]:text-white"
            >
              {tab === v && <motion.span layoutId="tab-pill" className="absolute inset-0 rounded-xl bg-gradient-to-r from-sindoor-600 to-marigold-600" />}
              <Icon className="relative h-4 w-4" />
              <span className="relative">{label}</span>
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="live">
          <LiveFeed onOpen={setOpen} />
        </Tabs.Content>
        <Tabs.Content value="plan">
          <Planner selected={selected} setSelected={setSelected} hour={hour} setHour={setHour} onOpen={setOpen} />
        </Tabs.Content>
        <Tabs.Content value="virtual">
          <VirtualTour key={virtualFocus?.id ?? 'default'} focus={virtualFocus} onOpen={setOpen} />
        </Tabs.Content>
      </Tabs.Root>

      <PandalDialog
        pandal={open}
        hour={hour}
        selected={!!open && selected.includes(open.id)}
        onClose={() => setOpen(null)}
        onToggle={(id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))}
        onVirtual={(p) => {
          setVirtualFocus(p);
          setOpen(null);
          setTab('virtual');
        }}
      />

      <footer className="mt-16 border-t border-white/10 pt-6 text-xs text-stone-500">
        Crowd, traffic and fare figures are model estimates for planning — always follow Kolkata Police puja-traffic advisories.
        Map data © OpenStreetMap contributors. Shubho Sharodiya!
      </footer>
    </main>
  );
}
