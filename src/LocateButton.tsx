// Opt-in geolocation button. Icon-only — same surveyor reticle the map
// crosshair uses, in a 30×30 outlined pill that matches the search input's
// height. Positioning is the parent's concern.
//
// States: idle (normal), locating (pulsing), denied (dimmed for 3s). The
// SVG uses currentColor so it inverts cleanly with the parent's hover swap.

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
  const ariaLabel = (() => {
    if (status === 'locating') return 'Locating…';
    if (status === 'denied') return "Couldn't get your location";
    return hasGeo ? 'Re-center on me' : 'Use my location';
  })();

  const disabled = status !== 'idle';

  return (
    <button
      type="button"
      className="locate-button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={ariaLabel}
      data-status={status}
    >
      <svg
        viewBox="0 0 32 32"
        width={18}
        height={18}
        aria-hidden
      >
        <circle
          cx={16}
          cy={16}
          r={11}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
        />
        <line x1={16} y1={2} x2={16} y2={11} stroke="currentColor" strokeWidth={1.5} />
        <line x1={16} y1={21} x2={16} y2={30} stroke="currentColor" strokeWidth={1.5} />
        <line x1={2} y1={16} x2={11} y2={16} stroke="currentColor" strokeWidth={1.5} />
        <line x1={21} y1={16} x2={30} y2={16} stroke="currentColor" strokeWidth={1.5} />
      </svg>
    </button>
  );
}
