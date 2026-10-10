import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { clearSession, getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

/** POST /api/logout → leaves the map immediately (presence row removed). */
export async function POST() {
  const s = getSession();
  if (s && db()) await db()!.from('pp_presence').delete().eq('user_id', s.uid);
  clearSession();
  return NextResponse.json({ ok: true });
}
