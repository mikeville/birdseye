import { useRef, useState } from 'react';
import { geocodeLocation } from './geocode';

// Inline place-name search. Submits to Nominatim on Enter; on success
// clears the field and calls onResolved. On no-match shows a brief
// "Not found" beside the input and keeps the query so the user can edit.
type Status = 'idle' | 'searching' | 'notFound';

export function LocationSearch({
  onResolved,
}: {
  onResolved: (loc: { lat: number; lon: number }) => void;
}) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const abortRef = useRef<AbortController | null>(null);
  const notFoundTimerRef = useRef<number | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || status === 'searching') return;

    // Cancel any in-flight request so rapid resubmits don't race.
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    if (notFoundTimerRef.current != null) {
      clearTimeout(notFoundTimerRef.current);
      notFoundTimerRef.current = null;
    }

    setStatus('searching');
    const result = await geocodeLocation(trimmed, ctrl.signal);
    if (ctrl.signal.aborted) return;

    if (result) {
      onResolved({ lat: result.lat, lon: result.lon });
      setQuery('');
      setStatus('idle');
    } else {
      setStatus('notFound');
      notFoundTimerRef.current = window.setTimeout(() => {
        setStatus('idle');
        notFoundTimerRef.current = null;
      }, 2500);
    }
  };

  return (
    <form
      className="location-search"
      onSubmit={onSubmit}
      role="search"
    >
      <input
        type="search"
        className="location-search-input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Where to?"
        aria-label="Search for a place"
        disabled={status === 'searching'}
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />
      <span
        className="location-search-status"
        aria-live="polite"
        data-visible={status === 'notFound'}
      >
        Not found
      </span>
    </form>
  );
}
