import { describe, expect, it } from 'vitest';
import { PANDALS, getPandal } from '@/data/pandals';
import { haversineKm, ROAD_FACTOR } from '@/lib/geo';
import { crowdAt, estimateCost, metroFare, optimiseOrder, planItinerary, queueMins, suggestByZone, bestHour, type PlanOptions } from '@/lib/planner';
import { nearbyPlaces } from '@/lib/nearby';
import type { LatLng, Pandal } from '@/types/pandal';

const ESPLANADE: LatLng = { lat: 22.5646, lng: 88.3517 };
const pick = (...ids: string[]) => ids.map((id) => getPandal(id)!) as Pandal[];

function matrixFor(start: LatLng, ps: Pandal[]) {
  const pts = [start, ...ps.map((p) => p.coordinates)];
  const distances = pts.map((a) => pts.map((b) => haversineKm(a, b) * ROAD_FACTOR * 1000));
  return { distances, durations: distances.map((r) => r.map((m) => m / 8.33)) };
}

describe('fares', () => {
  it('uses Kolkata Metro slab fares', () => {
    expect(metroFare(1)).toBe(5);
    expect(metroFare(4)).toBe(10);
    expect(metroFare(8)).toBe(15);
    expect(metroFare(15)).toBe(20);
    expect(metroFare(40)).toBe(25);
  });
  it('applies evening surge to ride-share', () => {
    expect(estimateCost(5, 21).rideShare).toBeGreaterThan(estimateCost(5, 10).rideShare);
  });
});

describe('crowd model', () => {
  it('is quieter early morning than at 9 PM for every pandal', () => {
    for (const p of PANDALS) expect(queueMins(p, 6)).toBeLessThanOrEqual(queueMins(p, 21));
  });
  it('rain (crowdFactor < 1) shortens queues', () => {
    const p = getPandal('santosh-mitra')!;
    expect(queueMins(p, 21, 0.6)).toBeLessThan(queueMins(p, 21, 1));
  });
  it('bestHour is never more crowded than prime time', () => {
    const p = getPandal('bagbazar')!;
    expect(['Low', 'Medium']).toContain(crowdAt(p, bestHour(p)));
  });
});

describe('optimiser', () => {
  const ps = pick('bagbazar', 'college-square', 'kumartuli-park', 'md-ali-park', 'santosh-mitra', 'ahiritola');
  const m = matrixFor(ESPLANADE, ps);
  const opts: PlanOptions = { mode: 'drive', priority: 'time', avoidCrowds: false };

  it('exact search finds an order no worse than every permutation sampled', () => {
    const best = planItinerary(ESPLANADE, ps, 10, 'drive', { ...opts, matrix: m });
    expect(best.algorithm).toMatch(/Exact search over all 720/);
    // compare against a few hand-made orders
    for (const order of [[0, 1, 2, 3, 4, 5], [5, 4, 3, 2, 1, 0], [1, 3, 5, 0, 2, 4]]) {
      const alt = planItinerary(ESPLANADE, order.map((i) => ps[i]), 10, 'drive', { ...opts, matrix: matrixFor(ESPLANADE, order.map((i) => ps[i])) });
      expect(best.totalMins).toBeLessThanOrEqual(alt.baseline.totalMins);
    }
  });

  it('optimised itinerary is never worse than the order the user picked', () => {
    const it2 = planItinerary(ESPLANADE, ps, 18, 'metro-mix', { matrix: m });
    expect(it2.totalMins).toBeLessThanOrEqual(it2.baseline.totalMins + 1);
    expect(it2.stops).toHaveLength(ps.length);
    expect(new Set(it2.stops.map((s) => s.pandal.id)).size).toBe(ps.length);
  });

  it('"cheapest" priority spends no more than "fastest"', () => {
    const far = pick('bagbazar', 'sreebhumi', 'ekdalia', 'suruchi-sangha', 'fd-block');
    const mm = matrixFor(ESPLANADE, far);
    const cheap = planItinerary(ESPLANADE, far, 19, 'metro-mix', { priority: 'cost', matrix: mm });
    const fast = planItinerary(ESPLANADE, far, 19, 'metro-mix', { priority: 'time', matrix: mm });
    expect(cheap.totalFare).toBeLessThanOrEqual(fast.totalFare);
    expect(fast.totalMins).toBeLessThanOrEqual(cheap.totalMins);
  });

  it('avoid-crowds does not increase queue time', () => {
    const a = planItinerary(ESPLANADE, ps, 16, 'drive', { matrix: m, avoidCrowds: true, priority: 'time' });
    const b = planItinerary(ESPLANADE, ps, 16, 'drive', { matrix: m, avoidCrowds: false, priority: 'time' });
    expect(a.totalQueueMins).toBeLessThanOrEqual(b.totalQueueMins);
  });

  it('heuristic handles 12 pandals and visits each once', () => {
    const twelve = PANDALS.slice(0, 12);
    const { order, algorithm } = optimiseOrder(twelve, 18, { mode: 'drive' }, matrixFor(ESPLANADE, twelve).distances, matrixFor(ESPLANADE, twelve).durations);
    expect(algorithm).toMatch(/2-opt/);
    expect([...order].sort((x, y) => x - y)).toEqual([...Array(12).keys()]);
  });

  it('walk mode never uses paid transport', () => {
    const it3 = planItinerary(ESPLANADE, pick('college-square', 'md-ali-park'), 10, 'walk', {});
    expect(it3.totalFare).toBe(0);
    expect(it3.stops.every((s) => s.leg.suggestedMode === 'walk')).toBe(true);
  });
});

describe('discovery', () => {
  it('groups all pandals into four zones, nearest zone first', () => {
    const z = suggestByZone(getPandal('kumartuli-park')!.coordinates, 18);
    expect(z).toHaveLength(4);
    expect(z[0].zone).toBe('North');
    expect(z.reduce((n, s) => n + s.pandals.length, 0)).toBe(PANDALS.length);
  });
  it('finds curated food near Bagbazar', () => {
    expect(nearbyPlaces(getPandal('bagbazar')!.coordinates).length).toBeGreaterThan(0);
  });
});
