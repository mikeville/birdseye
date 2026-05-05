# Birdseye — v0 (legacy, originally titled "Earth Spin")

A tiny visual experiment: make the user *feel* that the ground is moving.

## The idea

We sit still on Earth and feel motionless, but the planet is rotating beneath us at roughly 1,670 km/h at the equator. This prototype simulates a "window" planted at a fixed point in inertial space, looking straight down. Because the window doesn't rotate with the Earth, the ground appears to slide past underneath. The user can change altitude, which widens the window and changes how fast the motion *feels* even though the actual ground speed is constant.

The intended emotional payoff: zoom in close → ground whips past dizzyingly. Zoom out → planet turns gently. Both views are the same physics; altitude is the perceptual knob.

## v0 scope

**Bare-minimum thought experiment.** No real-world data of any kind:

- No geolocation, no latitude, no Maps / Mapbox / Cesium, no map tiles
- Ground is a stylized procedural simulation, not a real map
- Single fixed reference frame (assume equator — full 1,670 km/h)
- Real-time motion only (no time-warp control)

Anything beyond this is v1+, listed at the bottom.

## Aesthetic

Chrome dinosaur game vibe. Top-down view, but abstract — not a literal map.

- Background: `#f7f7f7`
- Foreground (all marks): `#535353`
- Optional secondary tone: `#aaaaaa` for HUD labels
- Type: monospace (Courier New, system mono — whatever's available)
- No gradients, no shadows, no antialiased polish — keep it flat and slightly austere
- Vector primitives only: dots, short rectangles, line segments, small dot clusters

## Tech

- Single self-contained `index.html` — HTML + CSS + JS in one file
- No build step, no dependencies, no package.json
- HTML5 `<canvas>` filling the viewport, `requestAnimationFrame` loop
- Pure JS, no frameworks

## Layout

- Canvas: full window
- Top-left HUD: altitude, field-of-view width, current ground speed (small monospace, uppercase labels above values)
- Top-right: minimal compass indicator (just "N ↑" in a thin circle)
- Bottom-center: altitude slider, ~80% width, with km tick labels beneath (1 km / 10 km / 100 km / 1,000 km / 10,000 km)
- Bottom-left: one-line caption explaining what the user is seeing
- Center of canvas: small crosshair (10–15px) marking the fixed inertial viewpoint

## Physics

- Earth's equatorial circumference: 40,075 km
- Sidereal day: 86,164 s
- Equatorial ground speed: ~1,670 km/h ≈ 0.4641 km/s — compute from the two constants above, don't hardcode
- Ground moves **east** in the inertial frame. With north up on screen, that means features drift **left → right**. New ground enters from the **west** (left side); ground exits to the east (right side).

### Altitude → field of view

Assume a fixed 60° vertical viewing cone. FOV width in km = `2 * altitude * tan(30°)` ≈ `1.155 * altitude`.

Pixels-per-km on screen = `canvas_width / fov_km`.

### Time integration

```
worldOffsetKm += groundSpeedKmPerSec * dt
```

Cap `dt` at ~0.1s to avoid jumps when the tab is backgrounded.

## Procedural ground

Features are anchored to **ground coordinates** (i.e., they move with the Earth). The world offset shifts which patch of ground is visible.

- Use a deterministic hash function `hash(x, y) → [0, 1]` so features are reproducible at any position. A simple integer-mix hash is fine; no need for proper Perlin noise.
- Divide ground into square tiles. Tile size scales with FOV so the view always feels populated — aim for **~6–8 tiles spanning the canvas width** at any altitude. (This is a deliberate "fractal" cheat, not physically accurate. v0 only.)
- For each visible tile, generate 3–8 features. Feature type chosen by hash:
  - Dot (1–4px radius) — represents a tree
  - Small filled rectangle (4–30px wide, 4–25px tall) — building
  - Line segment at random angle (30–110px long, 1.5px wide) — road
  - Cluster of ~6 small dots within a 30px area — forest patch
- Cull features outside the visible canvas (with a small margin)

## Important: scrolling direction (don't get this wrong)

We are stationary in inertial space. Earth rotates eastward beneath us. A ground feature that was directly below us a moment ago has been carried east, so it now appears on our right. New ground keeps appearing from the west.

**On screen, with north up: features drift left → right.**

Sanity test: at low altitude, the motion should look like watching pavement from a low-flying plane heading west — ground rushing past in the rightward direction.

## HUD copy

- "Altitude" — value updates live, formatted with units (e.g., `42 km`, `1,200 km`)
- "Field of view" — value formatted as e.g. `48 km wide`
- "Ground speed (equator)" — fixed at `1,670 km/h`
- Bottom-left caption: *"Looking down at Earth from a point fixed in space. Earth rotates eastward beneath you — the ground appears to drift to the right."*

## Slider

- Range: 1 km to 10,000 km
- Log scale: `altitude = 10^(slider_value / 25)` for slider in [0, 100]
- Default starting position: somewhere mid-range, e.g. slider value ~30 (≈ 16 km altitude) — low enough that motion is visible but not nauseating

## Acceptance

- Open `index.html` in any modern browser → ground is visibly scrolling
- Drag altitude slider down → motion looks faster (features whip past)
- Drag altitude slider up → motion looks slower, more features in view
- HUD numbers update smoothly as the slider moves
- No console errors
- Looks deliberate and minimal, not janky or busy
- Resizes cleanly on window resize

## Out of scope for v0 (architecture should leave room for these later)

- Geolocation API and current-location latitude (just scales ground speed by `cos(lat)`)
- Real map tiles (MapLibre, Mapbox, or Cesium for proper inertial-frame 3D)
- Curved Earth — the flat-ground approximation breaks above ~500 km altitude
- Time-warp control for the high-altitude regime where real-time motion looks frozen
- Day/night terminator, sun direction, stars
- Latitude indicator / map of where you are on the globe
- Touch gestures, mobile layout

## File structure

```
birdseye/
  README.md      # this spec
  index.html     # the whole prototype
```
