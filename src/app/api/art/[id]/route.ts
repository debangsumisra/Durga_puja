import { getPandal, ZONE_META } from '@/data/pandals';

/**
 * Generates a stylised SVG poster for a pandal photo slot. Used until real,
 * licensed photography is pulled in by `scripts/scrape-pandals.ts`.
 */
function hash(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

export function GET(req: Request, { params }: { params: { id: string } }) {
  const p = getPandal(params.id);
  const v = Number(new URL(req.url).searchParams.get('v') ?? 0);
  const seed = hash(params.id + v);
  const accent = p ? ZONE_META[p.zone].color : '#e0301e';
  const hue = seed % 360;
  const name = (p?.name ?? 'Pandal').replace(/&/g, '&amp;');
  const labels = ['FACADE', 'PRATIMA', 'INTERIOR', 'LIGHTING'];

  const lights = Array.from({ length: 40 }, (_, i) => {
    const x = (hash(`${seed}x${i}`) % 1200);
    const y = (hash(`${seed}y${i}`) % 380);
    const r = 1 + (hash(`${seed}r${i}`) % 4);
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="#ffd166" opacity="${0.4 + (i % 5) / 10}"/>`;
  }).join('');

  const arches = Array.from({ length: 5 }, (_, i) => {
    const w = 900 - i * 150;
    const x = 600 - w / 2;
    const h = 520 - i * 70;
    return `<path d="M${x} 800 L${x} ${800 - h + w / 4} Q600 ${800 - h - w / 6} ${x + w} ${800 - h + w / 4} L${x + w} 800 Z" fill="none" stroke="${i % 2 ? '#ffbf3c' : accent}" stroke-width="${10 - i}" opacity="${0.9 - i * 0.12}"/>`;
  }).join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
  <defs>
    <radialGradient id="g" cx="50%" cy="60%" r="75%">
      <stop offset="0" stop-color="hsl(${hue},85%,45%)"/>
      <stop offset="0.55" stop-color="hsl(${(hue + 20) % 360},70%,18%)"/>
      <stop offset="1" stop-color="#140b08"/>
    </radialGradient>
    <radialGradient id="halo" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#ffd166" stop-opacity="0.9"/>
      <stop offset="1" stop-color="#ffd166" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="800" fill="url(#g)"/>
  ${lights}
  ${arches}
  <circle cx="600" cy="430" r="${130 + (v % 2) * 30}" fill="url(#halo)"/>
  <g transform="translate(600 470)" fill="#ffbf3c" opacity="0.95">
    <ellipse cx="0" cy="-70" rx="34" ry="42"/>
    <path d="M-70 120 Q0 -40 70 120 Z"/>
    ${Array.from({ length: 10 }, (_, i) => `<rect x="-6" y="-10" width="12" height="${110 - Math.abs(i - 4.5) * 8}" rx="6" transform="rotate(${-90 + i * 20})" opacity="0.75"/>`).join('')}
  </g>
  <rect x="0" y="680" width="1200" height="120" fill="#140b08" opacity="0.75"/>
  <text x="40" y="735" font-family="Georgia, serif" font-size="40" fill="#fff">${name}</text>
  <text x="40" y="775" font-family="Arial, sans-serif" font-size="20" letter-spacing="6" fill="${accent}">${labels[v % 4]} · PUJOPULSE 2026</text>
</svg>`;

  return new Response(svg, {
    headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400, immutable' },
  });
}
