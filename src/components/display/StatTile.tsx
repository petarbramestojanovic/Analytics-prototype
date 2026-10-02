import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Card, Tooltip } from '@/components/ui';

/**
 * The visual shell shared by every KPI-style tile — the compact
 * count/percentage callout (SummaryTile) and the larger
 * metric-with-tooltip card (campaigns' MetricTile) are the same shape at two
 * sizes.
 */
export function StatTile({
  label,
  value,
  tone = 'default',
  compact = false,
  footnote,
  className = '',
}: {
  label: ReactNode;
  value: ReactNode;
  tone?: 'default' | 'emphasis';
  compact?: boolean;
  footnote?: ReactNode;
  className?: string;
}) {
  if (compact) {
    return (
      <Card padded={false} className={cn('p-3', className)}>
        <div className="truncate text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {label}
        </div>
        <div className="tnum mt-0.5 text-xl font-bold text-brame-dark dark:text-white">{value}</div>
      </Card>
    );
  }
  return (
    <div
      className={cn(
        'rounded-xl border p-4',
        tone === 'emphasis'
          ? 'border-brame-teal/30 bg-brame-teal/5 dark:border-brame-teal/40 dark:bg-brame-teal/10'
          : 'border-gray-200 bg-white dark:border-white/10 dark:bg-brame-dark-light',
        className
      )}
    >
      <div className="flex min-h-8 items-start gap-1.5">{label}</div>
      <div className="tnum mt-1.5 text-2xl font-bold text-brame-dark dark:text-white">{value}</div>
      {footnote && <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{footnote}</div>}
    </div>
  );
}

/** The compact count/percentage callout used in every page's summary row,
 *  with an optional help tooltip next to the label. */
export function SummaryTile({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <StatTile
      label={
        hint ? (
          <span className="flex items-center gap-1 truncate">
            <span className="truncate">{label}</span>
            <Tooltip text={hint} />
          </span>
        ) : (
          label
        )
      }
      value={value}
      compact
      className={className}
    />
  );
}

const GRID_COLUMNS = {
  4: 'grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
} as const;

/** The responsive row summary tiles sit in at the top of a page. */
export function StatGrid({ columns = 4, children, className }: { columns?: keyof typeof GRID_COLUMNS; children: ReactNode; className?: string }) {
  return <div className={cn('mb-5 grid gap-4', GRID_COLUMNS[columns], className)}>{children}</div>;
}
