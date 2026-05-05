import { PAPER, INK } from './style';

const fmt = (n: number, dp = 1) =>
  n.toLocaleString(undefined, {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });

export function HUD({
  altitudeKm,
  fovKm,
  speedKmh,
  latDeg,
  lonDeg,
}: {
  altitudeKm: number;
  fovKm: number;
  speedKmh: number;
  latDeg: number;
  lonDeg: number;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 14,
        left: 14,
        padding: '10px 12px',
        background: `${PAPER}cc`,
        backdropFilter: 'blur(4px)',
        border: `1px solid ${INK}22`,
        color: INK,
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
      <Row label="altitude" value={`${fmt(altitudeKm, altitudeKm < 10 ? 2 : 1)} km`} />
      <Row label="field of view" value={`${fmt(fovKm)} km`} />
      <Row label="ground speed" value={`${Math.round(speedKmh)} km/h`} />
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
