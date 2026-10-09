import { PANDALS } from '@/data/pandals';

export type NewsCategory = 'Live' | 'Trending' | 'Traffic' | 'Weather' | 'Events';

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  image: string | null;
  publishedAt: string;
  category: NewsCategory;
  /** Pandal ids mentioned in the headline/summary — lets the UI link to the planner. */
  pandalIds: string[];
}

/** Re-scrape window: 4 hours. Used for both fetch caching and the route's ISR. */
export const NEWS_REVALIDATE_SECONDS = 4 * 60 * 60;

const QUERIES = [
  'Durga Puja Kolkata pandal',
  'Mahalaya Kolkata Durga Puja',
  'Kolkata pandal trending theme',
  'Durga Puja West Bengal events',
  'Kolkata puja traffic crowd police advisory',
  'Durga Puja Kolkata carnival immersion',
];

const MAX_AGE_MS = 6 * 24 * 3600 * 1000;

const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/<[^>]+>/g, '')
    .trim();

const tag = (xml: string, name: string) => {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? decode(m[1]) : '';
};

/** Bing wraps the publisher URL in a tracking redirect — unwrap it. */
function realUrl(link: string): string {
  try {
    const u = new URL(link.replace(/&amp;/g, '&'));
    return u.searchParams.get('url') ?? link;
  } catch {
    return link;
  }
}

function categorise(text: string): NewsCategory {
  const t = text.toLowerCase();
  if (/traffic|diversion|metro|police|crowd|barricade|advisory|bus service|cab/.test(t)) return 'Traffic';
  if (/rain|weather|forecast|showers|depression|downpour/.test(t)) return 'Weather';
  if (/mahalaya|inaugurat|unveil|opens?|launch|carnival|lights?|festival|tarpan|bodhon|chokkhu|live|today/.test(t)) return 'Live';
  if (/theme|pandal|best|trending|must-visit|popular|top \d+|hopping|replica|idol/.test(t)) return 'Trending';
  return 'Events';
}

const pandalIndex = PANDALS.map((p) => ({
  id: p.id,
  keys: [p.name.replace(/\s*\(.*\)/, ''), ...p.name.split(/[\s()]+/).filter((w) => w.length > 5 && !/sarbojanin|sammilani|sporting|evergreen|ashar|sangha|club|block/i.test(w))].map((k) =>
    k.toLowerCase(),
  ),
}));

function mentionedPandals(text: string): string[] {
  const t = text.toLowerCase();
  return pandalIndex.filter((p) => p.keys.some((k) => t.includes(k))).map((p) => p.id);
}

export function parseBingRss(xml: string, now = Date.now()): NewsItem[] {
  const items: NewsItem[] = [];
  for (const raw of xml.split('<item>').slice(1)) {
    const title = tag(raw, 'title');
    const link = tag(raw, 'link');
    const published = new Date(tag(raw, 'pubDate')).getTime();
    if (!title || !link || !Number.isFinite(published)) continue;
    if (now - published > MAX_AGE_MS || published > now + 3600_000) continue;
    const img = tag(raw, 'News:Image');
    const summary = tag(raw, 'description');
    items.push({
      id: Buffer.from(realUrl(link)).toString('base64url').slice(-24),
      title,
      summary,
      url: realUrl(link),
      source: tag(raw, 'News:Source') || 'News',
      // Bing's thumbnail URL takes w/h params — ask for a crisp 16:9 card image
      image: img ? img.replace(/^http:/, 'https:') + '&w=800&h=450&c=14' : null,
      publishedAt: new Date(published).toISOString(),
      category: categorise(`${title} ${summary}`),
      pandalIds: mentionedPandals(`${title} ${summary}`),
    });
  }
  return items;
}

async function fetchQuery(q: string): Promise<NewsItem[]> {
  const url = `https://www.bing.com/news/search?q=${encodeURIComponent(q)}&format=rss&mkt=en-IN`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PujoPulse/1.0)' },
    next: { revalidate: NEWS_REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`bing ${res.status}`);
  return parseBingRss(await res.text());
}

/** Fallback image when the feed has no thumbnail: the article's og:image. */
async function ogImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PujoPulse/1.0)' },
      next: { revalidate: NEWS_REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, 60_000);
    const m = html.match(/<meta[^>]+(?:property|name)=["']og:image["'][^>]*content=["']([^"']+)["']/i) ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
    return m && m[1].startsWith('http') ? decode(m[1]) : null;
  } catch {
    return null;
  }
}

export async function scrapeNews(): Promise<{ items: NewsItem[]; fetchedAt: string; sources: number }> {
  const results = await Promise.allSettled(QUERIES.map(fetchQuery));
  const seen = new Set<string>();
  const items: NewsItem[] = [];
  let ok = 0;
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    ok++;
    for (const it of r.value) {
      const key = it.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').slice(0, 60);
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(it);
    }
  }
  items.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const top = items.slice(0, 40);
  // fill in missing pictures for the first few items only (keeps the scrape quick)
  await Promise.all(
    top
      .filter((i) => !i.image)
      .slice(0, 8)
      .map(async (i) => {
        i.image = await ogImage(i.url);
      }),
  );
  return { items: top, fetchedAt: new Date().toISOString(), sources: ok };
}
