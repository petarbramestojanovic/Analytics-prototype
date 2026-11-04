import type { ReactNode } from 'react';
import { useI18n } from '@/i18n';
import { Tooltip } from '@/components/ui';
import { useSimulatedAction } from '@/hooks/useSimulatedAction';
import type { Campaign } from '@/types';
import { FreshnessBar } from '../../components/FreshnessBar';
import { SourceSwitcher, type SourceTab } from '../../components/SourceSwitcher';

/** The "which source are you looking at" card: the source switcher, that
 *  source's freshness, and (as children) the view tabs underneath. */
export function MeasurementSourcePanel({
  campaign,
  activeTab,
  onTabChange,
  children,
}: {
  campaign: Campaign;
  activeTab: SourceTab;
  onTabChange: (tab: SourceTab) => void;
  children?: ReactNode;
}) {
  const { t } = useI18n();
  const [syncing, syncNow] = useSimulatedAction(1600);

  return (
    <section className="mb-6 rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-brame-dark-light dark:shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 pt-4">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          {t('detail.measurementSourceTitle')}
          <Tooltip text={t('detail.measurementSourceBody')} />
        </div>
        {activeTab === 'compare' ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('detail.compareBody')}</p>
        ) : (
          <FreshnessBar
            campaign={campaign}
            source={activeTab}
            onSyncNow={syncNow}
            syncing={syncing}
          />
        )}
      </div>
      <div className="px-4 pb-4 pt-3">
        <SourceSwitcher campaign={campaign} active={activeTab} onChange={onTabChange} />
      </div>
      {/* What to look at within that source: Overview / Daily / Creatives. */}
      {children && (
        <div className="border-t border-gray-100 px-4 py-3 dark:border-white/10">{children}</div>
      )}
    </section>
  );
}
