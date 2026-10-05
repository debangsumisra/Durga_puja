# 🪔 PujoPulse 2026

**Kolkata Durga Puja pandal-hopping guide, route optimiser & 3D virtual pandal experience.**

Built with Next.js 14 (App Router), TypeScript, Tailwind CSS, Radix UI, Framer Motion, React-Leaflet (OpenStreetMap / CARTO dark tiles), Photo Sphere Viewer and Embla Carousel.

## Features

| Module | What it does |
| --- | --- |
| **Discovery & zone clusters** | Choose a preset start (Howrah, Sealdah, Esplanade…), use GPS, or click/drag a pin on the map. Pandals are grouped into **North, Central, South and Salt Lake/East**, zones sorted by distance and pandals ranked by rating, proximity and live crowd level. "Best 5" auto-picks a zone's top pandals. |
| **Smart route & time estimator** | Greedy nearest-neighbour seed + **2-opt** improvement over the selected pandals. Each leg gets transit time (walk 4.2 km/h, puja-night driving speeds by hour, or metro + walk), **traffic/barricade buffers**, an arrival-time **crowd level & queue estimate**, and viewing time. |
| **Multi-modal cost** | Per-leg and total fares for **Kolkata Metro** (slab fares), **Non-AC / AC bus**, **yellow taxi** and **ride-share** (with evening surge). |
| **Food & stays** | Top-rated restaurants, street-food hubs and hotels within walking distance of each pandal / itinerary stop. |
| **3D virtual darshan** | A 3D perspective **coverflow card slider** (Embla + rotateY/translateZ tween) of all pandals, plus a **360° panorama viewer** (Photo Sphere Viewer / Three.js). Pandals without real panoramas get a procedurally-painted equirectangular mandap. |

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

## API routes

| Route | Description |
| --- | --- |
| `GET /api/pandals` | All pandals (`?zone=South` to filter). |
| `GET /api/pandals?lat=22.56&lng=88.35&hour=19` | Zone-clustered suggestions for a start point. |
| `POST /api/route` | Body `{ start: {lat,lng}, pandalIds: string[], startHour: number, mode: 'walk'\|'drive'\|'metro-mix' }` → optimised `Itinerary`. |
| `GET /api/nearby?pandalId=bagbazar&kind=hotel` | Nearby restaurants / street food / hotels. |
| `GET /api/art/:id?v=0..3` | Generated SVG poster used as placeholder photography. |

## Data & scraping scripts

- `src/types/pandal.ts` — the `Pandal` schema (plus `Place`, `Itinerary`, …).
- `src/data/pandals.ts` — 23 seed pandals with approximate coordinates, nearest metro, heritage notes and an hourly crowd model.
- `src/data/places.ts` — curated food & stay spots.
- `npm run scrape -- --url <listing page> [--playwright]` — Cheerio (or Playwright-rendered) scraper that extracts 2026 themes, artisans and photos and writes `scripts/output/pandal-updates.json` for review.
- `GOOGLE_PLACES_API_KEY=... npm run scrape:food` — refreshes nearby places via the Google Places API.

> ⚠️ 2026 themes/artisans in the seed data are illustrative placeholders, and crowd, traffic and fare numbers are model estimates. Run the scrapers and verify before relying on them. Follow Kolkata Police puja traffic advisories.

## Project structure

```
src/
  app/            layout, page, api/{pandals,route,nearby,art}
  components/     Planner, MapView, ItineraryPanel, PandalDialog, VirtualTour,
                  CoverflowSlider, PanoramaViewer, NearbyList, CrowdBar
  data/           pandals.ts, places.ts
  lib/            planner.ts (TSP, crowd, traffic, fares), geo.ts, nearby.ts, utils.ts
  types/          pandal.ts
scripts/          scrape-pandals.ts, scrape-places.ts
```

Shubho Sharodiya! 🙏
