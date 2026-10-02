import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/cn';

const VARIANTS = {
  /** Teal "Manage alerts →" style link. */
  action: 'inline-flex items-center gap-1 text-xs font-medium text-brame-teal hover:underline dark:text-brame-turquoise-light',
  /** A record name inside a table row that opens its detail page. */
  record:
    'font-medium text-brame-dark hover:text-brame-teal hover:underline dark:text-gray-100 dark:hover:text-brame-turquoise-light',
  /** Inline link inside running text (auth screens). */
  inline: 'font-medium text-brame-teal hover:underline dark:text-brame-turquoise-light',
} as const;

/** An in-app link in one of the app's link styles. `newTab` opens it in a new
 *  tab (used where the current page holds context worth keeping). */
export function TextLink({
  to,
  children,
  variant = 'action',
  arrow = variant === 'action',
  newTab = false,
  className,
}: {
  to: string;
  children: ReactNode;
  variant?: keyof typeof VARIANTS;
  arrow?: boolean;
  newTab?: boolean;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={cn(VARIANTS[variant], className)}
      {...(newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {children}
      {arrow && <ArrowRight size={11} />}
    </Link>
  );
}
