# Birdseye

> Renamed from "Earth Spin" on 2026-04-30 at the Claude Code handoff. Same project, new name.

## Goal
Mobile-first interactive prototype that makes the user viscerally feel the rotation of the planet beneath them. Top-down map view at the user's actual latitude, fixed in inertial space, ground drifts past as Earth rotates. Embeddable on Mike's portfolio site.

## Folder structure
- `README.md` — original v0 spec (chrome dinosaur procedural ground; superseded by v1, kept for context)
- `DESIGN_PROMPT.md` — long-form v0 prompt for design tools
- `birdseye-claude-design-prompt.txt` — compressed Claude Design prompt for v0 (generated via design-prompter skill)
- `maps-research.md` — research findings on map rendering options for v1
- `BUILD_SPEC.md` — v1 build spec for Claude Code handoff (current active doc)
- `PROJECT-CONTEXT.md` — this file

## Status
- [x] v0 conceptual spec drafted
- [x] v0 Claude Design prompt drafted (compressed via design-prompter skill)
- [x] v0 prototype built in Claude Design (validates concept)
- [x] Map rendering research completed
- [x] v1 architecture decisions locked in
- [x] BUILD_SPEC.md drafted for Claude Code handoff
- [x] Hand off to Claude Code
- [x] v1 runtime build complete (Vite + React + TS + MapLibre + bundled PMTiles)
- [x] Map renders, drift direction verified (L→R), slider works, geolocation falls back to Istanbul, country labels at low zoom, dotted coastlines, warm paper background
- [ ] SRTM/GEBCO contour pipeline — output `contours.pmtiles` + `bathymetry.pmtiles`, bumps basemap to z8 (next session)
- [ ] Service Worker for offline cache (next session)
- [ ] Mobile perf validated on real device
- [ ] Italic-serif country-label fontstack PBF (next session, polish)
- [ ] Deployed to portfolio site

## Key decisions
- **Stack:** Vite + React + TypeScript + MapLibre GL JS via `@vis.gl/react-maplibre`
- **Map data:** Protomaps PMTiles bundled as static assets, $0/month evergreen hosting (no paid services, no API keys)
- **Coverage:** lat ±60° pre-baked strip, range-requested by MapLibre, Service Worker cached after first load
- **Latitude handling:** geolocate the user; ground that scrolls past is their actual latitude band; fallback to default if denied
- **Aesthetic:** Loch Coruisk topographic reference — monochrome, warm paper background (~#f4eee0), contour-driven, labels stripped except country names at low zoom
- **Contour data:** SRTM 30m for land, GEBCO for bathymetry, both processed via `gdal_contour` + `tippecanoe`
- **Physics:** ground drifts left → right (north-up); speed = equatorial × cos(latitude); FOV = 1.155 × altitude (60° cone)
- **UI:** mobile-first; vertical altitude slider on the right edge; default 10 km altitude; log scale 1 km → 10,000 km
- **Out of scope for v1:** time warp, user-controlled latitude, day/night, sun, stars, curved earth, sharing
- **v0 is a napkin sketch** — Claude Code must build v1 from first principles, not pattern-match against v0 code

## Last session
2026-05-01: Built the v1 runtime in Claude Code. Vite + React + TS scaffold at `birdseye/birdseye/`. MapLibre mounted directly (`@vis.gl/react-maplibre` had a `mapStyle` diffing bug on this configuration). PMTiles bundled at `public/basemap.pmtiles` (lat ±60°, z0–6, ~34 MB) extracted via `pmtiles` CLI from the Protomaps daily build. Custom MapLibre style stripped to background + earth + water + dotted coastline + low-zoom country labels. RAF drift loop integrating worldOffsetKm, computing zoom from FOV via Mercator math. Vertical altitude slider, HUD, crosshair, caption — all per BUILD_SPEC. Verified end-to-end in preview: map renders Mediterranean with country labels (BELARUS, UKRAINE, GREECE, TURKEY...), HUD shows ground speed 1264 km/h at Istanbul (correct: 1670 × cos(41°)), longitude decreases over time (drift direction correct). Disabled React StrictMode for now. Production build succeeds at 350 KB gzipped JS. Deferred to next session: SRTM/GEBCO contour pipeline, Service Worker, italic-serif fontstack, real-device perf test.

2026-04-29: Researched map rendering options (Protomaps PMTiles + MapLibre + custom style emerged as $0-evergreen recommendation). Settled three open design questions: lat ±60° (preserves room for latitude-as-control later), bathymetric contours over ocean, 10 km default altitude. Wrote BUILD_SPEC.md as the Claude Code handoff document, framed to lock in research decisions while leaving implementation details open and explicitly forbidding porting from v0.

## Changelog
- 2026-04-29: Drafted v0 spec, Claude Design prompts; user prototyped v0 in Claude Design; conducted maps research; settled v1 design decisions; drafted BUILD_SPEC.md and PROJECT-CONTEXT.md for Claude Code handoff
- 2026-04-30: Project renamed "Earth Spin" → "Birdseye"; v1 build started in `birdseye/birdseye/`. Staging: runtime against remote Protomaps PMTiles this session; SRTM/GEBCO contour pipeline deferred to a focused session. Fallback latitude set to Istanbul (~41°N, 29°E) — westward drift sweeps recognizable land.
- 2026-05-01: v1 runtime build complete. Switched from remote Protomaps URL to bundled `public/basemap.pmtiles` (z0–6, lat ±60°, 34 MB) after the demo bucket's missing CORS headers + DNS thrashing under heavy range-request load made the proxy approach unworkable. Switched from `@vis.gl/react-maplibre` to direct MapLibre mount after the wrapper left the underlying map with an empty style. Drift direction verified, slider/HUD/geolocation flow verified. Production build green.
