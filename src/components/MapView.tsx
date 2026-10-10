'use client';

import L from 'leaflet';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import { ZONE_META } from '@/data/pandals';
import { KOLKATA_CENTER } from '@/lib/geo';
import type { Itinerary, LatLng, Pandal } from '@/types/pandal';
import Mover from './MapMovers';

function pin(color: string, label: string, size = 26) {
  return L.divIcon({
    className: '',
    html: `<div class="pin-marker" style="width:${size}px;height:${size}px;background:${color}">${label}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const startIcon = L.divIcon({
  className: '',
  html: `<div class="pin-marker" style="width:34px;height:34px;background:#16a34a;font-size:16px">★</div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const LEG_COLOR = { walk: '#34d399', metro: '#60a5fa', drive: '#ffbf3c' } as const;

function ClickToDrop({ onDrop }: { onDrop: (c: LatLng) => void }) {
  useMapEvents({ click: (e) => onDrop({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

function FitTo({ points }: { points: LatLng[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [40, 40], maxZoom: 15 });
    }
  }, [map, points]);
  return null;
}

interface Props {
  pandals: Pandal[];
  start: LatLng;
  selected: string[];
  itinerary: Itinerary | null;
  onDropStart: (c: LatLng) => void;
  onToggle: (id: string) => void;
  onOpen: (p: Pandal) => void;
}

export default function MapView({ pandals, start, selected, itinerary, onDropStart, onToggle, onOpen }: Props) {
  const order = new Map(itinerary?.stops.map((s) => [s.pandal.id, s.order]) ?? []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fitPoints = useMemo(() => (itinerary ? [start, ...itinerary.stops.flatMap((s) => s.leg.path)] : []), [itinerary]);

  const [road, setRoad] = useState<'car' | 'bus'>('car');
  const idlePath = useMemo(() => [{ lat: start.lat + 0.0006, lng: start.lng + 0.0008 }], [start]);

  return (
    <div className="relative h-full w-full">
    <div className="absolute right-3 top-3 z-[1000] flex gap-1 rounded-xl border border-white/20 bg-ink-900/85 p-1 text-xs backdrop-blur" role="group" aria-label="Road vehicle">
      {(['car', 'bus'] as const).map((v) => (
        <button key={v} onClick={() => setRoad(v)} aria-pressed={road === v} className={`rounded-lg px-2.5 py-1 font-medium ${road === v ? 'bg-marigold-500 text-ink-900' : 'text-stone-200'}`}>
          {v === 'car' ? '🚕 Cab' : '🚌 Bus'}
        </button>
      ))}
    </div>
    <MapContainer center={[KOLKATA_CENTER.lat, KOLKATA_CENTER.lng]} zoom={12} className="h-full w-full" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        className="osm-dark"
        maxZoom={19}
      />
      <ClickToDrop onDrop={onDropStart} />
      {!itinerary && <Mover kind="idle" path={idlePath} label="Namaskar! Pick pandals and I’ll walk you there 🪔" />}
      <FitTo points={fitPoints} />

      <Marker
        position={[start.lat, start.lng]}
        icon={startIcon}
        draggable
        eventHandlers={{ dragend: (e) => onDropStart(e.target.getLatLng()) }}
      >
        <Tooltip direction="top" offset={[0, -16]}>Start — drag me or click the map</Tooltip>
      </Marker>

      {itinerary?.stops.map((s) => {
        const line = s.leg.path.map((c) => [c.lat, c.lng] as [number, number]);
        const color = LEG_COLOR[s.leg.suggestedMode];
        const m = s.leg.suggestedMode;
        const kind = m === 'walk' ? 'walk' : m === 'metro' ? 'metro' : road;
        const mins = s.leg.transitMins + s.leg.trafficBufferMins;
        const label =
          m === 'walk'
            ? `Pupu is walking ${s.leg.distanceKm} km to ${s.pandal.name} — about ${mins} min`
            : m === 'metro'
              ? `Metro to ${s.pandal.name} (from ${s.pandal.nearestMetro}) · ${mins} min · ₹${s.leg.cost.metro}`
              : road === 'bus'
                ? `Bus to ${s.pandal.name} · ${mins} min · ₹${s.leg.cost.busNonAc}–${s.leg.cost.busAc}`
                : `Cab to ${s.pandal.name} · ${mins} min · ₹${s.leg.cost.yellowTaxi}`;
        return (
          <Fragment key={s.pandal.id}>
            <Mover kind={kind} path={s.leg.path} seconds={Math.min(24, Math.max(7, s.leg.distanceKm * (m === 'walk' ? 9 : 3)))} label={label} />
            <Polyline positions={line} pathOptions={{ color: '#000', weight: 9, opacity: 0.45 }} />
            <Polyline
              positions={line}
              className="route-leg"
              pathOptions={{ color, weight: 5, dashArray: s.leg.suggestedMode === 'walk' ? '2 9' : s.leg.suggestedMode === 'metro' ? '12 8' : undefined, lineCap: 'round' }}
            >
              <Tooltip sticky>
                Leg {s.order}: {s.leg.suggestedMode} · {s.leg.distanceKm} km · {s.leg.transitMins + s.leg.trafficBufferMins} min · ₹{s.leg.fare}
              </Tooltip>
            </Polyline>
          </Fragment>
        );
      })}

      {pandals.map((p) => {
        const isSel = selected.includes(p.id);
        const n = order.get(p.id);
        const color = ZONE_META[p.zone].color;
        return (
          <Marker
            key={p.id}
            position={[p.coordinates.lat, p.coordinates.lng]}
            icon={pin(isSel ? color : '#57534e', n ? String(n) : isSel ? '✓' : '', isSel ? 28 : 18)}
          >
            <Popup>
              <div className="space-y-1">
                <div className="font-semibold">{p.name}</div>
                <div className="text-xs opacity-80">{p.zone} · Metro: {p.nearestMetro}</div>
                <div className="flex gap-2 pt-1">
                  <button className="rounded bg-orange-600 px-2 py-1 text-xs text-white" onClick={() => onToggle(p.id)}>
                    {isSel ? 'Remove' : 'Add to route'}
                  </button>
                  <button className="rounded bg-stone-600 px-2 py-1 text-xs text-white" onClick={() => onOpen(p)}>
                    Details
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
    </div>
  );
}
