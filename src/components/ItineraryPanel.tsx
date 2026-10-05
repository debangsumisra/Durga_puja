'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Bus, Car, Footprints, Hourglass, TrainFront, Utensils } from 'lucide-react';
import { useState } from 'react';
import { CROWD_STYLE, cn, inr, mins } from '@/lib/utils';
import type { Itinerary, Pandal } from '@/types/pandal';
import NearbyList from './NearbyList';

const MODE_ICON = { walk: Footprints, drive: Car, metro: TrainFront };

export default function ItineraryPanel({ itinerary, onOpen }: { itinerary: Itinerary; onOpen: (p: Pandal) => void }) {
  const [foodFor, setFoodFor] = useState<string | null>(null);
  const c = itinerary.cost;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Total time" value={mins(itinerary.totalMins)} />
        <Stat label="Finish by" value={itinerary.finishAt} />
        <Stat label="Distance" value={`${itinerary.totalDistanceKm} km`} />
        <Stat label="In queues" value={mins(itinerary.totalQueueMins)} />
      </div>

      <div className="card p-4">
        <h4 className="mb-2 text-sm font-semibold">Transport cost for the whole route (per person)</h4>
        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
          <Cost icon={TrainFront} label="Metro" value={c.metro} />
          <Cost icon={Bus} label="Non-AC bus" value={c.busNonAc} />
          <Cost icon={Bus} label="AC bus" value={c.busAc} />
          <Cost icon={Car} label="Yellow taxi" value={c.yellowTaxi} />
          <Cost icon={Car} label="Ride-share" value={c.rideShare} />
        </div>
        <p className="mt-2 text-[11px] text-stone-500">
          Costs apply to motorised legs only. Taxi/ride-share includes puja-night surge. {itinerary.algorithm}.
        </p>
      </div>

      <ol className="relative space-y-3 border-l border-dashed border-marigold-500/40 pl-5">
        {itinerary.stops.map((s, i) => {
          const Icon = MODE_ICON[s.leg.suggestedMode];
          return (
            <motion.li
              key={s.pandal.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="relative"
            >
              <span className="absolute -left-[33px] top-3 grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-sindoor-500 to-marigold-500 text-xs font-bold">
                {s.order}
              </span>
              <div className="mb-1 flex items-center gap-1.5 text-[11px] text-stone-400">
                <Icon className="h-3.5 w-3.5" />
                {s.leg.suggestedMode} {s.leg.distanceKm} km · {s.leg.transitMins}m
                {s.leg.trafficBufferMins > 0 && <span className="text-orange-300">+{s.leg.trafficBufferMins}m buffer</span>}
              </div>
              <div className="card p-3">
                <div className="flex items-start justify-between gap-2">
                  <button onClick={() => onOpen(s.pandal)} className="text-left font-semibold hover:text-marigold-300">
                    {s.pandal.name}
                  </button>
                  <span className={cn('chip shrink-0', CROWD_STYLE[s.crowd])}>{s.crowd}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-400">
                  <span>Arrive {s.arriveAt}</span>
                  <span className="flex items-center gap-1"><Hourglass className="h-3 w-3" />Queue ~{s.queueMins}m</span>
                  <span>View {s.viewingMins}m</span>
                  <span>Leave {s.departAt}</span>
                </div>
                <button
                  onClick={() => setFoodFor(foodFor === s.pandal.id ? null : s.pandal.id)}
                  className="mt-2 flex items-center gap-1 text-xs text-marigold-300 hover:underline"
                >
                  <Utensils className="h-3 w-3" /> {foodFor === s.pandal.id ? 'Hide' : 'Food & stays nearby'}
                </button>
                <AnimatePresence>
                  {foodFor === s.pandal.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden pt-2">
                      <NearbyList at={s.pandal.coordinates} compact />
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card px-3 py-2">
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
