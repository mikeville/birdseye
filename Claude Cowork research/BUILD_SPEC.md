# Birdseye v1 — Build Spec

This is the build spec for the real, public-shippable version of Birdseye (project renamed from "Earth Spin" on 2026-04-30). Written for Claude Code.

> **Important context: do not port v0.** The other files in this folder (`README.md`, `DESIGN_PROMPT.md`, `birdseye-claude-design-prompt.txt`) describe a v0 napkin sketch with procedural ground and a chrome-dinosaur aesthetic. They exist only as concept background. v1 is a complete first-principles rebuild with real maps, a different aesthetic, and a different architecture. Read those files for the *concept*, but do not pattern-match against their implementation, scope, or visual direction. The relevant research backing this spec is in `maps-research.md` — read that first.

## Mission

A single mobile-first interactive prototype that makes the user viscerally feel the planet rotating beneath them. The user looks straight down at Earth from a viewpoint *fixed in inertial space*. Earth rotates beneath that fixed window, so the actual map of where the user lives drifts past. One control: an altitude slider that widens or narrows the field of view. Low altitude = ground whips by dizzyingly. High altitude = planet turns gently. Same physics; altitude is the perceptual knob.

Success metric: when someone opens this on their phone, within five seconds they should think *"wait — that's how fast I'm actually moving right now?"*

## Hard constraints

1. **Public-shippable, evergreen, $0/month.** No paid services, no API keys, no third-party hosted tile providers. The map data lives as static assets bundled with the app. If the portfolio site exists, the map exists.
2. **Mobile-first.** Primary form factor is a phone held vertically. Desktop is a secondary, accommodated case. Touch interactions only.
3. **Embeddable.** Builds to a React component (or web component if simpler) that drops into a portfolio site as a hero piece.
4. **Simple.** One page, one experience. No menus, no settings, no auth.
5. **Performant.** 60fps on a low-end Android (~$200 device). Initial bundle + first-paint should feel snappy on 4G.

## Architecture (locked)

Justifications in `maps-research.md`.

- **Build tool:** Vite + TypeScript + React
- **Renderer:** MapLibre GL JS via `@vis.gl/react-maplibre`
- **Map data:** Protomaps PMTiles, bundled as a static asset in `public/`
  - Single file covering lat ±60°, zoom 0–8 (estimated 30–80 MB)
  - Served via HTTP range requests (Vite preview / static hosts support this natively)
  - On first load, fetched whole into Service Worker cache for subsequent runs
- **Land contour data:** Generated from SRTM 30m elevation via `gdal_contour` → `tippecanoe`, packaged as a separate PMTiles file
- **Bathymetric contours over ocean:** Generated from GEBCO global bathymetry, same pipeline
- **Style:** Custom MapLibre style JSON, generated from `@protomaps/basemaps` `namedFlavor("white")` with all label layers stripped, plus contour overlay layers

What we explicitly aren't using: Mapbox (paid), MapTiler hosted (paid at scale), Stadia hosted (paid for commercial use), any external CDN for tiles, any third-party geocoder.

## Aesthetic recipe

Reference: Loch Coruisk topographic map (described in user conversation; if a reference image lands in this folder, treat it as authoritative). Pure monochrome topographic feel — antique-inspired but not distressed. Hand-feeling but precise. Most labels removed.

- **Background (paper):** warm off-white, around `#f4eee0`. Tune by eye.
- **All marks:** soft black, around `#2a2520` (slightly warmer than pure black; avoid `#000`).
- **Coastlines:** thin dotted/dashed lines via `line-dasharray: [1, 2]`, `line-width: 1`.
- **Contour lines (land):** very thin (`line-width: 0.5`), low opacity at low zoom (~0.2) ramping to ~0.6 at high zoom. Filter intervals per zoom level: 500m at z3, 200m at z5, 100m at z7+.
- **Bathymetric contours (ocean):** same treatment but lighter, lower opacity ceiling (~0.4), sparser intervals.
- **Labels:** keep ONLY country names at z ≤ 4. Italic serif, small, in the same soft black. No city labels, no road labels, no POI labels, no admin labels.
- **What to remove entirely:** roads, buildings, POIs, landuse polygons, admin boundaries, water labels, all landcover shading.
- **Ripple texture on water:** optional. Sparse SVG pattern via MapLibre `addImage`, very low opacity. Skip for v1 if it's fiddly — bathymetric contours already give the ocean visual interest.

## Physics

Constants — compute, don't hardcode the derived values:

```ts
const EARTH_CIRCUMFERENCE_KM = 40075;
const SIDEREAL_DAY_SEC = 86164;
const EQUATORIAL_SPEED_KMH = EARTH_CIRCUMFERENCE_KM / (SIDEREAL_DAY_SEC / 3600); // ~1670
const EQUATORIAL_SPEED_KM_PER_SEC = EQUATORIAL_SPEED_KMH / 3600; // ~0.4641
```

At latitude L (in radians):

```ts
const localSpeedKmPerSec = EQUATORIAL_SPEED_KM_PER_SEC * Math.cos(L);
```

Field of view from altitude (60° vertical cone):

```ts
const fovKm = 2 * altitudeKm * Math.tan(30 * Math.PI / 180); // ~1.155 * altitudeKm
```

## Behavior

- On load, request geolocation. If granted, use the user's actual latitude. If denied or fails, default to a sensible fallback latitude (suggest something with recognizable, evocative geography — see open question #5).
- Use the exact latitude value for speed math; round to the nearest integer degree only for the HUD readout.
- Camera is conceptually fixed in inertial space at the user's latitude. The map content scrolls **west to east** (left to right) at the local speed.
- The visible map is a horizontal strip of width `fovKm` centered on the user's latitude.
- A small crosshair (thin `+` inside a thin circle) is pinned dead center marking the fixed inertial point.
- Time integration: `worldOffsetKm += localSpeedKmPerSec * dt` per frame. Clamp `dt` at 0.1s.

### Scrolling direction (don't get this wrong)

We are stationary in inertial space. Earth rotates eastward beneath us. A ground feature directly below us a moment ago has been carried east, so it now appears to our right. New ground enters from the west. **On screen with north up: features drift LEFT → RIGHT.** Sanity test: same direction the Sun appears to drift across the sky.

## Layout (mobile-first, vertical slider)

This is the v1 layout. Don't pattern-match against v0.

**Phone-portrait (primary):**

- Map fills the screen edge-to-edge.
- **Vertical altitude slider** along the right edge, ~80% of viewport height, vertically centered. Thumb-reachable for a right-handed grip.
- HUD in top-left corner: altitude / FOV / ground speed / latitude. Stacked, small, semi-transparent paper-colored backdrop so it's legible over the map.
- Crosshair dead center.
- Bottom-left: tiny one-line caption explaining what's being seen. Permission to dismiss.
- North indicator: omit on mobile (north is always up by construction; no need to take screen real estate).

**Desktop (accommodated):**

- Same essentials. Slider stays vertical, right-aligned. HUD stays top-left. Map fills the rest.

## Slider mapping

- Range: 1 km → 10,000 km
- Log scale: `altitudeKm = Math.pow(10, sliderValue / 25)` for slider in `[0, 100]`
- **Default starting altitude: 10 km** (slider value 25)
- The slider is vertical: bottom = low altitude, top = high altitude

## Data preparation pipeline

This is a one-time prep step (or rare re-run when Protomaps data updates). Document as `scripts/build-data.sh` so it's reproducible.

1. **Base vector tiles:**
   ```sh
   pmtiles extract \
     https://build.protomaps.com/<latest-date>.pmtiles \
     public/basemap.pmtiles \
     --bbox=-180,-60,180,60 \
     --maxzoom=8
   ```
2. **Land contours from SRTM 30m:**
   - Download SRTM tiles for the bbox (use `elevation` CLI or AWS Open Data terrain tiles)
   - `gdal_contour -i 100 -snodata 0 -a height input.tif contours.geojson`
   - `tippecanoe -z8 -o public/contours.pmtiles -l contours --drop-densest-as-needed contours.geojson`
3. **Bathymetric contours from GEBCO:**
   - Download GEBCO global bathymetry NetCDF
   - Same `gdal_contour` + `tippecanoe` pipeline → `public/bathymetry.pmtiles`
4. **Verify file sizes** — three files combined should be well under 150 MB. If larger, drop max zoom or coarsen contour intervals.

The runtime app loads these as bundled assets. Commit them to the repo OR add as a release artifact, whichever you prefer.

## Suggested file structure (not mandatory)

```
birdseye/
  public/
    basemap.pmtiles
    contours.pmtiles
    bathymetry.pmtiles
  scripts/
    build-data.sh       # one-time data pipeline
  src/
    Birdseye.tsx        # the main component
    style.ts            # generates the MapLibre style JSON
    physics.ts          # speed, FOV, time integration
    geolocation.ts      # geo + fallback
    HUD.tsx             # the readout
    Slider.tsx          # the vertical altitude slider
    sw.ts               # service worker for asset caching
  index.html
  vite.config.ts
  package.json
  README.md             # how to dev / build / deploy
  BUILD_SPEC.md         # this file
  maps-research.md      # research backing
```

Restructure if you have a better idea. This is a starting suggestion, not a rule.

## Build order (recommended)

Stage in this order so each step's output is testable before the next is layered on:

1. Vite + React + TypeScript scaffold. Hello world.
2. Add MapLibre via `@vis.gl/react-maplibre`. Render the unmodified Protomaps basemap from a remote PMTiles URL (don't bundle yet). Verify it shows up.
3. Add inertial scrolling motion. Camera fixed; world drifts left → right at equatorial speed. Verify direction is correct.
4. Apply custom style: strip labels, set paper background, soft-black marks, dotted coastlines.
5. Generate land contour PMTiles via the data pipeline. Add as a layer.
6. Add bathymetric contour PMTiles. Layer on top.
7. Wire geolocation; latitude affects displayed map and ground speed.
8. Build the HUD and vertical altitude slider.
9. Bundle PMTiles as static assets in `public/`; switch from remote URL.
10. Add Service Worker; verify offline behavior after first load.
11. Test on a real low-end Android phone. If perf is bad, profile and optimize before adding polish.
12. Polish: ripple texture, country labels, country-name font.

Resist the temptation to wire everything up before stage 11. The mobile-perf gate is the only "go / no-go" question that can't be answered on paper.

## Acceptance criteria

- Opens on a phone in portrait orientation, fills the screen, looks intentional
- On first load, geolocation prompt appears; on accept, user's latitude is used; on deny, fallback latitude is used (no error state)
- The map shows the user's actual latitude band, drifting LEFT → RIGHT
- HUD shows altitude, FOV, ground speed (correctly scaled for latitude — should be less than 1670 km/h for users not at the equator), and latitude
- Vertical slider on the right edge controls altitude (1 km → 10,000 km, log scale, default 10 km)
- Aesthetic matches the Loch Coruisk reference: monochrome, contour-driven, no labels except country names at low zoom, warm-paper background
- After first load, the app works fully offline (PMTiles cached in Service Worker)
- No external network requests after first PMTiles load (verify in DevTools)
- 60fps motion on a low-end Android device (real-device test, not just lab)
- Total bundled assets under 150 MB; first paint happens before tiles finish loading

## Out of scope for v1

- Time-warp control
- Latitude as a user control (it's set from geolocation only)
- Day/night terminator
- Sun direction / shadows
- Stars
- Curved Earth (flat-projection breaks above ~500 km altitude — accept it; the visceral payoff is at low altitudes anyway)
- Multiple language fonts in labels (Latin script only)
- Sharing / screenshot UI
- Settings / preferences
- Lefty / handedness toggle for the slider

## Open questions to surface (do not decide alone)

1. **Exact paper background color** — `#f4eee0` is a starting point. Try 3–4 candidates and ask before committing.
2. **Italic serif font choice + licensing** — Caslon Italic, Garamond Italic, Source Serif Italic, Crimson Italic are candidates. Need a webfont with appropriate license. Ask before generating the fontstack PBF.
3. **Bathymetric contour density** — surface what you generated and ask if it feels right or too busy.
4. **Service Worker scope** — bundling 100+ MB into SW cache is correct for evergreen offline behavior, but be explicit about the first-load size to the user via a small loading indicator.
5. **Default fallback latitude** — what's the most evocative "default location" if geolocation is denied? Suggest 2–3 options and ask.

## How I'll judge the build

- Does it produce the visceral "I AM moving" reaction on a phone, on first load? (the only success metric that matters)
- Is the aesthetic recognizably in the Loch Coruisk family — minimal monochrome topographic, warm not cold, hand-feeling not corporate?
- Is it actually evergreen — no API keys, no paid services, no expiring tokens, no third-party CDN dependencies?
- Does the codebase look like it was built from these decisions, not ported from the v0 sketch?
