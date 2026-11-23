import { useEffect, useState } from 'react';

/**
 * Infinite scroll for a list that is already in memory: `visible` is how many
 * rows to show, and it grows by `step` each time the element given to
 * `sentinelRef` scrolls into view (a little early, so the next rows are there
 * before the end is reached). Render the sentinel only while there is more to
 * show. `resetKey` — the filters and sort — starts the list over from the top
 * when it changes.
 */
export function useInfiniteScroll(resetKey: unknown, step = 20) {
  const [visible, setVisible] = useState(step);
  const [seenKey, setSeenKey] = useState(resetKey);
  const [node, setNode] = useState<HTMLElement | null>(null);

  // Reset while rendering, not in an effect: no frame paints the old, long list.
  if (!Object.is(seenKey, resetKey)) {
    setSeenKey(resetKey);
    setVisible(step);
  }

  useEffect(() => {
    if (!node) return;
    // Re-observed after every load: a sentinel that is still in view fires again.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setVisible((v) => v + step);
      },
      { rootMargin: '0px 0px 400px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, visible, step]);

  return { visible, sentinelRef: setNode };
}
