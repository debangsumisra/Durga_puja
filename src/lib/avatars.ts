import type { AvatarId } from './social';

export interface AvatarDef {
  id: AvatarId;
  label: string;
  blurb: string;
  /** inner SVG for viewBox 0 0 60 84 */
  body: string;
}

const E = '#cbbfb2'; // soft outline that reads on both light and dark backgrounds

const legs = (shoe: string, pants = '#fff') =>
  `<rect x="21" y="68" width="8" height="12" rx="4" fill="${pants}" stroke="${E}" stroke-width=".9"/><rect x="31" y="68" width="8" height="12" rx="4" fill="${pants}" stroke="${E}" stroke-width=".9"/>
   <ellipse cx="25" cy="80.5" rx="6" ry="3" fill="${shoe}"/><ellipse cx="35" cy="80.5" rx="6" ry="3" fill="${shoe}"/>`;
const head = (skin = '#fff') => `<ellipse cx="30" cy="21" rx="12.5" ry="15" fill="${skin}" stroke="${E}" stroke-width=".9"/>`;
const eyes = (y = 20, r = 1.9) =>
  `<circle cx="25.2" cy="${y}" r="${r}" fill="#161616"/><circle cx="34.8" cy="${y}" r="${r}" fill="#161616"/><circle cx="25.8" cy="${y - 0.7}" r=".7" fill="#fff"/><circle cx="35.4" cy="${y - 0.7}" r=".7" fill="#fff"/>`;
const smile = (y = 28, w = 3.6) => `<path d="M${30 - w} ${y} Q30 ${y + 3.6} ${30 + w} ${y}" stroke="#161616" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;
const arms = (fill: string) =>
  `<ellipse cx="11.5" cy="52" rx="4" ry="9" fill="${fill}" stroke="${E}" stroke-width=".9"/><ellipse cx="48.5" cy="52" rx="4" ry="9" fill="${fill}" stroke="${E}" stroke-width=".9"/>`;

export const AVATARS: Record<AvatarId, AvatarDef> = {
  spy: {
    id: 'spy',
    label: 'The Spy',
    blurb: 'Trench coat, dark shades — sneaking between pandals to spot the best bhog.',
    body: `${legs('#222', '#3b3f4a')}${arms('#6b6f7a')}
      <ellipse cx="30" cy="52" rx="17" ry="20" fill="#6b6f7a" stroke="${E}" stroke-width=".9"/>
      <path d="M30 34 L24 46 L30 70 L36 46 Z" fill="#e9e6df"/><path d="M30 36 L21 33 L26 48 Z M30 36 L39 33 L34 48 Z" fill="#555a66"/>
      <rect x="14" y="58" width="32" height="3" fill="#44485a"/>
      ${head()}
      <path d="M13 12 Q30 4 47 12 L45 15 Q30 9 15 15 Z" fill="#222"/><ellipse cx="30" cy="9.5" rx="13" ry="6" fill="#2d2d33"/><rect x="17" y="9" width="26" height="3.2" fill="#a23"/>
      <rect x="17.5" y="17.5" width="11" height="6.2" rx="2.6" fill="#101010"/><rect x="31.5" y="17.5" width="11" height="6.2" rx="2.6" fill="#101010"/><rect x="28" y="19" width="4" height="1.4" fill="#101010"/>
      <path d="M26 29 H34" stroke="#161616" stroke-width="1.3" stroke-linecap="round"/>
      <circle cx="53" cy="62" r="5.5" fill="rgba(160,210,255,.55)" stroke="#d4a017" stroke-width="2"/><path d="M49 66 L44 72" stroke="#d4a017" stroke-width="2.4" stroke-linecap="round"/>`,
  },
  thief: {
    id: 'thief',
    label: 'The Chor',
    blurb: 'Masked bandit with a sack — here to steal the best seat (and a rosogolla).',
    body: `${legs('#222', '#2a2a2e')}${arms('#fff')}
      <ellipse cx="30" cy="52" rx="16" ry="19" fill="#fff" stroke="${E}" stroke-width=".9"/>
      <g fill="#1c1c20"><rect x="14.5" y="40" width="31" height="3.2"/><rect x="14" y="47" width="32" height="3.2"/><rect x="14" y="54" width="32" height="3.2"/><rect x="14.5" y="61" width="31" height="3.2"/></g>
      ${head()}
      <path d="M17.5 14 Q30 -2 42.5 14 Z" fill="#1c1c20"/><circle cx="30" cy="3.5" r="3" fill="#c33"/>
      <rect x="15.5" y="16" width="29" height="8" rx="4" fill="#1c1c20"/>
      <circle cx="25.2" cy="20" r="2.3" fill="#fff"/><circle cx="34.8" cy="20" r="2.3" fill="#fff"/><circle cx="25.7" cy="20.3" r="1.1" fill="#161616"/><circle cx="35.3" cy="20.3" r="1.1" fill="#161616"/>
      <path d="M24 28.5 Q30 32.5 36 28" stroke="#161616" stroke-width="1.3" fill="none" stroke-linecap="round"/><path d="M33 28.7 l2.2 2.6" stroke="#161616" stroke-width="1.1"/>
      <path d="M49 40 Q60 48 56 66 Q52 74 44 70 Q40 58 49 40 Z" fill="#a9743a" stroke="#6e4a1f" stroke-width="1"/><path d="M47 42 q4 -4 8 0" stroke="#6e4a1f" stroke-width="1.5" fill="none"/><text x="49" y="62" font-size="11" font-weight="700" fill="#fff6d6" text-anchor="middle" font-family="sans-serif">₹</text>`,
  },
  innocent: {
    id: 'innocent',
    label: 'Sweet Bhola',
    blurb: 'Pure-hearted kurta-dhoti guy who believes every queue ends in 5 minutes.',
    body: `${legs('#c9a07a', '#fffdf5')}${arms('#fffdf5')}
      <ellipse cx="30" cy="52" rx="16" ry="19" fill="#fffdf5" stroke="${E}" stroke-width=".9"/>
      <path d="M30 34 V50" stroke="${E}" stroke-width="1"/><circle cx="30" cy="41" r="1" fill="#f6a609"/><circle cx="30" cy="46" r="1" fill="#f6a609"/>
      <path d="M14.5 62 Q30 70 45.5 62" stroke="#f6a609" stroke-width="3" fill="none"/>
      ${head('#fff')}
      <path d="M19 12 Q30 4 41 12 Q36 8 30 9 Q24 8 19 12 Z" fill="#2b1b12"/><path d="M29 6 Q30 1 33 4" stroke="#2b1b12" stroke-width="2" fill="none" stroke-linecap="round"/>
      <ellipse cx="25.2" cy="20" rx="2.8" ry="3.2" fill="#161616"/><ellipse cx="34.8" cy="20" rx="2.8" ry="3.2" fill="#161616"/><circle cx="26.2" cy="18.8" r="1.1" fill="#fff"/><circle cx="35.8" cy="18.8" r="1.1" fill="#fff"/>
      <circle cx="21" cy="26" r="2.4" fill="#ffb3b3" opacity=".7"/><circle cx="39" cy="26" r="2.4" fill="#ffb3b3" opacity=".7"/>
      ${smile(27.5, 4)}
      <ellipse cx="30" cy="-1" rx="7" ry="1.6" fill="none" stroke="#ffd166" stroke-width="1.6"/>`,
  },
  lady: {
    id: 'lady',
    label: 'Lal-Par Didi',
    blurb: 'Classic red-bordered white saree, a bindi and a shiuli in her hair.',
    body: `<ellipse cx="30" cy="76" rx="14" ry="5" fill="#d7263d"/>
      <path d="M17 44 Q14 72 18 78 H42 Q46 72 43 44 Z" fill="#fff" stroke="${E}" stroke-width=".9"/>
      <path d="M17.5 76 H42.5" stroke="#d7263d" stroke-width="3"/><path d="M18 44 Q16 58 18 66" stroke="#d7263d" stroke-width="2.4" fill="none"/>
      ${arms('#fff')}
      <ellipse cx="30" cy="50" rx="14" ry="12" fill="#fff" stroke="${E}" stroke-width=".9"/>
      <path d="M44 36 Q54 52 40 70" stroke="#d7263d" stroke-width="5" fill="none" stroke-linecap="round" opacity=".95"/>
      <path d="M44 36 Q54 52 40 70" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" opacity=".9"/>
      <circle cx="30" cy="5.5" r="6" fill="#241512"/><circle cx="36" cy="4" r="2.6" fill="#fff"/><circle cx="36" cy="4" r="1" fill="#f6a609"/>
      ${head()}
      <path d="M17.5 17 Q30 3 42.5 17 Q30 10 17.5 17 Z" fill="#241512"/>
      ${eyes(20.5, 1.8)}<circle cx="30" cy="14.6" r="1.4" fill="#d7263d"/>${smile(28)}
      <circle cx="21" cy="26" r="2.2" fill="#ffb3b3" opacity=".55"/><circle cx="39" cy="26" r="2.2" fill="#ffb3b3" opacity=".55"/>`,
  },
  baddie: {
    id: 'baddie',
    label: 'Baddie Bong',
    blurb: 'Cat-eye shades, high pony, zero patience for pandal queues.',
    body: `${legs('#d7263d', '#1c1c20')}${arms('#fff')}
      <ellipse cx="30" cy="52" rx="15.5" ry="19" fill="#fff" stroke="${E}" stroke-width=".9"/>
      <path d="M15 47 Q30 40 45 47 L44 56 Q30 50 16 56 Z" fill="#d7263d"/><rect x="15.5" y="57" width="29" height="10" rx="3" fill="#1c1c20"/>
      <path d="M44 6 Q60 4 56 28 Q54 38 50 44 Q52 26 46 14 Z" fill="#241512"/>
      ${head()}
      <path d="M17 17 Q30 1 43 17 Q40 8 30 8 Q20 8 17 17 Z" fill="#241512"/><circle cx="45" cy="9" r="3.4" fill="#d7263d"/>
      <path d="M16.5 17.5 H27.5 Q28.5 24 22 24.5 Q17 24 16.5 17.5 Z M32.5 17.5 H43.5 Q43 24 38 24.5 Q31.5 24 32.5 17.5 Z" fill="#101010"/><path d="M27 18.5 H33" stroke="#101010" stroke-width="1.6"/><path d="M16 17 l-3 -2.4 M44 17 l3 -2.4" stroke="#101010" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M25 28.2 Q30 31.8 36 27.2" stroke="#d7263d" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <circle cx="17.2" cy="29" r="2.4" fill="none" stroke="#f6a609" stroke-width="1.4"/>`,
  },
};

export const AVATAR_LIST = Object.values(AVATARS);

/** Standalone <svg> markup (works in React via dangerouslySetInnerHTML and in Leaflet divIcons). */
export function avatarSvg(id: AvatarId, height = 64): string {
  const def = AVATARS[id] ?? AVATARS.innocent;
  const w = Math.round((height * 60) / 84);
  return `<svg viewBox="0 -4 60 88" width="${w}" height="${height}" overflow="visible" aria-hidden="true">${def.body}</svg>`;
}
