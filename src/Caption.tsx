import { useState } from 'react';
import { formatSpeed, type Units } from './units';

export function Caption({
  speedKmh,
  units,
}: {
  speedKmh: number;
  units: Units;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 14,
        left: 14,
        right: 14 + 56, // leave room for the slider track on small screens
        maxWidth: 460,
        padding: '8px 32px 8px 12px',
        background: 'color-mix(in srgb, var(--paper) 81%, transparent)',
        backdropFilter: 'blur(4px)',
        border: '1px solid color-mix(in srgb, var(--ink) 13%, transparent)',
        color: 'var(--ink)',
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
        {formatSpeed(speedKmh, units)}
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
          color: 'var(--ink)',
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
