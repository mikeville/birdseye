import { useEffect, useState } from 'react';
import { DEFAULT_COLORS, type Colors } from './style';

// Compact dev-only color tweak panel. Top-right corner. Two color pickers
// (paper + ink) wired to the same state that drives both CSS variables and
// the MapLibre style. Collapses to a small dot button so it gets out of
// the way once you've settled on a palette. Open/closed state and the
// last-used colors persist via localStorage.
const OPEN_STORAGE_KEY = 'birdseye:dev-open';

export function DevPanel({
  colors,
  onChange,
}: {
  colors: Colors;
  onChange: (next: Colors) => void;
}) {
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof localStorage === 'undefined') return true;
    return localStorage.getItem(OPEN_STORAGE_KEY) !== '0';
  });

  useEffect(() => {
    try {
      localStorage.setItem(OPEN_STORAGE_KEY, open ? '1' : '0');
    } catch {
      // storage disabled — preference just won't persist
    }
  }, [open]);

  if (!open) {
    return (
      <button
        type="button"
        aria-label="Open color tweaks"
        onClick={() => setOpen(true)}
        style={{
          position: 'absolute',
          top: 14,
          right: 14,
          width: 24,
          height: 24,
          borderRadius: 12,
          background: 'color-mix(in srgb, var(--paper) 80%, transparent)',
          border: '1px solid color-mix(in srgb, var(--ink) 33%, transparent)',
          color: 'var(--ink)',
          cursor: 'pointer',
          fontSize: 11,
          lineHeight: 1,
          opacity: 0.55,
          padding: 0,
        }}
      >
        ✦
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 14,
        right: 14,
        padding: '8px 10px 10px',
        background: 'color-mix(in srgb, var(--paper) 88%, transparent)',
        backdropFilter: 'blur(4px)',
        border: '1px solid color-mix(in srgb, var(--ink) 22%, transparent)',
        color: 'var(--ink)',
        fontFamily:
          '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif',
        fontStyle: 'italic',
        fontSize: 11,
        letterSpacing: 0.2,
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        minWidth: 178,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
        <span style={{ opacity: 0.55, fontStyle: 'normal', fontVariant: 'small-caps' }}>
          colors
        </span>
        <button
          type="button"
          onClick={() => onChange(DEFAULT_COLORS)}
          style={{
            marginLeft: 'auto',
            background: 'transparent',
            border: 'none',
            color: 'var(--ink)',
            opacity: 0.55,
            cursor: 'pointer',
            fontSize: 10,
            fontStyle: 'italic',
            padding: 0,
          }}
        >
          reset
        </button>
        <button
          type="button"
          aria-label="Close"
          onClick={() => setOpen(false)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--ink)',
            opacity: 0.55,
            cursor: 'pointer',
            fontSize: 14,
            lineHeight: 1,
            padding: 0,
            width: 16,
          }}
        >
          ×
        </button>
      </div>
      <Row
        label="paper"
        value={colors.paper}
        onChange={(paper) => onChange({ ...colors, paper })}
      />
      <Row
        label="ink"
        value={colors.ink}
        onChange={(ink) => onChange({ ...colors, ink })}
      />
    </div>
  );
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function Row({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  // Local text-input draft so partial typing (e.g. "#f4") doesn't reject —
  // commit upstream only on a complete 6-digit hex.
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ opacity: 0.65, minWidth: 36 }}>{label}</span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: 28,
          height: 22,
          padding: 0,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
        }}
      />
      <input
        type="text"
        value={draft}
        onChange={(e) => {
          const next = e.target.value;
          setDraft(next);
          if (HEX_RE.test(next)) onChange(next);
        }}
        spellCheck={false}
        style={{
          flex: 1,
          minWidth: 0,
          padding: '3px 6px',
          background: 'color-mix(in srgb, var(--paper) 60%, transparent)',
          border: '1px solid color-mix(in srgb, var(--ink) 22%, transparent)',
          color: 'var(--ink)',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontStyle: 'normal',
          fontSize: 10,
          letterSpacing: 0,
          width: 80,
          outline: 'none',
        }}
      />
    </label>
  );
}
