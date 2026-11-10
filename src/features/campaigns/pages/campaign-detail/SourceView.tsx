import { useMemo, useState, type ComponentProps } from 'react';
import { ArrowRight, Cable, Layers, Monitor, Settings2, Smartphone, Unplug } from 'lucide-react';
import { paths } from '@/config/paths';
import { useI18n, type TranslationKey } from '@/i18n';
import { fmtCompact, fmtMetric } from '@/lib/format';
import { Button, ButtonLink, Card, Tabs, Tooltip } from '@/components/ui';
import { EmptyState } from '@/components/feedback';
import { useSession } from '@/features/session';
import { BenchmarkValue, ContextComparison, useIndustryBenchmark } from '@/features/benchmarks';
import type { Campaign, MetricKey, SourceKey } from '@/types';
import { KpiWidget } from '../../components/KpiWidget';
import { TrendChart } from '../../components/TrendChart';
import { deviceSplit, scaleSeriesForDevice, type DeviceTab } from '../../lib/devices';
import { METRIC_KEYS, seriesEngagements, sourceMeta } from '../../lib/sources';
import { buildCampaignTrend } from '../../lib/trend';
import { AttributionCard, CreativesCard, CtaCard, DevicesCard, PageFlowCard } from './SourceSections';

/** Page flow and Calls to action are hidden for now: they need per-screen and
 *  per-button data that isn't confirmed to exist yet (today they show demo
 *  numbers). Flip to `true` once the data does. */
const SHOW_IN_UNIT_CARDS = false;

const DEVICE_TAB_ICONS = { total: Layers, mobile: Smartphone, desktop: Monitor } as const;

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
    const reason = source === 'nexd' ? t('detail.noDataReasonNexd') : t('detail.noDataReasonGeneric');

    return (
      <EmptyState
        icon={<Unplug size={32} />}
        title={
          isInternal
            ? t('detail.noDataTitle', { source: t(`connectors.source.${meta.key}`) })
            : t('detail.noDataTitleClient')
        }
        body={
          isInternal
            ? `${reason} ${t('detail.noDataSuffix')}`
            : t('detail.noDataBodyClient')
        }
        action={
          isAdmin ? (
            <ButtonLink to={paths.setup(campaign.id)} variant="primary" icon={<Settings2 size={14} />}>
                {t('detail.openSetup')}
              </ButtonLink>
          ) : undefined
        }
      />
    );
  }

  const measuresEngagement = meta.measures.includes('engagementRate');
  const totals = scopedSeries.totals;
  const has = (m: MetricKey) => meta.measures.includes(m);
  const rate = (metric: 'engagementRate' | 'ctr' | 'viewability') => (
    <BenchmarkValue value={totals[metric]} metric={metric} companyId={campaign.companyId}>
      {fmtMetric(metric, totals[metric])}
    </BenchmarkValue>
  );
  const label = (m: string) => t(`metric.${m}.label` as TranslationKey);
  const help = (m: string) => t(`metric.${m}.help` as TranslationKey);
  const engagements = seriesEngagements(scopedSeries);

  // The customer journey, left to right and top to bottom: delivered →
  // engaged → clicked → viewable, then what only some sources/campaigns have.
  // A count and its rate share a widget (the rate small in the corner).
  const widgets: (ComponentProps<typeof KpiWidget> & { key: string })[] = [
    {
      key: 'impressions',
      label: label('impressions'),
      help: help('impressions'),
      value: fmtMetric('impressions', totals.impressions),
      emphasis: true,
      secondary: has('viewable')
        ? { label: label('viewable'), value: fmtMetric('viewable', totals.viewable), help: help('viewable') }
        : undefined,
    },
    ...(engagements != null
      ? [
          {
            key: 'engagements',
            label: label('engagements'),
            help: help('engagements'),
            value: fmtCompact(engagements),
            secondary: { label: label('engagementRate'), value: rate('engagementRate'), help: help('engagementRate') },
          },
        ]
      : []),
    // CTR leads (it is what is read and compared); the click count sits small
    // in the corner. A source that has clicks but no CTR shows the count alone.
    ...(has('ctr')
      ? [
          {
            key: 'ctr',
            label: label('ctr'),
            help: help('ctr'),
            value: rate('ctr'),
            secondary: has('ctaClicks')
              ? { label: label('ctaClicks'), value: fmtMetric('ctaClicks', totals.ctaClicks), help: help('ctaClicks') }
              : undefined,
          },
        ]
      : has('ctaClicks')
        ? [{ key: 'clicks', label: label('ctaClicks'), help: help('ctaClicks'), value: fmtMetric('ctaClicks', totals.ctaClicks) }]
        : []),
    ...(has('viewability')
      ? [{ key: 'viewability', label: label('viewability'), help: help('viewability'), value: rate('viewability') }]
      : []),
    ...(has('plays') ? [{ key: 'plays', label: label('plays'), help: help('plays'), value: fmtMetric('plays', totals.plays) }] : []),
    ...(campaign.salesforce.conversionTracking && has('conversions') && totals.conversions !== undefined
      ? [{ key: 'conversions', label: label('conversions'), help: help('conversions'), value: fmtMetric('conversions', totals.conversions) }]
      : []),
    ...(has('completionRate')
      ? [{ key: 'completionRate', label: label('completionRate'), help: help('completionRate'), value: fmtMetric('completionRate', totals.completionRate) }]
      : []),
    ...(has('avgDwell')
      ? [{ key: 'avgDwell', label: label('avgDwell'), help: help('avgDwell'), value: fmtMetric('avgDwell', totals.avgDwell), footnote: t(METRIC_FOOTNOTES.avgDwell!) }]
      : []),
    ...(has('uniqueUsers')
      ? [{ key: 'uniqueUsers', label: label('uniqueUsers'), help: help('uniqueUsers'), value: fmtMetric('uniqueUsers', totals.uniqueUsers), footnote: t(METRIC_FOOTNOTES.uniqueUsers!) }]
      : []),
  ];

  return (
    <div className="space-y-5">
      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div>
            <h2 className="text-base font-semibold text-brame-dark dark:text-gray-100">{t('detail.keyMetrics')}</h2>
            {isInternal && (
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {t('detail.showingMetrics', { count: meta.measures.length, source: t(`connectors.source.${meta.key}`) })}
                {meta.measures.length < METRIC_KEYS.length && (
                  <span className="text-gray-400 dark:text-gray-500"> {t('detail.metricsNotTracked')}</span>
                )}
              </p>
            )}
          </div>
          {split && (
            <div className="flex items-center gap-1.5" title={t('detail.deviceTabHint')}>
              <Tabs
                onPage
                value={deviceTab}
                onChange={setDeviceTab}
                groupLabel={t('detail.deviceTabHint')}
                options={(['total', 'mobile', 'desktop'] as const).map((value) => {
                  const Icon = DEVICE_TAB_ICONS[value];
                  return {
                    value,
                    label: (
                      <span className="inline-flex items-center gap-1.5">
                        <Icon size={13} />
                        {t(`detail.deviceTab.${value}`)}
                      </span>
                    ),
                  };
                })}
              />
              <Tooltip text={t('detail.deviceTabHint')} />
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {widgets.map(({ key, ...w }) => (
            <KpiWidget key={key} {...w} />
          ))}
        </div>
      </section>

      {/* The headline numbers put in context: this campaign against its client
          and industry (and KLEA, for Klea seats only). */}
      {source === campaign.primarySource && (
        <ContextComparison
          companyId={campaign.companyId}
          isInternal={isInternal}
          own={{ engagementRate: totals.engagementRate, ctr: totals.ctr, viewability: totals.viewability }}
        />
      )}

      <Card>
        <TrendChart
          title={t('detail.deliveryTitle')}
          hint={isInternal ? t('detail.deliveryHint', { source: t(`connectors.source.${meta.key}`) }) : t('detail.deliveryHintClient')}
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
        SHOW_IN_UNIT_CARDS && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <PageFlowCard campaign={campaign} />
            <CtaCard campaign={campaign} />
          </div>
        )
      ) : isInternal ? (
        <Card className="border-dashed bg-gray-50/60 dark:border-white/15 dark:bg-white/5">
          <div className="flex items-start gap-3">
            <Cable size={18} className="mt-0.5 flex-shrink-0 text-gray-400 dark:text-gray-500" />
            <div>
              <h3 className="text-sm font-semibold text-brame-dark dark:text-gray-100">
                {t('detail.noInUnitTitle', { source: t(`connectors.source.${meta.key}`) })}
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
      ) : null}

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
