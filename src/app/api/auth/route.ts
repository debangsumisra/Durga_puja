import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, sessionConfigured, setSession, verifyPassword } from '@/lib/session';
import { AVATAR_IDS, NAME_RE, type AvatarId } from '@/lib/social';

export const dynamic = 'force-dynamic';

const SUFFIXES = ['dhak', 'pujo', 'shiuli', 'dhuni', 'alpona', 'sindoor', 'bijoya', 'kash'];

async function suggest(base: string): Promise<string[]> {
  const root = base.slice(0, 14);
  const pool = new Set<string>();
  while (pool.size < 10) {
    const s = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];
    pool.add(Math.random() < 0.5 ? `${root}_${s}` : `${root}${Math.floor(10 + Math.random() * 90)}`);
  }
  const cands = [...pool].filter((n) => NAME_RE.test(n));
  const { data } = await db()!.from('pp_users').select('username_key').in('username_key', cands.map((c) => c.toLowerCase()));
  const taken = new Set((data ?? []).map((r) => r.username_key));
  return cands.filter((c) => !taken.has(c.toLowerCase())).slice(0, 3);
}

/**
 * One form, two inputs. Name + password:
 *  - known name + right password  → log in
 *  - known name + wrong password  → 409 "taken", with free alternatives
 *  - unknown name                 → { status:'new' }; the client then sends `avatar` to create the account
 */
export async function POST(req: Request) {
  if (!db() || !sessionConfigured()) return NextResponse.json({ error: 'not-configured' }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? '').trim();
  const password = String(body.password ?? '');
  const avatar = body.avatar as AvatarId | undefined;

  if (!NAME_RE.test(name)) return NextResponse.json({ error: 'Name must be 3–20 letters, numbers, _ . or -' }, { status: 400 });
  if (password.length < 4 || password.length > 64) return NextResponse.json({ error: 'Password must be 4–64 characters' }, { status: 400 });

  const key = name.toLowerCase();
  const { data: user, error } = await db()!.from('pp_users').select('id, username, pass_hash, avatar').eq('username_key', key).maybeSingle();
  if (error) return NextResponse.json({ error: 'db' }, { status: 500 });

  if (user) {
    if (!verifyPassword(password, user.pass_hash)) {
      return NextResponse.json({ status: 'taken', error: 'That name is taken (or the password is wrong).', suggestions: await suggest(name) }, { status: 409 });
    }
    setSession({ uid: user.id, name: user.username });
    return NextResponse.json({ status: 'login', user: { id: user.id, name: user.username, avatar: user.avatar } });
  }

  if (!avatar) return NextResponse.json({ status: 'new' });
  if (!AVATAR_IDS.includes(avatar)) return NextResponse.json({ error: 'Pick one of the 5 characters' }, { status: 400 });

  const { data: created, error: insErr } = await db()!
    .from('pp_users')
    .insert({ username: name, username_key: key, pass_hash: hashPassword(password), avatar })
    .select('id, username, avatar')
    .single();
  if (insErr) {
    if (insErr.code === '23505') return NextResponse.json({ status: 'taken', error: 'Someone just took that name.', suggestions: await suggest(name) }, { status: 409 });
    return NextResponse.json({ error: 'db' }, { status: 500 });
  }
  setSession({ uid: created.id, name: created.username });
  return NextResponse.json({ status: 'created', user: { id: created.id, name: created.username, avatar: created.avatar } });
}
