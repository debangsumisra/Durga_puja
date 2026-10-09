'use client';

import { motion } from 'framer-motion';
import { CalendarDays, ExternalLink, MapPin, Newspaper, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getPandal } from '@/data/pandals';
import type { PujaEvent } from '@/lib/events';
import type { NewsCategory, NewsItem } from '@/lib/news';
import type { Pandal } from '@/types/pandal';
import CoverflowSlider from './CoverflowSlider';

interface Feed {
  items: NewsItem[];
  fetchedAt: string;
  refreshEverySeconds: number;
}

/** Festival calendar 2026 (IST). Mahalaya is the new-moon day that opens Devi Paksha. */
const DAYS = [
  { key: 'mahalaya', name: 'Mahalaya', date: '2026-10-10', note: 'Tarpan at the ghats, Mahisasuramardini at dawn, chokkhu daan' },
  { key: 'shashthi', name: 'Shashthi', date: '2026-10-16', note: 'Bodhon — Durga arrives; pandals open' },
  { key: 'saptami', name: 'Saptami', date: '2026-10-17', note: 'Nabapatrika snan, first big pandal-hopping day' },
  { key: 'ashtami', name: 'Ashtami', date: '2026-10-18', note: 'Anjali, Kumari puja, Sandhi puja' },
  { key: 'navami', name: 'Navami', date: '2026-10-20', note: 'Peak crowds, evening aarti & dhunuchi naach' },
  { key: 'dashami', name: 'Dashami', date: '2026-10-21', note: 'Sindoor khela and visarjan — carnival & ghat immersion' },
] as const;

const CATS: ('All' | NewsCategory)[] = ['All', 'Live', 'Trending', 'Traffic', 'Weather', 'Events'];
const CAT_STYLE: Record<NewsCategory, string> = {
  Live: 'text-emerald-300 ring-emerald-500/40',
  Trending: 'text-marigold-300 ring-marigold-400/40',
  Traffic: 'text-orange-300 ring-orange-500/40',
  Weather: 'text-sky-300 ring-sky-500/40',
  Events: 'text-pink-300 ring-pink-500/40',
};

const istDay = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

function ago(iso: string) {
  const m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
}

export default function LiveFeed({ onOpen }: { onOpen: (p: Pandal) => void }) {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [error, setError] = useState(false);
  const [cat, setCat] = useState<'All' | NewsCategory>('All');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch('/api/news')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Feed) => {
        setFeed(d);
        setError(false);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
    const t = setInterval(load, 30 * 60_000); // the server only re-scrapes every 4h; this just picks it up
    return () => clearInterval(t);
  }, []);

  const slides = useMemo(
    () => (feed?.items ?? []).filter((i) => i.image && (i.category === 'Trending' || i.category === 'Live' || i.pandalIds.length)).slice(0, 10),
    [feed],
  );
  const list = useMemo(() => (feed?.items ?? []).filter((i) => cat === 'All' || i.category === cat), [feed, cat]);

  const today = istDay(new Date());
  const current = [...DAYS].reverse().find((d) => d.date <= today) ?? null;
  const next = DAYS.find((d) => d.date > today) ?? null;
  const daysTo = next ? Math.round((new Date(next.date).getTime() - new Date(today).getTime()) / 86400000) : 0;

  return (
    <div className="space-y-8" data-testid="live-feed">
      <section aria-label="Festival timeline" className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
            <CalendarDays className="h-5 w-5 text-marigold-400" /> Mahalaya → Dashami
          </h2>
          <p className="text-sm text-stone-400" data-testid="festival-now">
            {current ? `Today: ${current.name}` : 'Pujo is coming'}
            {next && ` · ${next.name} in ${daysTo} day${daysTo === 1 ? '' : 's'}`}
          </p>
        </div>
        <ol className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {DAYS.map((d) => {
            const active = current?.key === d.key;
            const past = d.date < today && !active;
            return (
              <li key={d.key} className={`rounded-xl border p-3 text-xs ${active ? 'border-marigold-400 bg-marigold-500/10' : 'border-white/10 bg-ink-800'} ${past ? 'opacity-50' : ''}`}>
                <div className="flex items-center justify-between">
                  <b className="text-sm">{d.name}</b>
                  {active && <span className="chip text-emerald-300 ring-emerald-500/40">NOW</span>}
                </div>
                <div className="text-stone-500">{new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' })}</div>
                <p className="mt-1 text-stone-300">{d.note}</p>
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-[11px] text-stone-500">Dates follow published 2026 Bengal calendars (Shashthi 16 Oct – Bijoya Dashami 21 Oct); Ashtami/Navami timings vary by tithi.</p>
      </section>

      <EventsSection />

      <section aria-label="Trending now">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-2xl font-bold">Trending in Kolkata</h2>
            <p className="text-sm text-stone-400">New mandaps, themes and festive buzz — scraped from live news every 4 hours.</p>
          </div>
          <button className="btn-ghost" onClick={load} disabled={loading} aria-label="Refresh feed">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {feed ? `Updated ${ago(feed.fetchedAt)}` : 'Loading…'}
          </button>
        </div>

        {error && !feed && <p className="card p-6 text-sm text-stone-400">Couldn’t reach the news sources right now — try again shortly.</p>}
        {!feed && !error && <div className="card h-72 animate-pulse" />}

        {slides.length > 0 && (
          <CoverflowSlider
            items={slides}
            slideClass="basis-[82%] sm:basis-[52%] lg:basis-[38%]"
            render={(n, active) => (
              <a
                href={n.url}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="trend-slide"
                className={`block overflow-hidden rounded-3xl border bg-ink-800 ${active ? 'border-marigold-400/60 shadow-2xl shadow-sindoor-900/70' : 'border-white/10'}`}
              >
                <div className="relative aspect-video bg-ink-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={n.image!} alt={n.title} loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                  <span className={`chip absolute left-3 top-3 bg-black/70 ${CAT_STYLE[n.category]}`}>{n.category}</span>
                </div>
                <div className="space-y-1 p-4">
                  <h3 className="line-clamp-2 font-display text-base font-bold leading-snug">{n.title}</h3>
                  <p className="text-[11px] text-stone-500">
                    {n.source} · {ago(n.publishedAt)}
                  </p>
                </div>
              </a>
            )}
          />
        )}
      </section>

      <section aria-label="All updates">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h2 className="mr-2 flex items-center gap-2 font-display text-2xl font-bold">
            <Newspaper className="h-5 w-5 text-marigold-400" /> Live updates
          </h2>
          {CATS.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              aria-pressed={cat === c}
              className={`chip cursor-pointer px-3 py-1 ${cat === c ? 'bg-marigold-500 text-ink-900 ring-marigold-400' : 'text-stone-300 ring-white/20'}`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-2" data-testid="news-list">
          {list.map((n, i) => (
            <motion.article key={n.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.03 }} className="card flex gap-3 p-3">
              {n.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={n.image} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-24 w-32 shrink-0 rounded-xl object-cover" />
              )}
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 text-[11px] text-stone-500">
                  <span className={`chip ${CAT_STYLE[n.category]}`}>{n.category}</span>
                  {n.source} · {ago(n.publishedAt)}
                </div>
                <a href={n.url} target="_blank" rel="noopener noreferrer" className="line-clamp-2 font-semibold hover:text-marigold-300">
                  {n.title} <ExternalLink className="inline h-3 w-3" />
                </a>
                <p className="line-clamp-2 text-xs text-stone-400">{n.summary}</p>
                <div className="flex flex-wrap gap-1">
                  {n.pandalIds.slice(0, 3).map((id) => {
                    const p = getPandal(id);
                    return p ? (
                      <button key={id} className="chip cursor-pointer text-marigold-300 ring-marigold-400/30" onClick={() => onOpen(p)}>
                        <MapPin className="h-3 w-3" /> {p.name.replace(/\s*\(.*\)/, '')}
                      </button>
                    ) : null;
                  })}
                </div>
              </div>
            </motion.article>
          ))}
          {feed && list.length === 0 && <p className="text-sm text-stone-400">Nothing in this category yet — check back after the next refresh.</p>}
        </div>
      </section>
    </div>
  );
}

function EventsSection() {
  const [events, setEvents] = useState<PujaEvent[] | null>(null);
  useEffect(() => {
    fetch('/api/events')
      .then((r) => r.json())
      .then((d) => setEvents(d.events ?? []))
      .catch(() => setEvents([]));
  }, []);
  if (events && events.length === 0) return null;
  return (
    <section aria-label="Events across West Bengal" data-testid="events">
      <h2 className="font-display text-2xl font-bold">Happening across West Bengal</h2>
      <p className="mb-3 text-sm text-stone-400">Mahalaya-to-Dashami events found by an AI web search, each matched with the latest news and pictures.</p>
      {!events && <div className="card h-48 animate-pulse" />}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {events?.map((e) => (
          <article key={e.title} className="card overflow-hidden">
            {e.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={e.image} alt={e.title} loading="lazy" referrerPolicy="no-referrer" className="aspect-video w-full object-cover" />
            )}
            <div className="space-y-1 p-4 text-sm">
              <h3 className="font-display text-base font-bold">{e.title}</h3>
              <p className="flex items-center gap-1 text-xs text-marigold-300"><MapPin className="h-3 w-3" /> {e.venue}</p>
              <p className="text-xs text-stone-500">{e.when}</p>
              <p className="text-xs text-stone-300">{e.description}</p>
              {e.news[0] && (
                <a href={e.news[0].url} target="_blank" rel="noopener noreferrer" className="line-clamp-2 text-xs text-sky-300 hover:underline">
                  {e.news[0].title} · {e.news[0].source}
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
