import type { CrowdLevel, Pandal, PandalPhoto, Zone } from '@/types/pandal';

/**
 * Seed dataset. Coordinates are approximate pandal locations.
 * Themes / artisans for 2026 are placeholders until `npm run scrape` refreshes
 * them from published puja listings — treat them as illustrative.
 */

type Popularity = 1 | 2 | 3 | 4 | 5;

/** Time-of-day crowd model for Puja days (Saptami–Navami). */
export function buildCrowdProfile(popularity: Popularity): Record<number, CrowdLevel> {
  const levels: CrowdLevel[] = ['Low', 'Medium', 'High', 'Extreme'];
  // Base demand curve: quiet mornings, afternoon lull, evening surge, peak 21:00–01:00.
  const curve = [2.2, 1.8, 1.2, 0.6, 0.3, 0.2, 0.3, 0.6, 0.9, 1.1, 1.2, 1.3, 1.3, 1.2, 1.2, 1.4, 1.7, 2.1, 2.6, 3.0, 3.3, 3.5, 3.5, 3.0];
  const out: Record<number, CrowdLevel> = {};
  for (let h = 0; h < 24; h++) {
    const score = curve[h] * (0.55 + popularity * 0.13);
    out[h] = levels[Math.max(0, Math.min(3, Math.floor(score)))];
  }
  return out;
}

function photos(id: string, name: string): PandalPhoto[] {
  return [
    { url: `/api/art/${id}?v=0`, caption: `${name} — main facade`, isPanorama360: false, tag: 'Facade' },
    { url: `/api/art/${id}?v=1`, caption: 'Pratima (idol) close-up', isPanorama360: false, tag: 'Idol' },
    { url: `/api/art/${id}?v=2`, caption: 'Interior art installation', isPanorama360: false, tag: 'Interior' },
    { url: `/api/art/${id}?v=3`, caption: 'Night lighting', isPanorama360: false, tag: 'Lighting' },
    { url: `procedural:${id}`, caption: '360° walk-through of the mandap', isPanorama360: true, tag: '360°' },
  ];
}

interface Seed {
  id: string;
  name: string;
  zone: Zone;
  lat: number;
  lng: number;
  metro: string;
  metroKm: number;
  theme: string;
  artisan: string;
  history: string;
  deity: string;
  view: number;
  year: number;
  pop: Popularity;
  rating: number;
}

const seeds: Seed[] = [
  // ---------- North ----------
  { id: 'kumartuli-park', name: 'Kumartuli Park Sarbojanin', zone: 'North', lat: 22.6006, lng: 88.3596, metro: 'Shobhabazar Sutanuti', metroKm: 0.6, theme: 'Mrinmoyee — a tribute to the clay idol-makers of Kumartuli', artisan: 'Kumartuli artisans collective', history: 'Sits in the heart of the potters quarter where most of Kolkata’s idols are sculpted.', deity: 'Traditional ek-chala Durga with Lakshmi, Saraswati, Kartik and Ganesh under a single arch.', view: 20, year: 1933, pop: 4, rating: 4.6 },
  { id: 'ahiritola', name: 'Ahiritola Sarbojanin', zone: 'North', lat: 22.5978, lng: 88.3577, metro: 'Shobhabazar Sutanuti', metroKm: 0.8, theme: 'Gangar Ghate — river-front life along the Hooghly', artisan: 'Local art collective', history: 'One of North Kolkata’s oldest community pujas, by the Hooghly ghats.', deity: 'Sabeki (classical) styled idol with daaker saaj ornamentation.', view: 15, year: 1937, pop: 3, rating: 4.4 },
  { id: 'bagbazar', name: 'Bagbazar Sarbojanin', zone: 'North', lat: 22.6043, lng: 88.3651, metro: 'Shobhabazar Sutanuti', metroKm: 1.0, theme: 'Sabeki tradition with a heritage mela on the grounds', artisan: 'Traditional idol makers', history: 'Founded in 1919; famous for its huge traditional idol and the fair that accompanies it.', deity: 'Tall, majestic sabeki Durga with daaker saaj — one of the city’s most photographed.', view: 25, year: 1919, pop: 5, rating: 4.7 },
  { id: 'shobhabazar-rajbari', name: 'Shobhabazar Rajbari', zone: 'North', lat: 22.5963, lng: 88.3637, metro: 'Shobhabazar Sutanuti', metroKm: 0.3, theme: 'Bonedi bari puja — aristocratic family tradition', artisan: 'Deb family (hereditary)', history: 'Started by Raja Nabakrishna Deb in 1757 — Robert Clive is said to have attended.', deity: 'Family idol worshipped in the thakurdalan with centuries-old rituals.', view: 20, year: 1757, pop: 3, rating: 4.6 },
  { id: 'tala-prattoy', name: 'Tala Prattoy', zone: 'North', lat: 22.6087, lng: 88.3791, metro: 'Belgachia', metroKm: 0.9, theme: 'Large-scale installation art — immersive walk-through', artisan: 'Contemporary installation artists', history: 'Known for ambitious theme pandals that frequently win city awards.', deity: 'Modern sculptural idol integrated into the theme.', view: 25, year: 1972, pop: 5, rating: 4.5 },
  { id: 'kashi-bose-lane', name: 'Kashi Bose Lane', zone: 'North', lat: 22.5871, lng: 88.3685, metro: 'Girish Park', metroKm: 0.5, theme: 'Folk crafts of Bengal reimagined', artisan: 'Rural craft guilds', history: 'A popular lane puja near Girish Park known for craft-based themes.', deity: 'Idol crafted to match the folk-art theme.', view: 15, year: 1937, pop: 3, rating: 4.3 },
  // ---------- Central ----------
  { id: 'md-ali-park', name: 'Mohammad Ali Park', zone: 'Central', lat: 22.5793, lng: 88.3604, metro: 'MG Road', metroKm: 0.4, theme: 'Replica architecture — famous monuments recreated', artisan: 'Set-design studio', history: 'A Central Kolkata landmark puja famed for monumental replicas.', deity: 'Grand idol beneath a replica dome.', view: 20, year: 1969, pop: 5, rating: 4.4 },
  { id: 'college-square', name: 'College Square Sarbojanin', zone: 'Central', lat: 22.5747, lng: 88.3637, metro: 'Central', metroKm: 0.9, theme: 'Lights on the water — reflections across the College Square pool', artisan: 'Chandannagar lighting artisans', history: 'Its lit reflections on the swimming-pool tank are an annual highlight.', deity: 'Shimmering idol framed by lights reflected on the pond.', view: 20, year: 1948, pop: 5, rating: 4.6 },
  { id: 'santosh-mitra', name: 'Santosh Mitra Square (Lebutala)', zone: 'Central', lat: 22.5641, lng: 88.3651, metro: 'Sealdah', metroKm: 0.7, theme: 'Gold-clad idol & mega replica', artisan: 'Committee artisans', history: 'Famous for its gold idol and blockbuster replica themes that draw record crowds.', deity: 'Durga adorned in gold — one of the most crowded darshans in the city.', view: 30, year: 1936, pop: 5, rating: 4.5 },
  { id: 'kolkata-maidan', name: 'Esplanade Maidan Puja', zone: 'Central', lat: 22.5600, lng: 88.3510, metro: 'Esplanade', metroKm: 0.3, theme: 'Open-ground puja with mela stalls', artisan: 'Community committee', history: 'Easy-access stop near the Esplanade transit hub.', deity: 'Classical idol with ek-chala chalchitra.', view: 15, year: 1958, pop: 2, rating: 4.1 },
  // ---------- South ----------
  { id: 'ekdalia', name: 'Ekdalia Evergreen', zone: 'South', lat: 22.5172, lng: 88.3663, metro: 'Kalighat', metroKm: 2.0, theme: 'Temple replica with intricate carvings', artisan: 'Temple-architecture craftsmen', history: 'A Gariahat stalwart known for temple-style pandals.', deity: 'Traditional idol with elaborate shola work.', view: 20, year: 1943, pop: 4, rating: 4.5 },
  { id: 'singhi-park', name: 'Singhi Park', zone: 'South', lat: 22.5182, lng: 88.3678, metro: 'Kalighat', metroKm: 2.1, theme: 'Heritage meets lighting', artisan: 'Local art directors', history: 'Next door to Ekdalia — the two are usually visited together.', deity: 'Classical Durga in sabeki style.', view: 15, year: 1942, pop: 4, rating: 4.4 },
  { id: 'deshapriya-park', name: 'Deshapriya Park', zone: 'South', lat: 22.5203, lng: 88.3518, metro: 'Kalighat', metroKm: 1.1, theme: 'Grand-scale spectacle', artisan: 'Committee art team', history: 'Made headlines for the “biggest Durga” idol; draws huge crowds.', deity: 'Monumental idol — expect tight crowd control.', view: 25, year: 1938, pop: 5, rating: 4.3 },
  { id: 'tridhara', name: 'Tridhara Sammilani', zone: 'South', lat: 22.5168, lng: 88.3497, metro: 'Kalighat', metroKm: 1.0, theme: 'Eco-conscious theme with recycled materials', artisan: 'Theme art collective', history: 'Known for socially-conscious, award-winning themes.', deity: 'Minimalist modern idol.', view: 20, year: 1960, pop: 4, rating: 4.5 },
  { id: 'badamtala', name: 'Badamtala Ashar Sangha', zone: 'South', lat: 22.5133, lng: 88.3449, metro: 'Kalighat', metroKm: 0.9, theme: 'Rural Bengal storytelling installation', artisan: 'Folk-art collaborators', history: 'Consistent award winner for artistic themes in South Kolkata.', deity: 'Idol shaped in folk-art idiom.', view: 20, year: 1935, pop: 4, rating: 4.6 },
  { id: 'chetla-agrani', name: 'Chetla Agrani', zone: 'South', lat: 22.5158, lng: 88.3382, metro: 'Kalighat', metroKm: 1.3, theme: 'Sculptural idol by a leading contemporary artist', artisan: 'Contemporary sculptor', history: 'Famous for artist-designed idols that redefine Durga’s form.', deity: 'Avant-garde idol design — a talking point every year.', view: 20, year: 1952, pop: 5, rating: 4.6 },
  { id: 'suruchi-sangha', name: 'Suruchi Sangha', zone: 'South', lat: 22.4983, lng: 88.3332, metro: 'Tollygunge', metroKm: 1.8, theme: 'States of India — cultural showcase', artisan: 'Craftspeople from across India', history: 'Celebrates a different Indian state’s culture each year.', deity: 'Idol styled after the featured region.', view: 25, year: 1953, pop: 5, rating: 4.5 },
  { id: 'behala-notun-dal', name: 'Behala Notun Dal', zone: 'South', lat: 22.4957, lng: 88.3112, metro: 'Behala Chowrasta', metroKm: 0.7, theme: 'Art-installation puja', artisan: 'Art college alumni', history: 'Behala’s flagship theme puja.', deity: 'Sculptural theme-based idol.', view: 20, year: 1962, pop: 3, rating: 4.3 },
  { id: 'barisha-club', name: 'Barisha Club', zone: 'South', lat: 22.4732, lng: 88.3161, metro: 'Sakherbazar', metroKm: 0.6, theme: 'Social-message installation', artisan: 'Theme artists', history: 'Known for strong social-message pandals in Behala.', deity: 'Expressive modern idol.', view: 20, year: 1980, pop: 3, rating: 4.3 },
  // ---------- Salt Lake / East ----------
  { id: 'fd-block', name: 'FD Block Salt Lake', zone: 'Salt Lake', lat: 22.5903, lng: 88.4049, metro: 'City Centre', metroKm: 1.2, theme: 'Celebrity-studded spectacle with lavish decor', artisan: 'Event design studio', history: 'Bidhannagar’s most famous puja; frequently inaugurated by film stars.', deity: 'Opulent idol with heavy ornamentation.', view: 20, year: 1986, pop: 5, rating: 4.4 },
  { id: 'ae-block', name: 'AE Block Salt Lake', zone: 'Salt Lake', lat: 22.5882, lng: 88.4119, metro: 'City Centre', metroKm: 0.8, theme: 'Traditional decor in a residential block', artisan: 'Block committee', history: 'Calmer, family-friendly Salt Lake puja.', deity: 'Classical idol.', view: 15, year: 1979, pop: 3, rating: 4.2 },
  { id: 'bj-block', name: 'BJ Block Salt Lake', zone: 'Salt Lake', lat: 22.5802, lng: 88.4083, metro: 'Bengal Chemical', metroKm: 1.0, theme: 'Theme pandal with art-installation feel', artisan: 'Art directors', history: 'Popular Salt Lake stop near Karunamoyee.', deity: 'Theme-based idol.', view: 15, year: 1983, pop: 3, rating: 4.2 },
  { id: 'sreebhumi', name: 'Sreebhumi Sporting Club', zone: 'Salt Lake', lat: 22.6043, lng: 88.4042, metro: 'Dum Dum', metroKm: 3.3, theme: 'Mega replica of a world landmark', artisan: 'Set-design studio', history: 'Lake Town’s blockbuster puja; gold-adorned idol and enormous replicas.', deity: 'Durga adorned with heavy gold ornaments.', view: 30, year: 1973, pop: 5, rating: 4.4 },
];

export const PANDALS: Pandal[] = seeds.map((s) => ({
  id: s.id,
  name: s.name,
  zone: s.zone,
  coordinates: { lat: s.lat, lng: s.lng },
  nearestMetro: s.metro,
  metroDistanceKm: s.metroKm,
  theme2025_2026: s.theme,
  artisan: s.artisan,
  historicalSignificance: s.history,
  avgViewingTimeMins: s.view,
  crowdLevelByHour: buildCrowdProfile(s.pop),
  photos: photos(s.id, s.name),
  deityDescription: s.deity,
  establishedYear: s.year,
  rating: s.rating,
}));

export const ZONES: Zone[] = ['North', 'Central', 'South', 'Salt Lake'];

export const ZONE_META: Record<Zone, { label: string; color: string; blurb: string }> = {
  North: { label: 'North Kolkata', color: '#e0301e', blurb: 'Bonedi baris, Kumartuli & heritage lanes' },
  Central: { label: 'Central', color: '#f6a609', blurb: 'Blockbuster crowd-pullers near Sealdah & College St' },
  South: { label: 'South Kolkata', color: '#9b5de5', blurb: 'Award-winning theme pandals around Gariahat & Behala' },
  'Salt Lake': { label: 'Salt Lake / East', color: '#00a6a6', blurb: 'Planned blocks, wide roads, celebrity pujas' },
};

export const getPandal = (id: string) => PANDALS.find((p) => p.id === id);
