import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';

/** What counts as "inside" the sheet even though it sits elsewhere in the DOM:
 *  calendars and dropdowns opened from a field render in their own portals,
 *  and the toggle button that opens the sheet handles its own click. */
const INSIDE =
  '[data-filter-sheet], [role="dialog"], [role="listbox"], [role="menu"], [data-radix-popper-content-wrapper], [data-filter-toggle]';

/**
 * A filter tray that slides in from the right edge over the page. It floats
 * above the content, so opening it never changes the list's width, and it has
 * no scrim, so the list stays visible and clickable and narrows live as
 * filters change. Always mounted (so the slide plays both ways and field state
 * survives a close); while shut it is inert and invisible. Closes with its X
 * button, Escape, or a click anywhere outside it.
 */
export function FilterSheet({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { t } = useI18n();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      // While a dropdown is open, Radix turns off pointer events on the whole
      // page, so every click — even one inside this sheet — lands on <html>.
      // That click only dismisses the dropdown; it must not close the sheet.
      if (document.body.style.pointerEvents === 'none') return;
      // composedPath, not target: a control re-rendered by this very click
      // (a clear button, a calendar day) is already detached when we run.
      const inside = e.composedPath().some((n) => n instanceof Element && n.matches(INSIDE));
      if (!inside) onClose();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      // Escape closes an open dropdown or calendar first, not the whole sheet.
      if (e.key === 'Escape' && !document.querySelector('[role="listbox"], [role="menu"], [role="dialog"]'))
        onClose();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  return (
    <aside
      data-filter-sheet
      aria-label={title}
      aria-hidden={!open}
      inert={!open}
      className={cn(
        'fixed inset-y-0 right-0 z-30 flex w-[min(22rem,100vw)] flex-col border-l border-gray-200 bg-white will-change-transform dark:border-white/10 dark:bg-brame-dark-light',
        // Tailwind's translate-* sets the `translate` property, not
        // `transform`. Visibility rides the same transition: it flips at the
        // start of the slide-in and the end of the slide-out.
        'transition-[translate,box-shadow,visibility] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none',
        open ? 'visible translate-x-0 shadow-2xl' : 'invisible translate-x-full shadow-none',
      )}
    >
      <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-white/10">
        <h2 className="text-base font-semibold text-brame-dark dark:text-gray-100">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-white/10 dark:hover:text-gray-300"
        >
          <X size={16} />
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">{children}</div>
      {footer && (
        <div className="flex flex-shrink-0 items-center justify-between gap-2 border-t border-gray-200 px-5 py-3 dark:border-white/10">
          {footer}
        </div>
      )}
    </aside>
  );
}
