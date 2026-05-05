// Opt-in geolocation button. Sits below the HUD card (top-left) and matches
// its paper/italic aesthetic. The button stays visible after a successful
// grant so it doubles as "re-center on me" — useful because the inertial
// drift means the camera's longitude diverges from the user's actual
// longitude over time.
export type GeoStatus = 'idle' | 'locating' | 'denied';

export function LocateButton({
  status,
  hasGeo,
  onClick,
}: {
  status: GeoStatus;
  hasGeo: boolean;
  onClick: () => void;
}) {
  const label = (() => {
    if (status === 'locating') return 'Locating…';
    if (status === 'denied') return "Couldn't get your location";
    return hasGeo ? 'Re-center on me' : 'Use my location';
  })();

  const disabled = status !== 'idle';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        position: 'absolute',
        top: 130,
        left: 14,
        minHeight: 44,
        padding: '10px 14px',
        background: 'color-mix(in srgb, var(--paper) 80%, transparent)',
        backdropFilter: 'blur(4px)',
        border: '1px solid color-mix(in srgb, var(--ink) 33%, transparent)',
        color: 'var(--ink)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: status === 'denied' ? 0.6 : 1,
        fontFamily:
          '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif',
        fontStyle: 'italic',
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
