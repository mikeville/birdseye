// Forward geocoding via Nominatim (OpenStreetMap). Public endpoint, no key.
// Per Nominatim's usage policy, requests must identify themselves — the
// browser supplies User-Agent and Referer automatically, which satisfies
// that for low-volume browser-originated traffic. Keep traffic polite
// (≤1 req/sec) and don't run this from server-side bulk jobs.
// https://operations.osmfoundation.org/policies/nominatim/

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

export type GeocodeResult = {
  lat: number;
  lon: number;
  displayName: string;
};

export const geocodeLocation = async (
  query: string,
  signal?: AbortSignal,
): Promise<GeocodeResult | null> => {
  const trimmed = query.trim();
  if (!trimmed) return null;
  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(trimmed)}&format=json&limit=1`;
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const first = data[0] as { lat?: string; lon?: string; display_name?: string };
    const lat = Number(first.lat);
    const lon = Number(first.lon);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) return null;
    if (!Number.isFinite(lon) || lon < -180 || lon > 180) return null;
    return {
      lat,
      lon,
      displayName: typeof first.display_name === 'string' ? first.display_name : '',
    };
  } catch {
    // Network error, aborted, or invalid JSON — caller treats as "not found".
    return null;
  }
};
