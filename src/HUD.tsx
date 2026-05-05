import {
  formatAltitude,
  formatDistance,
  formatSpeed,
  type Units,
} from './units';

export function HUD({
  altitudeKm,
  fovKm,
  speedKmh,
  latDeg,
  lonDeg,
  units,
}: {
  altitudeKm: number;
  fovKm: number;
  speedKmh: number;
  latDeg: number;
  lonDeg: number;
  units: Units;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 14,
        left: 14,
        padding: '10px 12px',
        background: 'color-mix(in srgb, var(--paper) 80%, transparent)',
        backdropFilter: 'blur(4px)',
        border: '1px solid color-mix(in srgb, var(--ink) 13%, transparent)',
        color: 'var(--ink)',
        fontFamily:
          '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif',
        fontStyle: 'italic',
        fontSize: 12,
        lineHeight: 1.5,
        letterSpacing: 0.2,
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <Row label="altitude" value={formatAltitude(altitudeKm, units)} />
      <Row label="field of view" value={formatDistance(fovKm, units)} />
      <Row label="ground speed" value={formatSpeed(speedKmh, units)} />
      <Row
        label="position"
        value={`${formatLat(latDeg)} ${formatLon(lonDeg)}`}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
      <span style={{ opacity: 0.55, fontStyle: 'normal', fontVariant: 'small-caps' }}>
        {label}
      </span>
      <span style={{ marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </span>
    </div>
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
