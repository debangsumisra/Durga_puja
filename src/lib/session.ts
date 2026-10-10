import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

export const COOKIE = 'pp_session';
const MAX_AGE = 30 * 24 * 3600;

export interface Session {
  uid: string;
  name: string;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  return `${salt.toString('hex')}:${scryptSync(password, salt, 64).toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return timingSafeEqual(actual, expected);
}

const sign = (data: string) => createHmac('sha256', process.env.SESSION_SECRET ?? '').update(data).digest('base64url');

export const sessionConfigured = () => !!process.env.SESSION_SECRET;

export function setSession(s: Session) {
  const body = Buffer.from(JSON.stringify({ ...s, exp: Date.now() + MAX_AGE * 1000 })).toString('base64url');
  cookies().set(COOKIE, `${body}.${sign(body)}`, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: MAX_AGE });
}

export function clearSession() {
  cookies().delete(COOKIE);
}

export function getSession(): Session | null {
  if (!sessionConfigured()) return null;
  const raw = cookies().get(COOKIE)?.value;
  if (!raw) return null;
  const [body, sig] = raw.split('.');
  if (!body || !sig) return null;
  const good = Buffer.from(sign(body));
  const given = Buffer.from(sig);
  if (good.length !== given.length || !timingSafeEqual(good, given)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString());
    return p.exp > Date.now() && p.uid ? { uid: p.uid, name: p.name } : null;
  } catch {
    return null;
  }
}
