export function Crosshair() {
  const stroke = 'var(--ink)';
  // viewBox 32×32, circle r=11 centered at (16,16) → circle edges at 5 and 27.
  // Tick lines sit fully OUTSIDE the circle with a deliberate 2 px gap between
  // each line tip and the circle edge — the conventional surveyor / map-center
  // reticle. The previous geometry started a few pixels outside and ended a
  // few pixels inside, which read as a misalignment.
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
        opacity: 0.6,
      }}
      aria-hidden
    >
      <circle
        cx={16}
        cy={16}
        r={11}
        fill="none"
        stroke={stroke}
        strokeWidth={0.9}
      />
      <line x1={16} y1={0} x2={16} y2={3} stroke={stroke} strokeWidth={0.9} />
      <line x1={16} y1={29} x2={16} y2={32} stroke={stroke} strokeWidth={0.9} />
      <line x1={0} y1={16} x2={3} y2={16} stroke={stroke} strokeWidth={0.9} />
      <line x1={29} y1={16} x2={32} y2={16} stroke={stroke} strokeWidth={0.9} />
    </svg>
  );
}
