import { Radio, RefreshCw } from 'lucide-react';
import { useFormatters, useI18n } from '@/i18n';
import { YESTERDAY_ISO } from '@/lib/clock';
import { Pill } from '@/components/ui';
import type { Campaign, SourceKey } from '@/types';
import { sourceMeta } from '../lib/sources';

/**
 * Freshness is per-source, not per-page: the adserver is complete through
 * yesterday while our own beacon is live. Showing one "last updated" for the
 * whole screen would be a lie on at least one tab.
 */
export function FreshnessBar({
  campaign,
  source,
  onSyncNow,
  syncing,
}: {
  campaign: Campaign;
  source: SourceKey;
  onSyncNow?: () => void;
  syncing?: boolean;
}) {
  const { t } = useI18n();
  const { fmtDate, relativeTime } = useFormatters();
  const meta = sourceMeta(campaign, source);
  if (meta.connector === 'not_configured') return null;

  if (meta.cadence === 'live') {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <LivePill />
        <span>{t('source.liveBody', { time: relativeTime(meta.lastSyncedAt!) })}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
      <Pill tone="amber">{t('source.completeThrough', { date: fmtDate(YESTERDAY_ISO) })}</Pill>
      <span>{t('source.nightlyBody', { time: relativeTime(meta.lastSyncedAt!) })}</span>
      <button
        onClick={onSyncNow}
        disabled={syncing}
        className="inline-flex items-center gap-1 font-medium text-brame-teal hover:underline disabled:opacity-50 dark:text-brame-turquoise-light"
      >
        <RefreshCw size={11} className={syncing ? 'animate-spin' : ''} />
        {syncing ? t('source.syncing') : t('source.syncNow')}
      </button>
    </div>
  );
}

/** The green "Live" badge for a real-time source. */
export function LivePill({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <Pill tone="green" icon={<Radio size={10} />}>
      {label ?? t('source.live')}
    </Pill>
  );
}
