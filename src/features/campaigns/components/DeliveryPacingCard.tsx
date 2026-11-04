import { ArrowRight, CalendarDays, Info } from 'lucide-react';
import { useFormatters, useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import { fmtCompact, fmtPct } from '@/lib/format';
import { Card, Pill } from '@/components/ui';
import type { Campaign } from '@/types';
import { DELIVERY_HEALTH_BAR_CLASS, DELIVERY_HEALTH_TONE, deliveryPacing } from '../lib/delivery';
import { flightProgress } from '../lib/flight';
import { primarySeries } from '../lib/sources';
import { DeliveryTip } from './DeliveryTip';

/**
 * The first thing on a campaign: how much of the booking has been delivered
 * and whether that is on pace for the runtime elapsed. The big number is the
 * current status; the bar's colour (and the tick marking where it should be by
 * now) is the pace verdict from the backend. Flight dates and runtime sit
 * underneath, since the pace only means something against them.
 */
export function DeliveryPacingCard({
  campaign,
  className,
}: {
  campaign: Campaign;
  className?: string;
}) {
  const { t } = useI18n();
  const { fmtDateLong } = useFormatters();
  const pacing = deliveryPacing(campaign);
  const { health, expectedPacing } = campaign.delivery;
  const flight = flightProgress(campaign);
  const delivered = primarySeries(campaign)?.totals.impressions ?? 0;
  const booked = campaign.salesforce.bookedImpressions;

  // The numbers behind the pace: what is left and what it takes to finish.
  const daysElapsed =
    flight.state === 'running' ? flight.day : flight.state === 'ended' ? flight.totalDays : 0;
  const daysLeft = flight.state === 'running' ? flight.totalDays - flight.day : 0;
  const remaining = Math.max(booked - delivered, 0);
  const stats = [
    { label: t('detail.pacing.stat.delivered'), value: fmtCompact(delivered) },
    { label: t('detail.pacing.stat.booked'), value: fmtCompact(booked) },
    { label: t('detail.pacing.stat.remaining'), value: fmtCompact(remaining) },
    daysElapsed > 0 && {
      label: t('detail.pacing.stat.avgDaily'),
      value: fmtCompact(delivered / daysElapsed),
      sub:
        daysLeft > 0 && remaining > 0
          ? t('detail.pacing.stat.needed', { value: fmtCompact(remaining / daysLeft) })
          : undefined,
    },
  ].filter((x): x is { label: string; value: string; sub?: string } => !!x);

  const runtime =
    flight.state === 'running'
      ? t('detail.flight.running', {
          day: flight.day,
          total: flight.totalDays,
          pct: fmtPct(flight.pct, 0),
        })
      : flight.state === 'ended'
        ? t('detail.flight.ended', { total: flight.totalDays })
        : t('detail.flight.scheduled', { n: flight.startsInDays });

  return (
    <Card className={cn('flex flex-col justify-between gap-5', className)}>
      <div>
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            {t('detail.pacing.title')}
          </div>
          {health && (
            <Pill tone={DELIVERY_HEALTH_TONE[health]}>{t(`delivery.status.${health}`)}</Pill>
          )}
        </div>

        {pacing == null ? (
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            {t('detail.pacing.noDelivery')}
          </p>
        ) : (
          <>
            <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-1">
              <DeliveryTip
                pacing={pacing}
                health={health}
                expectedPacing={expectedPacing}
                side="bottom"
              >
                <span className="tnum text-5xl font-bold leading-none text-brame-dark dark:text-white">
                  {fmtPct(pacing, 0)}
                </span>
              </DeliveryTip>
              <div className="pb-1 text-sm text-gray-500 dark:text-gray-400">
                <div>{t('detail.pacing.deliveredOfBooked')}</div>
                <div className="tnum">
                  {t('detail.pacing.counts', {
                    delivered: fmtCompact(delivered),
                    booked: fmtCompact(booked),
                  })}
                </div>
              </div>
            </div>

            {/* The bar: fill = delivered share, tick = where it should be by now. */}
            <div className="relative mt-4">
              <div className="h-4 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    health ? DELIVERY_HEALTH_BAR_CLASS[health] : 'bg-brame-teal',
                  )}
                  style={{ width: `${Math.min(Math.max(pacing, 0), 1) * 100}%` }}
                />
              </div>
              {expectedPacing != null && (
                <div
                  className="absolute -top-1 bottom-[-4px] w-0.5 rounded bg-brame-dark/70 dark:bg-white/80"
                  style={{ left: `${Math.min(Math.max(expectedPacing, 0), 1) * 100}%` }}
                  title={t('delivery.expectedLabel')}
                />
              )}
            </div>
            {expectedPacing != null && (
              <div className="tnum mt-1.5 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <Info size={11} />
                {t('detail.pacing.expected', { pct: fmtPct(expectedPacing, 0) })}
              </div>
            )}
          </>
        )}
      </div>

      {pacing != null && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-gray-100 pt-4 sm:grid-cols-4 dark:border-white/10">
          {stats.map((st) => (
            <div key={st.label}>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                {st.label}
              </dt>
              <dd className="tnum mt-0.5 text-lg font-semibold text-brame-dark dark:text-white">
                {st.value}
              </dd>
              {st.sub && (
                <div className="tnum text-[11px] text-gray-400 dark:text-gray-500">{st.sub}</div>
              )}
            </div>
          ))}
        </dl>
      )}

      {/* A live campaign shows its timeline in the page header instead. */}
      {campaign.status !== 'live' && (
        <div className="space-y-2 border-t border-gray-100 pt-4 dark:border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-sm">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <CalendarDays size={15} className="text-brame-teal dark:text-brame-turquoise-light" />
              <span className="font-medium text-brame-dark dark:text-gray-100">
                {fmtDateLong(campaign.flightStart)}
              </span>
              <ArrowRight size={12} className="text-gray-300 dark:text-gray-600" />
              <span className="font-medium text-brame-dark dark:text-gray-100">
                {fmtDateLong(campaign.flightEnd)}
              </span>
            </div>
            <span className="tnum text-xs text-gray-500 dark:text-gray-400">{runtime}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-brame-teal/70"
              style={{ width: `${flight.pct * 100}%` }}
            />
          </div>
        </div>
      )}
    </Card>
  );
}
