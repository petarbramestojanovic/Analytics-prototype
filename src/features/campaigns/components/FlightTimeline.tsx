import { CalendarDays } from 'lucide-react';
import { useFormatters, useI18n } from '@/i18n';
import { fmtPct } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { Campaign } from '@/types';
import { flightProgress } from '../lib/flight';

/** The flight at a glance, small enough to sit inline next to a campaign's
 *  name: its dates, a progress bar, and which day of the runtime it is. The
 *  bar takes whatever room the row has left, so in the page header it runs
 *  right up to the Setup button. */
export function FlightTimeline({
  campaign,
  className,
}: {
  campaign: Campaign;
  className?: string;
}) {
  const { t } = useI18n();
  const { fmtDateRange } = useFormatters();
  const flight = flightProgress(campaign);
  const status =
    flight.state === 'running'
      ? t('detail.flight.running', {
          day: flight.day,
          total: flight.totalDays,
          pct: fmtPct(flight.pct, 0),
        })
      : t('detail.flight.ended', { total: flight.totalDays });

  return (
    <div className={cn('flex min-w-60 flex-1 items-center gap-3 text-xs', className)}>
      <span className="inline-flex flex-shrink-0 items-center gap-1.5 font-medium text-gray-600 dark:text-gray-300">
        <CalendarDays size={13} className="text-brame-teal dark:text-brame-turquoise-light" />
        {fmtDateRange(campaign.flightStart, campaign.flightEnd)}
      </span>
      <span
        className="h-2 min-w-16 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10"
        title={status}
      >
        <span
          className="block h-full rounded-full bg-brame-teal"
          style={{ width: `${flight.pct * 100}%` }}
        />
      </span>
      <span className="tnum flex-shrink-0 text-gray-500 dark:text-gray-400">{status}</span>
    </div>
  );
}
