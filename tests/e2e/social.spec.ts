import { expect, request as pwRequest, test, type APIRequestContext } from '@playwright/test';

const RUN = Math.random().toString(36).slice(2, 7);
const PREFIX = 'e2e_';
const name = (s: string) => `${PREFIX}${s}_${RUN}`;
const ESPLANADE = { lat: 22.5646, lng: 88.3517 };

async function cleanup() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  await fetch(`${url}/rest/v1/pp_users?username_key=like.${PREFIX}*_${RUN}`, { method: 'DELETE', headers: { apikey: key, Authorization: `Bearer ${key}` } });
}

test.describe('social: login, avatars, live crowd, messages', () => {
  test.describe.configure({ mode: 'serial' });
  test.afterAll(cleanup);

  let base: string | undefined;
  let a: APIRequestContext;
  let b: APIRequestContext;
  let idA = '';
  let idB = '';

  test.beforeAll(async ({ playwright }, info) => {
    const baseURL = (base = info.project.use.baseURL);
    a = await playwright.request.newContext({ baseURL });
    b = await playwright.request.newContext({ baseURL });
  });

  test('new name → picks avatar → account created, session cookie set', async () => {
    const first = await (await a.post('/api/auth', { data: { name: name('alice'), password: 'secret1' } })).json();
    expect(first.status).toBe('new');
    const bad = await a.post('/api/auth', { data: { name: name('alice'), password: 'secret1', avatar: 'wizard' } });
    expect(bad.status()).toBe(400);
    const res = await a.post('/api/auth', { data: { name: name('alice'), password: 'secret1', avatar: 'spy' } });
    const d = await res.json();
    expect(d.status).toBe('created');
    idA = d.user.id;
    expect(res.headers()['set-cookie']).toContain('HttpOnly');
    const me = await (await a.get('/api/me')).json();
    expect(me.user).toMatchObject({ name: name('alice'), avatar: 'spy' });
  });

  test('same name + wrong password → "taken" with free suggestions; right password logs in', async () => {
    const c = await pwRequest.newContext({ baseURL: base });
    const res = await c.post('/api/auth', { data: { name: name('alice').toUpperCase(), password: 'nope-nope' } });
    expect(res.status()).toBe(409);
    const d = await res.json();
    expect(d.status).toBe('taken');
    expect(d.suggestions.length).toBeGreaterThan(0);
    for (const s of d.suggestions) expect(s.toLowerCase()).not.toBe(name('alice').toLowerCase());
    const ok = await (await c.post('/api/auth', { data: { name: name('alice'), password: 'secret1' } })).json();
    expect(ok.status).toBe('login');
    await c.dispose();
  });

  test('passwords are stored hashed, never in plain text', async () => {
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const rows = await (await fetch(`${url}/rest/v1/pp_users?select=pass_hash&username_key=eq.${name('alice').toLowerCase()}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } })).json();
    expect(rows[0].pass_hash).not.toContain('secret1');
    expect(rows[0].pass_hash).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/);
  });

  test('the public anon-style access cannot read users (RLS)', async () => {
    const url = process.env.SUPABASE_URL!;
    const res = await fetch(`${url}/rest/v1/pp_users?select=*`, { headers: { apikey: 'not-a-real-anon-key' } });
    expect(res.ok).toBeFalsy();
  });

  test('two visitors see each other, nearby message + direct note arrive', async () => {
    const d = await (await b.post('/api/auth', { data: { name: name('bob'), password: 'secret2', avatar: 'baddie' } })).json();
    expect(d.status).toBe('created');
    idB = d.user.id;

    // sync requires a session
    const anon = await pwRequest.newContext({ baseURL: base });
    expect((await anon.post('/api/sync', { data: ESPLANADE })).status()).toBe(401);
    await anon.dispose();

    const sa1 = await (await a.post('/api/sync', { data: { ...ESPLANADE } })).json();
    const cursorA = sa1.now;
    const sb1 = await (await b.post('/api/sync', { data: { lat: 22.5703, lng: 88.3639 } })).json();
    expect(sb1.users.map((u: { id: string }) => u.id)).toContain(idA);

    const sa2 = await (await a.post('/api/sync', { data: { ...ESPLANADE, since: cursorA } })).json();
    const seenB = sa2.users.find((u: { id: string }) => u.id === idB);
    expect(seenB).toMatchObject({ name: name('bob'), avatar: 'baddie' });
    expect(seenB.lat).toBeCloseTo(22.5703, 3);

    // direct note B → A, broadcast B → nearby
    expect((await b.post('/api/message', { data: { toId: idA, body: 'Shubho Mahalaya! <script>x</script>' } })).ok()).toBeTruthy();
    expect((await b.post('/api/message', { data: { toId: idA, body: 'again' } })).status()).toBe(429); // flood control
    await new Promise((r) => setTimeout(r, 3200));
    expect((await b.post('/api/message', { data: { body: 'Anyone at College Square?' } })).ok()).toBeTruthy();

    const sa3 = await (await a.post('/api/sync', { data: { ...ESPLANADE, since: cursorA } })).json();
    const mine = (sa3.messages as { fromName: string }[]).filter((m) => m.fromName.endsWith(RUN));
    const bodies = mine.map((m: unknown) => { const x = m as { body: string; direct: boolean }; return `${x.direct ? 'D' : 'N'}:${x.body}`; } );
    expect(bodies.some((x: string) => x.startsWith('D:Shubho Mahalaya!'))).toBeTruthy();
    expect(bodies.join('|')).not.toContain('<script>');
    expect(bodies).toContain('N:Anyone at College Square?');
    const m0 = mine[0];
    expect(m0).toMatchObject({ fromName: name('bob'), fromAvatar: 'baddie' });

    // a sender never receives their own messages
    const sb2 = await (await b.post('/api/sync', { data: { lat: 22.5703, lng: 88.3639, since: cursorA } })).json();
    expect((sb2.messages as { fromName: string }[]).filter((m) => m.fromName === name('bob'))).toHaveLength(0);
  });

  test('UI: join dialog → choose character → my avatar stands on the map; other online users show too', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('join-crowd').click();
    const dlg = page.getByTestId('auth-dialog');
    await dlg.getByLabel('Name').fill(name('carol'));
    await dlg.getByLabel('Password').fill('secret3');
    await dlg.getByRole('button', { name: 'Continue' }).click();
    await expect(dlg.getByRole('radiogroup')).toBeVisible();
    await expect(dlg.getByRole('radio')).toHaveCount(5);
    await dlg.getByTestId('avatar-thief').click();
    await dlg.getByRole('button', { name: 'Enter the pandals' }).click();

    await expect(page.getByTestId('social-bar')).toContainText(name('carol'));
    await expect(page.getByTestId('toasts')).toContainText('Namaskar');

    await page.getByRole('tab', { name: /route planner/i }).click();
    await expect(page.locator('.peer-me .peer-name')).toContainText(`${name('carol')} (you)`);

    // Alice + Bob heartbeat → Carol sees them as avatars within a few seconds
    await a.post('/api/sync', { data: { lat: 22.5647, lng: 88.3518 } });
    await b.post('/api/sync', { data: { lat: 22.5703, lng: 88.3639 } });
    await expect(page.locator('.peer-icon:not(:has(.peer-me)) .peer-name', { hasText: name('bob') })).toBeVisible({ timeout: 15_000 });

    await page.screenshot({ path: 'test-results/social-map.png' });

    // log out → leaves the crowd
    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page.getByTestId('join-crowd')).toBeVisible();
  });
});
