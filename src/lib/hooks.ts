'use client';

import { useEffect, useState } from 'react';
import type { NearbyPlace } from '@/types/pandal';

export interface Photo {
  url: string;
  thumb: string;
  caption: string;
  author: string;
  license: string;
  sourcePage: string;
}

const photoCache = new Map<string, Promise<Photo[]>>();

export function fetchPhotos(pandalId: string): Promise<Photo[]> {
  if (!photoCache.has(pandalId)) {
    photoCache.set(
      pandalId,
      fetch(`/api/photos?pandalId=${encodeURIComponent(pandalId)}`)
        .then((r) => r.json())
        .then((d) => (d.photos ?? []) as Photo[])
        .catch(() => []),
    );
  }
  return photoCache.get(pandalId)!;
}

/** Real Wikimedia Commons photos for a pandal; `null` while loading. */
export function usePhotos(pandalId: string | undefined) {
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  useEffect(() => {
    if (!pandalId) return;
    let live = true;
    setPhotos(null);
    fetchPhotos(pandalId).then((p) => live && setPhotos(p));
    return () => {
      live = false;
    };
  }, [pandalId]);
  return photos;
}

export type SourcedPlace = NearbyPlace & { source: 'curated' | 'openstreetmap' };

export function useNearby(key: string, query: string) {
  const [state, setState] = useState<{ places: SourcedPlace[]; source: string; loading: boolean }>({ places: [], source: '', loading: true });
  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, loading: true }));
    fetch(`/api/nearby?${query}`)
      .then((r) => r.json())
      .then((d) => live && setState({ places: d.places ?? [], source: d.source ?? '', loading: false }))
      .catch(() => live && setState({ places: [], source: 'error', loading: false }));
    return () => {
      live = false;
    };
  }, [key, query]);
  return state;
}

export interface LiveStatus {
  now: string;
  weather: { description: string; temperatureC: number; crowdFactor: number; source: string; rainProbability: number };
  traffic: { factor: number | null; source: string };
}

export function useLive() {
  const [live, setLive] = useState<LiveStatus | null>(null);
  useEffect(() => {
    const load = () => fetch('/api/live').then((r) => r.json()).then(setLive).catch(() => {});
    load();
    const t = setInterval(load, 5 * 60_000);
    return () => clearInterval(t);
  }, []);
  return live;
}
