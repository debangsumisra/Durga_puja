import type { LatLng } from '@/types/pandal';

const R = 6371;
const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in km. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Kolkata's lane grid makes road distance ~1.35x the straight line. */
export const ROAD_FACTOR = 1.35;
export const roadKm = (a: LatLng, b: LatLng) => haversineKm(a, b) * ROAD_FACTOR;

export const KOLKATA_CENTER: LatLng = { lat: 22.5626, lng: 88.3630 };

export const START_PRESETS: Array<{ name: string; coordinates: LatLng }> = [
  { name: 'Howrah Station', coordinates: { lat: 22.5839, lng: 88.3425 } },
  { name: 'Sealdah Station', coordinates: { lat: 22.5675, lng: 88.3700 } },
  { name: 'Esplanade', coordinates: { lat: 22.5646, lng: 88.3517 } },
  { name: 'Gariahat', coordinates: { lat: 22.5186, lng: 88.3653 } },
  { name: 'Salt Lake Sector V', coordinates: { lat: 22.5726, lng: 88.4339 } },
  { name: 'Dum Dum', coordinates: { lat: 22.6218, lng: 88.3936 } },
  { name: 'Netaji Subhas Airport', coordinates: { lat: 22.6547, lng: 88.4467 } },
];

export function formatClock(hourDecimal: number): string {
  const total = Math.round(hourDecimal * 60);
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${suffix}`;
}
