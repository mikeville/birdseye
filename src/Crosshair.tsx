// Surveyor / map-center reticle: ticks sit outside the circle with a 2 px gap.
export function Crosshair() {
  const stroke = 'var(--ink)';
  return (
    <svg
      viewBox="0 0 32 32"
      width={28}
      height={28}
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
      }}
      aria-hidden
    >
      <circle
        cx={16}
        cy={16}
        r={11}
        fill="none"
        stroke={stroke}
        strokeWidth={1}
      />
      <line x1={16} y1={0} x2={16} y2={10} stroke={stroke} strokeWidth={1} />
      <line x1={16} y1={22} x2={16} y2={32} stroke={stroke} strokeWidth={1} />
      <line x1={0} y1={16} x2={10} y2={16} stroke={stroke} strokeWidth={1} />
      <line x1={22} y1={16} x2={32} y2={16} stroke={stroke} strokeWidth={1} />
    </svg>
  );
}
