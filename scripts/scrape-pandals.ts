/**
 * Refresh pandal themes / artisans / photos from public puja listing pages.
 *
 *   npm run scrape -- --url https://example.com/durga-puja-2026-themes [--playwright]
 *
 * - Default mode fetches static HTML and parses it with Cheerio.
 * - `--playwright` renders JS-heavy pages first (requires `npm i -D playwright && npx playwright install chromium`).
 *
 * Output: scripts/output/pandal-updates.json — a list of partial Pandal records
 * matched to our seed ids by fuzzy name. Review it, then merge into src/data/pandals.ts.
 * Respect each site's robots.txt and terms; only store images you are licensed to use.
 */
import * as cheerio from 'cheerio';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PANDALS } from '../src/data/pandals';

interface ScrapedUpdate {
  id: string;
  matchedName: string;
  theme2025_2026?: string;
  artisan?: string;
  photos?: Array<{ url: string; caption: string; isPanorama360: boolean; tag: string }>;
  source: string;
}

const args = process.argv.slice(2);
const url = args[args.indexOf('--url') + 1];
const usePlaywright = args.includes('--playwright');

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

async function getHtml(target: string): Promise<string> {
  if (usePlaywright) {
    // Optional dependency — resolved at runtime only when requested.
    const { chromium } = await import('playwright' as string);
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(target, { waitUntil: 'networkidle' });
    const html = await page.content();
    await browser.close();
    return html;
  }
  const res = await fetch(target, { headers: { 'User-Agent': 'PujoPulseBot/1.0 (+research; contact repo owner)' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${target}`);
  return res.text();
}

function matchPandal(text: string) {
  const t = norm(text);
  return PANDALS.find((p) => {
    const key = norm(p.name.split(/[(\s]/)[0] + (p.name.split(' ')[1] ?? ''));
    return t.includes(key) || t.includes(norm(p.id));
  });
}

async function main() {
  if (!url || url.startsWith('--')) {
    console.error('Usage: npm run scrape -- --url <listing-page> [--playwright]');
    process.exit(1);
  }
  const $ = cheerio.load(await getHtml(url));
  const updates = new Map<string, ScrapedUpdate>();

  // Listing pages usually render one pandal per heading followed by paragraphs and images.
  $('h2, h3, h4').each((_, el) => {
    const heading = $(el).text().trim();
    const pandal = matchPandal(heading);
    if (!pandal) return;
    const block = $(el).nextUntil('h2, h3, h4');
    const text = block.text().replace(/\s+/g, ' ').trim();
    const theme = text.match(/theme[:\s-]+([^.]+)/i)?.[1]?.trim();
    const artisan = text.match(/(?:artist|artisan|designed by|sculpt\w* by)[:\s-]+([^.,]+)/i)?.[1]?.trim();
    const photos = block
      .find('img')
      .map((__, img) => {
        const src = $(img).attr('data-src') ?? $(img).attr('src');
        if (!src) return null;
        return {
          url: new URL(src, url).toString(),
          caption: $(img).attr('alt')?.trim() || pandal.name,
          isPanorama360: /360|pano/i.test(src),
          tag: 'Scraped',
        };
      })
      .get()
      .filter(Boolean);

    updates.set(pandal.id, {
      id: pandal.id,
      matchedName: heading,
      ...(theme && { theme2025_2026: theme }),
      ...(artisan && { artisan }),
      ...(photos.length && { photos }),
      source: url,
    });
  });

  const outDir = path.join(process.cwd(), 'scripts', 'output');
  await mkdir(outDir, { recursive: true });
  const outFile = path.join(outDir, 'pandal-updates.json');
  await writeFile(outFile, JSON.stringify([...updates.values()], null, 2));
  console.log(`Matched ${updates.size}/${PANDALS.length} pandals → ${outFile}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
