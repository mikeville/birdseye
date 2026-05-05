# Birdseye

Mobile-first interactive prototype that makes you viscerally feel Earth's rotation. You look straight down from a viewpoint **fixed in inertial space**; the ground rotates past beneath at your actual latitude. One control: a vertical altitude slider that widens or narrows the field of view. Low altitude = ground whips by. High altitude = planet turns gently. Same physics; altitude is the perceptual knob.

> **v1 build.** See `Claude Cowork research/BUILD_SPEC.md` for the full spec, `Claude Cowork research/maps-research.md` for the architecture rationale, and `Claude Cowork research/PROJECT-CONTEXT.md` for the project status.

## Stack

- **Vite + React + TypeScript**
- **MapLibre GL JS** (vanilla, mounted directly — `@vis.gl/react-maplibre` was tried and dropped because its `mapStyle` diffing left the underlying map with an empty style on this configuration)
- **Protomaps PMTiles** as a bundled static asset (`public/basemap.pmtiles`, lat ±60°). Extracted from the Protomaps daily build via the `pmtiles` CLI — see `scripts/build-data.sh`.
- **Custom MapLibre style** built on `@protomaps/basemaps`'s `namedFlavor("white")`, aggressively pruned to monochrome topographic.

## Run

```sh
pnpm install
pnpm dev          # Vite picks 5180, or auto-increments if it's busy
PORT=5173 pnpm dev   # pin a port (strictPort fails if it's taken)
pnpm build
pnpm preview
pnpm typecheck
```

The dev server prints its actual URL on startup. The default is 5180 (matching
`.claude/launch.json`) so birdseye doesn't collide with other prototypes that
default to 5173. If 5180 is busy too, Vite bounces up to the next free port.

## Data pipeline

`public/basemap.pmtiles` is committed-or-not at your option (it's static, ~30 MB at the current z0–6 / lat ±60° extract). Re-generate it via:

```sh
./scripts/build-data.sh
# or, for crisper detail at low altitudes:
BIRDSEYE_BASEMAP_MAXZOOM=8 ./scripts/build-data.sh
```

The script reads the Protomaps daily build over HTTP range requests and writes a small PMTiles file. Nothing gets uploaded; nothing recurs.

The SRTM/GEBCO contour pipeline that gives the topographic-line aesthetic is **deferred to a focused next session** — `scripts/build-data.sh` documents the steps. Until then, the map renders coastlines + paper background only.

## Configuration

- `VITE_PMTILES_URL` (build-time env var): override the bundled PMTiles URL. Defaults to `/basemap.pmtiles` (same-origin static asset).
- `PORT` (env var): override the Vite dev port. Defaults to 5180.

## Architecture notes

- **Single component, single experience.** `src/Birdseye.tsx` mounts the map, runs the RAF-driven drift loop, and composes the HUD / Slider / Crosshair / Caption.
- **Inertial-frame physics.** The camera is fixed; the camera's longitude in Earth-fixed coordinates *decreases* over time at `EQUATORIAL_SPEED * cos(latitude) / 3600` km/s. That produces left→right drift on screen with north up — same direction the Sun appears to move.
- **Mercator zoom from FOV.** `physics.ts:zoomFromFov` solves for the MapLibre zoom that fits a target horizontal FOV (km) at a given latitude and viewport width.
- **Geolocation with Istanbul fallback.** If denied, drift sweeps over Bulgaria → Greece → Italy → Iberia → Atlantic → Americas → Pacific → Asia. Lots of recognizable land.

## What's deferred (next session)

1. **SRTM/GEBCO contour pipeline** → `contours.pmtiles`, `bathymetry.pmtiles`. Documented in `scripts/build-data.sh`.
2. **Service Worker** for offline cache after first load.
3. **Real low-end Android device test.** The codebase is built per spec; only a real device confirms 60fps under sustained drift.
4. **Polish:** ripple-water texture, italic-serif country-label fontstack PBF (currently using a Noto Sans Italic glyph URL placeholder), bathymetric density tuning, paper-color tuning, first-load size indicator.
5. **React StrictMode** is currently disabled (`src/main.tsx`). Re-enable once the maplibre lifecycle is shimmed for double-mount safety.

## Acceptance against BUILD_SPEC

| Criterion | Status |
| --- | --- |
| Mobile-first portrait layout | ✅ |
| Geolocation prompt → real lat; on deny → Istanbul fallback | ✅ |
| Map drifts LEFT → RIGHT (verified by polling map center) | ✅ |
| HUD with altitude / FOV / ground speed / latitude | ✅ |
| Vertical altitude slider, 1 → 10,000 km log scale, default 10 km | ✅ |
| Loch Coruisk-family aesthetic: monochrome, dotted coastlines, country names only at low zoom, warm paper | ✅ (contours pending data pipeline) |
| Static-asset hosting, $0 evergreen | ✅ |
| 60fps on low-end Android | ⚠️ untested in real-device context |
| Bundled assets < 150 MB | ✅ (~34 MB at z0–6; will be ~80–150 MB once contours land) |

## Known limitations of the dev preview

The Claude Code preview tool keeps the page in a `document.hidden` state between actions, which throttles `requestAnimationFrame` and freezes MapLibre's render loop. Visual verification works (screenshots force brief visibility), and inspection works after triggering a screenshot, but continuous motion can't be observed in the preview itself. Real browser tabs in the foreground don't have this issue.
