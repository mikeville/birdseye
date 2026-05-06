import type { Units } from './units';

// Two-segment km / mi pill. Composed inline by TopBar — positioning is
// the parent's concern.
export function UnitsToggle({
  units,
  onChange,
}: {
  units: Units;
  onChange: (next: Units) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Units"
      style={{
        display: 'flex',
        border: '1px solid color-mix(in srgb, var(--ink) 33%, transparent)',
        userSelect: 'none',
      }}
    >
      <Segment
        label="km"
        active={units === 'metric'}
        onClick={() => onChange('metric')}
      />
      <div style={{ width: 1, background: 'color-mix(in srgb, var(--ink) 33%, transparent)' }} />
      <Segment
        label="mi"
        active={units === 'imperial'}
        onClick={() => onChange('imperial')}
      />
    </div>
  );
}

function Segment({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        minHeight: 28,
        minWidth: 32,
        padding: '3px 8px',
        background: 'transparent',
        border: 'none',
        color: 'var(--ink)',
        opacity: active ? 1 : 0.4,
        cursor: 'pointer',
        fontFamily:
          '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif',
        fontStyle: 'italic',
        fontSize: 12,
        letterSpacing: 0.2,
        transition: 'opacity 200ms ease',
      }}
    >
      {label}
    </button>
  );
}
