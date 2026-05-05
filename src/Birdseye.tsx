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
import { buildStyle, PAPER } from './style';
import { HUD } from './HUD';
import { Slider } from './Slider';
import { Crosshair } from './Crosshair';
import { Caption } from './Caption';
import { LocateButton, type GeoStatus } from './LocateButton';
import { UnitsToggle } from './UnitsToggle';
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

  // Persist the units preference across reloads.
  useEffect(() => {
    try {
      localStorage.setItem(UNITS_STORAGE_KEY, units);
    } catch {
      // Quota exceeded or storage disabled — preference just won't persist.
    }
  }, [units]);

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
      style: buildStyle(),
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
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

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
        background: PAPER,
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
    </div>
  );
}
