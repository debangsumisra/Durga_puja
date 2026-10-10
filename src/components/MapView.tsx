'use client';

import L from 'leaflet';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import { ZONE_META } from '@/data/pandals';
import { KOLKATA_CENTER } from '@/lib/geo';
import type { Itinerary, LatLng, Pandal } from '@/types/pandal';
import { avatarSvg } from '@/lib/avatars';
import { distKm } from '@/lib/social';
import { useSocial } from '@/lib/useSocial';
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

/** Avatar height (px) that grows as the visitor zooms in. */
function useAvatarHeight() {
  const map = useMap();
  const [z, setZ] = useState(map.getZoom());
  useMapEvents({ zoomend: () => setZ(map.getZoom()) });
  return Math.round(Math.min(100, Math.max(46, 60 * Math.pow(2, (z - 13) * 0.4))));
}

const avatarIcon = (avatar: Parameters<typeof avatarSvg>[0], h: number, label: string, me = false) =>
  L.divIcon({
    className: 'peer-icon',
    iconSize: [Math.round((h * 60) / 84), h],
    iconAnchor: [Math.round((h * 60) / 168), h - 4],
    html: `<div class="peer-wrap${me ? ' peer-me' : ''}">${avatarSvg(avatar, h)}<span class="peer-name">${label}</span></div>`,
  });

const esc = (t: string) => t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const QUICK = ['Shubho Mahalaya! 🪔', 'Which pandal are you at?', 'Queue kemon? 👀', 'Phuchka break? 😋'];

function PeerCard({ id, name, km }: { id: string; name: string; km: number }) {
  const { send } = useSocial();
  const [text, setText] = useState('');
  const [note, setNote] = useState('');
  const go = async (body: string) => {
    if (!body.trim()) return;
    setNote((await send(id, body)) ?? 'Sent ✓');
    setText('');
  };
  return (
    <div className="w-56 space-y-2">
      <div className="font-semibold">{name}</div>
      <div className="text-xs opacity-80">{km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`} from you</div>
      <div className="flex flex-wrap gap-1">
        {QUICK.map((q) => (
          <button key={q} className="rounded-full bg-orange-600 px-2 py-1 text-[11px] text-white" onClick={() => go(q)}>
            {q}
          </button>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); go(text); }} className="flex gap-1">
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={100} placeholder="Say something short…" aria-label={`Message ${name}`} className="min-w-0 flex-1 rounded bg-stone-700 px-2 py-1 text-xs text-white outline-none" />
        <button className="rounded bg-stone-500 px-2 text-xs text-white">Send</button>
      </form>
      {note && <div className="text-[11px] text-emerald-300">{note}</div>}
    </div>
  );
}

/** Everyone else who is online right now, standing where they chose to be. */
function PeerLayer({ start }: { start: LatLng }) {
  const { peers } = useSocial();
  const h = useAvatarHeight();
  return (
    <>
      {peers.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]} icon={avatarIcon(p.avatar, h, esc(p.name))} zIndexOffset={800}>
          <Popup>
            <PeerCard id={p.id} name={p.name} km={distKm(start, p)} />
          </Popup>
        </Marker>
      ))}
    </>
  );
}

/** My own draggable spot — my chosen character, or the ★ when logged out. */
function StartMarker({ start, onDrop }: { start: LatLng; onDrop: (c: LatLng) => void }) {
  const { me } = useSocial();
  const h = useAvatarHeight();
  const icon = useMemo(() => (me ? avatarIcon(me.avatar, h + 6, `${esc(me.name)} (you)`, true) : startIcon), [me, h]);
  return (
    <Marker position={[start.lat, start.lng]} icon={icon} draggable zIndexOffset={1000} eventHandlers={{ dragend: (e) => onDrop(e.target.getLatLng()) }}>
      <Tooltip direction="top" offset={[0, me ? -h : -16]}>{me ? 'You — drag me to where you are' : 'Start — drag me or click the map'}</Tooltip>
    </Marker>
  );
}

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

  const { me } = useSocial();
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
      {!itinerary && !me && <Mover kind="idle" path={idlePath} label="Namaskar! Pick pandals and I’ll walk you there 🪔" />}
      <FitTo points={fitPoints} />

      <StartMarker start={start} onDrop={onDropStart} />
      <PeerLayer start={start} />

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
