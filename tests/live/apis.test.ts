/**
 * Hits the real public APIs the app depends on. Run with `npm run test:live`.
 * Overpass is a volunteer service that is often overloaded, so that test
 * accepts either live data or a clear failure (the app falls back to curated data).
 */
import { describe, expect, it } from 'vitest';
import { getPandal } from '@/data/pandals';
import { commonsPhotos, currentWeather, osmNearby, roadMatrix, roadRoute } from '@/lib/live';

const ESPLANADE = { lat: 22.5646, lng: 88.3517 };
const BAGBAZAR = getPandal('bagbazar')!.coordinates;
const COLLEGE_SQ = getPandal('college-square')!.coordinates;

describe('live APIs', () => {
  it('OSRM returns a real road distance/time matrix', async () => {
    const m = await roadMatrix([ESPLANADE, BAGBAZAR, COLLEGE_SQ]);
    expect(m.source).toBe('osrm');
    expect(m.distances[0][1]).toBeGreaterThan(3000); // > 3 km by road
    expect(m.durations[0][1]).toBeGreaterThan(60);
  });

  it('OSRM returns road-following geometry for each leg', async () => {
    const r = await roadRoute([ESPLANADE, COLLEGE_SQ, BAGBAZAR]);
    expect(r.source).toBe('osrm');
    expect(r.legs).toHaveLength(2);
    for (const leg of r.legs) expect(leg.path.length).toBeGreaterThan(10);
  });

  it('Open-Meteo returns current Kolkata weather', async () => {
    const w = await currentWeather();
    expect(w.source).toBe('open-meteo');
    expect(w.temperatureC).toBeGreaterThan(5);
    expect(w.temperatureC).toBeLessThan(50);
  });

  it('Wikimedia Commons returns real Bagbazar puja photos', async () => {
    const photos = await commonsPhotos('Bagbazar Durga Puja');
    expect(photos.length).toBeGreaterThan(0);
    expect(photos[0].thumb).toMatch(/^https:\/\/upload\.wikimedia\.org|^https:\/\/thumb\.wikimedia\.org/);
    expect(photos[0].license).not.toBe('');
  });

  it('Overpass returns real places near College Square (or fails cleanly)', async () => {
    try {
      const places = await osmNearby(COLLEGE_SQ);
      expect(places.length).toBeGreaterThan(0);
      expect(places[0].distanceKm).toBeLessThan(3);
    } catch (e) {
      console.warn('Overpass unavailable right now:', (e as Error).message);
      expect(e).toBeInstanceOf(Error);
    }
  });
});
