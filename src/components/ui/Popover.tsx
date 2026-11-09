import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';

const MARGIN = 8;

/**
 * A panel that opens under its trigger and closes on outside click or Escape.
 * Unlike a dropdown menu it can hold any content (chips, inputs, a calendar),
 * so it stays open while you interact inside it; `children` receives `close`
 * for the controls that should dismiss it.
 *
 * The panel is portalled to <body> and positioned against the trigger, so it
 * is never clipped by an `overflow-hidden` ancestor (a collapsing filter
 * panel, a card) and is kept inside the viewport.
 */
export function Popover({
  trigger,
  children,
  align = 'start',
  className,
  rootClassName,
}: {
  trigger: (state: { open: boolean; toggle: () => void }) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: 'start' | 'end';
  className?: string;
  /** Classes for the wrapper around the trigger (e.g. `max-w-full` so a wide
   *  trigger shrinks on a narrow screen instead of overflowing its row). */
  rootClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const place = () => {
    const root = rootRef.current;
    const panel = panelRef.current;
    if (!root || !panel) return;
    const rect = root.getBoundingClientRect();
    const width = panel.offsetWidth;
    const wanted = align === 'end' ? rect.right - width : rect.left;
    const left = Math.max(MARGIN, Math.min(wanted, window.innerWidth - width - MARGIN));
    // Under the trigger — unless that runs off the bottom of the window and
    // there is room above, as when the trigger is in the last card of a page.
    const below = rect.bottom + MARGIN;
    const height = panel.offsetHeight;
    const top =
      below + height > window.innerHeight - MARGIN && rect.top - MARGIN - height >= MARGIN
        ? rect.top - MARGIN - height
        : below;
    setPos((prev) => (prev && prev.top === top && prev.left === left ? prev : { top, left }));
  };

  // Measure before paint so the panel never flashes in the wrong spot.
  useLayoutEffect(() => {
    if (!open) return setPos(null);
    // Follow the trigger every frame: it can move under an open panel (a
    // collapsing filter tray animating, a scroll, a resize), and a stale
    // position would leave the panel floating away from it.
    let frame = 0;
    const follow = () => {
      place();
      frame = requestAnimationFrame(follow);
    };
    follow();
    return () => cancelAnimationFrame(frame);
    // `place` only reads refs and `align`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      // While a dropdown is open Radix disables pointer events page-wide, so
      // every click lands on <html>; it only dismisses the dropdown.
      if (document.body.style.pointerEvents === 'none') return;
      // A Radix dropdown opened from inside the panel renders in its own
      // portal; clicking its options is not an outside click. composedPath
      // keeps working for a target the click itself removed from the DOM.
      const inside = e.composedPath().some(
        (n) =>
          n instanceof Element &&
          (n === rootRef.current || n === panelRef.current || n.matches('[data-radix-popper-content-wrapper]'))
      );
      if (!inside) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      // Escape closes an open dropdown first, not the whole panel.
      if (e.key === 'Escape' && !document.querySelector('[role="listbox"], [role="menu"]')) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const panel = open && (
    <div
      ref={panelRef}
      role="dialog"
      style={pos ? { top: pos.top, left: pos.left } : { top: 0, left: 0, visibility: 'hidden' }}
      className={cn(
        'fixed z-[45] w-[min(26rem,calc(100vw-1rem))] rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-brame-dark-light',
        className,
      )}
    >
      {children(() => setOpen(false))}
    </div>
  );

  return (
    <div ref={rootRef} className={cn('relative', rootClassName)}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && createPortal(panel, document.body)}
    </div>
  );
}
