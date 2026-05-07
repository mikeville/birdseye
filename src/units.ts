// Display-layer unit conversion. All physics state lives in km / km·h⁻¹;
// these helpers convert at the format-for-display boundary so internal
// math stays unit-agnostic.

export type Units = 'metric' | 'imperial';

const KM_TO_MI = 0.621371;

const fmt = (n: number, dp: number) =>
  n.toLocaleString(undefined, {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });

// Altitude: more precision when small (matches the prior HUD behavior
// where altitudes < 10 used 2 dp).
export const formatAltitude = (km: number, u: Units) => {
  const v = u === 'imperial' ? km * KM_TO_MI : km;
  const dp = v < 10 ? 2 : 1;
  const label = u === 'imperial' ? 'mi' : 'km';
  return `${fmt(v, dp)} ${label}`;
};

// Speed: integer rounded.
export const formatSpeed = (kmh: number, u: Units) => {
  const v = u === 'imperial' ? kmh * KM_TO_MI : kmh;
  const label = u === 'imperial' ? 'mph' : 'km/h';
  return `${Math.round(v).toLocaleString()} ${label}`;
};

// Slider tick label only (no unit suffix — the unit is implicit from the
// active toggle). Gives compact strings like 1, 10, 100, 1k, 10k or
// 0.6, 6, 62, 621, 6.2k.
export const formatTick = (km: number, u: Units) => {
  const v = u === 'imperial' ? km * KM_TO_MI : km;
  if (v >= 1000) {
    const k = v / 1000;
    // 1 dp under 10k (e.g. 6.2k), no dp at/above (e.g. 10k).
    const s = k < 10 ? k.toFixed(1) : k.toFixed(0);
    return `${s.replace(/\.0$/, '')}k`;
  }
  if (v < 10) {
    // Sub-10 imperial values (0.6) need 1 dp; metric 1 stays as "1".
    return v < 1 ? v.toFixed(1) : Math.round(v).toString();
  }
  return Math.round(v).toString();
};
