import { NextResponse } from 'next/server';
import { getPandal } from '@/data/pandals';
import { commonsPhotos } from '@/lib/live';

export const dynamic = 'force-dynamic';

/** Search terms that work well on Commons for each pandal's name. */
const QUERY_OVERRIDES: Record<string, string> = {
  'santosh-mitra': 'Santosh Mitra Square Durga Puja',
  'kolkata-maidan': 'Durga Puja Kolkata pandal Esplanade',
  'md-ali-park': 'Md Ali Park Durga Puja',
  'shobhabazar-rajbari': 'Sovabazar Rajbari Durga Puja',
  'sreebhumi': 'Sreebhumi Durga Puja',
  'fd-block': 'FD Block Durga Puja',
};

/** GET /api/photos?pandalId=bagbazar → real, freely-licensed photos from Wikimedia Commons */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get('pandalId') ?? '';
  const pandal = getPandal(id);
  if (!pandal) return NextResponse.json({ error: 'Unknown pandalId' }, { status: 404 });

  const primary = QUERY_OVERRIDES[id] ?? `${pandal.name.replace(/\(.*\)|Sarbojanin|Sporting Club|Salt Lake/g, '').trim()} Durga Puja`;
  try {
    let photos = await commonsPhotos(primary);
    if (photos.length < 3) {
      const more = await commonsPhotos(`${pandal.name.split(' ')[0]} Durga Puja Kolkata`);
      const seen = new Set(photos.map((p) => p.url));
      photos = [...photos, ...more.filter((p) => !seen.has(p.url))].slice(0, 8);
    }
    return NextResponse.json({ source: 'wikimedia-commons', query: primary, photos }, { headers: { 'Cache-Control': 'public, max-age=3600' } });
  } catch (e) {
    return NextResponse.json({ source: 'unavailable', error: (e as Error).message, photos: [] });
  }
}
