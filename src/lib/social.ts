export const AVATAR_IDS = ['spy', 'thief', 'innocent', 'lady', 'baddie'] as const;
export type AvatarId = (typeof AVATAR_IDS)[number];

export interface Me {
  id: string;
  name: string;
  avatar: AvatarId;
}
export interface Peer extends Me {
  lat: number;
  lng: number;
}
export interface Msg {
  id: number;
  fromId: string;
  fromName: string;
  fromAvatar: AvatarId;
  direct: boolean;
  body: string;
  at: string;
}

export const NAME_RE = /^[\p{L}\p{N}_.-]{3,20}$/u;
export const NEARBY_KM = 5;
export const ONLINE_WINDOW_S = 45;

export function distKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Strip control chars / angle brackets and clamp length. */
export const cleanText = (s: unknown, max: number) =>
  String(s ?? '')
    .replace(/[\u0000-\u001f\u007f<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
