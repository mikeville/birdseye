# Birdseye

A mobile-first prototype that lets you viscerally feel Earth's rotation. You look straight down from a viewpoint **fixed in inertial space**; the ground rotates past beneath at your actual latitude. One control: a vertical altitude slider that widens or narrows the field of view. Low altitude = ground whips by. High altitude = planet turns gently. Same physics; altitude is the perceptual knob.

## Stack

- **Vite + React + TypeScript**
- **MapLibre GL JS** mounted directly (without `@vis.gl/react-maplibre`, whose `mapStyle` diffing left the underlying map with an empty style in this configuration).
- **Protomaps PMTiles** as a bundled static asset (`public/basemap.pmtiles`, lat ±60°), extracted from the Protomaps daily build via the `pmtiles` CLI — see `scripts/build-data.sh`.
- **Custom MapLibre style** built on `@protomaps/basemaps`'s `namedFlavor("white")`, pruned to a monochrome topographic look.

## Run

```sh
pnpm install
pnpm dev
pnpm build
pnpm preview
pnpm typecheck
```

The dev server defaults to port 5180. Set `PORT=5173 pnpm dev` to pin a different port.

## Data pipeline

`public/basemap.pmtiles` is gitignored (the z0–7 extract is ~136 MB, over GitHub's push limit). Re-generate it after a fresh clone:

```sh
./scripts/build-data.sh
# or, for crisper detail at low altitudes:
BIRDSEYE_BASEMAP_MAXZOOM=8 ./scripts/build-data.sh
```

The script reads the Protomaps daily build over HTTP range requests and writes a small PMTiles file locally.

## Configuration

- `VITE_PMTILES_URL` (build-time): override the bundled PMTiles URL. Defaults to `${BASE_URL}basemap.pmtiles`.
- `PORT`: override the Vite dev port. Defaults to 5180.

## Architecture notes

- **Single component, single experience.** `src/Birdseye.tsx` mounts the map, runs the RAF-driven drift loop, and composes the HUD / Slider / Crosshair.
- **Inertial-frame physics.** The camera is fixed; the camera's longitude in Earth-fixed coordinates *decreases* over time at `EQUATORIAL_SPEED · cos(latitude) / 3600` km/s. That produces left → right drift on screen with north up — the same direction the Sun appears to move.
- **Mercator zoom from FOV.** `physics.ts:zoomFromFov` solves for the MapLibre zoom that fits a target horizontal FOV (km) at a given latitude and viewport width.
- **Geolocation is opt-in.** First paint uses a fallback location so the experience is interactive immediately; tapping "Use my location" re-centers on the user's real latitude.

## License

MIT — see [LICENSE](LICENSE).
