import { useEffect, useState } from "react";

/**
 * A countdown in whole seconds, e.g. for "Try again in 25s". Reads the clock
 * rather than counting ticks, so a throttled background tab stays accurate.
 */
export function useCountdown() {
  const [endsAt, setEndsAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const remainingMs = Math.max(endsAt - now, 0);
  const isRunning = remainingMs > 0;

  useEffect(() => {
    if (!isRunning) return;
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, [isRunning]);

  const start = (seconds: number) => {
    const at = Date.now();
    setNow(at);
    setEndsAt(at + seconds * 1000);
  };

  return {
    /** Whole seconds left, rounded up; 0 when finished. */
    remainingSeconds: Math.ceil(remainingMs / 1000),
    start,
  };
}
