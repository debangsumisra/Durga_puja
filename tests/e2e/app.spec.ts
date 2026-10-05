import { expect, test } from '@playwright/test';

test.describe('PujoPulse end-to-end', () => {
  test('API: route endpoint returns road geometry, fares and live conditions', async ({ request }) => {
    const res = await request.post('/api/route', {
      data: {
        start: { lat: 22.5646, lng: 88.3517 },
        pandalIds: ['bagbazar', 'kumartuli-park', 'college-square', 'md-ali-park', 'santosh-mitra'],
        startHour: 18,
        mode: 'metro-mix',
        priority: 'balanced',
        avoidCrowds: true,
      },
    });
    expect(res.ok()).toBeTruthy();
    const it = await res.json();
    expect(it.stops).toHaveLength(5);
    expect(it.live.routing).toBe('osrm');
    expect(it.live.weather.source).toBe('open-meteo');
    expect(it.totalMins).toBeLessThanOrEqual(it.baseline.totalMins + 1);
    for (const s of it.stops) expect(s.leg.path.length).toBeGreaterThan(5);
  });

  test('API: rejects bad input', async ({ request }) => {
    expect((await request.post('/api/route', { data: { pandalIds: [] } })).status()).toBe(400);
    expect((await request.get('/api/photos?pandalId=nope')).status()).toBe(404);
  });

  test('plan a crowd-aware route that follows real roads', async ({ page }, info) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /PujoPulse/ })).toBeVisible();

    // live weather chip
    await expect(page.getByTestId('live-status')).toContainText(/°C|Unavailable/);

    // map tiles render
    const tile = page.locator('img.leaflet-tile-loaded').first();
    await expect(tile).toBeVisible();
    expect(await tile.getAttribute('src')).toContain('tile.openstreetmap.org');

    // pick the best 5 pandals of the nearest zone, then optimise
    await page.getByRole('button', { name: /Best 5/ }).first().click();
    const optimise = page.getByRole('button', { name: /Optimise route for \d+ pandals/ });
    const n = Number((await optimise.innerText()).match(/(\d+) pandal/)![1]);
    expect(n).toBeGreaterThanOrEqual(3);
    await optimise.click();

    const itinerary = page.getByTestId('itinerary');
    await expect(itinerary).toBeVisible();
    await expect(page.getByTestId('stop')).toHaveCount(n);
    await expect(itinerary).toContainText('Real road routing (OSRM)');
    await expect(page.getByTestId('total-fare')).toContainText('₹');

    // route legs drawn on the map and they bend along streets (many vertices)
    const legs = page.locator('path.route-leg');
    await expect(legs).toHaveCount(n);
    const vertexCounts = await legs.evaluateAll((els) => els.map((e) => (e.getAttribute('d') ?? '').split(/[LM]/).length));
    expect(Math.max(...vertexCounts)).toBeGreaterThan(5);

    await page.screenshot({ path: `test-results/route-${info.project.name}.png`, fullPage: true });

    // nearby food for first stop
    await page.getByRole('button', { name: /Food & stays nearby/ }).first().click();
    await expect(page.getByTestId('nearby').first()).toContainText(/min walk|Nothing found/);
  });

  test('pandal details show real photos from Wikimedia Commons', async ({ page }, info) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Bagbazar Sarbojanin', exact: true }).click();
    const gallery = page.getByTestId('gallery');
    await expect(gallery).toBeVisible();
    const img = gallery.locator('img[src*="wikimedia.org"]').first();
    await expect(img).toBeVisible();
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBeGreaterThan(100);
    await expect(page.getByTestId('nearby')).toBeVisible();
    await page.screenshot({ path: `test-results/details-${info.project.name}.png` });
  });

  test('virtual darshan: 3D slider and 360° viewer', async ({ page }, info) => {
    await page.goto('/');
    await page.getByRole('tab', { name: /virtual darshan/i }).click();
    await expect(page.locator('img[data-real="true"]').first()).toBeVisible();
    await expect(page.locator('.psv-container canvas').first()).toBeVisible();
    await page.screenshot({ path: `test-results/virtual-${info.project.name}.png` });
  });
});
