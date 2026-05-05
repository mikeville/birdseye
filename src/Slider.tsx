import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import {
  altitudeFromSlider,
  sliderFromAltitude,
} from './physics';
import { INK, PAPER } from './style';

// Vertical slider on the right edge. Bottom = low altitude (1 km), top = high.
// Range 0–100 maps log-scale to 1 → 10,000 km via altitudeFromSlider.

const TICKS = [
  { km: 1, label: '1' },
  { km: 10, label: '10' },
  { km: 100, label: '100' },
  { km: 1000, label: '1k' },
  { km: 10000, label: '10k' },
];

export function Slider({
  value,
  onChange,
}: {
  value: number;
  onChange: (km: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  const sliderValue = sliderFromAltitude(value); // 0..100

  const updateFromY = useCallback(
    (clientY: number) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const t = 1 - (clientY - rect.top) / rect.height; // top = 1, bottom = 0
      const clamped = Math.min(1, Math.max(0, t));
      const next = altitudeFromSlider(clamped * 100);
      onChange(next);
    },
    [onChange],
  );

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setActive(true);
    updateFromY(e.clientY);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!active) return;
    updateFromY(e.clientY);
  };

  const handlePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    setActive(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // pointer was already released
    }
  };

  const thumbBottomPct = sliderValue; // 0..100

  return (
    <div
      style={{
        position: 'absolute',
        right: 0,
        top: '50%',
        transform: 'translateY(-50%)',
        height: '78%',
        width: 56,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        touchAction: 'none',
      }}
    >
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        role="slider"
        aria-label="Altitude"
        aria-valuemin={1}
        aria-valuemax={10000}
        aria-valuenow={Math.round(value)}
        tabIndex={0}
        style={{
          position: 'relative',
          width: 32,
          height: '100%',
          cursor: 'pointer',
        }}
      >
        {/* track line */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 0,
            bottom: 0,
            width: 1,
            transform: 'translateX(-50%)',
            background: INK,
            opacity: 0.35,
          }}
        />
        {/* tick marks */}
        {TICKS.map((tick) => {
          const pct = sliderFromAltitude(tick.km); // 0..100
          return (
            <div
              key={tick.km}
              style={{
                position: 'absolute',
                left: '50%',
                bottom: `${pct}%`,
                transform: 'translate(-50%, 50%)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 1,
                  background: INK,
                  opacity: 0.45,
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  right: 14,
                  fontFamily:
                    '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif',
                  fontStyle: 'italic',
                  fontSize: 10,
                  color: INK,
                  opacity: 0.5,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {tick.label}
              </span>
            </div>
          );
        })}
        {/* thumb */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: `${thumbBottomPct}%`,
            transform: 'translate(-50%, 50%)',
            width: active ? 22 : 18,
            height: active ? 22 : 18,
            borderRadius: '50%',
            background: PAPER,
            border: `1.5px solid ${INK}`,
            boxShadow: active ? `0 0 0 4px ${INK}1a` : 'none',
            transition:
              'width 120ms ease, height 120ms ease, box-shadow 120ms ease',
          }}
        />
      </div>
    </div>
  );
}
