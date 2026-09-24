import { useEffect, useRef, useState } from 'react';

const TICK_MS = 1000;

/** Renders whole seconds as `3s ago` / `2m 5s ago`. */
export function formatAge(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s ago`;
  }
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s ago`;
}

/**
 * Seconds elapsed since `value` last changed (by identity), ticking locally off
 * a 1s timer. Deliberately client-side: the freshness readout describes how
 * stale the data on screen is, so it must not be read from an API payload.
 */
export function useFreshness(value: unknown): number {
  const anchorRef = useRef(Date.now());
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    anchorRef.current = Date.now();
    setSeconds(0);
  }, [value]);

  useEffect(() => {
    const id = setInterval(() => {
      setSeconds(Math.floor((Date.now() - anchorRef.current) / 1000));
    }, TICK_MS);

    return () => clearInterval(id);
  }, []);

  return seconds;
}
