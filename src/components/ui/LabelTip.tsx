import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type FocusEvent, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';

const GAP = 8;
const EDGE = 8;
const SHOW_DELAY_MS = 350;

type Side = 'top' | 'bottom' | 'right';
interface Placement {
  top: number;
  left: number;
  side: Side;
  /** Where the arrow sits along the tooltip's edge, in px. */
  arrow: number;
}

export interface LabelTipOptions {
  /** Preferred side; flips to the opposite one if there's no room. */
  side?: Side;
  /** A keyboard shortcut shown as a key cap, e.g. "⌘K". */
  shortcut?: string;
  /** A second, quieter line under the label. */
  detail?: string;
  disabled?: boolean;
}

/**
 * A small styled tooltip for an icon-only control, in place of the browser's
 * plain `title` popup. Mouse hover (after a short delay so it doesn't flash as
 * the pointer crosses the bar) and keyboard focus open it; a click, a tap,
 * scrolling or Escape close it. Touch never opens it: there is no hover, and
 * an icon someone has just tapped has already done its job.
 *
 * It is a hook, not a wrapper, so the control keeps its own element and layout:
 * spread `bind` on it, attach `ref`, and render `tip` next to it.
 */
export function useLabelTip<T extends HTMLElement>(label: string, { side = 'bottom', shortcut, detail, disabled }: LabelTipOptions = {}) {
  const id = useId();
  const ref = useRef<T>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number>(undefined);
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<Placement | null>(null);

  const close = useCallback(() => {
    window.clearTimeout(timer.current);
    setOpen(false);
  }, []);
  const openSoon = useCallback(
    (delay: number) => {
      if (disabled) return;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setOpen(true), delay);
    },
    [disabled]
  );

  useEffect(() => () => window.clearTimeout(timer.current), []);

  useLayoutEffect(() => {
    const trigger = ref.current;
    const tip = tipRef.current;
    if (!open || !trigger || !tip) {
      setPlacement(null);
      return;
    }
    const r = trigger.getBoundingClientRect();
    const { offsetWidth: w, offsetHeight: h } = tip;
    const fits = {
      top: r.top - GAP - h >= EDGE,
      bottom: r.bottom + GAP + h <= window.innerHeight - EDGE,
      right: r.right + GAP + w <= window.innerWidth - EDGE,
    };
    let resolved: Side = side;
    if (!fits[side]) resolved = side === 'top' ? 'bottom' : side === 'bottom' ? 'top' : 'bottom';
    const centreX = r.left + r.width / 2;
    if (resolved === 'right') {
      setPlacement({ side: resolved, left: r.right + GAP, top: r.top + r.height / 2 - h / 2, arrow: h / 2 });
      return;
    }
    const left = Math.min(Math.max(centreX - w / 2, EDGE), window.innerWidth - w - EDGE);
    setPlacement({
      side: resolved,
      left,
      top: resolved === 'top' ? r.top - GAP - h : r.bottom + GAP,
      arrow: Math.min(Math.max(centreX - left, 10), w - 10),
    });
  }, [open, side, label, detail, shortcut]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  const bind = {
    onPointerEnter: (e: PointerEvent) => e.pointerType === 'mouse' && openSoon(SHOW_DELAY_MS),
    onPointerLeave: close,
    onPointerDown: close,
    // Keyboard focus shows it at once; a mouse click's focus does not.
    onFocus: (e: FocusEvent<HTMLElement>) => e.currentTarget.matches(':focus-visible') && openSoon(0),
    onBlur: close,
  };

  const tip = open
    ? createPortal(
        <div
          ref={tipRef}
          id={id}
          role="tooltip"
          style={{
            top: placement?.top ?? 0,
            left: placement?.left ?? 0,
            visibility: placement ? 'visible' : 'hidden',
          }}
          className="pointer-events-none fixed z-[60] flex max-w-[16rem] items-center gap-2 rounded-md bg-white px-2.5 py-1.5 text-xs font-medium leading-tight text-brame-dark shadow-lg shadow-black/10 ring-1 ring-gray-200 dark:bg-[#1b1c1c] dark:text-gray-100 dark:shadow-black/50 dark:ring-white/15"
        >
          <span>
            {label}
            {detail && <span className="mt-0.5 block font-normal text-gray-500 dark:text-gray-400">{detail}</span>}
          </span>
          {shortcut && (
            <kbd className="rounded border border-gray-200 px-1 py-px font-sans text-[10px] font-semibold text-gray-500 dark:border-white/15 dark:text-gray-300">
              {shortcut}
            </kbd>
          )}
          {placement && (
            <span
              aria-hidden
              style={placement.side === 'right' ? { top: placement.arrow } : { left: placement.arrow }}
              className={cn(
                // The tooltip has a hairline ring in both themes, so the arrow carries
                // the same line on the two edges that stick out.
                'absolute h-2 w-2 rotate-45 border-gray-200 bg-white dark:border-white/15 dark:bg-[#1b1c1c]',
                placement.side === 'top' && '-bottom-1 -translate-x-1/2 border-b border-r',
                placement.side === 'bottom' && '-top-1 -translate-x-1/2 border-l border-t',
                placement.side === 'right' && '-left-1 -translate-y-1/2 border-b border-l'
              )}
            />
          )}
        </div>,
        document.body
      )
    : null;

  return { ref, bind, tip, describedBy: open ? id : undefined };
}

/** Runs the control's own handler first, then the tooltip's — for a control
 *  that other code (a Radix trigger) also hands handlers to. */
export function composeBind<E extends HTMLElement>(
  own: Partial<Record<'onPointerEnter' | 'onPointerLeave' | 'onPointerDown' | 'onFocus' | 'onBlur', (e: never) => void>>,
  bind: ReturnType<typeof useLabelTip<E>>['bind']
) {
  const call = (name: keyof typeof bind) => (e: never) => {
    (own[name] as ((e: never) => void) | undefined)?.(e);
    (bind[name] as (e: never) => void)(e);
  };
  return {
    onPointerEnter: call('onPointerEnter'),
    onPointerLeave: call('onPointerLeave'),
    onPointerDown: call('onPointerDown'),
    onFocus: call('onFocus'),
    onBlur: call('onBlur'),
  };
}
