import { useLayoutEffect, useRef, useState } from 'react';

export interface IndicatorRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Measures the active option's own box inside a track element so a sliding
 * background indicator can be positioned against it — extracted from the
 * identical useRef/useLayoutEffect/ResizeObserver logic that SegmentedControl
 * and SourceSwitcher each hand-rolled. Each caller still renders its own
 * markup (button sizes/labels/icons differ too much to share); this only
 * shares the measurement.
 *
 * The active element is found via `[data-${attr}="<activeKey>"]` on a child
 * of the returned `trackRef`.
 */
export function useSlidingIndicator<T extends string>(activeKey: T, attr: string) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<IndicatorRect | null>(null);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const measure = () => {
      const el = track.querySelector<HTMLElement>(`[data-${attr}="${CSS.escape(activeKey)}"]`);
      if (!el) return;
      setRect({ left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, [activeKey, attr]);

  return { trackRef, rect };
}
