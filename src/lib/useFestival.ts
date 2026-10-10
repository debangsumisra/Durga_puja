'use client';

import { useEffect, useState } from 'react';
import { countdown, countdownActive, festivalPhase, SAPTAMI_START } from './festival';

/** Follows the festival clock, ticking once a second. */
export function useFestival() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  // before hydration, assume the morning phase so server and client markup match
  return {
    ready: now !== null,
    phase: festivalPhase(now ?? -Infinity),
    counting: now !== null && countdownActive(now),
    left: now === null ? null : countdown(SAPTAMI_START, now),
  };
}
