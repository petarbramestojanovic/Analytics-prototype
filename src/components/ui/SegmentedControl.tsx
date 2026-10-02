import type { ReactNode } from 'react';
import { useSlidingIndicator } from '@/hooks/useSlidingIndicator';
import { cn } from '@/lib/cn';

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
}

/**
 * A tab-style toggle with a background pill that slides to the clicked option
 * instead of the selection just repainting in place. Works for flex or grid
 * tracks of any option count/width — the pill's position and size are
 * measured off the active button's own box, not hardcoded percentages.
 *
 * This is the unstyled engine: every class is the caller's. For the standard
 * gray-track look use `Tabs`; reach for this directly only for a genuinely
 * different surface (the teal sidebar switcher, the EN/DE pill).
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  groupLabel,
  className = '',
  indicatorClassName = '',
  itemClassName = '',
  activeItemClassName = '',
  inactiveItemClassName = '',
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly SegmentOption<T>[];
  groupLabel?: string;
  className?: string;
  indicatorClassName?: string;
  itemClassName?: string;
  activeItemClassName?: string;
  inactiveItemClassName?: string;
}) {
  const { trackRef, rect } = useSlidingIndicator(value, 'seg-value');

  return (
    <div ref={trackRef} role="group" aria-label={groupLabel} className={cn('relative', className)}>
      {rect && (
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute left-0 top-0 transition-[transform,width,height] duration-200 ease-out',
            indicatorClassName
          )}
          style={{ transform: `translate(${rect.left}px, ${rect.top}px)`, width: rect.width, height: rect.height }}
        />
      )}
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          data-seg-value={opt.value}
          aria-pressed={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn('relative z-10', itemClassName, value === opt.value ? activeItemClassName : inactiveItemClassName)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// bg-gray-200 (not gray-100) under the white pill keeps a real,
// mode-independent contrast step in light mode, rather than relying on a
// shadow alone to mark the active tab.
const TRACK = 'rounded-lg p-1 bg-gray-200 dark:bg-white/5';
const INDICATOR = 'rounded-md bg-white shadow-sm dark:bg-brame-dark-light';
const ACTIVE = 'text-brame-dark dark:text-white';
const INACTIVE = 'text-gray-500 hover:text-brame-dark dark:text-gray-400 dark:hover:text-gray-100';

const HEIGHT = { sm: 'h-9', md: 'h-10', lg: 'h-11' } as const;
const GRID_COLUMNS = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' } as const;

/**
 * The app's standard tabs — gray track, sliding white pill. Used for status
 * filters, view switchers, and dialog-level choices alike, so all of them
 * look like one component.
 *
 *   fill    — stretch to the container and share the width equally
 *   columns — lay options out on a grid instead (for labels that would
 *             otherwise not fit side by side)
 */
export function Tabs<T extends string>({
  value,
  onChange,
  options,
  groupLabel,
  size = 'md',
  fill = false,
  columns,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly SegmentOption<T>[];
  groupLabel?: string;
  size?: keyof typeof HEIGHT;
  fill?: boolean;
  columns?: keyof typeof GRID_COLUMNS;
  className?: string;
}) {
  const layout = columns
    ? cn('grid gap-1', GRID_COLUMNS[columns])
    : cn(fill ? 'flex' : 'inline-flex', 'items-center gap-1', HEIGHT[size]);
  const item = columns
    ? 'flex items-center justify-center gap-1.5 px-2 py-1.5'
    : cn('flex h-full items-center gap-1.5 px-3', fill && 'flex-1 justify-center');

  return (
    <SegmentedControl
      value={value}
      onChange={onChange}
      options={options}
      groupLabel={groupLabel}
      className={cn(TRACK, layout, className)}
      indicatorClassName={INDICATOR}
      itemClassName={cn(item, 'text-xs font-medium transition-colors')}
      activeItemClassName={ACTIVE}
      inactiveItemClassName={INACTIVE}
    />
  );
}
