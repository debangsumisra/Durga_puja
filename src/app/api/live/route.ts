import { NextResponse } from 'next/server';
import { currentWeather, trafficFactor } from '@/lib/live';
import { KOLKATA_CENTER } from '@/lib/geo';

export const dynamic = 'force-dynamic';

/** GET /api/live → current Kolkata weather (+ live traffic if TOMTOM_API_KEY is set) */
export async function GET() {
  const [weather, traffic] = await Promise.all([currentWeather(), trafficFactor(KOLKATA_CENTER)]);
  return NextResponse.json({
    now: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    weather,
    traffic: traffic ? { factor: traffic, source: 'tomtom' } : { factor: null, source: 'time-of-day model (set TOMTOM_API_KEY for live flow)' },
  });
}
