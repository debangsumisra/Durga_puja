import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, sessionConfigured } from '@/lib/session';

export const dynamic = 'force-dynamic';

/** GET /api/me → { enabled, user } — `enabled:false` when Supabase isn't configured. */
export async function GET() {
  if (!db() || !sessionConfigured()) return NextResponse.json({ enabled: false, user: null });
  const s = getSession();
  if (!s) return NextResponse.json({ enabled: true, user: null });
  const { data } = await db()!.from('pp_users').select('id, username, avatar').eq('id', s.uid).maybeSingle();
  return NextResponse.json({ enabled: true, user: data ? { id: data.id, name: data.username, avatar: data.avatar } : null });
}
