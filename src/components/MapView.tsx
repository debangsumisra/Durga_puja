'use client';

import L from 'leaflet';
import { useEffect } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import { ZONE_META } from '@/data/pandals';
import { KOLKATA_CENTER } from '@/lib/geo';
import type { Itinerary, LatLng, Pandal } from '@/types/pandal';

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
  const routeLine: [number, number][] = itinerary
    ? [[start.lat, start.lng], ...itinerary.stops.map((s) => [s.pandal.coordinates.lat, s.pandal.coordinates.lng] as [number, number])]
    : [];
  const fitPoints = itinerary ? [start, ...itinerary.stops.map((s) => s.pandal.coordinates)] : [];

  return (
    <MapContainer center={[KOLKATA_CENTER.lat, KOLKATA_CENTER.lng]} zoom={12} className="h-full w-full" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <ClickToDrop onDrop={onDropStart} />
      <FitTo points={fitPoints} />

      <Marker
        position={[start.lat, start.lng]}
        icon={startIcon}
        draggable
        eventHandlers={{ dragend: (e) => onDropStart(e.target.getLatLng()) }}
      >
        <Tooltip direction="top" offset={[0, -16]}>Start — drag me or click the map</Tooltip>
      </Marker>

      {routeLine.length > 1 && (
        <>
          <Polyline positions={routeLine} pathOptions={{ color: '#000', weight: 8, opacity: 0.5 }} />
          <Polyline positions={routeLine} pathOptions={{ color: '#ffbf3c', weight: 4, dashArray: '8 8' }} />
        </>
      )}

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
  );
}
