import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/cn';

/** The padded content area every routed page renders into. */
export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('px-4 py-6 sm:px-6 lg:px-8', className)}>{children}</div>;
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-brame-dark dark:text-white">{title}</h1>
            {badges}
          </div>
          {subtitle && <div className="mt-1 max-w-3xl text-sm text-gray-500 dark:text-gray-400">{subtitle}</div>}
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
    </div>
  );
}

/** "← Back to …" above a detail page's title. */
export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brame-teal dark:text-gray-400 dark:hover:text-brame-turquoise-light"
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
    <div className={cn('mb-4 flex items-start justify-between gap-4', className)}>
      <div>
        <h2 className="text-base font-semibold text-brame-dark dark:text-gray-100">{children}</h2>
        {hint && <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{hint}</p>}
      </div>
      {action}
    </div>
  );
}
