import { NEWS_REVALIDATE_SECONDS, parseBingRss, type NewsItem } from '@/lib/news';

export interface PujaEvent {
  title: string;
  venue: string;
  when: string;
  description: string;
  /** Latest news stories (with pictures) found by scraping for this event. */
  news: NewsItem[];
  image: string | null;
}

export interface EventsResult {
  events: PujaEvent[];
  source: 'gemini-search' | 'gemini-from-news' | 'news-only';
  fetchedAt: string;
}

// Tried in order — a busy (503) or out-of-quota (429) model falls through to the next one.
const MODELS = [process.env.GEMINI_MODEL, 'gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'].filter(Boolean) as string[];
const GEMINI = (m: string) => `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`;

const PROMPT = (today: string) =>
  `Today is ${today}. Search the web for the events and celebrations happening across West Bengal (Kolkata and districts) from Mahalaya 2026 (10 Oct) through Dashami (Oct 2026) for Durga Puja. ` +
  `Return ONLY a JSON array of 8-12 objects: {"title": string, "venue": string, "when": string, "description": string (max 25 words)}. Only include events you found evidence for; no markdown.`;

async function gemini(body: unknown, models = MODELS): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not set');
  let last = 'no model';
  for (const m of models) {
    try {
      const res = await fetch(GEMINI(m), {
        method: 'POST',
        headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(40_000),
        cache: 'no-store',
      });
      if (!res.ok) {
        last = `${m} ${res.status}`;
        continue;
      }
      const d = await res.json();
      return (d.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? '').join('');
    } catch (e) {
      last = `${m} ${(e as Error).message}`;
    }
  }
  throw new Error(last);
}

function parseEvents(text: string): Omit<PujaEvent, 'news' | 'image'>[] {
  const m = text.match(/\[[\s\S]*\]/);
  if (!m) return [];
  try {
    return (JSON.parse(m[0]) as Record<string, unknown>[])
      .filter((e) => typeof e.title === 'string')
      .map((e) => ({ title: String(e.title), venue: String(e.venue ?? 'West Bengal'), when: String(e.when ?? ''), description: String(e.description ?? '') }))
      .slice(0, 12);
  } catch {
    return [];
  }
}

async function newsFor(query: string, limit = 3): Promise<NewsItem[]> {
  try {
    const res = await fetch(`https://www.bing.com/news/search?q=${encodeURIComponent(query)}&format=rss&mkt=en-IN`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PujoPulse/1.0)' },
      next: { revalidate: NEWS_REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok ? parseBingRss(await res.text()).slice(0, limit) : [];
  } catch {
    return [];
  }
}

export async function findEvents(): Promise<EventsResult> {
  const today = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full' });
  let found: Omit<PujaEvent, 'news' | 'image'>[] = [];
  let source: EventsResult['source'] = 'news-only';

  // 1) LLM call with Google Search grounding → list of real events
  try {
    found = parseEvents(await gemini({ contents: [{ parts: [{ text: PROMPT(today) }] }], tools: [{ google_search: {} }] }, MODELS.slice(0, 1)));
    if (found.length) source = 'gemini-search';
  } catch (err) {
    console.warn('[events] grounded search failed:', (err as Error).message);
  }

  // 2) Fallback: scrape headlines, let the LLM structure ONLY what those headlines say
  if (!found.length) {
    console.warn('[events] falling back to news headlines');
    const qs = ['Mahalaya Durga Puja Kolkata events 2026', 'West Bengal Durga Puja events programme', 'Mahalaya Eden Gardens Red Road show', 'Mahalaya tarpan Ganga ghat Kolkata cruise', 'Durga Puja carnival inauguration Kolkata festival', 'Durga Puja fair exhibition cultural programme Bengal'];
    const seen = new Set<string>();
    const heads = (await Promise.all(qs.map((q) => newsFor(q, 10)))).flat().filter((h) => !seen.has(h.title) && seen.add(h.title));
    if (heads.length && process.env.GEMINI_API_KEY) {
      try {
        const ctx = heads.map((h) => `- ${h.title}: ${h.summary}`).join('\n');
        found = parseEvents(
          await gemini({
            contents: [{ parts: [{ text: `From ONLY these news snippets, extract EVERY distinct West Bengal Durga Puja / Mahalaya event, ritual, show, inauguration, fair, programme or notable pandal opening (aim for 8-12; a pandal opening or street programme counts). Reply ONLY with a JSON array of {"title","venue","when","description"}; skip anything not in the text. Use a short date like '10 Oct' for when, and omit events whose venue is unknown.\n${ctx}` }] }],
          }),
        );
        if (found.length) source = 'gemini-from-news';
      } catch (err) {
        console.warn('[events] news→LLM extraction failed:', (err as Error).message);
      }
    }
  }

  // 3) Scrape news + pictures for every event the LLM named
  const events: PujaEvent[] = await Promise.all(
    found.map(async (e) => {
      const news = await newsFor(`${e.title} ${e.venue.split(',')[0]} Durga Puja`);
      return { ...e, news, image: news.find((n) => n.image)?.image ?? null };
    }),
  );
  return { events, source, fetchedAt: new Date().toISOString() };
}
