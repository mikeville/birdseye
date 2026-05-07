// Opt-in geolocation button. Composed inline by TopBar — positioning is
// the parent's concern. Compact mode swaps the long-form labels for
// shorter ones used in the mobile layout.
export type GeoStatus = 'idle' | 'locating' | 'denied';

export function LocateButton({
  status,
  hasGeo,
  onClick,
  compact = false,
}: {
  status: GeoStatus;
  hasGeo: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  const label = (() => {
    if (status === 'locating') return 'Locating…';
    if (status === 'denied') return "Couldn't get your location";
    if (compact) return hasGeo ? 'Center' : 'Find me';
    return hasGeo ? 'Re-center on me' : 'Use my location';
  })();

  const disabled = status !== 'idle';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        minHeight: 30,
        padding: '3px 8px',
        background: 'transparent',
        border: '1px solid color-mix(in srgb, var(--ink) 75%, transparent)',
        color: 'var(--ink)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: status === 'denied' ? 0.6 : 1,
        fontFamily:
          '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif',
        fontSize: 12,
        letterSpacing: 0.2,
        userSelect: 'none',
        transition: 'opacity 200ms ease, border-color 200ms ease',
      }}
    >
      {label}
    </button>
  );
}
