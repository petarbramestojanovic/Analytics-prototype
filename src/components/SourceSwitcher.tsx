import { Radio, RefreshCw, Rows3, Star, Unplug } from 'lucide-react';
import type { Campaign, SourceKey } from '../mock/types';
import { YESTERDAY_ISO, sourceMeta } from '../mock/data';
import { useI18n, useFormatters } from '../lib/i18n';
import { Pill } from './primitives';

export type SourceTab = SourceKey | 'compare';

/**
 * RFC §4 rule 3 made visible. The headline belongs to exactly one source; the
 * others are checks you switch into. Nothing here adds two sources together,
 * and the tab strip is deliberately the loudest thing on the page so nobody
 * reads a number without knowing who counted it.
 */
export default function SourceSwitcher({
  campaign,
  active,
  onChange,
}: {
  campaign: Campaign;
  active: SourceTab;
  onChange: (t: SourceTab) => void;
}) {
  const { t } = useI18n();
  const order: SourceKey[] = [
    campaign.primarySource,
    ...(['atk', 'nexd', 'custom'] as SourceKey[]).filter((s) => s !== campaign.primarySource),
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {order.map((key) => {
        const meta = sourceMeta(campaign, key);
        const isPrimary = key === campaign.primarySource;
        const isActive = active === key;
        const missing = meta.connector === 'not_configured';

        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            aria-pressed={isActive}
            aria-label={`${meta.fullLabel}${isPrimary ? ` — ${t('source.primarySource')}` : ` — ${t('source.check')}`}${
              missing ? `, ${t('source.noConnector')}` : ''
            }`}
            className={`group flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition-all ${
              isActive
                ? 'border-brame-teal bg-brame-teal text-white shadow-sm'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-white/10 dark:bg-brame-dark-light dark:hover:border-white/20 dark:hover:bg-white/5'
            }`}
          >
            <div>
              <div className="flex items-center gap-1.5">
                {isPrimary && (
                  <Star
                    size={12}
                    className={isActive ? 'text-brame-lime' : 'text-brame-teal'}
                    fill="currentColor"
                  />
                )}
                <span
                  className={`text-sm font-semibold ${
                    isActive ? 'text-white' : 'text-brame-dark dark:text-gray-100'
                  }`}
                >
                  {meta.label}
                </span>
                {missing && (
                  <Unplug size={12} className={isActive ? 'text-white/70' : 'text-gray-400 dark:text-gray-500'} />
                )}
              </div>
              <div
                className={`mt-0.5 text-[11px] ${
                  isActive ? 'text-white/75' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {missing ? t('source.noConnector') : isPrimary ? t('source.primarySource') : t('source.check')}
              </div>
            </div>
          </button>
        );
      })}

      <div className="mx-1 h-8 w-px bg-gray-200 dark:bg-white/10" />

      <button
        onClick={() => onChange('compare')}
        aria-pressed={active === 'compare'}
        aria-label={t('source.compare')}
        className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition-all ${
          active === 'compare'
            ? 'border-brame-purple bg-brame-purple text-white shadow-sm'
            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-white/10 dark:bg-brame-dark-light dark:hover:border-white/20 dark:hover:bg-white/5'
        }`}
      >
        <Rows3 size={14} className={active === 'compare' ? 'text-white' : 'text-brame-purple'} />
        <div>
          <div
            className={`text-sm font-semibold ${
              active === 'compare' ? 'text-white' : 'text-brame-dark dark:text-gray-100'
            }`}
          >
            {t('source.compare')}
          </div>
          <div
            className={`mt-0.5 text-[11px] ${
              active === 'compare' ? 'text-white/75' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {t('source.compareSub')}
          </div>
        </div>
      </button>
    </div>
  );
}

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
        <Pill tone="green" icon={<Radio size={11} />}>
          {t('source.live')}
        </Pill>
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
