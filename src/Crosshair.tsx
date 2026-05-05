import { INK } from './style';

export function Crosshair() {
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
        stroke={INK}
        strokeWidth={0.9}
      />
      <line x1={16} y1={4} x2={16} y2={11} stroke={INK} strokeWidth={0.9} />
      <line x1={16} y1={21} x2={16} y2={28} stroke={INK} strokeWidth={0.9} />
      <line x1={4} y1={16} x2={11} y2={16} stroke={INK} strokeWidth={0.9} />
      <line x1={21} y1={16} x2={28} y2={16} stroke={INK} strokeWidth={0.9} />
    </svg>
  );
}
