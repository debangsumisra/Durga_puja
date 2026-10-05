export type Zone = 'North' | 'South' | 'Central' | 'Salt Lake';
export type CrowdLevel = 'Low' | 'Medium' | 'High' | 'Extreme';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface PandalPhoto {
  url: string;
  caption: string;
  isPanorama360: boolean;
  tag: string;
}

export interface Pandal {
  id: string;
  name: string;
  zone: Zone;
  coordinates: LatLng;
  nearestMetro: string;
  metroDistanceKm: number;
  theme2025_2026: string;
  artisan: string;
  historicalSignificance: string;
  avgViewingTimeMins: number;
  crowdLevelByHour: Record<number, CrowdLevel>;
  photos: PandalPhoto[];
  /** Extra UI metadata (not part of the core spec schema) */
  deityDescription: string;
  establishedYear: number;
  rating: number;
}

export type PlaceKind = 'restaurant' | 'street-food' | 'hotel';

export interface Place {
  id: string;
  name: string;
  kind: PlaceKind;
  coordinates: LatLng;
  rating: number;
  priceLevel: 1 | 2 | 3 | 4;
  speciality: string;
  address: string;
}

export interface NearbyPlace extends Place {
  distanceKm: number;
  walkMins: number;
}

export type TravelMode = 'walk' | 'drive' | 'metro-mix';

export interface RouteRequest {
  start: LatLng;
  pandalIds: string[];
  startHour: number; // 0-23, decimal allowed (e.g. 18.5)
  mode: TravelMode;
  date?: string;
}

export interface CostBreakdown {
  metro: number;
  busNonAc: number;
  busAc: number;
  yellowTaxi: number;
  rideShare: number;
}

export interface RouteLeg {
  fromName: string;
  toId: string;
  toName: string;
  distanceKm: number;
  transitMins: number;
  trafficBufferMins: number;
  suggestedMode: 'walk' | 'drive' | 'metro';
  cost: CostBreakdown;
  path: LatLng[];
}

export interface ItineraryStop {
  order: number;
  pandal: Pandal;
  arriveAt: string; // HH:MM
  crowd: CrowdLevel;
  queueMins: number;
  viewingMins: number;
  departAt: string;
  leg: RouteLeg;
}

export interface Itinerary {
  stops: ItineraryStop[];
  totalDistanceKm: number;
  totalTransitMins: number;
  totalQueueMins: number;
  totalViewingMins: number;
  totalMins: number;
  finishAt: string;
  cost: CostBreakdown;
  algorithm: string;
}
