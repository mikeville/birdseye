import type { Units } from './units';

// Fixed-position units toggle. The labels never move — `km` is always on the
// left, `mi` is always on the right. What changes on click is (a) which label
// is visually active, and (b) the direction of the arrow between them, which
// always points from the active unit toward the inactive one (i.e. the unit
// you'll get if you click again). On hover both labels go to full opacity so
// the whole control reads as one unit.
export function UnitsToggle({
  units,
  onChange,
}: {
  units: Units;
  onChange: (next: Units) => void;
}) {
  const next: Units = units === 'metric' ? 'imperial' : 'metric';
  const arrow = units === 'metric' ? '→' : '←';
  return (
    <button
      type="button"
      className="units-toggle"
      onClick={() => onChange(next)}
      aria-label={`Switch to ${next === 'metric' ? 'kilometers' : 'miles'}`}
    >
      <span className={units === 'metric' ? 'active' : 'inactive'}>km</span>
      {' '}
      <span className="inactive" aria-hidden="true">{arrow}</span>
      {' '}
      <span className={units === 'imperial' ? 'active' : 'inactive'}>mi</span>
    </button>
  );
}
