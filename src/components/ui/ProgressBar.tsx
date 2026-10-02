import { cn } from '@/lib/cn';

const SIZES = {
  sm: 'h-1.5 bg-gray-200 dark:bg-white/10',
  md: 'h-2 bg-gray-100 dark:bg-white/10',
  lg: 'h-3 bg-gray-100 dark:bg-white/10',
} as const;

/**
 * A horizontal fill bar — delivery pacing, funnel steps, coverage,
 * percentiles. `value` is a 0–1 fraction (clamped); `barClassName` sets the
 * fill colour.
 */
export function ProgressBar({
  value,
  size = 'md',
  barClassName = 'bg-brame-teal',
  title,
  className,
}: {
  value: number;
  size?: keyof typeof SIZES;
  barClassName?: string;
  title?: string;
  className?: string;
}) {
  const pct = Math.min(Math.max(value, 0), 1) * 100;
  return (
    <div className={cn('overflow-hidden rounded-full', SIZES[size], className)}>
      <div className={cn('h-full rounded-full transition-all', barClassName)} style={{ width: `${pct}%` }} title={title} />
    </div>
  );
}
