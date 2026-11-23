import { Children, createContext, isValidElement, useContext, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { CARD_SURFACE, Tooltip } from '@/components/ui';

/** The first tile of a `StatGrid` is the row's lead: filled deep teal, lime label. */
const LeadTileContext = createContext(false);

/** What every tile shares: a card surface, or — as the lead — deep teal with
 *  white text (guide: white on deep teal). */
const SHELL = 'flex h-full flex-col rounded-2xl p-5';
const LEAD = 'border border-brame-teal bg-brame-teal text-white dark:border-brame-teal-light';

/**
 * The visual shell shared by every KPI-style tile: label top left, an optional
 * bare `icon` top right, the value, and a small `footnote` under it. The value
 * sits at the bottom, so tiles of different label length line up in a row.
 * `tone="emphasis"` — or being the first tile in a StatGrid — fills it deep teal.
 */
export function StatTile({
  label,
  value,
  tone = 'default',
  icon,
  footnote,
  className = '',
}: {
  label: ReactNode;
  value: ReactNode;
  tone?: 'default' | 'emphasis';
  icon?: ReactNode;
  footnote?: ReactNode;
  className?: string;
}) {
  const lead = useContext(LeadTileContext);
  const filled = tone === 'emphasis' || lead;

  return (
    <div data-primary={filled || undefined} className={cn(SHELL, filled ? LEAD : CARD_SURFACE, className)}>
      <div className="flex items-start justify-between gap-3">
        <div className={cn('min-w-0 text-sm font-medium', filled ? 'text-brame-lime' : 'text-gray-500 dark:text-gray-400')}>
          {label}
        </div>
        {icon && (
          <span aria-hidden className={cn('shrink-0', filled ? 'text-brame-lime' : 'text-brame-teal dark:text-brame-lime')}>
            {icon}
          </span>
        )}
      </div>
      <div
        className={cn(
          'tnum mt-auto pt-3 font-heading text-2xl font-medium tracking-tight',
          filled ? 'text-white' : 'text-brame-dark dark:text-white',
        )}
      >
        {value}
      </div>
      {footnote && (
        <div className={cn('mt-0.5 text-xs', filled ? 'text-white/75' : 'text-gray-500 dark:text-gray-400')}>
          {footnote}
        </div>
      )}
    </div>
  );
}

/** A tile with an optional help tooltip next to the label. */
export function SummaryTile({
  label,
  value,
  hint,
  icon,
  footnote,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  footnote?: ReactNode;
  className?: string;
}) {
  return (
    <StatTile
      label={
        hint ? (
          <span className="flex items-center gap-1">
            {label}
            <Tooltip text={hint} />
          </span>
        ) : (
          label
        )
      }
      value={value}
      icon={icon}
      footnote={footnote}
      className={className}
    />
  );
}

/** Columns per tile count. A last tile that would sit alone (or short of a
 *  full row) stretches across the gap, so a row never ends half empty. */
const GRID_COLUMNS = {
  4: 'grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-2 md:grid-cols-3 xl:grid-cols-5 md:max-xl:[&>*:last-child:nth-child(3n+2)]:col-span-2',
  6: 'grid-cols-2 md:grid-cols-3 xl:grid-cols-6',
  7: 'grid-cols-2 md:grid-cols-4 2xl:grid-cols-7 md:max-2xl:[&>*:last-child:nth-child(4n+3)]:col-span-2',
} as const;

/** The responsive row summary tiles sit in at the top of a page. Its first
 *  tile is the lead: the one filled with deep teal. */
export function StatGrid({ columns = 4, children, className }: { columns?: keyof typeof GRID_COLUMNS; children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'mb-6 grid gap-4 max-md:[&>*:last-child:nth-child(odd)]:col-span-2',
        GRID_COLUMNS[columns],
        className
      )}
    >
      {Children.toArray(children).map((child, i) => (
        <LeadTileContext.Provider key={isValidElement(child) ? child.key : i} value={i === 0}>
          {child}
        </LeadTileContext.Provider>
      ))}
    </div>
  );
}
