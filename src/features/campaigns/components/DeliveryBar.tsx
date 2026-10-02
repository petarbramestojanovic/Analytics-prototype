import { useI18n } from '@/i18n';
import { EMPTY_VALUE, fmtPct } from '@/lib/format';
import { cn } from '@/lib/cn';
import { ProgressBar } from '@/components/ui';
import { DELIVERY_HEALTH_BAR_CLASS, deliveryHealth } from '../lib/delivery';

/** Delivered-vs-booked as a coloured bar, with or without the percentage
 *  next to it. Every place delivery pacing is shown uses this. */
export function DeliveryBar({
  pacing,
  align = 'end',
  showValue = true,
  className,
}: {
  pacing: number | null;
  align?: 'center' | 'end';
  showValue?: boolean;
  className?: string;
}) {
  const { t } = useI18n();
  const health = deliveryHealth(pacing);
  if (pacing == null || health == null) return showValue ? <span>{EMPTY_VALUE}</span> : null;

  const bar = (
    <ProgressBar
      value={pacing}
      size="sm"
      barClassName={DELIVERY_HEALTH_BAR_CLASS[health]}
      title={t(`delivery.health.${health}`)}
      className={cn(showValue && 'w-14', className)}
    />
  );
  if (!showValue) return bar;

  return (
    <div className={cn('flex items-center gap-2', align === 'center' ? 'justify-center' : 'justify-end')}>
      {bar}
      <span className="tnum w-10 text-left text-xs text-gray-500 dark:text-gray-400">{fmtPct(pacing, 0)}</span>
    </div>
  );
}
