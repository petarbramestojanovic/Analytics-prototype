import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** One small label/value pair inside a list card — put several in a `<dl>`. */
export function CardStat({
  label,
  children,
  valueClassName,
}: {
  label: ReactNode;
  children: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-xs text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className={cn('tnum mt-0.5 font-heading text-lg font-medium text-brame-dark dark:text-white', valueClassName)}>
        {children}
      </dd>
    </div>
  );
}
