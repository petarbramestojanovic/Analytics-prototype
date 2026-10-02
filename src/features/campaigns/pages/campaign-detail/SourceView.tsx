import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Cable, Settings2, Unplug } from 'lucide-react';
import { paths } from '@/config/paths';
import { useFormatters, useI18n } from '@/i18n';
import { Button, Card, Tabs } from '@/components/ui';
import { EmptyState } from '@/components/feedback';
import { useSession } from '@/features/session';
import { useIndustryBenchmark } from '@/features/benchmarks';
import type { Campaign, MetricKey, SourceKey } from '@/types';
import { MetricTile } from '../../components/MetricTile';
import { TrendChart } from '../../components/TrendChart';
import { deviceSplit, scaleSeriesForDevice, type DeviceTab } from '../../lib/devices';
import { METRIC_KEYS, sourceMeta } from '../../lib/sources';
import { buildCampaignTrend } from '../../lib/trend';
import { AttributionCard, CreativesCard, CtaCard, DevicesCard, PageFlowCard } from './SourceSections';

const METRIC_FOOTNOTES: Partial<Record<MetricKey, string>> = {
  uniqueUsers: 'metric.footnote.uniqueUsers',
  avgDwell: 'metric.footnote.avgDwell',
};

/** One source's own view — renders only what that platform measures. */
export function SourceView({
  campaign,
  source,
  onSwitchSource,
}: {
  campaign: Campaign;
  source: SourceKey;
  onSwitchSource: (s: SourceKey) => void;
}) {
  const { t } = useI18n();
  const { fmtDateLong } = useFormatters();
  const { isAdmin, isInternal } = useSession();
  const meta = sourceMeta(campaign, source);
  const series = campaign.sources[source];

  const [deviceTab, setDeviceTab] = useState<DeviceTab>('total');
  const split = useMemo(() => deviceSplit(campaign), [campaign]);
  const scopedSeries = useMemo(
    () => (series ? scaleSeriesForDevice(series, campaign, deviceTab) : null),
    [series, campaign, deviceTab]
  );
  const trendData = useMemo(
    () => (scopedSeries ? buildCampaignTrend(scopedSeries, campaign.salesforce.bookedImpressions) : []),
    [scopedSeries, campaign]
  );
  const benchmarks = useIndustryBenchmark(campaign.companyId, isInternal);

  if (!series || !scopedSeries) {
    const reason =
      source === 'nexd'
        ? t('detail.noDataReasonNexd')
        : campaign.status === 'scheduled'
          ? t('detail.noDataReasonScheduled', { date: fmtDateLong(campaign.flightStart) })
          : t('detail.noDataReasonGeneric');

    return (
      <EmptyState
        icon={<Unplug size={32} />}
        title={t('detail.noDataTitle', { source: meta.fullLabel })}
        body={`${reason} ${t('detail.noDataSuffix')}`}
        action={
          isAdmin ? (
            <Link to={paths.setup(campaign.id)}>
              <Button variant="primary" icon={<Settings2 size={14} />}>
                {t('detail.openSetup')}
              </Button>
            </Link>
          ) : undefined
        }
      />
    );
  }

  const measuresEngagement = meta.measures.includes('engagementRate');

  return (
    <div className="space-y-5">
      {split && (
        <div>
          <Tabs
            value={deviceTab}
            onChange={setDeviceTab}
            groupLabel={t('detail.deviceTabHint')}
            options={(['total', 'mobile', 'desktop'] as const).map((value) => ({
              value,
              label: t(`detail.deviceTab.${value}`),
            }))}
          />
          <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">{t('detail.deviceTabHint')}</p>
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span>{t('detail.showingMetrics', { count: meta.measures.length, source: meta.fullLabel })}</span>
          {meta.measures.length < METRIC_KEYS.length && (
            <span className="text-gray-400 dark:text-gray-500">{t('detail.metricsNotTracked')}</span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {meta.measures.map((m) => (
            <MetricTile
              key={m}
              metric={m}
              value={scopedSeries.totals[m]}
              emphasis={m === 'impressions'}
              footnote={METRIC_FOOTNOTES[m] && t(METRIC_FOOTNOTES[m])}
            />
          ))}
        </div>
      </div>

      <Card>
        <TrendChart
          title={t('detail.deliveryTitle')}
          hint={t('detail.deliveryHint', { source: meta.fullLabel })}
          daily={trendData}
          defaultMetrics={['impressions', 'delivery']}
          frameBenchmark={benchmarks.frameBenchmark}
          industryBenchmark={benchmarks.industryBenchmark}
          industryLabel={benchmarks.industry}
        />
      </Card>

      {/* Engagement detail exists only for platforms that measure inside the
          unit. The adserver stops at delivery. */}
      {measuresEngagement ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <PageFlowCard campaign={campaign} />
          <CtaCard campaign={campaign} />
        </div>
      ) : (
        <Card className="border-dashed bg-gray-50/60 dark:border-white/15 dark:bg-white/5">
          <div className="flex items-start gap-3">
            <Cable size={18} className="mt-0.5 flex-shrink-0 text-gray-400 dark:text-gray-500" />
            <div>
              <h3 className="text-sm font-semibold text-brame-dark dark:text-gray-100">
                {t('detail.noInUnitTitle', { source: meta.fullLabel })}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('detail.noInUnitBody')}</p>
              {campaign.sources.custom && (
                <div className="mt-3">
                  <Button variant="primary" icon={<ArrowRight size={13} />} onClick={() => onSwitchSource('custom')}>
                    {t('detail.switchToBrame')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <DevicesCard campaign={campaign} showEngagement={measuresEngagement} />
        <CreativesCard
          campaign={campaign}
          showEngagement={measuresEngagement}
          showDwell={meta.measures.includes('avgDwell')}
        />
      </div>

      {/* UTM attribution only exists where our own tags are on the click. */}
      {source === 'custom' && <AttributionCard campaign={campaign} />}
    </div>
  );
}
