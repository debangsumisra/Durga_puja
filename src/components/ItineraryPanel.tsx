'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Bus, Car, CloudRain, Footprints, Hourglass, Lightbulb, Navigation, Radio, TrainFront, Utensils } from 'lucide-react';
import { useState } from 'react';
import { CROWD_STYLE, cn, inr, mins } from '@/lib/utils';
import type { Itinerary, Pandal } from '@/types/pandal';
import NearbyList from './NearbyList';

const MODE_ICON = { walk: Footprints, drive: Car, metro: TrainFront };
const MODE_LABEL = { walk: 'Walk', drive: 'Cab', metro: 'Metro' };

export default function ItineraryPanel({ itinerary, onOpen }: { itinerary: Itinerary; onOpen: (p: Pandal) => void }) {
  const [foodFor, setFoodFor] = useState<string | null>(null);
  const c = itinerary.cost;
  const savedMins = itinerary.baseline.totalMins - itinerary.totalMins;
  const savedFare = itinerary.baseline.totalFare - itinerary.totalFare;
  const live = itinerary.live;
  const gmaps =
    'https://www.google.com/maps/dir/' +
    [itinerary.stops[0]?.leg.path[0], ...itinerary.stops.map((s) => s.pandal.coordinates)]
      .filter(Boolean)
      .map((p) => `${p!.lat},${p!.lng}`)
      .join('/');

  return (
    <div className="space-y-4" data-testid="itinerary">
      {live && (
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className={cn('chip', live.routing === 'osrm' ? 'text-emerald-300 ring-emerald-500/40' : 'text-amber-300 ring-amber-500/40')}>
            <Radio className="h-3 w-3" /> {live.routing === 'osrm' ? 'Real road routing (OSRM)' : 'Estimated distances (router offline)'}
          </span>
          <span className="chip text-sky-300 ring-sky-500/40">
            <CloudRain className="h-3 w-3" /> {live.weather.description}
            {Number.isFinite(live.weather.temperatureC) && ` · ${Math.round(live.weather.temperatureC)}°C`}
            {live.weather.crowdFactor < 1 && ` · crowds −${Math.round((1 - live.weather.crowdFactor) * 100)}%`}
          </span>
          <span className="chip text-stone-300 ring-white/20">
            <Car className="h-3 w-3" /> Traffic: {live.traffic.source === 'tomtom' ? `live TomTom ×${live.traffic.factor.toFixed(1)}` : 'puja time-of-day model'}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Stat label="Total time" value={mins(itinerary.totalMins)} />
        <Stat label="Finish by" value={itinerary.finishAt} />
        <Stat label="Travel fare" value={inr(itinerary.totalFare)} testId="total-fare" />
        <Stat label="Road distance" value={`${itinerary.totalDistanceKm} km`} />
        <Stat label="In queues" value={mins(itinerary.totalQueueMins)} />
      </div>

      {(savedMins > 0 || savedFare > 0) && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200" data-testid="savings">
          Optimised order saves <b>{mins(Math.max(0, savedMins))}</b>
          {savedFare > 0 && <> and <b>{inr(savedFare)}</b></>} compared with visiting in the order you picked.
        </div>
      )}

      <div className="card p-4">
        <h4 className="mb-2 text-sm font-semibold">If you used one mode for every leg (per person)</h4>
        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
          <Cost icon={TrainFront} label="Metro" value={c.metro} />
          <Cost icon={Bus} label="Non-AC bus" value={c.busNonAc} />
          <Cost icon={Bus} label="AC bus" value={c.busAc} />
          <Cost icon={Car} label="Yellow taxi" value={c.yellowTaxi} />
          <Cost icon={Car} label="Ride-share" value={c.rideShare} />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-stone-500">
            {itinerary.algorithm}. Recommended mix (walk / metro / cab per leg) shown below. Fares are 2026 estimates incl. puja-night surge.
          </p>
          <a href={gmaps} target="_blank" rel="noreferrer" className="btn-ghost !py-1.5 text-xs">
            <Navigation className="h-3.5 w-3.5" /> Navigate in Google Maps
          </a>
        </div>
        <div className="mt-2 flex gap-3 text-[11px] text-stone-400">
          <span><span className="mr-1 inline-block h-1 w-4 rounded bg-emerald-400 align-middle" />walk</span>
          <span><span className="mr-1 inline-block h-1 w-4 rounded bg-sky-400 align-middle" />metro</span>
          <span><span className="mr-1 inline-block h-1 w-4 rounded bg-marigold-400 align-middle" />cab</span>
        </div>
      </div>

      <ol className="relative space-y-3 border-l border-dashed border-marigold-500/40 pl-5">
        {itinerary.stops.map((s, i) => {
          const Icon = MODE_ICON[s.leg.suggestedMode];
          return (
            <motion.li key={s.pandal.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="relative" data-testid="stop">
              <span className="absolute -left-[33px] top-3 grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-sindoor-500 to-marigold-500 text-xs font-bold">{s.order}</span>
              <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[11px] text-stone-400">
                <Icon className="h-3.5 w-3.5" />
                {MODE_LABEL[s.leg.suggestedMode]} {s.leg.distanceKm} km · {s.leg.transitMins}m
                {s.leg.trafficBufferMins > 0 && <span className="text-orange-300">+{s.leg.trafficBufferMins}m buffer</span>}
                <span className="text-marigold-300">· {s.leg.fare ? inr(s.leg.fare) : 'free'}</span>
              </div>
              <div className="card p-3">
                <div className="flex items-start justify-between gap-2">
                  <button onClick={() => onOpen(s.pandal)} className="text-left font-semibold hover:text-marigold-300">{s.pandal.name}</button>
                  <span className={cn('chip shrink-0', CROWD_STYLE[s.crowd])}>{s.crowd}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-400">
                  <span>Arrive {s.arriveAt}</span>
                  <span className="flex items-center gap-1"><Hourglass className="h-3 w-3" />Queue ~{s.queueMins}m</span>
                  <span>View {s.viewingMins}m</span>
                  <span>Leave {s.departAt}</span>
                </div>
                {s.crowdTip && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-amber-200"><Lightbulb className="h-3 w-3" />Very busy then — {s.crowdTip.toLowerCase()}</p>
                )}
                <button onClick={() => setFoodFor(foodFor === s.pandal.id ? null : s.pandal.id)} className="mt-2 flex items-center gap-1 text-xs text-marigold-300 hover:underline">
                  <Utensils className="h-3 w-3" /> {foodFor === s.pandal.id ? 'Hide' : 'Food & stays nearby'}
                </button>
                <AnimatePresence>
                  {foodFor === s.pandal.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden pt-2">
                      <NearbyList at={s.pandal.coordinates} pandalId={s.pandal.id} compact />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}

function Stat({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div className="card px-3 py-2" data-testid={testId}>
      <div className="text-[10px] uppercase tracking-wider text-stone-500">{label}</div>
      <div className="font-display text-lg font-bold text-marigold-300">{value}</div>
    </div>
  );
}

function Cost({ icon: Icon, label, value }: { icon: typeof Bus; label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white/5 px-2 py-1.5">
      <div className="flex items-center gap-1 text-stone-400"><Icon className="h-3 w-3" />{label}</div>
      <div className="font-semibold">{inr(value)}</div>
    </div>
  );
}
