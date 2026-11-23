import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * The padded content area every routed page renders into. `fill` makes it a
 * column at least as tall as the viewport, so a page can let its last card
 * (`flex-1`) stretch to the bottom edge instead of leaving blank space under
 * it. Taller content still grows the page and scrolls as usual.
 */
export function Page({ children, className, fill = false }: { children: ReactNode; className?: string; fill?: boolean }) {
  return <div className={cn('px-4 pb-8 pt-6 sm:px-6 lg:px-8', fill && 'flex flex-1 flex-col', className)}>{children}</div>;
}

/**
 * A page's title block: optional back link, the title with any badges next
 * to it, a subtitle line, and page-level actions on the right.
 */
export function PageHeader({
  title,
  subtitle,
  badges,
  actions,
  back,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  badges?: ReactNode;
  actions?: ReactNode;
  back?: { to: string; label: string };
  className?: string;
}) {
  return (
    <div className={cn('mb-6', className)}>
      {back && <BackLink to={back.to}>{back.label}</BackLink>}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-medium text-brame-dark dark:text-white">{title}</h1>
            {badges}
          </div>
          {subtitle && <div className="mt-1.5 max-w-3xl text-base text-gray-500 dark:text-gray-400">{subtitle}</div>}
        </div>
        {actions && <div className="flex w-full min-w-0 items-center gap-3 sm:w-auto sm:max-w-full">{actions}</div>}
      </div>
    </div>
  );
}

/** "← Back to …" above a detail page's title. */
function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brame-teal dark:text-gray-400 dark:hover:text-brame-lime"
    >
      <ArrowLeft size={14} />
      {children}
    </Link>
  );
}

/** A section heading inside a padded Card, with optional hint and action. */
export function SectionTitle({
  children,
  hint,
  action,
  className,
}: {
  children: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-5 flex flex-wrap items-start justify-between gap-x-4 gap-y-2', className)}>
      <div className="min-w-0">
        <h2 className="text-lg font-medium text-brame-dark dark:text-gray-100">{children}</h2>
        {hint && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{hint}</p>}
      </div>
      {action}
    </div>
  );
}
