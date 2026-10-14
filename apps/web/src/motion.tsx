import { useEffect, useState } from 'react';

export function BusyIndicator() {
  return <span className="busy-indicator" aria-hidden="true" />;
}

export function useDebouncedValue<T>(value: T, delay = 220) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return settled;
}

export function motionDelay(milliseconds: number) {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : milliseconds;
}
