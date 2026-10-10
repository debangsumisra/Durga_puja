/**
 * Festival clock (IST). The whole site follows it automatically:
 *  - Mahalaya morning → "Shubho Mahalaya"
 *  - from 12:00 noon on Mahalaya day → "Shubho Sharodiya" + live countdown to Saptami
 *  - then Shashthi → Saptami → Ashtami → Navami → Bijoya, each switching at 06:00 IST.
 */
const ist = (iso: string) => Date.parse(`${iso}+05:30`);

export const MAHALAYA_NOON = ist('2026-10-10T12:00:00');
export const SAPTAMI_START = ist('2026-10-17T06:00:00');

export interface Phase {
  key: 'mahalaya' | 'sharodiya' | 'shashthi' | 'saptami' | 'ashtami' | 'navami' | 'bijoya';
  from: number;
  /** Bengali greeting for the header */
  bn: string;
  /** English greeting used on chips / messages */
  hello: string;
  feedLabel: string;
}

const PHASES: Phase[] = [
  { key: 'mahalaya', from: -Infinity, bn: 'শুভ মহালয়া · শারদীয়ার শুভেচ্ছা', hello: 'Shubho Mahalaya! 🪔', feedLabel: 'Live Mahalaya feed' },
  { key: 'sharodiya', from: MAHALAYA_NOON, bn: 'শুভ শারদীয়া · সপ্তমীর অপেক্ষায়', hello: 'Shubho Sharodiya! 🪔', feedLabel: 'Live Pujo feed' },
  { key: 'shashthi', from: ist('2026-10-16T06:00:00'), bn: 'শুভ ষষ্ঠী · মা আসছেন', hello: 'Shubho Shashthi! 🪔', feedLabel: 'Live Pujo feed' },
  { key: 'saptami', from: SAPTAMI_START, bn: 'শুভ সপ্তমী', hello: 'Shubho Saptami! 🪔', feedLabel: 'Live Pujo feed' },
  { key: 'ashtami', from: ist('2026-10-18T06:00:00'), bn: 'শুভ অষ্টমী', hello: 'Shubho Ashtami! 🪔', feedLabel: 'Live Pujo feed' },
  { key: 'navami', from: ist('2026-10-20T06:00:00'), bn: 'শুভ নবমী', hello: 'Shubho Navami! 🪔', feedLabel: 'Live Pujo feed' },
  { key: 'bijoya', from: ist('2026-10-21T06:00:00'), bn: 'শুভ বিজয়া', hello: 'Shubho Bijoya! 🪔', feedLabel: 'Live Pujo feed' },
];

export function festivalPhase(now: number): Phase {
  let cur = PHASES[0];
  for (const p of PHASES) if (now >= p.from) cur = p;
  return cur;
}

/** Countdown to Saptami runs from Mahalaya noon until Saptami begins. */
export const countdownActive = (now: number) => now >= MAHALAYA_NOON && now < SAPTAMI_START;

export function countdown(target: number, now: number) {
  const total = Math.max(0, Math.floor((target - now) / 1000));
  return { days: Math.floor(total / 86400), hours: Math.floor((total % 86400) / 3600), minutes: Math.floor((total % 3600) / 60), seconds: total % 60, total };
}
