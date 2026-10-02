import type { ReactNode } from 'react';
import { ShieldCheck, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/cn';

const TONES = {
  info: {
    box: 'border-brame-teal/20 bg-brame-teal/5 text-sm text-brame-dark dark:border-brame-turquoise/25 dark:bg-brame-teal/15 dark:text-gray-200',
    icon: <ShieldCheck size={16} className="mt-0.5 flex-shrink-0 text-brame-teal dark:text-brame-turquoise-light" />,
  },
  warning: {
    box: 'border-amber-200 bg-amber-50 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
    icon: <TriangleAlert size={14} className="mt-0.5 flex-shrink-0" />,
  },
} as const;

/** A highlighted note inside a page or card — an explanation (info) or
 *  something to double-check before trusting a number (warning). */
export function Callout({
  tone = 'info',
  icon,
  children,
  className,
}: {
  tone?: keyof typeof TONES;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start gap-2.5 rounded-lg border px-3 py-2.5', TONES[tone].box, className)}>
      {icon ?? TONES[tone].icon}
      <div>{children}</div>
    </div>
  );
}
