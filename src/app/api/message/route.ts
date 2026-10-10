import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';
import { cleanText } from '@/lib/social';

export const dynamic = 'force-dynamic';

/** POST /api/message { toId?, body } — short note to one person, or to everyone nearby when `toId` is omitted. */
export async function POST(req: Request) {
  const s = getSession();
  if (!db()) return NextResponse.json({ error: 'not-configured' }, { status: 503 });
  if (!s) return NextResponse.json({ error: 'auth' }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const text = cleanText(b.body, 100);
  if (!text) return NextResponse.json({ error: 'empty' }, { status: 400 });
  const toId = typeof b.toId === 'string' && /^[0-9a-f-]{36}$/i.test(b.toId) ? b.toId : null;
  if (toId === s.uid) return NextResponse.json({ error: 'self' }, { status: 400 });

  const sb = db()!;
  // simple flood control: one message per 2 seconds per user
  const recent = await sb.from('pp_messages').select('created_at').eq('from_id', s.uid).gt('created_at', new Date(Date.now() - 2000).toISOString()).limit(1);
  if (recent.data?.length) return NextResponse.json({ error: 'slow-down' }, { status: 429 });

  const me = await sb.from('pp_presence').select('lat, lng').eq('user_id', s.uid).maybeSingle();
  const { error } = await sb.from('pp_messages').insert({ from_id: s.uid, to_id: toId, body: text, lat: me.data?.lat ?? null, lng: me.data?.lng ?? null });
  if (error) return NextResponse.json({ error: 'db' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
