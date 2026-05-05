# Claude Design Prompt — Birdseye v0 (originally "Earth Spin")

Copy everything below the line into Claude (claude.ai, artifact mode, or similar). It's self-contained.

---

Build me a small, self-contained web prototype called **Birdseye** (originally drafted as "Earth Spin"). Output it as a single HTML artifact — one file, no build step, no external dependencies, no CDN scripts, no frameworks. Pure HTML + CSS + vanilla JS + `<canvas>`. It must run by opening the file in any modern browser.

## The concept (read this carefully — it informs every design choice)

We sit still on Earth and feel motionless, but the planet is rotating beneath us at ~1,670 km/h at the equator. This prototype simulates a window planted at a fixed point in inertial space, looking straight down. Because the window doesn't rotate with the Earth, the ground appears to slide past underneath. The user can change altitude, which widens the window — at low altitude the ground whips past dizzyingly, at high altitude the planet turns gently. Same physics; altitude is the perceptual knob.

The goal is a visceral "oh — I AM moving" moment. Everything else is in service of that.

## Scope boundaries (important)

This is v0. Do NOT add any of these, even if tempted:

- No geolocation / current-location awareness
- No real map tiles (Mapbox, Leaflet, Cesium, OpenStreetMap — none of it)
- No latitude controls — assume equator, full 1,670 km/h
- No time-warp or playback-speed controls
- No day/night, sun, stars, or terminator
- No 3D / WebGL / Three.js — this is 2D canvas only
- No sound, no icons from icon libraries, no external fonts (system fonts only)

The ground is a stylized procedural simulation. It is NOT meant to look like a real map. It is meant to look like an abstract top-down sketch of "ground."

## Aesthetic

Chrome dinosaur game. Minimal, flat, slightly austere.

- Background: `#f7f7f7`
- Foreground marks (ground features, crosshair, HUD values): `#535353`
- Secondary text (HUD labels, tick marks): `#999999`
- Typography: monospace system stack — `'Courier New', Courier, monospace`
- No gradients, no shadows, no rounded decorative elements beyond what's mentioned
- Vector primitives only: filled dots, filled rectangles, straight line segments, small dot clusters
- HUD labels UPPERCASE with 1px letter-spacing, 10px font-size; values 14px regular weight

## Layout

- `<canvas>` fills the full viewport (`100vw` × `100vh`), redraws on resize
- Top-left HUD (~16px from edges), stacked vertically with ~12px gaps between groups:
  - "ALTITUDE" / value (e.g., `42 km`)
  - "FIELD OF VIEW" / value (e.g., `48 km wide`)
  - "GROUND SPEED (EQUATOR)" / value (always `1,670 km/h`)
- Top-right: a 40×40px thin circle (1px `#535353` border), containing the text `N ↑` centered, 10px
- Bottom-center: horizontal slider, ~80% viewport width (max 600px), with 5 tick labels beneath evenly spaced: `1 km`, `10 km`, `100 km`, `1,000 km`, `10,000 km`
- Bottom-left (above the slider area, ~16px from edge), two lines of 11px `#888` text, max-width 320px:
  - "Looking down at Earth from a point fixed in space."
  - "Earth rotates eastward beneath you — the ground appears to drift right."
- Canvas center: crosshair marking the fixed inertial viewpoint — a small `+` (16px across, 1px stroke, `#535353`) surrounded by a 24px-diameter circle outline (1px stroke, same color). This is the anchor point that doesn't move.

Style the slider to match: thin track (2px, `#535353`), square 12px thumb (`#535353`, no border-radius). Remove default browser chrome.

## Physics (don't improvise — use exactly these)

- Earth equatorial circumference: `EARTH_CIRCUMFERENCE_KM = 40075`
- Sidereal day: `SIDEREAL_DAY_SEC = 86164`
- Ground speed: `GROUND_SPEED_KM_PER_SEC = EARTH_CIRCUMFERENCE_KM / SIDEREAL_DAY_SEC` (≈ 0.4641 km/s)
- Field of view from altitude (60° vertical cone): `fovKm = 2 * altitudeKm * Math.tan(30 * Math.PI / 180)` (≈ `1.1547 * altitudeKm`)
- Pixels per km on screen: `pxPerKm = canvasWidth / fovKm`

## Animation loop

- Use `requestAnimationFrame`
- Each frame: compute `dt` in seconds from the previous frame, clamp at `0.1` to survive tab-backgrounding
- `worldOffsetKm += GROUND_SPEED_KM_PER_SEC * dt`
- Redraw the full canvas each frame. No dirty-rect optimization needed.

## Scrolling direction — this is the part people get wrong

We are stationary in inertial space. Earth rotates eastward beneath us. A ground feature that was directly below us a moment ago has been carried east, so it now appears to our right. New ground keeps appearing from the west (the left side of the canvas).

**On screen, with north up: features must drift LEFT → RIGHT.**

If it scrolls right → left, it's backwards — fix it.

## Altitude slider mapping

- Slider range: `0` to `100` (float, `step=0.1`)
- Altitude in km: `altitudeKm = Math.pow(10, sliderValue / 25)` (gives range 1 km at slider=0 → 10,000 km at slider=100)
- Default starting value: `30` (≈ 16 km altitude — low enough to feel motion, high enough not to nauseate)

## Procedural ground generation

The ground features are anchored to *ground* coordinates (they move with Earth). Here's the coordinate logic:

- Let `groundCenterX = -worldOffsetKm`. This is the ground coordinate currently under the center of the view. (Screen center is inertial origin; as world offset grows, the ground point at center shifts westward in ground coords, because newer ground has rolled in from the west.)
- For a feature at ground coordinate `(gx, gy)`:
  - `screenX = canvasWidth/2 + (gx - groundCenterX) * pxPerKm`
  - `screenY = canvasHeight/2 + gy * pxPerKm`
- As `worldOffsetKm` increases, `groundCenterX` decreases, so `(gx - groundCenterX)` increases, so features drift right. ✓

Tile the ground into square tiles. Tile size scales with FOV so the scene stays populated at every altitude (a deliberate fractal cheat — do not try to "fix" this):

```js
const tileSizeKm = fovKm / 6;
```

For each visible tile at integer coordinates `(tx, ty)`:

- Seed from a deterministic hash. A simple integer-mix works:
  ```js
  function hash(x, y) {
    let h = (x * 374761393 + y * 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }
  ```
- Generate `3 + Math.floor(hash(tx, ty) * 6)` features (3–8 per tile)
- For each feature, use further hash calls to determine position within the tile and feature type. Type is chosen by a hash value in `[0, 1]`:
  - `< 0.40` → **dot** (filled circle, radius `1 + r*3` px) — tree
  - `< 0.70` → **rectangle** (filled, width `4 + r*30` px, height `4 + r*20` px) — building
  - `< 0.85` → **line segment** (random angle, length `30 + r*80` px, 1.5px stroke) — road
  - else → **dot cluster** (six small 1.5px-radius dots scattered within a 30×30px area) — forest

Cull features whose screen position is more than 50px outside the canvas.

Determine which tiles are visible from the ground coordinates at the four canvas corners, and iterate over `tx, ty` in that range (with a 1-tile margin on each side).

## Accessibility / niceties

- `cursor: pointer` on the slider
- `user-select: none` on HUD text
- Respect window resize (update canvas width/height, keep it running smoothly)
- No flicker on resize

## Acceptance criteria (check before you finish)

- Opens in a browser with zero setup
- Ground is visibly drifting LEFT → RIGHT on load
- At default slider position, motion is clearly visible but not overwhelming
- Dragging slider DOWN makes features whip past faster (smaller FOV, higher pixels-per-km)
- Dragging slider UP makes motion calmer and reveals more features
- HUD altitude / FOV values update live
- Crosshair stays pinned dead center at all times
- No console errors, no layout jank on resize
- Visually reads as chrome-dino-ish: cream background, dark gray marks, monospace, no decorative flourishes

## One last note

Do not add features not listed here, even if they "would be cool." The minimalism is the point. If you finish with time to spare, spend it on making the motion feel right, not on adding UI.
