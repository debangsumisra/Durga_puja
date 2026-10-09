import { describe, expect, it } from 'vitest';
import { parseBingRss } from '@/lib/news';

const now = Date.parse('2026-10-10T06:00:00Z');
const item = (title: string, pub: string, extra = '') =>
  `<item><title>${title}</title><link>http://www.bing.com/news/apiclick.aspx?ref=x&amp;url=https%3a%2f%2fexample.com%2fa%2f1&amp;c=1</link><description>desc &amp; more</description><pubDate>${pub}</pubDate><News:Source>Src</News:Source>${extra}</item>`;

describe('parseBingRss', () => {
  const xml = `<rss><channel>${[
    item('Bagbazar pandal opens for Mahalaya', 'Sat, 10 Oct 2026 03:00:00 GMT', '<News:Image>http://www.bing.com/th?id=A&amp;pid=News</News:Image>'),
    item('Metro extends service for puja crowd', 'Fri, 09 Oct 2026 03:00:00 GMT'),
    item('Old story', 'Mon, 01 Sep 2026 03:00:00 GMT'),
  ].join('')}</channel></rss>`;
  const items = parseBingRss(xml, now);

  it('drops stale items and unwraps tracking links', () => {
    expect(items).toHaveLength(2);
    expect(items[0].url).toBe('https://example.com/a/1');
  });
  it('builds an https sized image url', () => {
    expect(items[0].image).toBe('https://www.bing.com/th?id=A&pid=News&w=800&h=450&c=14');
    expect(items[1].image).toBeNull();
  });
  it('categorises and links pandals', () => {
    expect(items[0].pandalIds).toContain('bagbazar');
    expect(items[1].category).toBe('Traffic');
    expect(items[0].summary).toBe('desc & more');
  });
});
