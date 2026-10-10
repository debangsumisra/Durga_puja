'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { distKm, NEARBY_KM, type AvatarId, type Me, type Msg, type Peer } from './social';

export interface Toast {
  id: string;
  avatar: AvatarId;
  title: string;
  body: string;
}

export type AuthResult =
  | { status: 'login' | 'created' }
  | { status: 'new' }
  | { status: 'taken'; error: string; suggestions: string[] }
  | { status: 'error'; error: string };

interface Social {
  /** null while checking; false when Supabase isn't configured (feature hidden) */
  enabled: boolean | null;
  me: Me | null;
  peers: Peer[];
  toasts: Toast[];
  dismiss: (id: string) => void;
  setLocation: (c: { lat: number; lng: number }) => void;
  auth: (name: string, password: string, avatar?: AvatarId) => Promise<AuthResult>;
  logout: () => Promise<void>;
  /** `toId` null = say hi to everyone nearby. Resolves to an error string or null. */
  send: (toId: string | null, body: string) => Promise<string | null>;
  authOpen: boolean;
  setAuthOpen: (v: boolean) => void;
}

const Ctx = createContext<Social | null>(null);
export const useSocial = () => useContext(Ctx)!;

const POLL_MS = 5000;
const DEFAULT_LOC = { lat: 22.5646, lng: 88.3517 };

export function SocialProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [authOpen, setAuthOpen] = useState(false);
  const loc = useRef(DEFAULT_LOC);
  const since = useRef<string | null>(null);
  const known = useRef<Set<string> | null>(null);
  const syncNow = useRef<() => void>(() => {});

  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((l) => [...l.slice(-3), { ...t, id }]);
    setTimeout(() => setToasts((l) => l.filter((x) => x.id !== id)), 9000);
  }, []);

  useEffect(() => {
    fetch('/api/me')
      .then((r) => r.json())
      .then((d) => {
        setEnabled(!!d.enabled);
        setMe(d.user ?? null);
      })
      .catch(() => setEnabled(false));
  }, []);

  // heartbeat: publish my spot, receive everyone online + messages
  useEffect(() => {
    if (!me) return;
    let stop = false;
    let busy = false;
    since.current = null;
    known.current = null;

    const tick = async () => {
      if (stop || busy || document.hidden) return;
      busy = true;
      try {
        const r = await fetch('/api/sync', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...loc.current, since: since.current }) });
        if (r.status === 401) {
          setMe(null);
          return;
        }
        if (!r.ok) return;
        const d: { now: string; users: Peer[]; messages: Msg[] } = await r.json();
        since.current = d.now;
        const others = d.users.filter((u) => u.id !== me.id);
        setPeers(others);

        const first = known.current === null;
        const prev = known.current ?? new Set<string>();
        if (first) {
          toast({ avatar: me.avatar, title: `Namaskar, ${me.name}!`, body: others.length ? `${others.length} other pandal-hopper${others.length > 1 ? 's are' : ' is'} online right now.` : 'You’re the first one here — others will pop up as they join.' });
        } else {
          for (const u of others) {
            if (prev.has(u.id)) continue;
            const km = distKm(loc.current, u);
            if (km <= NEARBY_KM) toast({ avatar: u.avatar, title: `${u.name} is nearby`, body: `Just popped up ${km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`} away — tap their character to say hi.` });
          }
        }
        known.current = new Set(others.map((u) => u.id));

        for (const m of d.messages) toast({ avatar: m.fromAvatar, title: m.direct ? `${m.fromName} says` : `${m.fromName} (nearby)`, body: m.body });
      } catch {
        /* offline — try again next tick */
      } finally {
        busy = false;
      }
    };
    syncNow.current = tick;
    tick();
    const iv = setInterval(tick, POLL_MS);
    const vis = () => !document.hidden && tick();
    document.addEventListener('visibilitychange', vis);
    return () => {
      stop = true;
      clearInterval(iv);
      document.removeEventListener('visibilitychange', vis);
    };
  }, [me, toast]);

  const setLocation = useCallback((c: { lat: number; lng: number }) => {
    loc.current = c;
    syncNow.current();
  }, []);

  const auth = useCallback(async (name: string, password: string, avatar?: AvatarId): Promise<AuthResult> => {
    try {
      const r = await fetch('/api/auth', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, password, avatar }) });
      const d = await r.json();
      if (r.status === 409) return { status: 'taken', error: d.error, suggestions: d.suggestions ?? [] };
      if (!r.ok) return { status: 'error', error: d.error === 'not-configured' ? 'Live friends aren’t switched on yet.' : d.error ?? 'Something went wrong' };
      if (d.status === 'new') return { status: 'new' };
      setMe(d.user);
      setAuthOpen(false);
      return { status: d.status };
    } catch {
      return { status: 'error', error: 'Network problem — try again' };
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/logout', { method: 'POST' }).catch(() => {});
    setMe(null);
    setPeers([]);
  }, []);

  const send = useCallback(async (toId: string | null, body: string) => {
    const r = await fetch('/api/message', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ toId, body }) }).catch(() => null);
    if (!r) return 'Network problem';
    if (r.ok) return null;
    return r.status === 429 ? 'Slow down a little 🙂' : 'Could not send';
  }, []);

  const dismiss = useCallback((id: string) => setToasts((l) => l.filter((t) => t.id !== id)), []);

  const value = useMemo(
    () => ({ enabled, me, peers, toasts, dismiss, setLocation, auth, logout, send, authOpen, setAuthOpen }),
    [enabled, me, peers, toasts, dismiss, setLocation, auth, logout, send, authOpen],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
