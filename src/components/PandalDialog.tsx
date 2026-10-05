'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { motion } from 'framer-motion';
import { Clock, Landmark, MapPin, Palette, Plus, Check, Star, TrainFront, X } from 'lucide-react';
import { ZONE_META } from '@/data/pandals';
import { bestHour, crowdAt } from '@/lib/planner';
import { formatClock } from '@/lib/geo';
import { CROWD_STYLE, cn } from '@/lib/utils';
import type { Pandal } from '@/types/pandal';
import CoverflowSlider from './CoverflowSlider';
import CrowdBar from './CrowdBar';
import NearbyList from './NearbyList';
import { usePhotos } from '@/lib/hooks';

interface Props {
  pandal: Pandal | null;
  hour: number;
  selected: boolean;
  onClose: () => void;
  onToggle: (id: string) => void;
  onVirtual: (p: Pandal) => void;
}

export default function PandalDialog({ pandal, hour, selected, onClose, onToggle, onVirtual }: Props) {
  return (
    <Dialog.Root open={!!pandal} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-x-2 bottom-2 top-8 z-[1001] mx-auto max-w-4xl overflow-y-auto rounded-3xl border border-white/10 bg-ink-800 p-5 shadow-2xl scrollbar-thin sm:top-12 sm:p-7">
          {pandal && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="chip ring-white/20" style={{ color: ZONE_META[pandal.zone].color }}>
                    {ZONE_META[pandal.zone].label}
                  </span>
                  <Dialog.Title className="mt-2 font-display text-3xl font-bold">{pandal.name}</Dialog.Title>
                  <Dialog.Description className="mt-1 text-sm text-stone-400">
                    Est. {pandal.establishedYear} · <Star className="inline h-3.5 w-3.5 fill-marigold-400 text-marigold-400" /> {pandal.rating}
                  </Dialog.Description>
                </div>
                <Dialog.Close className="btn-ghost !p-2" aria-label="Close">
                  <X className="h-5 w-5" />
                </Dialog.Close>
              </div>

              <Gallery pandal={pandal} />

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <section className="space-y-3 text-sm">
                  <Info icon={Palette} label="Theme 2025–26" value={pandal.theme2025_2026} />
                  <Info icon={Palette} label="Artisan" value={pandal.artisan} />
                  <Info icon={Landmark} label="History" value={pandal.historicalSignificance} />
                  <Info icon={Star} label="Deity" value={pandal.deityDescription} />
                  <Info icon={TrainFront} label="Nearest metro" value={`${pandal.nearestMetro} (${pandal.metroDistanceKm} km)`} />
                  <Info icon={MapPin} label="Coordinates" value={`${pandal.coordinates.lat.toFixed(4)}, ${pandal.coordinates.lng.toFixed(4)}`} />
                </section>
                <section className="space-y-4">
                  <div className="card p-4">
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 font-semibold"><Clock className="h-4 w-4" /> Crowd forecast</span>
                      <span className={cn('chip', CROWD_STYLE[crowdAt(pandal, hour)])}>Now: {crowdAt(pandal, hour)}</span>
                    </div>
                    <CrowdBar pandal={pandal} highlightHour={hour} />
                    <p className="mt-2 text-xs text-stone-400">
                      Quietest window: <b className="text-emerald-300">{formatClock(bestHour(pandal))}</b> · ~{pandal.avgViewingTimeMins} min viewing
                    </p>
                  </div>
                  <div className="card p-4">
                    <h4 className="mb-2 text-sm font-semibold">Nearby food & stays</h4>
                    <NearbyList at={pandal.coordinates} pandalId={pandal.id} />
                  </div>
                </section>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button className="btn-primary" onClick={() => onToggle(pandal.id)}>
                  {selected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {selected ? 'In your route' : 'Add to route'}
                </button>
                <button className="btn-ghost" onClick={() => onVirtual(pandal)}>Open 360° virtual darshan</button>
              </div>
            </motion.div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof Star; label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-marigold-400" />
      <div>
        <div className="text-[11px] uppercase tracking-wider text-stone-500">{label}</div>
        <div className="text-stone-200">{value}</div>
      </div>
    </div>
  );
}

function Gallery({ pandal }: { pandal: Pandal }) {
  const photos = usePhotos(pandal.id);
  if (photos === null) {
    return <div className="my-6 grid aspect-[3/1] place-items-center rounded-2xl bg-white/5 text-sm text-stone-500">Loading real photos from Wikimedia Commons…</div>;
  }
  const items = photos.length
    ? photos.map((p) => ({ src: p.thumb, caption: p.caption, tag: p.license, credit: p.author, href: p.sourcePage }))
    : pandal.photos.filter((ph) => !ph.isPanorama360).map((p) => ({ src: p.url, caption: p.caption, tag: p.tag, credit: 'Illustration', href: '' }));
  return (
    <div data-testid="gallery">
      <CoverflowSlider
        items={items}
        slideClass="basis-[85%] sm:basis-[60%]"
        render={(ph, active) => (
          <figure className={cn('overflow-hidden rounded-2xl border border-white/10', active && 'shadow-2xl shadow-sindoor-900/60')}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ph.src} alt={ph.caption} className="aspect-[3/2] w-full bg-black object-cover" loading="lazy" referrerPolicy="no-referrer" />
            <figcaption className="flex items-center justify-between gap-2 bg-ink-900/90 px-3 py-2 text-xs">
              <span className="line-clamp-1">{ph.caption}</span>
              {ph.href ? (
                <a href={ph.href} target="_blank" rel="noreferrer" className="shrink-0 text-marigold-300 hover:underline" title={ph.credit}>
                  © {ph.credit.slice(0, 24)} · {ph.tag}
                </a>
              ) : (
                <span className="chip shrink-0 text-marigold-300 ring-marigold-400/40">{ph.tag}</span>
              )}
            </figcaption>
          </figure>
        )}
      />
      {photos.length === 0 && <p className="text-center text-[11px] text-stone-500">No freely-licensed photos found on Wikimedia Commons — showing illustrations.</p>}
    </div>
  );
}
