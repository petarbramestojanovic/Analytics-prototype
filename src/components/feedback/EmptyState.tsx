import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Neutral empty state. Used wherever a connector is absent — the RFC is
 *  explicit that a missing source is blank, never a zero. */
export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50/60 px-6 py-14 text-center dark:border-white/15 dark:bg-white/5">
      <div className="mb-3 text-gray-300 dark:text-gray-600">{icon}</div>
      <h3 className="text-sm font-semibold text-brame-dark dark:text-gray-100">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** A one-line "nothing here" message inside a card or table area. */
export function EmptyText({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400', className)}>{children}</p>;
}
