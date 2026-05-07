import type { Units } from './units';

// Inline text-only toggle. Lives among the HUD stats, styled like the
// stat values (serif, tabular-nums, small letter-spacing) with a dashed
// underline as the only "this is clickable" cue. The arrow shows what
// will happen: clicking "km → mi" switches to imperial, "mi → km"
// switches to metric.
export function UnitsToggle({
  units,
  onChange,
}: {
  units: Units;
  onChange: (next: Units) => void;
}) {
  const next = units === 'metric' ? 'imperial' : 'metric';
  const label =
    units === 'metric' ? (
      <>
        km <span style={{ opacity: 0.55 }}>→ mi</span>
      </>
    ) : (
      <>
        mi <span style={{ opacity: 0.55 }}>→ km</span>
      </>
    );
  return (
    <button
      type="button"
      onClick={() => onChange(next)}
      aria-label={`Switch to ${next === 'metric' ? 'kilometers' : 'miles'}`}
      style={{
        // Sit visually on the same baseline as the stat values rather than
        // looking like a chip — no background, no box, just text plus a
        // dashed underline as the affordance.
        background: 'transparent',
        border: 'none',
        padding: 0,
        margin: 0,
        color: 'var(--ink)',
        fontFamily: 'inherit',
        fontSize: 12,
        letterSpacing: 0.2,
        fontVariantNumeric: 'tabular-nums',
        cursor: 'pointer',
        borderBottom:
          '0',
        lineHeight: 1.2,
        userSelect: 'none',
      }}
    >
      {label}
    </button>
  );
}
