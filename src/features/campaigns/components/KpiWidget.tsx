import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Tooltip } from '@/components/ui';

/**
 * A headline number with, optionally, its relative figure small in the corner
 * (Impressions + Viewable, Engagements + Engagement Rate, CTR + Clicks) — one
 * widget per idea instead of two tiles that belong together.
 */
export function KpiWidget({
  label,
  help,
  value,
  secondary,
  footnote,
  emphasis = false,
  className,
}: {
  label: string;
  help?: string;
  value: ReactNode;
  secondary?: { label: string; value: ReactNode; help?: string };
  footnote?: string;
  emphasis?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border p-4',
        emphasis
          ? 'border-brame-teal/30 bg-brame-teal/5 dark:border-brame-teal/40 dark:bg-brame-teal/10'
          : 'border-gray-200 bg-white dark:border-white/10 dark:bg-brame-dark-light',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium uppercase leading-4 tracking-wide text-gray-500 dark:text-gray-400">
            {label}
          </span>
          {help && <Tooltip text={help} />}
        </div>
        {secondary && (
          <div className="flex-shrink-0 text-right" title={secondary.help}>
            <div className="text-[10px] font-medium uppercase leading-3 tracking-wide text-gray-400 dark:text-gray-500">
              {secondary.label}
            </div>
            <div className="tnum text-sm font-semibold text-brame-dark dark:text-gray-100">
              {secondary.value}
            </div>
          </div>
        )}
      </div>
      <div className="tnum mt-2 text-2xl font-bold text-brame-dark dark:text-white">{value}</div>
      {footnote && <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{footnote}</div>}
    </div>
  );
}
