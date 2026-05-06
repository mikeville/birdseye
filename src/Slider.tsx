import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import {
  altitudeFromSlider,
  sliderFromAltitude,
} from './physics';
import { formatTick, type Units } from './units';

// Vertical slider on the right edge. Bottom = low altitude (1 km), top = high.
// Range 0–100 maps log-scale to 1 → 10,000 km via altitudeFromSlider.
//
// Tick anchors are physical altitudes in km. We keep two sets so the labels
// are always round numbers in the active unit — converting metric anchors
// directly to imperial gives 0.6, 6, 62, 621, 6.2k mi which reads as noise.
// The thumb's physical position depends only on the altitude value, so the
// thumb stays put when the user toggles units; only the tick anchors and
// labels change.

const KM_PER_MI = 1 / 0.621371;
const TICK_KM_METRIC = [1, 10, 100, 1000, 10000];
const TICK_KM_IMPERIAL = [1, 10, 100, 1000, 6000].map((mi) => mi * KM_PER_MI);

export function Slider({
  value,
  onChange,
  units,
}: {
  value: number;
  onChange: (km: number) => void;
  units: Units;
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

  const tickKm = units === 'imperial' ? TICK_KM_IMPERIAL : TICK_KM_METRIC;

  return (
    <div
      style={{
        position: 'absolute',
        right: 0,
        // Clear the TopBar at the top; rest above the bottom edge. Using
        // top/bottom instead of centering keeps the slider out from under
        // the header regardless of header height (it wraps on narrow
        // screens).
        top: 120,
        bottom: 24,
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
            background: 'var(--ink)',
            opacity: 0.35,
          }}
        />
        {/* tick marks */}
        {tickKm.map((km) => {
          const pct = sliderFromAltitude(km); // 0..100
          return (
            <div
              key={km}
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
                  background: 'var(--ink)',
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
                  color: 'var(--ink)',
                  opacity: 0.5,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatTick(km, units)}
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
            background: 'var(--paper)',
            border: '1.5px solid var(--ink)',
            boxShadow: active ? '0 0 0 4px color-mix(in srgb, var(--ink) 10%, transparent)' : 'none',
            transition:
              'width 120ms ease, height 120ms ease, box-shadow 120ms ease',
          }}
        />
      </div>
    </div>
  );
}
