import { useState } from 'react';
import { PAPER, INK } from './style';

export function Caption({ speedKmh }: { speedKmh: number }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  const speed = Math.round(speedKmh).toLocaleString();
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 14,
        left: 14,
        right: 14 + 56, // leave room for the slider track on small screens
        maxWidth: 460,
        padding: '8px 32px 8px 12px',
        background: `${PAPER}d0`,
        backdropFilter: 'blur(4px)',
        border: `1px solid ${INK}22`,
        color: INK,
        fontFamily:
          '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif',
        fontStyle: 'italic',
        fontSize: 12,
        lineHeight: 1.45,
        letterSpacing: 0.1,
        userSelect: 'none',
      }}
    >
      You're stationary. Earth is rotating beneath you at{' '}
      <strong style={{ fontStyle: 'normal', fontVariantNumeric: 'tabular-nums' }}>
        {speed} km/h
      </strong>
      .
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
        style={{
          position: 'absolute',
          top: 4,
          right: 6,
          width: 22,
          height: 22,
          background: 'transparent',
          border: 'none',
          color: INK,
          opacity: 0.5,
          fontSize: 16,
          lineHeight: 1,
          cursor: 'pointer',
        }}
      >
        ×
      </button>
    </div>
  );
}
