// Pure math for Birdseye's inertial-frame view of a rotating Earth.
// Constants are computed, not hardcoded, per BUILD_SPEC.

export const EARTH_CIRCUMFERENCE_KM = 40075;
export const SIDEREAL_DAY_SEC = 86164;
export const EQUATORIAL_SPEED_KMH =
  EARTH_CIRCUMFERENCE_KM / (SIDEREAL_DAY_SEC / 3600);
export const EQUATORIAL_SPEED_KM_PER_SEC = EQUATORIAL_SPEED_KMH / 3600;

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

export const toRad = (deg: number) => deg * DEG_TO_RAD;
export const toDeg = (rad: number) => rad * RAD_TO_DEG;

export const localSpeedKmPerSec = (latRad: number) =>
  EQUATORIAL_SPEED_KM_PER_SEC * Math.cos(latRad);

export const localSpeedKmh = (latRad: number) =>
  EQUATORIAL_SPEED_KMH * Math.cos(latRad);

// 60° vertical cone → fov diameter = 2 * altitude * tan(30°) ≈ 1.155 * altitude
export const fovKm = (altitudeKm: number) =>
  2 * altitudeKm * Math.tan(30 * DEG_TO_RAD);

// Slider in [0, 100] maps log-scale to [1, 10000] km.
// 0 → 1 km, 25 → 10 km (default), 50 → 100 km, 75 → 1000 km, 100 → 10000 km.
export const altitudeFromSlider = (v: number) => Math.pow(10, v / 25);
export const sliderFromAltitude = (a: number) => 25 * Math.log10(a);

// Earth-fixed degrees of longitude per km at a given latitude.
// At the equator, 1° lon ≈ 111.3 km; at the poles it goes to infinity.
export const kmPerLonDegree = (latRad: number) =>
  (EARTH_CIRCUMFERENCE_KM * Math.cos(latRad)) / 360;

export const lonDegPerKm = (latRad: number) => 1 / kmPerLonDegree(latRad);

// MapLibre web mercator zoom such that the visible horizontal span at the
// given latitude is approximately `fovKm`. At zoom z the world is 256·2^z px
// wide; the visible window is `viewportPx` wide, so the visible longitude span
// is 360 · viewportPx / (256 · 2^z). Solve for z.
export const zoomFromFov = (
  fovKilometers: number,
  latRad: number,
  viewportPx: number,
) => {
  const fovDeg = fovKilometers * lonDegPerKm(latRad);
  if (fovDeg <= 0) return 0;
  return Math.log2((360 * viewportPx) / (256 * fovDeg));
};

export const clampDt = (dtSec: number, maxSec = 0.1) =>
  Math.min(Math.max(dtSec, 0), maxSec);
