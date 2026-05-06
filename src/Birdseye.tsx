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
import {
  buildStyle,
  DEFAULT_COLORS,
  WATER_PATTERN_ID,
  WATER_PATTERN_FINE_ID,
  type Colors,
} from './style';
import { makeStipplePattern } from './waterPattern';
import { HUD } from './HUD';
import { Slider } from './Slider';
import { Crosshair } from './Crosshair';
import { Caption } from './Caption';
import { LocateButton, type GeoStatus } from './LocateButton';
import { UnitsToggle } from './UnitsToggle';
import { DevPanel } from './DevPanel';
import type { Units } from './units';

const UNITS_STORAGE_KEY = 'birdseye:units';
const COLORS_STORAGE_KEY = 'birdseye:colors';
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

const isUnits = (v: string | null): v is Units =>
  v === 'metric' || v === 'imperial';

const loadStoredColors = (): Colors => {
  try {
    const raw = typeof localStorage !== 'undefined'
      ? localStorage.getItem(COLORS_STORAGE_KEY)
      : null;
    if (!raw) return DEFAULT_COLORS;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.paper === 'string' &&
      typeof parsed.ink === 'string' &&
      HEX_RE.test(parsed.paper) &&
      HEX_RE.test(parsed.ink)
    ) {
      return { paper: parsed.paper, ink: parsed.ink };
    }
  } catch {
    // fall through to defaults
  }
  return DEFAULT_COLORS;
};

// Register the pmtiles protocol once for the lifetime of the page.
maplibregl.addProtocol('pmtiles', new Protocol().tile);

const DEFAULT_ALTITUDE_KM = altitudeFromSlider(25); // 10 km

export default function Birdseye() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  // Default to the Istanbul fallback synchronously so the experience is
  // interactive on first paint with no permission prompt. The drift loop's
  // [start] effect re-centers and recomputes drift speed when `start`
  // changes, so swapping locations after the user opts in is free.
  const [start, setStart] = useState<StartLocation>(FALLBACK_LOCATION);
  const [altitudeKm, setAltitudeKm] = useState(DEFAULT_ALTITUDE_KM);
  const [liveLon, setLiveLon] = useState<number | null>(null);
  const [speedKmh, setSpeedKmh] = useState(0);
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle');
  const [units, setUnits] = useState<Units>(() => {
    const stored = typeof localStorage !== 'undefined'
      ? localStorage.getItem(UNITS_STORAGE_KEY)
      : null;
    return isUnits(stored) ? stored : 'metric';
  });
  const [colors, setColors] = useState<Colors>(loadStoredColors);

  // Persist the units preference across reloads.
  useEffect(() => {
    try {
      localStorage.setItem(UNITS_STORAGE_KEY, units);
    } catch {
      // Quota exceeded or storage disabled — preference just won't persist.
    }
  }, [units]);

  // Mirror colors to (a) CSS custom properties so the React UI bits update
  // live, and (b) localStorage. The map style is updated separately in the
  // [colors] effect below.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--paper', colors.paper);
    root.style.setProperty('--ink', colors.ink);
    try {
      localStorage.setItem(COLORS_STORAGE_KEY, JSON.stringify(colors));
    } catch {
      // storage disabled — preference just won't persist
    }
  }, [colors]);

  // Capture the latest colors for the mount effect (which is intentionally
  // mount-only — we don't want to recreate the map every time colors change).
  const colorsRef = useRef(colors);
  colorsRef.current = colors;

  // Skip the first colors-effect invocation: the mount effect already built
  // the map with these colors, so calling setStyle on first render would be
  // redundant work and could trigger a small flash before the first frame.
  const colorsFirstRun = useRef(true);

  const altitudeRef = useRef(altitudeKm);
  altitudeRef.current = altitudeKm;

  // Vertical scroll / trackpad pinch → altitude. Multiplicative because the
  // slider is log-scale: a constant `k` keeps each wheel notch a fixed
  // *fraction* of altitude regardless of where you are in the range.
  // ctrlKey === true on macOS trackpad pinch → smaller per-frame deltas, so
  // a larger `k` keeps the gesture comparable in feel.
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

  // Mount the maplibre map once — directly, without react-maplibre's wrapper.
  // The wrapper's mapStyle prop diffing was leaving the underlying map with
  // an empty style after the first render in this configuration.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildStyle({ colors: colorsRef.current }),
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

    // Register the runtime-generated water stipple pattern. Re-registers
    // on every style.load — that fires both for the initial style and
    // after every setStyle (e.g. when DevPanel changes paper/ink), so
    // the pattern is always in sync with the current palette.
    const onStyleLoad = () => {
      const c = colorsRef.current;
      try {
        if (map.hasImage(WATER_PATTERN_FINE_ID)) map.removeImage(WATER_PATTERN_FINE_ID);
        if (map.hasImage(WATER_PATTERN_ID)) map.removeImage(WATER_PATTERN_ID);
        // Fine tier — denser, smaller dots. Used at low zoom where the
        // regular pattern would read as discrete features rather than
        // texture. Tile size deliberately differs so the seam phase
        // doesn't align across tiers if a region of the map is split
        // across the threshold.
        map.addImage(
          WATER_PATTERN_FINE_ID,
          makeStipplePattern(c.ink, c.paper, { size: 48, count: 38, radius: 0.5 }),
          { pixelRatio: 2 },
        );
        map.addImage(
          WATER_PATTERN_ID,
          makeStipplePattern(c.ink, c.paper),
          { pixelRatio: 2 },
        );
      } catch {
        // Map may have been disposed mid-event; the layer falls back to
        // fill-color until the next style.load.
      }
    };
    map.on('style.load', onStyleLoad);
    if (map.isStyleLoaded()) onStyleLoad();

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Apply color changes to the live map by rebuilding the style with the
  // new palette. setStyle({ diff: true }) reconciles paint properties in
  // place — the camera stays put, the drift loop keeps running, and the
  // change feels instant.
  useEffect(() => {
    if (colorsFirstRun.current) {
      colorsFirstRun.current = false;
      return;
    }
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(buildStyle({ colors }), { diff: true });
  }, [colors]);

  // When `start` changes, re-center the camera and (re)start the drift loop.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const latRad = toRad(start.lat);
    const speedKmPerSec = localSpeedKmPerSec(latRad);
    setSpeedKmh(localSpeedKmh(latRad));

    // Initial jump to the user's actual band.
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

  const fov = fovKm(altitudeKm);

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
      <HUD
        altitudeKm={altitudeKm}
        fovKm={fov}
        speedKmh={speedKmh}
        latDeg={start.lat}
        lonDeg={liveLon ?? start.lon}
        units={units}
      />
      <LocateButton
        status={geoStatus}
        hasGeo={start.source === 'geo'}
        onClick={onLocate}
      />
      <UnitsToggle units={units} onChange={setUnits} />
      <Slider value={altitudeKm} onChange={setAltitudeKm} units={units} />
      <Caption speedKmh={speedKmh} units={units} />
      <DevPanel colors={colors} onChange={setColors} />
    </div>
  );
}
