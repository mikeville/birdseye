import type { Units } from './units';

// Two-segment km / mi pill. Sits below the LocateButton in the top-left
// stack and mirrors its paper/italic-serif aesthetic. Each segment is its
// own button with aria-pressed so screen readers see a proper toggle pair.
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
        position: 'absolute',
        top: 186,
        left: 14,
        display: 'flex',
        background: 'color-mix(in srgb, var(--paper) 80%, transparent)',
        backdropFilter: 'blur(4px)',
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
        minHeight: 36,
        minWidth: 44,
        padding: '8px 14px',
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
