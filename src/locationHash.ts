// Pure parser/formatter for the URL hash that encodes a starting view.
// Format: `lat,lon` or `lat,lon,altKm` — comma-separated decimals.

export type ParsedHash = { lat: number; lon: number; altKm?: number };

const MIN_ALT_KM = 1;
const MAX_ALT_KM = 10000;

export const parseLocationHash = (hash: string): ParsedHash | null => {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!raw) return null;

  const parts = raw.split(',');
  if (parts.length !== 2 && parts.length !== 3) return null;

  const lat = Number(parts[0]);
  const lon = Number(parts[1]);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return null;
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) return null;

  if (parts.length === 2) return { lat, lon };

  const altKm = Number(parts[2]);
  if (!Number.isFinite(altKm) || altKm < MIN_ALT_KM || altKm > MAX_ALT_KM) {
    return null;
  }
  return { lat, lon, altKm };
};

export const formatLocationHash = (
  lat: number,
  lon: number,
  altKm: number,
): string => `${lat.toFixed(4)},${lon.toFixed(4)},${altKm.toFixed(1)}`;
