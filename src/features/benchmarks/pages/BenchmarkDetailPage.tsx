import { useParams, useSearchParams } from 'react-router-dom';
import { paths } from '@/config/paths';
import { useFormatters, useI18n } from '@/i18n';
import { usePageTitle } from '@/hooks/usePageTitle';
import { fmtCompact, fmtMetric } from '@/lib/format';
import { Card, CardHeader, Pill } from '@/components/ui';
import { LoadingState } from '@/components/feedback';
import { NotFoundState, Page, PageHeader, SectionTitle } from '@/components/page';
import { Table, Td, Th, Tr } from '@/components/table';
import { StatGrid, TextLink } from '@/components/display';
import { DeliveryBar, MetricTile } from '@/features/campaigns';
import type { BenchmarkCampaign } from '@/types';
import { useBenchmarkGroup } from '@/api/hooks/useBenchmarks';
import { DistributionColumn } from '../components/DistributionColumn';
import { LowSamplePill } from '../components/LowSamplePill';
import { TrendPill } from '../components/TrendIndicator';
import {
  BENCHMARK_METRICS,
  MIN_BENCHMARK_ACTIVE_DAYS,
  parseBenchmarkMetric,
  parseDimension,
  type Dimension,
} from '../lib/benchmarks';

/**
 * One bucket's distribution and the campaigns behind it. Generic across all
 * three dimensions — the KPI dashboard had this as three ~420-line files whose
 * only real difference was a heading.
 */
export function BenchmarkDetailPage() {
  const { dimension: rawDimension, key: rawKey } = useParams<{ dimension: string; key: string }>();
  const [params] = useSearchParams();
  const { t } = useI18n();

  const dimension = parseDimension(rawDimension);
  const key = rawKey ? decodeURIComponent(rawKey) : undefined;
  // Carry the metric choice through from the overview, so drilling in keeps
  // whichever metric the user was already looking at.
  const metric = parseBenchmarkMetric(params.get('metric'));

  const { data, isLoading } = useBenchmarkGroup(dimension, key);
  usePageTitle(data?.group.displayName);

  const backTo = paths.benchmarks({ dimension, metric });

  if (isLoading) return <LoadingState />;

  if (!data) {
    return (
      <NotFoundState
        title={t('benchmarkDetail.notFoundTitle')}
        body={t('benchmarkDetail.notFoundBody')}
        backTo={backTo}
        backLabel={t('benchmarkDetail.back')}
      />
    );
  }

  const { group, overall } = data;

  return (
    <Page>
      <PageHeader
        back={{ to: backTo, label: t('benchmarkDetail.back') }}
        title={group.displayName}
        badges={
          <>
            <Pill tone="neutral">{t(`benchmarks.dimension.${dimension}`)}</Pill>
            {group.lowSample && <LowSamplePill />}
            <TrendPill trend={group.trend} pct={group.trendPct} />
          </>
        }
        subtitle={t('benchmarkDetail.eligible', { eligible: group.eligibleCount, total: group.campaignCount })}
        className="mb-5"
      />

      <StatGrid>
        <MetricTile metric="impressions" value={group.impressions} />
        {(['ctr', 'viewability', 'engagementRate'] as const).map((m) => (
          <MetricTile key={m} metric={m} value={group.stats[m]?.avg} emphasis={metric === m} />
        ))}
      </StatGrid>

      <Card className="mb-5">
        <SectionTitle hint={t('benchmarkDetail.distributionHint')}>{t('benchmarkDetail.distributionTitle')}</SectionTitle>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {BENCHMARK_METRICS.map((m) => (
            <DistributionColumn key={m} metric={m} stats={group.stats[m]} overall={overall[m]} />
          ))}
        </div>
      </Card>

      <Card padded={false}>
        <CardHeader title={t('benchmarkDetail.campaignsTitle')} hint={t('benchmarkDetail.campaignsHint')} />
        <Table>
          <thead>
            <tr>
              <Th>{t('benchmarkDetail.col.campaign')}</Th>
              <Th>{t('campaigns.col.agency')}</Th>
              {dimension !== 'client' && <Th>{t('benchmarkDetail.col.client')}</Th>}
              {dimension !== 'market' && <Th>{t('benchmarkDetail.col.market')}</Th>}
              <Th>{t('benchmarkDetail.col.flight')}</Th>
              <Th align="right">{t('benchmarks.col.impressions')}</Th>
              {BENCHMARK_METRICS.map((m) => (
                <Th key={m} align="right">
                  {t(`metric.${m}.label`)}
                </Th>
              ))}
              <Th align="right">{t('campaigns.col.delivery')}</Th>
            </tr>
          </thead>
          <tbody>
            {group.campaigns.map((c) => (
              <CampaignRow key={c.id} campaign={c} dimension={dimension} />
            ))}
          </tbody>
        </Table>
      </Card>
    </Page>
  );
}

function CampaignRow({ campaign, dimension }: { campaign: BenchmarkCampaign; dimension: Dimension }) {
  const { t } = useI18n();
  const { fmtDateRange } = useFormatters();
  const excluded = campaign.activeDays < MIN_BENCHMARK_ACTIVE_DAYS;

  return (
    <Tr>
      <Td>
        {/* Benchmark rows projected from a live campaign carry its id behind a
            `bm-live-` prefix (see api/mock/data.ts projectLiveCampaign). */}
        <TextLink to={paths.campaign(campaign.id.replace(/^bm-live-/, ''))} variant="record" newTab>
          {campaign.name}
        </TextLink>
        {excluded && (
          <span className="ml-2 inline-flex align-middle">
            <Pill
              tone="amber"
              title={t('benchmarkDetail.excludedHint', { days: campaign.activeDays, floor: MIN_BENCHMARK_ACTIVE_DAYS })}
            >
              {t('benchmarkDetail.excluded')}
            </Pill>
          </span>
        )}
      </Td>
      <Td>{campaign.agencyName ?? t('campaigns.agency.direct')}</Td>
      {dimension !== 'client' && <Td>{campaign.companyName}</Td>}
      {dimension !== 'market' && (
        <Td>
          <Pill tone="teal">{campaign.market}</Pill>
        </Td>
      )}
      <Td>
        <span className="text-xs text-gray-500 dark:text-gray-400">{fmtDateRange(campaign.flightStart, campaign.flightEnd)}</span>
      </Td>
      <Td align="right">{fmtCompact(campaign.impressions)}</Td>
      {BENCHMARK_METRICS.map((m) => (
        <Td key={m} align="right">
          {fmtMetric(m, campaign[m])}
        </Td>
      ))}
      <Td align="right">
        <DeliveryBar pacing={campaign.deliveryPacing} />
      </Td>
    </Tr>
  );
}
