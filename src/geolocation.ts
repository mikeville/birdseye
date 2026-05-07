// Try to get the user's real lat/lon. On failure or denial, fall back to Athens.

export type StartLocation = {
  lat: number;
  lon: number;
  source: 'geo' | 'fallback';
};

export const FALLBACK_LOCATION: StartLocation = {
  lat: 37.9838,
  lon: 23.7275,
  source: 'fallback',
};

export const getStartLocation = (timeoutMs = 5000): Promise<StartLocation> =>
  new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve(FALLBACK_LOCATION);
      return;
    }
    let settled = false;
    const finalize = (loc: StartLocation) => {
      if (settled) return;
      settled = true;
      resolve(loc);
    };
    const timer = setTimeout(() => finalize(FALLBACK_LOCATION), timeoutMs);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        finalize({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          source: 'geo',
        });
      },
      () => {
        clearTimeout(timer);
        finalize(FALLBACK_LOCATION);
      },
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 60_000 },
    );
  });
