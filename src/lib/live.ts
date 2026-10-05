/**
 * Server-side adapters for live, key-less public APIs:
 *  - OSRM (router.project-osrm.org)   → real road distance/time matrix + road geometry
 *  - Open-Meteo                         → current weather (rain thins out crowds)
 *  - Wikimedia Commons                  → real, freely-licensed pandal photos
 *  - Overpass (OpenStreetMap)           → real restaurants / street food / hotels
 *  - TomTom Traffic Flow (optional key) → live congestion factor
 * Every adapter has a timeout, an in-memory cache, and a graceful fallback.
 */
import { haversineKm, ROAD_FACTOR } from '@/lib/geo';
import type { LatLng, NearbyPlace, PlaceKind } from '@/types/pandal';

const UA = 'PujoPulse/2026 (https://github.com/debangsumisra/Durga_puja)';
const cache = new Map<string, { at: number; value: unknown }>();

async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;
  const value = await fn();
  cache.set(key, { at: Date.now(), value });
  return value;
}

async function fetchJson<T>(url: string, init: RequestInit = {}, timeoutMs = 12000): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'User-Agent': UA, Accept: 'application/json', ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(timeoutMs),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} from ${new URL(url).host}`);
  return (await res.json()) as T;
}

const OSRM = process.env.OSRM_URL ?? 'https://router.project-osrm.org';
const coordStr = (pts: LatLng[]) => pts.map((p) => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`).join(';');

// ---------------------------------------------------------------------------
// OSRM
// ---------------------------------------------------------------------------

export interface Matrix {
  /** seconds, free-flow driving */
  durations: number[][];
  /** metres along roads */
  distances: number[][];
  source: 'osrm' | 'estimate';
}

export async function roadMatrix(points: LatLng[]): Promise<Matrix> {
  const key = `table:${coordStr(points)}`;
  try {
    return await cached(key, 6 * 3600_000, async () => {
      const d = await fetchJson<{ code: string; durations: number[][]; distances: number[][] }>(
        `${OSRM}/table/v1/driving/${coordStr(points)}?annotations=duration,distance`,
      );
      if (d.code !== 'Ok') throw new Error(`OSRM ${d.code}`);
      return { durations: d.durations, distances: d.distances, source: 'osrm' as const };
    });
  } catch {
    const distances = points.map((a) => points.map((b) => haversineKm(a, b) * ROAD_FACTOR * 1000));
    // ~24 km/h free-flow city speed
    return { distances, durations: distances.map((r) => r.map((m) => m / 6.67)), source: 'estimate' };
  }
}

export interface RoadRoute {
  /** one polyline per leg, following real roads */
  legs: Array<{ path: LatLng[]; distanceM: number; durationS: number }>;
  source: 'osrm' | 'estimate';
}

export async function roadRoute(ordered: LatLng[]): Promise<RoadRoute> {
  const key = `route:${coordStr(ordered)}`;
  try {
    return await cached(key, 6 * 3600_000, async () => {
      // One request per leg so each leg has its own geometry (OSRM omits leg geometry without steps).
      const legs = await Promise.all(
        ordered.slice(1).map(async (to, i) => {
          const d = await fetchJson<{
            code: string;
            routes: Array<{ distance: number; duration: number; geometry: { coordinates: [number, number][] } }>;
          }>(`${OSRM}/route/v1/driving/${coordStr([ordered[i], to])}?overview=full&geometries=geojson`);
          if (d.code !== 'Ok' || !d.routes[0]) throw new Error(`OSRM ${d.code}`);
          const r = d.routes[0];
          return {
            path: r.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
            distanceM: r.distance,
            durationS: r.duration,
          };
        }),
      );
      return { legs, source: 'osrm' as const };
    });
  } catch {
    return {
      source: 'estimate',
      legs: ordered.slice(1).map((to, i) => {
        const m = haversineKm(ordered[i], to) * ROAD_FACTOR * 1000;
        return { path: [ordered[i], to], distanceM: m, durationS: m / 6.67 };
      }),
    };
  }
}

// ---------------------------------------------------------------------------
// Weather (Open-Meteo)
// ---------------------------------------------------------------------------

export interface Weather {
  temperatureC: number;
  precipitationMm: number;
  rainProbability: number;
  weatherCode: number;
  description: string;
  /** multiplier applied to crowd/queue estimates (rain → fewer people) */
  crowdFactor: number;
  observedAt: string;
  source: 'open-meteo' | 'unavailable';
}

const WMO: Record<number, string> = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast', 45: 'Fog', 48: 'Fog',
  51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle', 61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
  80: 'Rain showers', 81: 'Heavy showers', 82: 'Violent showers', 95: 'Thunderstorm', 96: 'Thunderstorm & hail', 99: 'Thunderstorm & hail',
};

export async function currentWeather(at: LatLng = { lat: 22.5726, lng: 88.3639 }): Promise<Weather> {
  try {
    return await cached('weather', 10 * 60_000, async () => {
      const d = await fetchJson<{
        current: { time: string; temperature_2m: number; precipitation: number; weather_code: number };
        hourly: { precipitation_probability: number[] };
      }>(
        `https://api.open-meteo.com/v1/forecast?latitude=${at.lat}&longitude=${at.lng}&current=temperature_2m,precipitation,weather_code&hourly=precipitation_probability&forecast_hours=1&timezone=Asia%2FKolkata`,
      );
      const c = d.current;
      const heavy = c.precipitation >= 4 || [65, 82, 95, 96, 99].includes(c.weather_code);
      const light = c.precipitation > 0 || [51, 53, 55, 61, 63, 80, 81].includes(c.weather_code);
      return {
        temperatureC: c.temperature_2m,
        precipitationMm: c.precipitation,
        rainProbability: d.hourly.precipitation_probability?.[0] ?? 0,
        weatherCode: c.weather_code,
        description: WMO[c.weather_code] ?? 'Unknown',
        crowdFactor: heavy ? 0.6 : light ? 0.8 : 1,
        observedAt: c.time,
        source: 'open-meteo' as const,
      };
    });
  } catch {
    return { temperatureC: NaN, precipitationMm: 0, rainProbability: 0, weatherCode: -1, description: 'Unavailable', crowdFactor: 1, observedAt: new Date().toISOString(), source: 'unavailable' };
  }
}

// ---------------------------------------------------------------------------
// Live traffic (TomTom, optional)
// ---------------------------------------------------------------------------

/** Ratio free-flow/current speed (≥1 means slower than free flow). null when no key / failure. */
export async function trafficFactor(at: LatLng): Promise<number | null> {
  const key = process.env.TOMTOM_API_KEY;
  if (!key) return null;
  try {
    return await cached(`tt:${at.lat.toFixed(3)},${at.lng.toFixed(3)}`, 5 * 60_000, async () => {
      const d = await fetchJson<{ flowSegmentData: { currentSpeed: number; freeFlowSpeed: number } }>(
        `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/12/json?point=${at.lat},${at.lng}&key=${key}`,
      );
      const { currentSpeed, freeFlowSpeed } = d.flowSegmentData;
      return Math.max(1, Math.min(5, freeFlowSpeed / Math.max(1, currentSpeed)));
    });
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Photos (Wikimedia Commons)
// ---------------------------------------------------------------------------

export interface LivePhoto {
  url: string;
  thumb: string;
  caption: string;
  author: string;
  license: string;
  sourcePage: string;
}

const stripHtml = (s = '') => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

export async function commonsPhotos(query: string, limit = 8): Promise<LivePhoto[]> {
  return cached(`photos:${query}`, 24 * 3600_000, async () => {
    const params = new URLSearchParams({
      action: 'query',
      generator: 'search',
      gsrsearch: `${query} filetype:bitmap`,
      gsrnamespace: '6',
      gsrlimit: String(limit * 2),
      prop: 'imageinfo',
      iiprop: 'url|extmetadata|mime',
      iiurlwidth: '1280',
      format: 'json',
      origin: '*',
    });
    const d = await fetchJson<{
      query?: {
        pages: Record<string, {
          index: number;
          title: string;
          imageinfo?: Array<{
            url: string;
            thumburl?: string;
            mime: string;
            descriptionurl: string;
            extmetadata?: Record<string, { value: string }>;
          }>;
        }>;
      };
    }>(`https://commons.wikimedia.org/w/api.php?${params}`);
    return Object.values(d.query?.pages ?? {})
      .sort((a, b) => a.index - b.index)
      .map((p) => ({ p, ii: p.imageinfo?.[0] }))
      .filter(({ ii }) => ii && /jpeg|png|webp/.test(ii.mime))
      .slice(0, limit)
      .map(({ p, ii }) => ({
        url: ii!.url,
        thumb: ii!.thumburl ?? ii!.url,
        caption: stripHtml(ii!.extmetadata?.ImageDescription?.value) || p.title.replace(/^File:|\.\w+$/g, ''),
        author: stripHtml(ii!.extmetadata?.Artist?.value) || 'Wikimedia Commons contributor',
        license: stripHtml(ii!.extmetadata?.LicenseShortName?.value) || 'See source',
        sourcePage: ii!.descriptionurl,
      }));
  });
}

// ---------------------------------------------------------------------------
// Nearby places (Overpass / OpenStreetMap)
// ---------------------------------------------------------------------------

const OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

interface OsmEl {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function kindOf(tags: Record<string, string>): PlaceKind | null {
  if (tags.tourism && /hotel|guest_house|hostel/.test(tags.tourism)) return 'hotel';
  if (tags.amenity === 'restaurant') return 'restaurant';
  if (tags.amenity && /fast_food|cafe|food_court|ice_cream/.test(tags.amenity)) return 'street-food';
  if (tags.shop && /confectionery|bakery|pastry/.test(tags.shop)) return 'street-food';
  return null;
}

let overpassDownUntil = 0;

export async function osmNearby(at: LatLng, radiusM = 1200): Promise<NearbyPlace[]> {
  const key = `osm:${at.lat.toFixed(4)},${at.lng.toFixed(4)},${radiusM}`;
  return cached(key, 6 * 3600_000, async () => {
    const q = `[out:json][timeout:15];(
      nwr(around:${radiusM},${at.lat},${at.lng})["amenity"~"^(restaurant|fast_food|cafe|food_court|ice_cream)$"]["name"];
      nwr(around:${radiusM},${at.lat},${at.lng})["shop"~"^(confectionery|bakery|pastry)$"]["name"];
      nwr(around:${radiusM * 2},${at.lat},${at.lng})["tourism"~"^(hotel|guest_house|hostel)$"]["name"];
    );out center 80;`;
    if (Date.now() < overpassDownUntil) throw new Error('Overpass unavailable (cooling down)');
    try {
      // Race all mirrors; first good answer wins.
      return await Promise.any(OVERPASS.map(async (endpoint) => {
        const d = await fetchJson<{ elements: OsmEl[] }>(
          endpoint,
          { method: 'POST', body: new URLSearchParams({ data: q }), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
          10000,
        );
        return d.elements
          .map((e): NearbyPlace | null => {
            const tags = e.tags ?? {};
            const kind = kindOf(tags);
            const lat = e.lat ?? e.center?.lat;
            const lng = e.lon ?? e.center?.lon;
            if (!kind || lat === undefined || lng === undefined || !tags.name) return null;
            const km = haversineKm(at, { lat, lng }) * ROAD_FACTOR;
            return {
              id: `osm-${e.type}-${e.id}`,
              name: tags['name:en'] ?? tags.name,
              kind,
              coordinates: { lat, lng },
              rating: 0, // OSM has no ratings
              priceLevel: 2,
              speciality: tags.cuisine?.replace(/;/g, ', ').replace(/_/g, ' ') ?? tags.amenity ?? tags.tourism ?? tags.shop ?? '',
              address: [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ') || tags['addr:full'] || '',
              distanceKm: Math.round(km * 100) / 100,
              walkMins: Math.max(1, Math.round((km / 4.2) * 60)),
            };
          })
          .filter((p): p is NearbyPlace => !!p)
          .sort((a, b) => a.distanceKm - b.distanceKm);
      }));
    } catch {
      overpassDownUntil = Date.now() + 5 * 60_000;
    }
    throw new Error('All Overpass mirrors timed out or are overloaded');
  });
}
