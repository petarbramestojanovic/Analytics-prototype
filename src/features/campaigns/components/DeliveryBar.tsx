import { EMPTY_VALUE, fmtPct } from '@/lib/format';
import { cn } from '@/lib/cn';
import { ProgressBar } from '@/components/ui';
import type { DeliveryHealth } from '@/types';
import { DELIVERY_HEALTH_BAR_CLASS } from '../lib/delivery';
import { DeliveryTip } from './DeliveryTip';

/** Delivered-vs-booked as a bar, with or without the percentage next to it.
 *  The fill is the current status (`pacing`); the colour is the backend's
 *  pacing-vs-runtime read (`health`) — grey when it has none yet. Hovering
 *  explains both. Every place delivery is shown uses this. */
export function DeliveryBar({
  pacing,
  health,
  expectedPacing = null,
  align = 'end',
  showValue = true,
  className,
}: {
  pacing: number | null;
  health: DeliveryHealth | null;
  /** Where delivery should be by now, for the tooltip. */
  expectedPacing?: number | null;
  align?: 'center' | 'end';
  showValue?: boolean;
  className?: string;
}) {
  if (pacing == null) return showValue ? <span>{EMPTY_VALUE}</span> : null;

  const bar = (
    <ProgressBar
      value={pacing}
      size="sm"
      barClassName={health ? DELIVERY_HEALTH_BAR_CLASS[health] : 'bg-gray-400 dark:bg-gray-500'}
      className={cn(showValue && 'w-10', !showValue && 'w-full')}
    />
  );

  if (!showValue) {
    return (
      <DeliveryTip pacing={pacing} health={health} expectedPacing={expectedPacing} className={cn('flex w-full', className)}>
        {bar}
      </DeliveryTip>
    );
  }

  return (
    <div className={cn('flex', align === 'center' ? 'justify-center' : 'justify-end')}>
      <DeliveryTip pacing={pacing} health={health} expectedPacing={expectedPacing} className="items-center gap-1.5">
        {bar}
        <span className="tnum w-9 text-left text-xs text-gray-500 dark:text-gray-400">{fmtPct(pacing, 0)}</span>
      </DeliveryTip>
    </div>
  );
}
