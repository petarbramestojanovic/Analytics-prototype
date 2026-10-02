import { useFormatters, useI18n } from '@/i18n';
import { YESTERDAY_ISO } from '@/lib/clock';
import { EMPTY_VALUE } from '@/lib/format';
import { Pill } from '@/components/ui';
import type { Campaign } from '@/types';
import { LivePill } from '../../components/FreshnessBar';
import { deviceSplit } from '../../lib/devices';
import { primarySeries, sourceMeta } from '../../lib/sources';

/** Whether the primary source is live or complete through a date. */
export function FreshnessCell({ campaign }: { campaign: Campaign }) {
  const { t } = useI18n();
  const { fmtDate } = useFormatters();
  if (!primarySeries(campaign)) return <span className="text-xs text-gray-400 dark:text-gray-500">{EMPTY_VALUE}</span>;
  if (sourceMeta(campaign, campaign.primarySource).cadence === 'live') return <LivePill />;
  const through = campaign.flightEnd < YESTERDAY_ISO ? campaign.flightEnd : YESTERDAY_ISO;
  return <Pill tone="amber">{t('campaigns.freshnessThrough', { date: fmtDate(through) })}</Pill>;
}

/** Desktop/mobile share of delivered impressions, "62/38". */
export function DeviceSplitCell({ campaign }: { campaign: Campaign }) {
  const split = deviceSplit(campaign);
  if (!split) return <span>{EMPTY_VALUE}</span>;
  const desktopPct = Math.round(split.desktop * 100);
  return (
    <span className="tnum text-xs text-gray-500 dark:text-gray-400">
      {desktopPct}/{100 - desktopPct}
    </span>
  );
}
