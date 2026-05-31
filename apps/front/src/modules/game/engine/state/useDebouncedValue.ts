import { useEffect, useState } from "react";

/**
 * Returns `value` delayed until it has held steady for `delayMs`. Each change
 * schedules a trailing update and cancels the previous pending one, so a burst
 * of rapid changes (e.g. scrolling through beatmaps) collapses into a single
 * update once the input settles. Use to gate expensive work keyed off a
 * fast-changing value — here, the focused beatmap's audio preview + background
 * crossfade — so it fires once instead of per intermediate step.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
