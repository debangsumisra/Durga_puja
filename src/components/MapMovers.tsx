'use client';

import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import type { LatLng } from '@/types/pandal';

export type MoverKind = 'walk' | 'idle' | 'metro' | 'car' | 'bus';

/** base size (px) at map zoom 13 — icons grow as the visitor zooms in */
const SIZE: Record<MoverKind, [number, number]> = { walk: [34, 52], idle: [34, 52], car: [60, 32], bus: [72, 36], metro: [110, 32] };

const EDGE = '#cdbfb3';

// An original little mascot: egg head, round white balloon body, dot eyes, marigold garland, red alta feet.
const PUPU = `
<g class="leg legL"><rect x="12" y="46" width="6.5" height="11" rx="3.2" fill="#fff" stroke="${EDGE}" stroke-width=".8"/><ellipse cx="15.2" cy="57.6" rx="4.6" ry="2.3" fill="#d7263d"/></g>
<g class="leg legR"><rect x="21.5" y="46" width="6.5" height="11" rx="3.2" fill="#fff" stroke="${EDGE}" stroke-width=".8"/><ellipse cx="24.8" cy="57.6" rx="4.6" ry="2.3" fill="#d7263d"/></g>
<g class="arm armL"><ellipse cx="5.5" cy="35" rx="3" ry="6.5" fill="#fff" stroke="${EDGE}" stroke-width=".8"/></g>
<g class="arm armR"><ellipse cx="34.5" cy="35" rx="3" ry="6.5" fill="#fff" stroke="${EDGE}" stroke-width=".8"/></g>
<ellipse cx="20" cy="36" rx="13.5" ry="14" fill="#fff" stroke="${EDGE}" stroke-width=".9"/>
<ellipse cx="20" cy="14" rx="9.2" ry="11.5" fill="#fff" stroke="${EDGE}" stroke-width=".9"/>
<circle cx="16.4" cy="13" r="1.8" fill="#1a1a1a"/><circle cx="23.6" cy="13" r="1.8" fill="#1a1a1a"/>
<circle cx="16.9" cy="12.4" r=".6" fill="#fff"/><circle cx="24.1" cy="12.4" r=".6" fill="#fff"/>
<path d="M16.5 18.6 Q20 22 23.5 18.6" stroke="#1a1a1a" stroke-width="1.2" fill="none" stroke-linecap="round"/>
<circle cx="20" cy="6.6" r="1.3" fill="#d7263d"/>
<g fill="#f6a609"><circle cx="9.5" cy="27" r="2"/><circle cx="13.5" cy="30" r="2"/><circle cx="20" cy="31.5" r="2"/><circle cx="26.5" cy="30" r="2"/><circle cx="30.5" cy="27" r="2"/></g>`;

const CAR = `
<ellipse cx="30" cy="31" rx="22" ry="2.2" fill="rgba(0,0,0,.35)" class="shd"/>
<path d="M5 22 Q5 15 12 14 L19 8 Q21 7 24 7 L38 7 Q41 7 43 9 L49 14 Q56 15 56 22 L56 25 L5 25 Z" fill="#ffbf3c" stroke="#b8790a" stroke-width="1"/>
<path d="M21 9.5 L37 9.5 L44 14 L16 14 Z" fill="#bfe3ff" stroke="#7aa6c9" stroke-width=".6"/>
<rect x="26" y="3.5" width="9" height="3.5" rx="1.2" fill="#fff" stroke="#999" stroke-width=".5"/>
<rect x="53" y="17" width="4" height="3.5" rx="1" fill="#fff6b0"/><rect x="4" y="17" width="3" height="3.5" rx="1" fill="#ff5a4f"/>
<g class="wheel"><circle cx="16" cy="25" r="5" fill="#222"/><circle cx="16" cy="25" r="2" fill="#aaa"/></g>
<g class="wheel"><circle cx="45" cy="25" r="5" fill="#222"/><circle cx="45" cy="25" r="2" fill="#aaa"/></g>`;

const BUS = `
<ellipse cx="36" cy="34" rx="28" ry="2.3" fill="rgba(0,0,0,.35)" class="shd"/>
<rect x="4" y="5" width="64" height="24" rx="5" fill="#e0301e" stroke="#8c150a" stroke-width="1"/>
<rect x="4" y="19" width="64" height="4" fill="#fff"/>
<g fill="#bfe3ff" stroke="#7aa6c9" stroke-width=".5"><rect x="9" y="9" width="10" height="8" rx="1.5"/><rect x="22" y="9" width="10" height="8" rx="1.5"/><rect x="35" y="9" width="10" height="8" rx="1.5"/><rect x="50" y="9" width="14" height="9" rx="1.5"/></g>
<rect x="64" y="22" width="4" height="3.5" rx="1" fill="#fff6b0"/>
<g class="wheel"><circle cx="18" cy="29" r="5.2" fill="#222"/><circle cx="18" cy="29" r="2" fill="#aaa"/></g>
<g class="wheel"><circle cx="54" cy="29" r="5.2" fill="#222"/><circle cx="54" cy="29" r="2" fill="#aaa"/></g>`;

const METRO = (() => {
  const car = (x: number) =>
    `<rect x="${x}" y="5" width="34" height="19" rx="4.5" fill="#fff" stroke="#9db4d6" stroke-width="1"/>
     <rect x="${x}" y="15" width="34" height="3.5" fill="#1e6fd9"/>
     <g fill="#7fb8ff"><rect x="${x + 3}" y="8" width="7" height="6" rx="1"/><rect x="${x + 13}" y="8" width="7" height="6" rx="1"/><rect x="${x + 23}" y="8" width="7" height="6" rx="1"/></g>`;
  return `<ellipse cx="55" cy="29" rx="48" ry="2" fill="rgba(0,0,0,.35)" class="shd"/>
    ${car(4)}${car(40)}
    <path d="M76 5 H96 Q106 7 106 14 V19 Q106 24 98 24 H76 Z" fill="#fff" stroke="#9db4d6" stroke-width="1"/>
    <path d="M90 8 H98 Q103 9 103 14 H90 Z" fill="#7fb8ff"/><rect x="76" y="15" width="30" height="3.5" fill="#1e6fd9"/>
    <circle cx="104" cy="19.5" r="1.6" fill="#fff6b0"/>
    <g class="lines" stroke="#9db4d6" stroke-width="1.2" stroke-linecap="round"><path d="M-2 10 H-12"/><path d="M0 16 H-14"/><path d="M-2 22 H-10"/></g>`;
})();

const ART: Record<MoverKind, { vb: string; body: string; cls: string }> = {
  walk: { vb: '0 0 40 62', body: PUPU, cls: 'pupu walking' },
  idle: { vb: '0 0 40 62', body: PUPU, cls: 'pupu idle' },
  car: { vb: '0 0 62 34', body: CAR, cls: 'veh' },
  bus: { vb: '0 0 74 38', body: BUS, cls: 'veh' },
  metro: { vb: '-16 0 124 34', body: METRO, cls: 'veh train' },
};

function makeIcon(kind: MoverKind, scale: number, flip: boolean) {
  const [bw, bh] = SIZE[kind];
  const w = Math.round(bw * scale);
  const h = Math.round(bh * scale);
  const a = ART[kind];
  return {
    icon: L.divIcon({
      className: 'mover',
      iconSize: [w, h],
      iconAnchor: [w / 2, h * (kind === 'walk' || kind === 'idle' ? 0.92 : 0.8)],
      html: `<div class="mv-flip" style="transform:scaleX(${flip ? -1 : 1})"><div class="mv-float ${a.cls}"><svg viewBox="${a.vb}" width="${w}" height="${h}" overflow="visible">${a.body}</svg></div></div>`,
    }),
    h,
  };
}

const zoomScale = (z: number) => Math.min(3.0, Math.max(0.65, Math.pow(2, (z - 13) * 0.62)));

function prepare(path: LatLng[]) {
  const k = Math.cos((path[0].lat * Math.PI) / 180);
  const cum = [0];
  for (let i = 1; i < path.length; i++) {
    cum.push(cum[i - 1] + Math.hypot((path[i].lng - path[i - 1].lng) * k, path[i].lat - path[i - 1].lat));
  }
  return { cum, total: cum[cum.length - 1] || 1e-9, k };
}

function at(path: LatLng[], cum: number[], total: number, t: number) {
  const d = t * total;
  let i = 1;
  while (i < cum.length - 1 && cum[i] < d) i++;
  const seg = cum[i] - cum[i - 1] || 1e-9;
  const f = Math.min(1, Math.max(0, (d - cum[i - 1]) / seg));
  const a = path[i - 1];
  const b = path[i];
  return { lat: a.lat + (b.lat - a.lat) * f, lng: a.lng + (b.lng - a.lng) * f, east: b.lng >= a.lng };
}

/** An animated character/vehicle that rides a route leg and scales with map zoom. */
export default function Mover({ kind, path, seconds = 12, label }: { kind: MoverKind; path: LatLng[]; seconds?: number; label: string }) {
  const map = useMap();
  const state = useRef({ flip: false, scale: zoomScale(map.getZoom()) });

  useEffect(() => {
    if (path.length < 2 && kind !== 'idle') return;
    const pts = path.length ? path : [];
    const { cum, total } = pts.length > 1 ? prepare(pts) : { cum: [0], total: 1 };
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const first = pts[0];
    const marker = L.marker([first.lat, first.lng], { icon: makeIcon(kind, state.current.scale, false).icon, zIndexOffset: 1500, keyboard: false }).addTo(map);

    const tip = () => {
      marker.unbindTooltip();
      marker.bindTooltip(label, { direction: 'top', offset: [0, -Math.round(makeIcon(kind, state.current.scale, false).h * 0.55)] });
    };
    tip();

    const onZoom = () => {
      state.current.scale = zoomScale(map.getZoom());
      marker.setIcon(makeIcon(kind, state.current.scale, state.current.flip).icon);
      tip();
    };
    map.on('zoomend', onZoom);

    let raf = 0;
    if (pts.length > 1) {
      const place = (t: number) => {
        const p = at(pts, cum, total, t);
        marker.setLatLng([p.lat, p.lng]);
        const flip = !p.east;
        if (flip !== state.current.flip) {
          state.current.flip = flip;
          const el = marker.getElement()?.querySelector<HTMLElement>('.mv-flip');
          if (el) el.style.transform = `scaleX(${flip ? -1 : 1})`;
        }
      };
      if (reduce) place(0.5);
      else {
        const t0 = performance.now();
        const loop = (now: number) => {
          const cycle = (seconds + 1.5) * 1000;
          const e = (now - t0) % cycle;
          place(Math.min(1, e / (seconds * 1000)));
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      }
    }

    return () => {
      cancelAnimationFrame(raf);
      map.off('zoomend', onZoom);
      marker.remove();
    };
  }, [map, kind, path, seconds, label]);

  return null;
}
