// Try to get the user's real latitude/longitude. On any failure or denial,
// fall back to Athens (~38°N, 24°E). Drifting westward from Athens sweeps
// the camera over Italy → Iberia → Atlantic → Americas → Pacific → Asia
// → Caucasus → back to Greece: lots of recognizable land for the visceral
// payoff.

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
