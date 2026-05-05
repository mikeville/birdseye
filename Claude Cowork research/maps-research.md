# Birdseye v1 — Map Rendering Research

Date: 2026-04-29
Purpose: Inform v1 architecture rebuild (real maps replacing v0 procedural ground)

## TL;DR recommendation

Self-host a pre-extracted **Protomaps PMTiles** file containing only the equatorial strip (lat ±10° to ±60° depending on whether latitude becomes a future control), served from **Cloudflare R2**, rendered with **MapLibre GL JS** via `@vis.gl/react-maplibre`, styled with a custom near-label-free monochrome flavor with **contour overlays generated from SRTM**. Cost is effectively **$0–2/month at portfolio scale**.

Key insight: because the camera path is deterministic (one-axis, one-direction, equator-locked), the entire visible strip can be fetched as a single static asset on first load and cached in a Service Worker — zero runtime tile fetches afterward. This is the architectural advantage no general-purpose map library is designed for.

## The architectural opportunity

Almost all of a map library's complexity exists to handle free 2D pan + arbitrary zoom. Birdseye needs none of that:

- Camera moves only on one axis (east-west)
- Camera moves only in one direction
- Camera speed is a known function of altitude
- Camera path is deterministic (a thin strip around the equator)
- User input is just the altitude slider

This means we can pre-fetch a tile strip ahead, recycle tiles as they exit the right edge, or pre-bake the entire equatorial strip at each zoom level as a static asset. PMTiles + MapLibre still gives styling flexibility and zoom transitions while preserving most of this win.

## Viable approaches

### 1. Self-hosted Protomaps PMTiles + MapLibre + custom style (recommended)

- **Cost**: Equator-only PMTiles extract at z0–8 ≈ 10–40 MB. Cloudflare R2 storage ≈ $0.015/GB/mo (cents), zero egress fees. Real-world reports put 10M tile requests/month at ~$11. At portfolio traffic (hundreds–low thousands MAU): **$0–2/month**.
- **Perf**: PMTiles uses HTTP range requests — only bytes for visible tiles fetched. Or `fetch()` whole file once, serve from Service Worker cache.
- **Aesthetic fit**: Excellent. Protomaps ships a `Flavor` TypeScript interface (plain object of colors/fonts/landcover shades). Generate MapLibre style JSON, then strip/edit layers — including all label layers. **Only path that gives full editorial control over what appears on the map.**
- **Complexity**: Moderate one-time setup. Steps: `pmtiles extract https://build.protomaps.com/<date>.pmtiles strip.pmtiles --bbox=-180,-10,180,10 --maxzoom=8`, upload to R2, write custom Flavor + MapLibre style with `symbol` layers removed, embed via MapLibre + `pmtiles` JS plugin.

### 2. Stadia Maps (Stamen Toner Lite) + Custom Style JSON

- **Cost**: Free for non-commercial/dev. Commercial plans start at **$20/month** (200k credits/mo, ~50k vector map sessions). Public portfolio = technically commercial. Pricing is request-based (~4 vector tile requests = 1 map view).
- **Perf**: Good — vector tiles, GPU rendered, served from Stadia CDN.
- **Aesthetic fit**: Toner Lite is closest off-the-shelf to Loch Coruisk reference. Custom Style on top can modify `text-field` layers. Won't get contours without additional source.
- **Complexity**: Lowest of any "real map" approach. No infrastructure. But locked into their tile pipeline and OSM data version.

### 3. Pure SVG / Canvas 2D, no map library

- **Cost**: Static asset hosting only.
- **Perf**: Lightest on mobile if done right. But ~100k SVG paths in one DOM is brutal on mobile. Canvas 2D with manual GeoJSON drawing is the realistic version.
- **Aesthetic fit**: Perfect — control every pixel.
- **Complexity**: High. Essentially rebuilding a renderer. Only worth it if approach #1 doesn't deliver the precise hand-drawn feel.

### 4. MapTiler hosted + custom style

- **Cost**: Free tier exists but throttles to next month. Paid tiers start meaningfully higher than Stadia.
- **Aesthetic fit**: Studio supports custom styles, but built-in monochrome themes ship with too many labels. Working against defaults.
- **Complexity**: Comparable to Stadia. No advantage for this aesthetic.

### Why not Mapbox GL JS / Mapbox Studio

License is no longer free (since v2, Dec 2020). $5/1000 map loads beyond 50k/month free. MapLibre is the open BSD fork — use that.

## The pre-bake question — feasible

For the equatorial strip use case, pre-baking is **very feasible** and the right architectural call.

- **Vector (PMTiles strip)**: lat ±10° band, z0–8: estimated **10–40 MB** as single PMTiles file. z0–9: **30–80 MB**. Loads progressively via HTTP range requests, or Service-Worker-cache on first visit.
- **Raster pre-bake (PNG strip)**: at z=6 the equator is 64 tiles × 256px = 16,384 px wide, ~512 px tall. Few MB as single PNG. At z=7 ~32k px wide, 10MB+. Workable at very low zooms, unwieldy fast.
- **Killer property**: deterministic camera path = ship single payload, **zero runtime tile fetches**. Battery, network, first-paint all benefit. PMTiles + MapLibre preserves most of this win while keeping styling flexibility.

What you lose: can't add latitude as a control without re-baking a larger region. Mitigation: bake lat ±60° instead of ±10°. Still under 100MB at sane zooms, covers any plausible v2.

## Aesthetic recipe (for approach #1)

1. **Base data**: Protomaps daily build PMTiles, extracted: `pmtiles extract --bbox=-180,-60,180,60 --maxzoom=8`.
2. **Contour data**: Generate from **SRTM 30m** (or Copernicus DEM 30m) via `gdal_contour` → GeoJSON → `tippecanoe -z8 -o contours.pmtiles`. Filter intervals by zoom: every 500m at z3, 200m at z5, 100m at z7+.
3. **Style JSON** (MapLibre): Start from `@protomaps/basemaps` `namedFlavor("white")`. Then:
   - Remove all layers where `type === "symbol"` (kills every label).
   - Set `background.paint.background-color` to warm off-white (`#f4eee0` ish — antique paper).
   - Recolor `water` polygons to white with thin dotted/dashed `line` overlay around coastlines (1px, `line-dasharray: [1, 2]`) for the dotted-shoreline feel.
   - Hide `roads`, `buildings`, `pois`, `landuse` entirely — keep only `coastline`, `water`, `places` (admin boundaries off too).
   - Add `contours` source as thin black line layer with `line-width: 0.5`, very low opacity at low zooms ramping up.
   - Optional: sparse SVG pattern as `fill-pattern` on water polygons (subtle ripple texture) via MapLibre `addImage`.
4. **Labels** (the few you keep): single `symbol` layer for `place=country` with very small italic serif (`text-font: ["Times New Roman Italic"]` or custom TTF via fontstack), only at very low zoom, max ~6 labels visible globally at a time.

## Embed approach

Use **MapLibre GL JS via `@vis.gl/react-maplibre`** as a React component, bundled with **Vite**. Cleanest, actively maintained React wrapper (split from `react-map-gl` specifically for MapLibre). Declarative `<Source>` / `<Layer>` components play nicely with altitude slider state. ~290KB gzipped MapLibre is fine on mobile when the map *is* the experience.

Avoid Web Components/Lit unless portfolio framework requires it. Avoid iframe — kills perf and breaks slider integration.

## Open questions

1. **Stadia Maps commercial threshold** — worth a 30-second email to support@stadiamaps.com to confirm whether portfolio/hobby sites count toward "non-commercial." Could save $20/mo as a fallback.
2. **Contour density at low zoom over ocean** — most of the visible loop is ocean. Bathymetric contours from GEBCO are an option but visually different. Decide: empty white, ripple-textured only, or submarine contours.
3. **Font licensing** — italic-serif label aesthetic likely wants Caslon Italic / Garamond Italic / Source Serif Italic. Need webfont with appropriate license; MapLibre needs fontstack PBF (generate via `node-fontnik`).
4. **Real perf on a low-end Android** — bundle size and PMTiles range fetching look fine on paper. Only honest answer is to prototype on a real $200 Android device. Continuously-scrolling vector scene at 60fps is the actual unknown.
5. **Pre-bake vs live tiles tradeoff** — build approach #1 first with live PMTiles range requests. If perf is good, done. If not, same PMTiles file `fetch()`ed whole into Service Worker cache.

## Sources

- [Mapbox Pricing](https://www.mapbox.com/pricing)
- [Mapbox GL JS Pricing Guide](https://docs.mapbox.com/mapbox-gl-js/guides/pricing/)
- [MapTiler Cloud Pricing](https://www.maptiler.com/cloud/pricing/)
- [MapTiler Tile Requests vs Map Sessions](https://docs.maptiler.com/guides/maps-apis/maps-platform/tile-requests-and-map-sessions-compared/)
- [Stadia Maps Pricing](https://stadiamaps.com/pricing/)
- [Stadia Maps Stamen Toner](https://docs.stadiamaps.com/map-styles/stamen-toner/)
- [Stadia Maps Custom Styling](https://docs.stadiamaps.com/custom-styles/)
- [Stadia Maps Migration from Stamen](https://docs.stadiamaps.com/guides/migrating-from-stamen-map-tiles/)
- [Stadia Maps Changing Place Labels](https://docs.stadiamaps.com/tutorials/changing-place-labels/)
- [Protomaps PMTiles Concepts](https://docs.protomaps.com/pmtiles/)
- [Protomaps PMTiles GitHub](https://github.com/protomaps/PMTiles)
- [Protomaps pmtiles CLI (extract / bbox)](https://docs.protomaps.com/pmtiles/cli)
- [Protomaps Basemap Downloads (file sizes)](https://docs.protomaps.com/basemaps/downloads)
- [Protomaps Basemaps for MapLibre](https://docs.protomaps.com/basemaps/maplibre)
- [Protomaps Basemap Flavors](https://docs.protomaps.com/basemaps/flavors)
- [Protomaps Basemap Layers](https://docs.protomaps.com/basemaps/layers)
- [Protomaps Serverless Maps blog](https://protomaps.com/blog/serverless-maps-now-open-source)
- [Simon Willison — PMTiles + MapLibre walkthrough](https://til.simonwillison.net/gis/pmtiles)
- [MapLibre](https://maplibre.org/)
- [MapLibre GL JS Docs](https://maplibre.org/maplibre-gl-js/docs/)
- [react-maplibre (vis.gl)](https://visgl.github.io/react-maplibre/)
- [react-map-gl (vis.gl)](https://visgl.github.io/react-map-gl/docs)
- [Mapbox vs Leaflet vs MapLibre 2026](https://www.pkgpulse.com/guides/mapbox-vs-leaflet-vs-maplibre-interactive-maps-2026)
- [Geoapify on Mapbox GL license change](https://www.geoapify.com/mapbox-gl-new-license-and-6-free-alternatives/)
- [MapTiler Contours Dataset](https://data.maptiler.com/downloads/dataset/contours/)
- [AWS Open Data Terrain Tiles](https://registry.opendata.aws/terrain-tiles/)
- [Copernicus DEM](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM)
- [OpenTopography](https://opentopography.org/)
- [nst-guide/contours (SRTM → vector tiles)](https://github.com/nst-guide/contours)
- [nst-guide/terrain (contours, hillshade pipeline)](https://github.com/nst-guide/terrain)
- [joe-akeem/contour-tiles (Docker SRTM contour pipeline)](https://github.com/joe-akeem/contour-tiles)
