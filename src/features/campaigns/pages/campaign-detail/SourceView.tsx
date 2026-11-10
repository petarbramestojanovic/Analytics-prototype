import { useMemo, useState, type ComponentProps } from 'react';
import { Layers, Monitor, Settings2, Smartphone, Unplug } from 'lucide-react';
import { paths } from '@/config/paths';
import { useI18n, type TranslationKey } from '@/i18n';
import { cn } from '@/lib/cn';
import { fmtCompact, fmtMetric } from '@/lib/format';
import { ButtonLink, Card, Tabs, Tooltip } from '@/components/ui';
import { EmptyState } from '@/components/feedback';
import { useSession } from '@/features/session';
import { BenchmarkValue, ContextComparison, useIndustryBenchmark } from '@/features/benchmarks';
import type { Campaign, MetricKey, SourceKey } from '@/types';
import { KpiWidget } from '../../components/KpiWidget';
import { TrendChart } from '../../components/TrendChart';
import { deviceSplit, scaleSeriesForDevice, type DeviceTab } from '../../lib/devices';
import { METRIC_KEYS, seriesEngagements, sourceMeta } from '../../lib/sources';
import { buildCampaignTrend } from '../../lib/trend';
import { CreativesCard, CtaCard, DevicesCard, PageFlowCard } from './SourceSections';

/** Page flow and Calls to action are hidden for now: they need per-screen and
 *  per-button data that isn't confirmed to exist yet (today they show demo
 *  numbers). Flip to `true` once the data does. */
const SHOW_IN_UNIT_CARDS = false;

const DEVICE_TAB_ICONS = { total: Layers, mobile: Smartphone, desktop: Monitor } as const;

/** One source's own view — renders only what that platform measures. */
export function SourceView({
  campaign,
  source,
  onOpenCreative,
}: {
  campaign: Campaign;
  source: SourceKey;
  onOpenCreative: (creativeId: string) => void;
}) {
  const { t } = useI18n();
  const { isAdmin, isInternal } = useSession();
  const meta = sourceMeta(campaign, source);
  const series = campaign.sources[source];

  const [deviceTab, setDeviceTab] = useState<DeviceTab>('total');
  const split = useMemo(() => deviceSplit(campaign), [campaign]);
  const scopedSeries = useMemo(
    () => (series ? scaleSeriesForDevice(series, campaign, deviceTab) : null),
    [series, campaign, deviceTab],
  );
  const trendData = useMemo(
    () =>
      scopedSeries ? buildCampaignTrend(scopedSeries, campaign.salesforce.bookedImpressions) : [],
    [scopedSeries, campaign],
  );
  const benchmarks = useIndustryBenchmark(campaign.companyId, isInternal);

  // Only admins pick a source. Everyone else sees one campaign view, so a number
  // the primary source can't measure (e.g. completion rate, Klea only) is
  // read from the richest other connected source instead of the widget being
  // dropped. Admins browsing a source tab still get strictly that source.
  const fillSource = isAdmin
    ? undefined
    : (['custom', 'nexd'] as const).find((k) => k !== source && campaign.sources[k]);
  const fillSeries = useMemo(() => {
    const raw = fillSource ? campaign.sources[fillSource] : null;
    return raw ? scaleSeriesForDevice(raw, campaign, deviceTab) : null;
  }, [fillSource, campaign, deviceTab]);

  if (!series || !scopedSeries) {
    const reason =
      source === 'nexd' ? t('detail.noDataReasonNexd') : t('detail.noDataReasonGeneric');

    return (
      <EmptyState
        icon={<Unplug size={32} />}
        title={
          isInternal
            ? t('detail.noDataTitle', { source: t(`connectors.source.${meta.key}`) })
            : t('detail.noDataTitleClient')
        }
        body={isInternal ? `${reason} ${t('detail.noDataSuffix')}` : t('detail.noDataBodyClient')}
        action={
          isAdmin ? (
            <ButtonLink
              to={paths.setup(campaign.id)}
              variant="primary"
              icon={<Settings2 size={14} />}
            >
              {t('detail.openSetup')}
            </ButtonLink>
          ) : undefined
        }
      />
    );
  }

  const measuresEngagement = meta.measures.includes('engagementRate');
  const totals = scopedSeries.totals;
  const fillMeasures = fillSource ? sourceMeta(campaign, fillSource).measures : [];
  /** The series a metric is read from: the source itself, else the fill source. */
  const seriesFor = (m: MetricKey) =>
    meta.measures.includes(m)
      ? scopedSeries
      : fillSeries && fillMeasures.includes(m)
        ? fillSeries
        : null;
  const has = (m: MetricKey) => seriesFor(m) !== null;
  const valueOf = (m: 'engagementRate' | 'ctr' | 'viewability') => seriesFor(m)?.totals[m];
  const rate = (metric: 'engagementRate' | 'ctr' | 'viewability') => (
    <BenchmarkValue value={valueOf(metric)} metric={metric} companyId={campaign.companyId}>
      {fmtMetric(metric, valueOf(metric))}
    </BenchmarkValue>
  );
  const label = (m: string) => t(`metric.${m}.label` as TranslationKey);
  const help = (m: string) => t(`metric.${m}.help` as TranslationKey);
  const engagementSeries = seriesFor('engagementRate');
  const engagements = engagementSeries ? seriesEngagements(engagementSeries) : null;

  // The five headline numbers, one widget each, in the order they are read:
  // delivered, engaged, clicked, viewable, then the engagement rate. A widget
  // appears only where the source measures it (never a made-up zero). A
  // campaign that tracks conversions gets that one too.
  const widgets: (ComponentProps<typeof KpiWidget> & { key: string })[] = [
    {
      key: 'impressions',
      label: label('impressions'),
      help: help('impressions'),
      value: fmtMetric('impressions', totals.impressions),
      emphasis: true,
    },
    ...(engagements != null
      ? [
          {
            key: 'engagements',
            label: label('engagements'),
            help: help('engagements'),
            value: fmtCompact(engagements),
          },
        ]
      : []),
    ...(has('ctr')
      ? [{ key: 'ctr', label: label('ctr'), help: help('ctr'), value: rate('ctr') }]
      : []),
    ...(has('viewability')
      ? [
          {
            key: 'viewability',
            label: label('viewability'),
            help: help('viewability'),
            value: rate('viewability'),
          },
        ]
      : []),
    ...(has('engagementRate')
      ? [
          {
            key: 'engagementRate',
            label: label('engagementRate'),
            help: help('engagementRate'),
            value: rate('engagementRate'),
          },
        ]
      : []),
    ...(campaign.salesforce.conversionTracking &&
    has('conversions') &&
    totals.conversions !== undefined
      ? [
          {
            key: 'conversions',
            label: label('conversions'),
            help: help('conversions'),
            value: fmtMetric('conversions', totals.conversions),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-5">
      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div>
            <h2 className="text-base font-semibold text-brame-dark dark:text-gray-100">
              {t('detail.keyMetrics')}
            </h2>
            {isInternal && (
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {t('detail.showingMetrics', {
                  count: meta.measures.length,
                  source: t(`connectors.source.${meta.key}`),
                })}
                {meta.measures.length < METRIC_KEYS.length && (
                  <span className="text-gray-400 dark:text-gray-500">
                    {' '}
                    {t('detail.metricsNotTracked')}
                  </span>
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
        <div
          className={cn(
            'grid grid-cols-2 gap-3',
            widgets.length > 5
              ? 'lg:grid-cols-6'
              : widgets.length > 4
                ? 'lg:grid-cols-5'
                : 'lg:grid-cols-4',
          )}
        >
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
          own={{
            engagementRate: valueOf('engagementRate'),
            ctr: valueOf('ctr'),
            viewability: valueOf('viewability'),
          }}
        />
      )}

      <Card>
        <TrendChart
          title={t('detail.deliveryTitle')}
          hint={
            isInternal
              ? t('detail.deliveryHint', { source: t(`connectors.source.${meta.key}`) })
              : t('detail.deliveryHintClient')
          }
          daily={trendData}
          defaultMetrics={['impressions', 'delivery']}
          frameBenchmark={benchmarks.frameBenchmark}
          industryBenchmark={benchmarks.industryBenchmark}
          industryLabel={benchmarks.industry}
        />
      </Card>

      {measuresEngagement && SHOW_IN_UNIT_CARDS && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <PageFlowCard campaign={campaign} />
          <CtaCard campaign={campaign} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <DevicesCard campaign={campaign} showEngagement={measuresEngagement} />
        <CreativesCard
          campaign={campaign}
          showEngagement={measuresEngagement}
          showCtr={has('ctr') || has('ctaClicks')}
          onOpenCreative={onOpenCreative}
        />
      </div>
    </div>
  );
}
