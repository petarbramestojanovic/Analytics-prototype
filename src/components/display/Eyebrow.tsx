import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** The small uppercase label above a card's headline value. */
export function Eyebrow({ icon, children, className }: { icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400',
        className
      )}
    >
      {icon}
      {children}
    </div>
  );
}
