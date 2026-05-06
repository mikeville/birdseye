import { useEffect, useState } from 'react';
import {
  formatAltitude,
  formatSpeed,
  type Units,
} from './units';
import { LocateButton, type GeoStatus } from './LocateButton';
import { UnitsToggle } from './UnitsToggle';

// Single full-width container at the top of the window. Mobile: the
// headline sits alone on the top row, with stats (left) and actions
// (right) on the row below. Desktop (>= 720 px): all three become a
// single row — headline left, stats middle, actions right. The layout
// switch is driven entirely by CSS in index.css; the React tree is the
// same shape at every viewport width. Compact-only label changes
// (alt. / pos. / "Find me") are driven by the matchMedia hook below
// because they affect the rendered text content, not just visibility.
export function TopBar({
  altitudeKm,
  speedKmh,
  latDeg,
  lonDeg,
  units,
  geoStatus,
  hasGeo,
  onLocate,
  onUnitsChange,
}: {
  altitudeKm: number;
  speedKmh: number;
  latDeg: number;
  lonDeg: number;
  units: Units;
  geoStatus: GeoStatus;
  hasGeo: boolean;
  onLocate: () => void;
  onUnitsChange: (next: Units) => void;
}) {
  const compact = useCompact();
  return (
    <header
      className="topbar"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        padding: '12px 14px 10px',
        background: 'var(--paper)',
        borderBottom:
          '1px solid color-mix(in srgb, var(--ink) 18%, transparent)',
        color: 'var(--ink)',
        fontFamily:
          '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif',
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 2,
      }}
    >
      <h1
        className="topbar-headline"
        style={{
          margin: 0,
          fontStyle: 'italic',
          fontWeight: 400,
          fontSize: 14,
          lineHeight: 1.35,
          letterSpacing: 0.1,
        }}
      >
        You're stationary. Earth is rotating beneath you.
      </h1>
      <div className="topbar-row">
        <div
          className="topbar-stats"
          style={{ fontSize: 12, letterSpacing: 0.2 }}
        >
          <Stat
            label={compact ? 'alt.' : 'altitude'}
            value={formatAltitude(altitudeKm, units)}
          />
          <Stat
            label={compact ? 'pos.' : 'position'}
            value={`${formatLat(latDeg)} ${formatLon(lonDeg)}`}
          />
          <Stat label="speed" value={formatSpeed(speedKmh, units)} />
        </div>
        <div className="topbar-actions">
          <LocateButton
            status={geoStatus}
            hasGeo={hasGeo}
            onClick={onLocate}
            compact={compact}
          />
          <UnitsToggle units={units} onChange={onUnitsChange} />
        </div>
      </div>
    </header>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
      <span style={{ opacity: 0.55, fontVariant: 'small-caps' }}>{label}</span>
      <span style={{ fontStyle: 'italic', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </span>
    </span>
  );
}

const formatLat = (d: number) => {
  const hemi = d >= 0 ? 'N' : 'S';
  return `${Math.abs(d).toFixed(0)}°${hemi}`;
};

const formatLon = (d: number) => {
  const hemi = d >= 0 ? 'E' : 'W';
  return `${Math.abs(d).toFixed(0)}°${hemi}`;
};

// Reactive matchMedia hook. The (max-width: 719px) breakpoint matches
// the CSS in index.css that switches between mobile column layout and
// desktop three-column row layout — keeping JS-driven label changes in
// lockstep with the CSS-driven layout change.
const COMPACT_QUERY = '(max-width: 719px)';

function useCompact() {
  const [compact, setCompact] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(COMPACT_QUERY).matches;
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia(COMPACT_QUERY);
    const update = () => setCompact(mq.matches);
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return compact;
}
