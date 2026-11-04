import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';

const WIDTH = 256;
const GAP = 10;
const EDGE = 8;

type Placement = { top: number; left: number; arrowLeft: number; side: 'top' | 'bottom' };

/**
 * A rich tooltip card around any trigger. Opens on hover, keyboard focus and
 * tap (touch has no hover). Portalled with fixed positioning, so it is never
 * clipped by a scrolling table or card; it flips to the other side when
 * there's no room, stays inside the viewport, and closes on scroll rather
 * than chasing its trigger. `content` is free-form — see TipTitle/TipText.
 *
 * The surface is white with a hairline border in light mode and the darkest
 * brand tone with a light ring in dark mode, so it reads against both the
 * page and the cards beneath it.
 */
export function FloatingTip({
  content,
  children,
  side = 'top',
  focusable = false,
  className,
}: {
  content: ReactNode;
  children: ReactNode;
  /** Preferred side; flips if it doesn't fit. */
  side?: 'top' | 'bottom';
  /** Make the wrapper itself a tab stop — for triggers that aren't already
   *  focusable (a bar, a pill). Leave off when `children` is a button. */
  focusable?: boolean;
  className?: string;
}) {
  const id = useId();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const open = hovered || focused || pinned;

  useLayoutEffect(() => {
    const trigger = triggerRef.current;
    const tip = tipRef.current;
    if (!open || !trigger || !tip) {
      setPlacement(null);
      return;
    }
    const r = trigger.getBoundingClientRect();
    const { offsetWidth: w, offsetHeight: h } = tip;
    const fitsAbove = r.top - GAP - h >= EDGE;
    const fitsBelow = r.bottom + GAP + h <= window.innerHeight - EDGE;
    const resolved = side === 'top' ? (fitsAbove || !fitsBelow ? 'top' : 'bottom') : fitsBelow || !fitsAbove ? 'bottom' : 'top';
    const centre = r.left + r.width / 2;
    const left = Math.min(Math.max(centre - w / 2, EDGE), window.innerWidth - w - EDGE);
    setPlacement({
      side: resolved,
      left,
      top: resolved === 'top' ? r.top - GAP - h : r.bottom + GAP,
      arrowLeft: Math.min(Math.max(centre - left, 14), w - 14),
    });
  }, [open, side, content]);

  useEffect(() => {
    if (!open) return;
    const close = () => {
      setHovered(false);
      setFocused(false);
      setPinned(false);
    };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  return (
    <>
      <span
        ref={triggerRef}
        tabIndex={focusable ? 0 : undefined}
        aria-describedby={open ? id : undefined}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          setPinned(false);
        }}
        onClick={() => setPinned((p) => !p)}
        onKeyDown={(e) => e.key === 'Escape' && setPinned(false)}
        className={cn('inline-flex rounded', focusable && 'outline-none focus-visible:ring-2 focus-visible:ring-brame-teal/50', className)}
      >
        {children}
      </span>
      {open &&
        createPortal(
          <div
            ref={tipRef}
            id={id}
            role="tooltip"
            style={{ top: placement?.top ?? 0, left: placement?.left ?? 0, width: WIDTH, visibility: placement ? 'visible' : 'hidden' }}
            className="pointer-events-none fixed z-50 rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-left text-xs font-normal normal-case leading-snug tracking-normal text-gray-600 shadow-xl shadow-black/10 dark:border-white/15 dark:bg-brame-dark dark:text-gray-300 dark:shadow-black/50"
          >
            {content}
            {placement && (
              <span
                aria-hidden
                style={{ left: placement.arrowLeft }}
                className={cn(
                  'absolute h-2 w-2 -translate-x-1/2 rotate-45 border-gray-200 bg-white dark:border-white/15 dark:bg-brame-dark',
                  placement.side === 'top' ? '-bottom-1 border-b border-r' : '-top-1 border-l border-t'
                )}
              />
            )}
          </div>,
          document.body
        )}
    </>
  );
}

/** The bold first line of a FloatingTip. */
export function TipTitle({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-2 text-[13px] font-semibold text-brame-dark dark:text-white">{children}</div>;
}

/** A body paragraph in a FloatingTip. */
export function TipText({ children }: { children: ReactNode }) {
  return <p className="mt-1">{children}</p>;
}

/** A label / value row in a FloatingTip (e.g. "Delivered — 58%"). */
export function TipRow({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-gray-100 py-1.5 first:mt-2 dark:border-white/10">
      <span>{label}</span>
      <span className="tnum font-semibold text-brame-dark dark:text-white">{value}</span>
    </div>
  );
}
