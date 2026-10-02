import { useI18n } from '@/i18n';
import { useSimulatedAction } from '@/hooks/useSimulatedAction';
import { fmtCompact, fmtPct } from '@/lib/format';
import { Pill } from '@/components/ui';
import type { Campaign } from '@/types';
import { FreshnessBar } from '../../components/FreshnessBar';
import { SourceSwitcher, type SourceTab } from '../../components/SourceSwitcher';
import { DELIVERY_HEALTH_TONE, deliveryHealth, deliveryPacing } from '../../lib/delivery';

/** The "which source are you looking at" strip — deliberately the loudest
 *  thing on the page — with delivery pacing and per-source freshness. */
export function MeasurementSourcePanel({
  campaign,
  activeTab,
  onTabChange,
}: {
  campaign: Campaign;
  activeTab: SourceTab;
  onTabChange: (tab: SourceTab) => void;
}) {
  const { t } = useI18n();
  const [syncing, syncNow] = useSimulatedAction(1600);
  const pacing = deliveryPacing(campaign);
  const health = deliveryHealth(pacing);

  return (
    <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-brame-dark-light dark:shadow-none">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            {t('detail.measurementSourceTitle')}
          </div>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">{t('detail.measurementSourceBody')}</p>
        </div>
        {pacing != null && health != null && (
          <div className="flex-shrink-0 rounded-xl border border-gray-200 bg-white px-4 py-2.5 dark:border-white/10 dark:bg-brame-dark-light">
            <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {t('detail.deliveredOfBooked')}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <Pill tone={DELIVERY_HEALTH_TONE[health]} title={t(`delivery.health.${health}`)}>
                <span className="tnum text-sm font-bold">{fmtPct(pacing, 0)}</span>
              </Pill>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {t('detail.booked', { value: fmtCompact(campaign.salesforce.bookedImpressions) })}
              </span>
            </div>
          </div>
        )}
      </div>
      <SourceSwitcher campaign={campaign} active={activeTab} onChange={onTabChange} />
      <div className="mt-3">
        {activeTab === 'compare' ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('detail.compareBody')}</p>
        ) : (
          <FreshnessBar campaign={campaign} source={activeTab} onSyncNow={syncNow} syncing={syncing} />
        )}
      </div>
    </div>
  );
}
