import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Minus, TrendingDown, TrendingUp, TriangleAlert } from 'lucide-react';
import { fmtCompact, fmtInt, fmtMetric } from '../mock/data';
import { useI18n, useFormatters } from '../lib/i18n';
import { usePageTitle } from '../lib/usePageTitle';
import {
  BENCHMARK_METRICS,
  DIMENSIONS,
  LOW_SAMPLE,
  MIN_BENCHMARK_ACTIVE_DAYS,
  performanceTier,
  type BenchmarkMetric,
  type Dimension,
  type PerformanceTier,
  type Stats,
} from '../lib/benchmarks';
import { useBenchmarkGroup } from '../hooks/useBenchmarks';
import type { BenchmarkCampaign } from '../mock/types';
import { Button, Card, EmptyState, LoadingState, Pill, SectionTitle, TableScroll, Td, Th, Tooltip } from '../components/primitives';
import MetricTile from '../components/MetricTile';

function isDimension(v: string | undefined): v is Dimension {
  return v !== undefined && (DIMENSIONS as string[]).includes(v);
}

/**
 * One bucket's distribution and the campaigns behind it. Generic across all
 * three dimensions — the KPI dashboard had this as three ~420-line files whose
 * only real difference was a heading.
 */
export default function BenchmarkDetailView() {
  const { dimension: rawDimension, key: rawKey } = useParams<{ dimension: string; key: string }>();
  const [params] = useSearchParams();
  const { t } = useI18n();
  const { fmtDate } = useFormatters();

  const dimension: Dimension = isDimension(rawDimension) ? rawDimension : 'industry';
  const key = rawKey ? decodeURIComponent(rawKey) : undefined;
  // Carry the metric choice through from the overview, so drilling in keeps
  // whichever metric the user was already looking at.
  const metricParam = params.get('metric');
  const metric: BenchmarkMetric =
    metricParam && (BENCHMARK_METRICS as string[]).includes(metricParam) ? (metricParam as BenchmarkMetric) : 'ctr';

  const { data, isLoading } = useBenchmarkGroup(dimension, key);
  usePageTitle(data?.group.displayName);

  const backTo = `/benchmarks?dimension=${dimension}&metric=${metric}`;

  if (isLoading) {
    return <LoadingState label={t('common.loading')} />;
  }

  if (!data) {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <EmptyState
          icon={<TriangleAlert size={32} />}
          title={t('benchmarkDetail.notFoundTitle')}
          body={t('benchmarkDetail.notFoundBody')}
          action={
            <Link to={backTo}>
              <Button variant="primary" icon={<ArrowLeft size={14} />}>
                {t('benchmarkDetail.back')}
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const { group, overall } = data;
  const scopedStats = group.stats[metric];

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <Link
        to={backTo}
        className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brame-teal dark:text-gray-400 dark:hover:text-brame-turquoise-light"
      >
        <ArrowLeft size={14} />
        {t('benchmarkDetail.back')}
      </Link>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-brame-dark dark:text-white">{group.displayName}</h1>
            <Pill tone="neutral">{t(`benchmarks.dimension.${dimension}`)}</Pill>
            {group.lowSample && (
              <Pill tone="amber" title={t('benchmarks.lowSampleHint', { n: LOW_SAMPLE })}>
                {t('benchmarks.lowSample')}
              </Pill>
            )}
            <TrendPill trend={group.trend} pct={group.trendPct} />
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('benchmarkDetail.eligible', { eligible: group.eligibleCount, total: group.campaignCount })}
          </p>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricTile metric="impressions" value={group.impressions} />
        <MetricTile metric="ctr" value={group.stats.ctr?.avg} emphasis={metric === 'ctr'} />
        <MetricTile metric="viewability" value={group.stats.viewability?.avg} emphasis={metric === 'viewability'} />
        <MetricTile
          metric="engagementRate"
          value={group.stats.engagementRate?.avg}
          emphasis={metric === 'engagementRate'}
        />
      </div>

      <Card className="mb-5">
        <SectionTitle hint={t('benchmarkDetail.distributionHint')}>
          {t('benchmarkDetail.distributionTitle')}
        </SectionTitle>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {BENCHMARK_METRICS.map((m) => (
            <DistributionColumn key={m} metric={m} stats={group.stats[m]} overall={overall[m]} />
          ))}
        </div>
      </Card>

      <Card padded={false}>
        <div className="border-b border-gray-200 p-4 dark:border-white/10">
          <SectionTitle hint={t('benchmarkDetail.campaignsHint')}>
            {t('benchmarkDetail.campaignsTitle')}
          </SectionTitle>
        </div>
        <TableScroll>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-white/10">
                <Th>{t('benchmarkDetail.col.campaign')}</Th>
                {dimension !== 'client' && <Th>{t('benchmarkDetail.col.client')}</Th>}
                {dimension !== 'market' && <Th>{t('benchmarkDetail.col.market')}</Th>}
                <Th>{t('benchmarkDetail.col.flight')}</Th>
                <Th align="right">{t('benchmarks.col.impressions')}</Th>
                <Th align="right">{t(`metric.${metric}.label`)}</Th>
                <Th>{t('benchmarkDetail.col.tier')}</Th>
              </tr>
            </thead>
            <tbody>
              {group.campaigns.map((c) => (
                <CampaignRow
                  key={c.id}
                  campaign={c}
                  dimension={dimension}
                  metric={metric}
                  scopedStats={scopedStats}
                  fmtDate={fmtDate}
                />
              ))}
            </tbody>
          </table>
        </TableScroll>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------

/**
 * The distribution track from the KPI dashboard, rebuilt on the design
 * system's tokens. Bars are scaled against P90 so the three rows share one
 * axis and P50-vs-P90 is readable as a shape, not just three numbers.
 */
function DistributionColumn({
  metric,
  stats,
  overall,
}: {
  metric: BenchmarkMetric;
  stats: Stats | null;
  overall: Stats | null;
}) {
  const { t } = useI18n();

  return (
    <div>
      <div className="mb-3 flex items-center gap-1.5">
        <span className="text-sm font-medium text-brame-dark dark:text-gray-200">{t(`metric.${metric}.label`)}</span>
        <Tooltip text={t(`metric.${metric}.help`)} />
      </div>

      {!stats ? (
        <p className="text-xs text-gray-400 dark:text-gray-500">{t('benchmarks.notMeasured')}</p>
      ) : (
        <>
          <div className="space-y-2">
            {(
              [
                ['p50', stats.p50],
                ['p75', stats.p75],
                ['p90', stats.p90],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="flex items-center gap-3">
                <span className="w-9 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {t(`benchmarks.col.${label}`)}
                </span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                  <div
                    className="h-full rounded-full bg-brame-teal dark:bg-brame-turquoise"
                    style={{ width: `${stats.p90 > 0 ? Math.min((value / stats.p90) * 100, 100) : 0}%` }}
                  />
                </div>
                <span className="tnum w-16 text-right text-sm font-medium text-brame-teal dark:text-brame-turquoise-light">
                  {fmtMetric(metric, value)}
                </span>
              </div>
            ))}
          </div>
          {/* The group's own sample size and the portfolio it is being
              compared against are different scopes — labelling them
              separately, since one line reading "… · n=19" was ambiguous
              about which of the two the n belonged to. */}
          <p className="mt-2.5 text-xs text-gray-400 dark:text-gray-500">
            {t('benchmarkDetail.sampleSize', { n: fmtInt(stats.n) })}
            {overall && (
              <>
                {' · '}
                {t('benchmarkDetail.portfolioP50', { value: fmtMetric(metric, overall.p50) })}
              </>
            )}
          </p>
        </>
      )}
    </div>
  );
}

function CampaignRow({
  campaign,
  dimension,
  metric,
  scopedStats,
  fmtDate,
}: {
  campaign: BenchmarkCampaign;
  dimension: Dimension;
  metric: BenchmarkMetric;
  scopedStats: Stats | null;
  fmtDate: (iso: string) => string;
}) {
  const { t } = useI18n();
  const excluded = campaign.activeDays < MIN_BENCHMARK_ACTIVE_DAYS;
  const value = campaign[metric];
  // A campaign the floor excluded gets no tier — ranking it against a
  // benchmark it was not allowed to inform would be incoherent.
  const tier = excluded ? null : performanceTier(value, scopedStats);

  return (
    <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50 dark:border-white/5 dark:hover:bg-white/5">
      <Td>
        <Link
          to={`/campaigns/${campaign.id.replace(/^bm-live-/, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-brame-dark hover:text-brame-teal hover:underline dark:text-gray-100 dark:hover:text-brame-turquoise-light"
        >
          {campaign.name}
        </Link>
        {excluded && (
          <span className="ml-2 inline-flex align-middle">
            <Pill
              tone="amber"
              title={t('benchmarkDetail.excludedHint', {
                days: campaign.activeDays,
                floor: MIN_BENCHMARK_ACTIVE_DAYS,
              })}
            >
              {t('benchmarkDetail.excluded')}
            </Pill>
          </span>
        )}
      </Td>
      {dimension !== 'client' && <Td>{campaign.companyName}</Td>}
      {dimension !== 'market' && <Td>{campaign.market}</Td>}
      <Td>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {fmtDate(campaign.flightStart)} – {fmtDate(campaign.flightEnd)}
        </span>
      </Td>
      <Td align="right">{fmtCompact(campaign.impressions)}</Td>
      <Td align="right">{value === null ? '—' : fmtMetric(metric, value)}</Td>
      <Td>{tier ? <TierPill tier={tier} /> : <span className="text-gray-300 dark:text-gray-600">—</span>}</Td>
    </tr>
  );
}

function TierPill({ tier }: { tier: PerformanceTier }) {
  const { t } = useI18n();
  const tone = tier === 'top' ? 'green' : tier === 'aboveAvg' ? 'teal' : tier === 'average' ? 'neutral' : 'amber';
  return <Pill tone={tone}>{t(`benchmarkDetail.tier.${tier}`)}</Pill>;
}

function TrendPill({ trend, pct }: { trend: 'improving' | 'stable' | 'declining'; pct: number }) {
  const { t } = useI18n();
  const icon =
    trend === 'improving' ? (
      <TrendingUp size={12} />
    ) : trend === 'declining' ? (
      <TrendingDown size={12} />
    ) : (
      <Minus size={12} />
    );
  const tone = trend === 'improving' ? 'green' : trend === 'declining' ? 'red' : 'neutral';
  const suffix = trend === 'stable' ? '' : ` ${pct > 0 ? '+' : ''}${(pct * 100).toFixed(1)}%`;
  return (
    <Pill tone={tone} icon={icon}>
      {t(`benchmarks.trend.${trend}`)}
      {suffix}
    </Pill>
  );
}
