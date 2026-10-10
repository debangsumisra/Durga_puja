import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';
import { distKm, NEARBY_KM, ONLINE_WINDOW_S } from '@/lib/social';

export const dynamic = 'force-dynamic';

type Emb = { username: string; avatar: string } | { username: string; avatar: string }[] | null;
const one = (e: Emb) => (Array.isArray(e) ? e[0] : e);

/**
 * POST /api/sync { lat, lng, since? } — a heartbeat. Publishes my spot, and returns
 * everyone online right now plus any messages sent to me / broadcast near me since `since`.
 */
export async function POST(req: Request) {
  const s = getSession();
  if (!db()) return NextResponse.json({ error: 'not-configured' }, { status: 503 });
  if (!s) return NextResponse.json({ error: 'auth' }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const lat = Number(b.lat);
  const lng = Number(b.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return NextResponse.json({ error: 'bad location' }, { status: 400 });

  const now = new Date();
  const since = b.since && !Number.isNaN(Date.parse(b.since)) ? new Date(b.since) : now;
  const sb = db()!;

  const up = await sb.from('pp_presence').upsert({ user_id: s.uid, lat, lng, updated_at: now.toISOString() });
  if (up.error) return NextResponse.json({ error: 'db' }, { status: 500 });

  const cutoff = new Date(now.getTime() - ONLINE_WINDOW_S * 1000).toISOString();
  const [online, msgs] = await Promise.all([
    sb.from('pp_presence').select('user_id, lat, lng, u:pp_users(username, avatar)').gt('updated_at', cutoff).limit(300),
    sb
      .from('pp_messages')
      .select('id, from_id, to_id, body, lat, lng, created_at, f:pp_users!pp_messages_from_id_fkey(username, avatar)')
      .gt('created_at', since.toISOString())
      .or(`to_id.eq.${s.uid},to_id.is.null`)
      .neq('from_id', s.uid)
      .order('created_at', { ascending: true })
      .limit(30),
  ]);

  const users = (online.data ?? []).flatMap((r) => {
    const u = one(r.u as Emb);
    return u ? [{ id: r.user_id, name: u.username, avatar: u.avatar, lat: r.lat, lng: r.lng }] : [];
  });

  const messages = (msgs.data ?? [])
    .filter((m) => m.to_id === s.uid || (m.lat != null && m.lng != null && distKm({ lat, lng }, { lat: m.lat, lng: m.lng }) <= NEARBY_KM))
    .flatMap((m) => {
      const f = one(m.f as Emb);
      return f ? [{ id: m.id, fromId: m.from_id, fromName: f.username, fromAvatar: f.avatar, direct: m.to_id === s.uid, body: m.body, at: m.created_at }] : [];
    });

  return NextResponse.json({ now: now.toISOString(), users, messages });
}
