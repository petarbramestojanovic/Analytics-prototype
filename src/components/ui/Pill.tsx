import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

const pillTones = {
  neutral: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300',
  teal: 'bg-brame-teal/10 text-brame-teal dark:bg-brame-teal/25 dark:text-brame-turquoise-light',
  lime: 'bg-brame-lime text-brame-dark dark:bg-brame-lime dark:text-brame-dark',
  amber: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  red: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  green: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300',
  purple: 'bg-brame-purple/10 text-brame-purple dark:bg-brame-purple/25 dark:text-brame-purple-light',
};

export type PillTone = keyof typeof pillTones;

export function Pill({
  children,
  tone = 'neutral',
  icon,
  title,
  className = '',
}: {
  children: ReactNode;
  tone?: PillTone;
  icon?: ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium',
        pillTones[tone],
        className
      )}
    >
      {icon}
      {children}
    </span>
  );
}
