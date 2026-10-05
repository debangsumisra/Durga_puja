import { PANDALS, ZONES } from '@/data/pandals';
import { formatClock, haversineKm, roadKm } from '@/lib/geo';
import type {
  CostBreakdown,
  CrowdLevel,
  Itinerary,
  ItineraryStop,
  LatLng,
  Pandal,
  RouteLeg,
  TravelMode,
  Zone,
} from '@/types/pandal';

// ---------------------------------------------------------------------------
// Crowd & queue model
// ---------------------------------------------------------------------------

export const QUEUE_MINS: Record<CrowdLevel, number> = { Low: 5, Medium: 15, High: 35, Extreme: 70 };
export const CROWD_SCORE: Record<CrowdLevel, number> = { Low: 0, Medium: 1, High: 2, Extreme: 3 };

export function crowdAt(p: Pandal, hourDecimal: number): CrowdLevel {
  return p.crowdLevelByHour[Math.floor(((hourDecimal % 24) + 24) % 24)];
}

/** Queue wait scales with viewing time: bigger pandals have longer snaking lines. */
export function queueMins(p: Pandal, hourDecimal: number): number {
  return Math.round(QUEUE_MINS[crowdAt(p, hourDecimal)] * (p.avgViewingTimeMins / 20));
}

// ---------------------------------------------------------------------------
// Traffic model — puja-night speeds in Kolkata collapse after sunset.
// ---------------------------------------------------------------------------

export function driveSpeedKmh(hourDecimal: number): number {
  const h = Math.floor(((hourDecimal % 24) + 24) % 24);
  if (h >= 2 && h < 7) return 26;
  if (h >= 7 && h < 11) return 18;
  if (h >= 11 && h < 16) return 16;
  if (h >= 16 && h < 19) return 11;
  return 8; // 19:00–02:00 peak pandal hopping, many roads one-way / closed
}

const WALK_KMH = 4.2;

/** Buffer added for parking, diversions and police barricading. */
export function trafficBufferMins(distanceKm: number, hourDecimal: number): number {
  const h = Math.floor(((hourDecimal % 24) + 24) % 24);
  const peak = h >= 18 || h < 2;
  return Math.round((peak ? 8 : 3) + distanceKm * (peak ? 2 : 0.5));
}

// ---------------------------------------------------------------------------
// Fare model (INR, 2026 estimates)
// ---------------------------------------------------------------------------

export function metroFare(km: number): number {
  if (km <= 2) return 5;
  if (km <= 5) return 10;
  if (km <= 10) return 15;
  if (km <= 20) return 20;
  return 25;
}

export function estimateCost(km: number, hourDecimal: number): CostBreakdown {
  const h = Math.floor(((hourDecimal % 24) + 24) % 24);
  const surge = h >= 19 || h < 2 ? 1.8 : h >= 16 ? 1.3 : 1.0;
  const taxi = km <= 2 ? 30 : 30 + (km - 2) * 25;
  return {
    metro: metroFare(km),
    busNonAc: km <= 4 ? 10 : km <= 8 ? 14 : 20,
    busAc: km <= 4 ? 20 : km <= 10 ? 30 : 45,
    yellowTaxi: Math.round(taxi * (surge > 1 ? 1.2 : 1)), // night-time haggling premium
    rideShare: Math.round((45 + km * 18) * surge),
  };
}

const ZERO_COST: CostBreakdown = { metro: 0, busNonAc: 0, busAc: 0, yellowTaxi: 0, rideShare: 0 };

function addCost(a: CostBreakdown, b: CostBreakdown): CostBreakdown {
  return {
    metro: a.metro + b.metro,
    busNonAc: a.busNonAc + b.busNonAc,
    busAc: a.busAc + b.busAc,
    yellowTaxi: a.yellowTaxi + b.yellowTaxi,
    rideShare: a.rideShare + b.rideShare,
  };
}

// ---------------------------------------------------------------------------
// Legs
// ---------------------------------------------------------------------------

function buildLeg(from: { name: string; c: LatLng }, to: Pandal, mode: TravelMode, hour: number): RouteLeg {
  const km = roadKm(from.c, to.coordinates);
  let suggested: RouteLeg['suggestedMode'];
  let mins: number;
  if (mode === 'walk' || km < 1.2) {
    suggested = 'walk';
    mins = (km / WALK_KMH) * 60;
  } else if (mode === 'metro-mix' && km > 3) {
    suggested = 'metro';
    // walk to/from stations + ~35 km/h in-train + 6 min headway
    mins = ((to.metroDistanceKm + 0.6) / WALK_KMH) * 60 + (km / 35) * 60 + 6;
  } else {
    suggested = 'drive';
    mins = (km / driveSpeedKmh(hour)) * 60;
  }
  const buffer = suggested === 'walk' ? Math.round(km * 3) : trafficBufferMins(km, hour);
  const cost = suggested === 'walk' ? { ...ZERO_COST } : estimateCost(km, hour);
  return {
    fromName: from.name,
    toId: to.id,
    toName: to.name,
    distanceKm: Math.round(km * 100) / 100,
    transitMins: Math.round(mins),
    trafficBufferMins: buffer,
    suggestedMode: suggested,
    cost,
    path: [from.c, to.coordinates],
  };
}

// ---------------------------------------------------------------------------
// TSP: greedy nearest-neighbour seed + 2-opt improvement (open path from start)
// ---------------------------------------------------------------------------

function pathLength(start: LatLng, order: Pandal[]): number {
  let total = 0;
  let prev = start;
  for (const p of order) {
    total += haversineKm(prev, p.coordinates);
    prev = p.coordinates;
  }
  return total;
}

export function nearestNeighbour(start: LatLng, pandals: Pandal[]): Pandal[] {
  const remaining = [...pandals];
  const out: Pandal[] = [];
  let cur = start;
  while (remaining.length) {
    let best = 0;
    let bestD = Infinity;
    remaining.forEach((p, i) => {
      const d = haversineKm(cur, p.coordinates);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    const [next] = remaining.splice(best, 1);
    out.push(next);
    cur = next.coordinates;
  }
  return out;
}

export function twoOpt(start: LatLng, order: Pandal[]): Pandal[] {
  let best = [...order];
  let bestLen = pathLength(start, best);
  let improved = true;
  let guard = 0;
  while (improved && guard++ < 50) {
    improved = false;
    for (let i = 0; i < best.length - 1; i++) {
      for (let k = i + 1; k < best.length; k++) {
        const candidate = [...best.slice(0, i), ...best.slice(i, k + 1).reverse(), ...best.slice(k + 1)];
        const len = pathLength(start, candidate);
        if (len + 1e-9 < bestLen) {
          best = candidate;
          bestLen = len;
          improved = true;
        }
      }
    }
  }
  return best;
}

export function planItinerary(
  start: LatLng,
  pandals: Pandal[],
  startHour: number,
  mode: TravelMode,
  startName = 'Your start',
): Itinerary {
  const ordered = twoOpt(start, nearestNeighbour(start, pandals));
  const stops: ItineraryStop[] = [];
  let clock = startHour;
  let from = { name: startName, c: start };
  let cost = { ...ZERO_COST };
  let dist = 0;
  let transit = 0;
  let queue = 0;
  let viewing = 0;

  ordered.forEach((p, idx) => {
    const leg = buildLeg(from, p, mode, clock);
    const travel = leg.transitMins + leg.trafficBufferMins;
    clock += travel / 60;
    const crowd = crowdAt(p, clock);
    const q = queueMins(p, clock);
    const arriveAt = formatClock(clock);
    clock += (q + p.avgViewingTimeMins) / 60;
    stops.push({
      order: idx + 1,
      pandal: p,
      arriveAt,
      crowd,
      queueMins: q,
      viewingMins: p.avgViewingTimeMins,
      departAt: formatClock(clock),
      leg,
    });
    cost = addCost(cost, leg.cost);
    dist += leg.distanceKm;
    transit += travel;
    queue += q;
    viewing += p.avgViewingTimeMins;
    from = { name: p.name, c: p.coordinates };
  });

  return {
    stops,
    totalDistanceKm: Math.round(dist * 10) / 10,
    totalTransitMins: transit,
    totalQueueMins: queue,
    totalViewingMins: viewing,
    totalMins: transit + queue + viewing,
    finishAt: formatClock(clock),
    cost,
    algorithm: 'Greedy nearest-neighbour + 2-opt',
  };
}

// ---------------------------------------------------------------------------
// Discovery: zone clusters ranked for a starting point
// ---------------------------------------------------------------------------

export interface ZoneSuggestion {
  zone: Zone;
  distanceKm: number;
  pandals: Array<Pandal & { distanceKm: number; score: number }>;
}

/**
 * Rank zones by distance to their centroid, and pandals inside each zone by a
 * blend of rating, proximity and crowd level at the chosen hour.
 */
export function suggestByZone(start: LatLng, hour: number): ZoneSuggestion[] {
  return ZONES.map((zone) => {
    const members = PANDALS.filter((p) => p.zone === zone);
    const centroid = {
      lat: members.reduce((s, p) => s + p.coordinates.lat, 0) / members.length,
      lng: members.reduce((s, p) => s + p.coordinates.lng, 0) / members.length,
    };
    const ranked = members
      .map((p) => {
        const d = haversineKm(start, p.coordinates);
        const score = p.rating * 20 - d * 1.5 - CROWD_SCORE[crowdAt(p, hour)] * 4;
        return { ...p, distanceKm: Math.round(d * 10) / 10, score: Math.round(score) };
      })
      .sort((a, b) => b.score - a.score);
    return { zone, distanceKm: Math.round(haversineKm(start, centroid) * 10) / 10, pandals: ranked };
  }).sort((a, b) => a.distanceKm - b.distanceKm);
}

/** Best hour (in the next window) to visit a pandal with the lowest crowd. */
export function bestHour(p: Pandal, from = 6, to = 26): number {
  let best = from;
  for (let h = from; h <= to; h++) {
    if (CROWD_SCORE[crowdAt(p, h)] < CROWD_SCORE[crowdAt(p, best)]) best = h;
  }
  return best % 24;
}
