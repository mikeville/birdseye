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
      className="locate-button"
      onClick={onClick}
      disabled={disabled}
      style={{
        opacity: status === 'denied' ? 0.6 : 1,
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      {label}
    </button>
  );
}
