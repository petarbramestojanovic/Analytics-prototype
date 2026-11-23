import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** The surface every panel sits on — exported for the few things that are cards
 *  in their own right (a tile, a list item) but need another element or padding. */
export const CARD_SURFACE =
  'rounded-2xl border border-gray-200 bg-white shadow-[0_2px_10px_rgba(40,41,41,0.05)] dark:border-white/10 dark:bg-brame-dark-light dark:shadow-none';

/** A card that is itself a link: a hover border and a focus ring. */
export const CARD_LINK = `${CARD_SURFACE} transition-colors hover:border-brame-teal/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brame-teal/50 dark:hover:border-brame-lime/40`;

/** The one surface every panel in the app sits on. */
export function Card({
  children,
  className = '',
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={cn(CARD_SURFACE, padded && 'p-6', className)}
    >
      {children}
    </div>
  );
}

/**
 * A `padded={false}` card's title strip — title, optional hint and badges on
 * the left, actions on the right, a divider underneath. For a title inside a
 * padded card, use `SectionTitle` instead.
 */
export function CardHeader({
  title,
  hint,
  badges,
  actions,
  className,
}: {
  title: ReactNode;
  hint?: ReactNode;
  badges?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-6 dark:border-white/10',
        className
      )}
    >
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-medium text-brame-dark dark:text-gray-100">{title}</h2>
          {badges}
        </div>
        {hint && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{hint}</p>}
      </div>
      {actions}
    </div>
  );
}

/** A card's bottom strip — pagination, totals, footnotes. */
export function CardFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mt-auto border-t border-gray-200 px-6 py-3.5 dark:border-white/10', className)}>{children}</div>;
}
