import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * A button that "does something" for a moment — a manual sync or a run-now
 * in a prototype with no backend to call. Returns whether it is running and
 * the function that starts it.
 */
export function useSimulatedAction(durationMs = 1400): [running: boolean, run: () => void] {
  const [running, setRunning] = useState(false);
  const timer = useRef<number>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const run = useCallback(() => {
    setRunning(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setRunning(false), durationMs);
  }, [durationMs]);

  return [running, run];
}
