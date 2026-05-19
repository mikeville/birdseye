import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  altitudeFromSlider,
  clampDt,
  fovKm,
  kmPerLonDegree,
  localSpeedKmPerSec,
  localSpeedKmh,
  toRad,
  zoomFromFov,
} from './physics';
import {
  FALLBACK_LOCATION,
  getStartLocation,
  type StartLocation,
} from './geolocation';
import { formatLocationHash, parseLocationHash } from './locationHash';
import {
  buildStyle,
  DEFAULT_COLORS,
  WATER_PATTERN_ID,
  WATER_PATTERN_FINE_ID,
} from './style';
import { makeStipplePattern } from './waterPattern';
import { TopBar } from './TopBar';
import { Slider } from './Slider';
import { Crosshair } from './Crosshair';
import type { GeoStatus } from './LocateButton';
import type { Units } from './units';

const UNITS_STORAGE_KEY = 'birdseye:units';

const isUnits = (v: string | null): v is Units =>
  v === 'metric' || v === 'imperial';

// Register the pmtiles protocol once for the lifetime of the page.
maplibregl.addProtocol('pmtiles', new Protocol().tile);

const DEFAULT_ALTITUDE_KM = altitudeFromSlider(25); // 10 km

export default function Birdseye() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  // Default to the fallback synchronously so the experience is interactive
  // on first paint with no permission prompt. A `#lat,lon[,altKm]` hash
  // overrides the fallback so demo URLs jump straight to a chosen view.
  const [start, setStart] = useState<StartLocation>(() => {
    const parsed = parseLocationHash(window.location.hash);
    if (parsed) return { lat: parsed.lat, lon: parsed.lon, source: 'fallback' };
    return FALLBACK_LOCATION;
  });
  const [altitudeKm, setAltitudeKm] = useState(() => {
    const parsed = parseLocationHash(window.location.hash);
    return parsed?.altKm ?? DEFAULT_ALTITUDE_KM;
  });
  const [liveLon, setLiveLon] = useState<number | null>(null);
  const [speedKmh, setSpeedKmh] = useState(0);
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle');
  const [units, setUnits] = useState<Units>(() => {
    const stored = typeof localStorage !== 'undefined'
      ? localStorage.getItem(UNITS_STORAGE_KEY)
      : null;
    return isUnits(stored) ? stored : 'metric';
  });

  useEffect(() => {
    try {
      localStorage.setItem(UNITS_STORAGE_KEY, units);
    } catch {
      // storage disabled — preference just won't persist
    }
  }, [units]);

  const altitudeRef = useRef(altitudeKm);
  altitudeRef.current = altitudeKm;

  // After a successful re-center, mirror the new view into the URL hash so
  // it's shareable. Guarded on `source === 'geo'` so the fallback (or a
  // user-typed hash) doesn't get overwritten on mount.
  useEffect(() => {
    if (start.source !== 'geo') return;
    const hash = formatLocationHash(start.lat, start.lon, altitudeRef.current);
    history.replaceState(null, '', `#${hash}`);
  }, [start]);

  // Vertical scroll / trackpad pinch → altitude. Multiplicative because the
  // slider is log-scale: a constant `k` keeps each wheel notch a fixed
  // fraction of altitude regardless of where you are in the range.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const k = e.ctrlKey ? 0.005 : 0.0015;
      setAltitudeKm((prev) => {
        const next = prev * Math.exp(e.deltaY * k);
        return Math.min(10000, Math.max(1, next));
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Geolocation is opt-in: triggered only when the user taps the button.
  const onLocate = async () => {
    setGeoStatus('locating');
    const loc = await getStartLocation();
    if (loc.source === 'geo') {
      setStart(loc);
      setGeoStatus('idle');
    } else {
      setGeoStatus('denied');
      setTimeout(() => setGeoStatus('idle'), 3000);
    }
  };

  // Mount the map directly. @vis.gl/react-maplibre's mapStyle diffing left
  // the underlying map with an empty style after the first render here.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildStyle({ colors: DEFAULT_COLORS }),
      center: [0, 0],
      zoom: 2,
      interactive: false,
      attributionControl: false,
      renderWorldCopies: true,
      fadeDuration: 0,
    });
    mapRef.current = map;
    if (import.meta.env.DEV) {
      (window as unknown as { __map?: unknown }).__map = map;
    }

    // Register the runtime-generated water stipple. Two tiers because
    // fill-pattern is screen-space: a single density can't read correctly
    // at both global and close-in scales.
    const onStyleLoad = () => {
      try {
        if (map.hasImage(WATER_PATTERN_FINE_ID)) map.removeImage(WATER_PATTERN_FINE_ID);
        if (map.hasImage(WATER_PATTERN_ID)) map.removeImage(WATER_PATTERN_ID);
        map.addImage(
          WATER_PATTERN_FINE_ID,
          makeStipplePattern(DEFAULT_COLORS.ink, DEFAULT_COLORS.paper, { size: 48, count: 48, radius: 0.33 }),
          { pixelRatio: 2 },
        );
        map.addImage(
          WATER_PATTERN_ID,
          makeStipplePattern(DEFAULT_COLORS.ink, DEFAULT_COLORS.paper),
          { pixelRatio: 2 },
        );
      } catch {
        // Map may have been disposed mid-event; layer falls back to fill-color.
      }
    };
    map.on('style.load', onStyleLoad);
    if (map.isStyleLoaded()) onStyleLoad();

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // When `start` changes, re-center and (re)start the drift loop.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const latRad = toRad(start.lat);
    const speedKmPerSec = localSpeedKmPerSec(latRad);
    setSpeedKmh(localSpeedKmh(latRad));

    const init = () => {
      const canvas = map.getCanvas();
      const viewportPx = canvas.clientWidth || window.innerWidth;
      const z = zoomFromFov(fovKm(altitudeRef.current), latRad, viewportPx);
      map.jumpTo({ center: [start.lon, start.lat], zoom: z });
    };
    if (map.isStyleLoaded()) init();
    else map.once('styledata', init);

    let raf = 0;
    let lastTs: number | null = null;
    let worldOffsetKm = 0;

    const tick = (ts: number) => {
      if (lastTs == null) lastTs = ts;
      const dt = clampDt((ts - lastTs) / 1000);
      lastTs = ts;
      worldOffsetKm += speedKmPerSec * dt;
      const dLonDeg = worldOffsetKm / kmPerLonDegree(latRad);
      let lon = start.lon - dLonDeg;
      lon = ((((lon + 180) % 360) + 360) % 360) - 180;

      const canvas = map.getCanvas();
      const viewportPx = canvas.clientWidth || window.innerWidth;
      const z = zoomFromFov(fovKm(altitudeRef.current), latRad, viewportPx);
      map.jumpTo({ center: [lon, start.lat], zoom: z });
      setLiveLon(lon);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start]);

  return (
    <div
      ref={rootRef}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--paper)',
        overflow: 'hidden',
      }}
    >
      <div
        ref={containerRef}
        style={{ position: 'absolute', inset: 0 }}
      />
      <Crosshair />
      <TopBar
        altitudeKm={altitudeKm}
        speedKmh={speedKmh}
        latDeg={start.lat}
        lonDeg={liveLon ?? start.lon}
        units={units}
        geoStatus={geoStatus}
        hasGeo={start.source === 'geo'}
        onLocate={onLocate}
        onUnitsChange={setUnits}
      />
      <Slider value={altitudeKm} onChange={setAltitudeKm} units={units} />
    </div>
  );
}
