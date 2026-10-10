import { describe, expect, it } from 'vitest';
import { countdown, countdownActive, festivalPhase, MAHALAYA_NOON, SAPTAMI_START } from '@/lib/festival';

const at = (iso: string) => Date.parse(`${iso}+05:30`);

describe('festival clock (IST)', () => {
  it('is Mahalaya until 12:00 noon on 10 Oct, with no countdown', () => {
    const t = at('2026-10-10T11:59:59');
    expect(festivalPhase(t).key).toBe('mahalaya');
    expect(countdownActive(t)).toBe(false);
  });

  it('switches to Sharodiya at noon and starts the Saptami countdown', () => {
    expect(festivalPhase(MAHALAYA_NOON).key).toBe('sharodiya');
    expect(countdownActive(MAHALAYA_NOON)).toBe(true);
    expect(festivalPhase(MAHALAYA_NOON).hello).toContain('Sharodiya');
  });

  it('counts down to Saptami 06:00 IST: 6d 18h at Mahalaya noon', () => {
    const c = countdown(SAPTAMI_START, MAHALAYA_NOON);
    expect(c).toMatchObject({ days: 6, hours: 18, minutes: 0, seconds: 0 });
  });

  it('stops at Saptami and then follows each day', () => {
    expect(countdownActive(SAPTAMI_START)).toBe(false);
    expect(festivalPhase(SAPTAMI_START).key).toBe('saptami');
    expect(festivalPhase(at('2026-10-16T08:00:00')).key).toBe('shashthi');
    expect(festivalPhase(at('2026-10-18T09:00:00')).key).toBe('ashtami');
    expect(festivalPhase(at('2026-10-20T09:00:00')).key).toBe('navami');
    expect(festivalPhase(at('2026-10-21T09:00:00')).key).toBe('bijoya');
  });

  it('never goes negative', () => {
    expect(countdown(SAPTAMI_START, SAPTAMI_START + 5000).total).toBe(0);
  });
});
