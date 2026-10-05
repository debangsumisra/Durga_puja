import { PANDALS, ZONES } from '@/data/pandals';
import { formatClock, haversineKm, ROAD_FACTOR } from '@/lib/geo';
import type {
  CostBreakdown,
  CrowdLevel,
  Itinerary,
  ItineraryStop,
  LatLng,
  LegMode,
  Pandal,
  Priority,
  RouteLeg,
  TravelMode,
  Zone,
} from '@/types/pandal';

// ---------------------------------------------------------------------------
// Crowd & queue model
// ---------------------------------------------------------------------------

export const QUEUE_MINS: Record<CrowdLevel, number> = { Low: 5, Medium: 15, High: 35, Extreme: 70 };
export const CROWD_SCORE: Record<CrowdLevel, number> = { Low: 0, Medium: 1, High: 2, Extreme: 3 };

const hourOf = (h: number) => Math.floor(((h % 24) + 24) % 24);

export function crowdAt(p: Pandal, hourDecimal: number): CrowdLevel {
  return p.crowdLevelByHour[hourOf(hourDecimal)];
}

/** Queue wait scales with viewing time (bigger pandals → longer lines) and live weather. */
export function queueMins(p: Pandal, hourDecimal: number, crowdFactor = 1): number {
  return Math.round(QUEUE_MINS[crowdAt(p, hourDecimal)] * (p.avgViewingTimeMins / 20) * crowdFactor);
}

// ---------------------------------------------------------------------------
// Traffic model — puja-night speeds in Kolkata collapse after sunset.
// ---------------------------------------------------------------------------

export function driveSpeedKmh(hourDecimal: number): number {
  const h = hourOf(hourDecimal);
  if (h >= 2 && h < 7) return 26;
  if (h >= 7 && h < 11) return 18;
  if (h >= 11 && h < 16) return 16;
  if (h >= 16 && h < 19) return 11;
  return 8; // 19:00–02:00 peak pandal hopping, many roads one-way / closed
}

/** Multiplier on OSRM free-flow time (OSRM assumes ~30 km/h in the city core). */
export const congestion = (hour: number) => 30 / driveSpeedKmh(hour);

const WALK_KMH = 4.2;
const METRO_KMH = 32;

/** Buffer for parking, diversions and police barricading. */
export function trafficBufferMins(distanceKm: number, hourDecimal: number): number {
  const h = hourOf(hourDecimal);
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
  const h = hourOf(hourDecimal);
  const surge = h >= 19 || h < 2 ? 1.8 : h >= 16 ? 1.3 : 1.0;
  const taxi = km <= 2 ? 30 : 30 + (km - 2) * 25;
  return {
    metro: metroFare(km),
    busNonAc: km <= 4 ? 10 : km <= 8 ? 14 : 20,
    busAc: km <= 4 ? 20 : km <= 10 ? 30 : 45,
    yellowTaxi: Math.round(taxi * (surge > 1 ? 1.2 : 1)),
    rideShare: Math.round((45 + km * 18) * surge),
  };
}

const ZERO: CostBreakdown = { metro: 0, busNonAc: 0, busAc: 0, yellowTaxi: 0, rideShare: 0 };
const addCost = (a: CostBreakdown, b: CostBreakdown): CostBreakdown => ({
  metro: a.metro + b.metro,
  busNonAc: a.busNonAc + b.busNonAc,
  busAc: a.busAc + b.busAc,
  yellowTaxi: a.yellowTaxi + b.yellowTaxi,
  rideShare: a.rideShare + b.rideShare,
});

/** Rupees → minutes trade-off per priority. */
export const RUPEE_WEIGHT: Record<Priority, number> = { time: 0.02, balanced: 0.25, cost: 1.5 };

// ---------------------------------------------------------------------------
// Problem definition
// ---------------------------------------------------------------------------

export interface PlanOptions {
  mode: TravelMode;
  priority?: Priority;
  avoidCrowds?: boolean;
  /** live weather factor on queues (1 = normal, <1 = rain keeps people home) */
  crowdFactor?: number;
  /** live traffic factor (TomTom); overrides time-of-day congestion when set */
  trafficFactor?: number | null;
  /**
   * Road matrix with index 0 = start and 1..n = pandals in input order.
   * Durations in seconds (free-flow), distances in metres.
   */
  matrix?: { durations: number[][]; distances: number[][] };
  startName?: string;
}

interface LegChoice {
  mode: LegMode;
  mins: number;
  buffer: number;
  fare: number;
  km: number;
}

function chooseLeg(km: number, freeFlowS: number, toMetroKm: number, hour: number, opts: PlanOptions): LegChoice {
  const w = RUPEE_WEIGHT[opts.priority ?? 'balanced'];
  const cands: LegChoice[] = [];
  const walkMins = (km / WALK_KMH) * 60;
  if (opts.mode === 'walk' || km <= 2.5) cands.push({ mode: 'walk', mins: walkMins, buffer: Math.round(km * 3), fare: 0, km });
  if (opts.mode !== 'walk') {
    const factor = opts.trafficFactor ?? congestion(hour);
    const fares = estimateCost(km, hour);
    cands.push({ mode: 'drive', mins: (freeFlowS / 60) * factor, buffer: trafficBufferMins(km, hour), fare: Math.min(fares.rideShare, fares.yellowTaxi), km });
  }
  if (opts.mode === 'metro-mix' && km > 2) {
    // walk to and from stations + ride + headway + puja-time platform crowding
    const mins = ((toMetroKm + 0.6) / WALK_KMH) * 60 + (km / METRO_KMH) * 60 + 8;
    cands.push({ mode: 'metro', mins, buffer: 5, fare: metroFare(km), km });
  }
  if (cands.length === 0) cands.push({ mode: 'walk', mins: walkMins, buffer: 0, fare: 0, km });
  return cands.reduce((best, c) => (c.mins + c.buffer + c.fare * w < best.mins + best.buffer + best.fare * w ? c : best));
}

interface Sim {
  objective: number;
  totalMins: number;
  totalFare: number;
}

/** Simulate visiting `order` (indices into pandals, 0-based) and score it. */
function simulate(order: number[], pandals: Pandal[], startHour: number, opts: PlanOptions, distM: number[][], durS: number[][]): Sim {
  const w = RUPEE_WEIGHT[opts.priority ?? 'balanced'];
  let clock = startHour;
  let prev = 0;
  let mins = 0;
  let fare = 0;
  let crowdPenalty = 0;
  for (const i of order) {
    const p = pandals[i];
    const leg = chooseLeg(distM[prev][i + 1] / 1000, durS[prev][i + 1], p.metroDistanceKm, clock, opts);
    const t = leg.mins + leg.buffer;
    clock += t / 60;
    const q = queueMins(p, clock, opts.crowdFactor);
    if (opts.avoidCrowds) crowdPenalty += q + (crowdAt(p, clock) === 'Extreme' ? 30 : 0);
    clock += (q + p.avgViewingTimeMins) / 60;
    mins += t + q + p.avgViewingTimeMins;
    fare += leg.fare;
    prev = i + 1;
  }
  return { objective: mins + fare * w + crowdPenalty, totalMins: Math.round(mins), totalFare: Math.round(fare) };
}

function* permutations(n: number): Generator<number[]> {
  const a = Array.from({ length: n }, (_, i) => i);
  const c = new Array(n).fill(0);
  yield [...a];
  let i = 0;
  while (i < n) {
    if (c[i] < i) {
      const j = i % 2 ? c[i] : 0;
      [a[j], a[i]] = [a[i], a[j]];
      yield [...a];
      c[i]++;
      i = 0;
    } else {
      c[i] = 0;
      i++;
    }
  }
}

export const EXACT_LIMIT = 8;

/** Returns the best visiting order (indices into `pandals`). */
export function optimiseOrder(pandals: Pandal[], startHour: number, opts: PlanOptions, distM: number[][], durS: number[][]): { order: number[]; algorithm: string } {
  const n = pandals.length;
  const score = (o: number[]) => simulate(o, pandals, startHour, opts, distM, durS).objective;

  if (n <= EXACT_LIMIT) {
    let best: number[] = [];
    let bestScore = Infinity;
    for (const perm of permutations(n)) {
      const s = score(perm);
      if (s < bestScore) {
        bestScore = s;
        best = perm;
      }
    }
    return { order: best, algorithm: `Exact search over all ${factorial(n).toLocaleString('en-IN')} orders` };
  }

  // Nearest neighbour on road time, then 2-opt + or-opt on the full time/cost/crowd objective.
  const left = new Set(pandals.map((_, i) => i));
  let cur = 0;
  let order: number[] = [];
  while (left.size) {
    let pick = -1;
    for (const i of left) if (pick < 0 || durS[cur][i + 1] < durS[cur][pick + 1]) pick = i;
    order.push(pick);
    left.delete(pick);
    cur = pick + 1;
  }
  let bestScore = score(order);
  for (let improved = true, guard = 0; improved && guard < 100; guard++) {
    improved = false;
    for (let i = 0; i < n - 1; i++) {
      for (let k = i + 1; k < n; k++) {
        const twoOpt = [...order.slice(0, i), ...order.slice(i, k + 1).reverse(), ...order.slice(k + 1)];
        const s = score(twoOpt);
        if (s + 1e-9 < bestScore) [order, bestScore, improved] = [twoOpt, s, true];
      }
    }
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const moved = [...order];
        const [x] = moved.splice(i, 1);
        moved.splice(j, 0, x);
        const s = score(moved);
        if (s + 1e-9 < bestScore) [order, bestScore, improved] = [moved, s, true];
      }
    }
  }
  return { order, algorithm: 'Nearest-neighbour + 2-opt + or-opt' };
}

function factorial(n: number): number {
  return n <= 1 ? 1 : n * factorial(n - 1);
}

function estimateMatrix(points: LatLng[]) {
  const distances = points.map((a) => points.map((b) => haversineKm(a, b) * ROAD_FACTOR * 1000));
  return { distances, durations: distances.map((r) => r.map((m) => m / (30 / 3.6))) };
}

/**
 * Build the full itinerary. `legPaths` (optional) are real road polylines for the
 * legs of the *final* order, fetched by the API after optimisation.
 */
export function planItinerary(start: LatLng, pandals: Pandal[], startHour: number, mode: TravelMode, opts: Omit<PlanOptions, 'mode'> = {}): Itinerary {
  const o: PlanOptions = { ...opts, mode };
  const { distances, durations } = o.matrix ?? estimateMatrix([start, ...pandals.map((p) => p.coordinates)]);
  const { order, algorithm } = optimiseOrder(pandals, startHour, o, distances, durations);
  const baselineSim = simulate(pandals.map((_, i) => i), pandals, startHour, o, distances, durations);

  const stops: ItineraryStop[] = [];
  let clock = startHour;
  let prev = 0;
  let prevName = o.startName ?? 'Your start';
  let prevC = start;
  let cost = { ...ZERO };
  let dist = 0;
  let transit = 0;
  let queue = 0;
  let viewing = 0;
  let fare = 0;

  order.forEach((i, idx) => {
    const p = pandals[i];
    const km = distances[prev][i + 1] / 1000;
    const choice = chooseLeg(km, durations[prev][i + 1], p.metroDistanceKm, clock, o);
    const leg: RouteLeg = {
      fromName: prevName,
      toId: p.id,
      toName: p.name,
      distanceKm: Math.round(km * 100) / 100,
      transitMins: Math.round(choice.mins),
      trafficBufferMins: choice.buffer,
      suggestedMode: choice.mode,
      fare: choice.fare,
      cost: estimateCost(km, clock),
      path: [prevC, p.coordinates],
    };
    clock += (choice.mins + choice.buffer) / 60;
    const crowd = crowdAt(p, clock);
    const q = queueMins(p, clock, o.crowdFactor);
    const arriveAt = formatClock(clock);
    const quiet = bestHour(p);
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
      crowdTip: CROWD_SCORE[crowd] >= 2 ? `Quieter around ${formatClock(quiet)}` : undefined,
    });
    cost = addCost(cost, leg.cost);
    fare += choice.fare;
    dist += km;
    transit += choice.mins + choice.buffer;
    queue += q;
    viewing += p.avgViewingTimeMins;
    prev = i + 1;
    prevName = p.name;
    prevC = p.coordinates;
  });

  return {
    stops,
    totalDistanceKm: Math.round(dist * 10) / 10,
    totalTransitMins: Math.round(transit),
    totalQueueMins: queue,
    totalViewingMins: viewing,
    totalMins: Math.round(transit) + queue + viewing,
    finishAt: formatClock(clock),
    totalFare: Math.round(fare),
    cost,
    algorithm,
    baseline: { totalMins: baselineSim.totalMins, totalFare: baselineSim.totalFare },
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

/** Quietest hour between 6 AM and 2 AM. */
export function bestHour(p: Pandal, from = 6, to = 26): number {
  let best = from;
  for (let h = from; h <= to; h++) {
    if (CROWD_SCORE[crowdAt(p, h)] < CROWD_SCORE[crowdAt(p, best)]) best = h;
  }
  return best % 24;
}
