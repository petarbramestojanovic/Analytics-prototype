import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

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
      className={cn(
        'rounded-xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-brame-dark-light dark:shadow-none',
        padded && 'p-5',
        className
      )}
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
        'flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-5 dark:border-white/10',
        className
      )}
    >
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-brame-dark dark:text-gray-100">{title}</h2>
          {badges}
        </div>
        {hint && <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{hint}</p>}
      </div>
      {actions}
    </div>
  );
}

/** A card's bottom strip — pagination, totals, footnotes. */
export function CardFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('border-t border-gray-200 px-4 py-3 dark:border-white/10', className)}>{children}</div>;
}
