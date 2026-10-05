import { NextResponse } from 'next/server';
import { PANDALS } from '@/data/pandals';
import { currentWeather, roadMatrix, roadRoute, trafficFactor } from '@/lib/live';
import { planItinerary } from '@/lib/planner';
import type { Priority, RouteRequest, TravelMode } from '@/types/pandal';

export const dynamic = 'force-dynamic';

const MODES: TravelMode[] = ['walk', 'drive', 'metro-mix'];
const PRIORITIES: Priority[] = ['time', 'balanced', 'cost'];

/** POST /api/route — body: RouteRequest → optimised Itinerary following real roads */
export async function POST(req: Request) {
  let body: RouteRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { start, pandalIds, startHour, mode, priority, avoidCrowds, startName } = body;
  if (!start || !Number.isFinite(start.lat) || !Number.isFinite(start.lng)) {
    return NextResponse.json({ error: 'start {lat,lng} required' }, { status: 400 });
  }
  if (!Array.isArray(pandalIds) || pandalIds.length === 0) {
    return NextResponse.json({ error: 'pandalIds must be a non-empty array' }, { status: 400 });
  }
  if (pandalIds.length > 15) {
    return NextResponse.json({ error: 'Pick at most 15 pandals per route' }, { status: 400 });
  }
  const selected = pandalIds.map((id) => PANDALS.find((p) => p.id === id)).filter((p) => !!p);
  if (selected.length === 0) {
    return NextResponse.json({ error: 'No known pandal ids supplied' }, { status: 400 });
  }

  // Live inputs, fetched in parallel.
  const [matrix, weather, traffic] = await Promise.all([
    roadMatrix([start, ...selected.map((p) => p.coordinates)]),
    currentWeather(),
    trafficFactor(start),
  ]);

  const itinerary = planItinerary(start, selected, Number.isFinite(startHour) ? startHour : 18, MODES.includes(mode) ? mode : 'metro-mix', {
    priority: PRIORITIES.includes(priority as Priority) ? priority : 'balanced',
    avoidCrowds: avoidCrowds ?? true,
    crowdFactor: weather.crowdFactor,
    trafficFactor: traffic,
    matrix,
    startName,
  });

  // Real road geometry for the optimised order.
  const road = await roadRoute([start, ...itinerary.stops.map((s) => s.pandal.coordinates)]);
  road.legs.forEach((leg, i) => {
    if (itinerary.stops[i]) itinerary.stops[i].leg.path = leg.path;
  });

  itinerary.live = {
    routing: matrix.source === 'osrm' && road.source === 'osrm' ? 'osrm' : 'estimate',
    weather: { description: weather.description, temperatureC: weather.temperatureC, crowdFactor: weather.crowdFactor, source: weather.source },
    traffic: traffic ? { factor: traffic, source: 'tomtom' } : { factor: 0, source: 'time-of-day model' },
  };
  return NextResponse.json(itinerary);
}
