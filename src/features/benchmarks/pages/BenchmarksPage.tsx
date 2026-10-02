import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BarChart3, Download } from 'lucide-react';
import { paths } from '@/config/paths';
import { useI18n } from '@/i18n';
import { usePageTitle } from '@/hooks/usePageTitle';
import { usePagination } from '@/hooks/usePagination';
import { EMPTY_VALUE, fmtCompact, fmtInt, fmtMetric } from '@/lib/format';
import { exportToXlsx } from '@/lib/exportXlsx';
import { matchesQuery } from '@/lib/text';
import { compareValues, toggleSort, type SortState } from '@/lib/sort';
import { Button, Card, CardFooter, Tabs, Tooltip } from '@/components/ui';
import { EmptyState, EmptyText, ErrorState, LoadingState } from '@/components/feedback';
import { FilterSelect, ListToolbar, Page, PageHeader, SearchInput, SectionTitle } from '@/components/page';
import { Pagination, SortableTh, Table, TableEmptyRow, Td, Tr } from '@/components/table';
import { StatGrid, SummaryTile, TextLink } from '@/components/display';
import { useBenchmarks } from '@/api/hooks/useBenchmarks';
import { LowSamplePill } from '../components/LowSamplePill';
import { RankedBars } from '../components/RankedBars';
import { TrendIcon } from '../components/TrendIndicator';
import {
  BENCHMARK_METRICS,
  DIMENSIONS,
  MIN_BENCHMARK_ACTIVE_DAYS,
  parseBenchmarkMetric,
  parseDimension,
  type BenchmarkGroup,
  type BenchmarkMetric,
  type Dimension,
} from '../lib/benchmarks';

type SortKey = 'group' | 'campaigns' | 'impressions' | BenchmarkMetric;

/** Table column order — engagement rate, then CTR, then viewability, per the
 *  agreed reading order. The chart's own metric dropdown doesn't touch this:
 *  the table always shows all three, side by side. */
const TABLE_METRICS: BenchmarkMetric[] = ['engagementRate', 'ctr', 'viewability'];
const PAGE_SIZE = 10;

/** Missing stats sort last regardless of direction — a group whose sources
 *  never measured this metric is not "the worst performer". */
function sortValue(g: BenchmarkGroup, key: SortKey): number | string {
  switch (key) {
    case 'group':
      return g.displayName.toLowerCase();
    case 'campaigns':
      return g.campaignCount;
    case 'impressions':
      return g.impressions;
    default:
      return g.stats[key]?.avg ?? -1;
  }
}

/**
 * Cross-client comparison, redone from the KPI platform's three separate
 * category/country/client pages. One view with a dimension switcher rather
 * than three near-identical files — the only thing that actually differed
 * between them was which field the rows grouped on.
 */
export function BenchmarksPage() {
  const { t } = useI18n();
  usePageTitle(t('benchmarks.title'));

  // Dimension and metric live in the URL so a "look at Food Retail's CTR"
  // link survives being pasted into Slack.
  const [params, setParams] = useSearchParams();
  const dimension = parseDimension(params.get('dimension'));
  const metric = parseBenchmarkMetric(params.get('metric'));
  const setParam = (key: 'dimension' | 'metric', value: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set(key, value);
        return next;
      },
      { replace: true }
    );

  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortState<SortKey>>({ key: 'impressions', desc: true });
  const { data, isLoading, isError, refetch } = useBenchmarks(dimension);

  const rows = useMemo(() => {
    const filtered = (data?.groups ?? []).filter((g) => matchesQuery(q, g.displayName));
    return [...filtered].sort((a, b) => {
      const cmp = compareValues(sortValue(a, sort.key), sortValue(b, sort.key));
      return sort.desc ? -cmp : cmp;
    });
  }, [data, q, sort]);

  const { paged, pagination } = usePagination(rows, PAGE_SIZE, [q, sort, dimension]);

  const chartData = useMemo(
    () =>
      rows
        .filter((g) => g.stats[metric] !== null)
        .map((g) => ({ name: g.displayName, value: g.stats[metric]!.avg * 100, key: g.key }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 12),
    [rows, metric]
  );

  if (isLoading) return <LoadingState />;
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />;

  const overall = data.overall[metric];

  const exportRows = () =>
    exportToXlsx(`benchmarks-${dimension}.xlsx`, rows, [
      { key: 'displayName', header: t('benchmarks.col.group') },
      { key: 'campaignCount', header: t('benchmarks.col.campaigns') },
      { key: 'impressions', header: t('benchmarks.col.impressions') },
      ...TABLE_METRICS.flatMap((m) => [
        { key: m, header: t(`metric.${m}.label`), format: (g: BenchmarkGroup) => fmtMetric(m, g.stats[m]?.avg) },
        {
          key: `${m}Trend`,
          header: t('benchmarks.col.trendOf', { metric: t(`metric.${m}.label`) }),
          format: (g: BenchmarkGroup) => (g.stats[m] ? t(`benchmarks.trend.${g.trends[m].trend}`) : EMPTY_VALUE),
        },
      ]),
    ]);

  return (
    <Page>
      <PageHeader
        title={t('benchmarks.title')}
        subtitle={t('benchmarks.subtitle')}
        actions={
          <Button variant="primary" icon={<Download size={13} />} onClick={exportRows} disabled={rows.length === 0}>
            {t('common.exportCsv')}
          </Button>
        }
      />

      <StatGrid>
        <SummaryTile
          label={t('benchmarks.tile.campaigns')}
          value={fmtInt(data.windowCampaignCount)}
          hint={t('benchmarks.tile.campaignsHint')}
        />
        <SummaryTile label={t('benchmarks.tile.buckets')} value={String(data.groups.length)} />
        <SummaryTile label={t('benchmarks.tile.overallCtr')} value={fmtMetric('ctr', data.overall.ctr?.avg)} />
        <SummaryTile label={t('benchmarks.tile.overallViewability')} value={fmtMetric('viewability', data.overall.viewability?.avg)} />
      </StatGrid>

      {/* Dimension is the loudest control here — every number below only
          means something once you know what it was grouped by. */}
      <ListToolbar className="mb-5">
        <SearchInput value={q} onChange={setQ} placeholder={t('benchmarks.search')} className="min-w-56" />
        <FilterSelect
          value={metric}
          onChange={(v) => setParam('metric', v)}
          options={BENCHMARK_METRICS.map((m) => ({ value: m, label: t(`metric.${m}.label`) }))}
        />
        <Tabs
          value={dimension}
          onChange={(d) => setParam('dimension', d)}
          options={DIMENSIONS.map((d) => ({ value: d, label: t(`benchmarks.dimension.${d}`) }))}
        />
      </ListToolbar>

      {data.groups.length === 0 ? (
        <EmptyState icon={<BarChart3 size={32} />} title={t('benchmarks.empty.title')} body={t('benchmarks.empty.body')} />
      ) : (
        <>
          <Card className="mb-5">
            <SectionTitle hint={t('benchmarks.chartHint', { days: MIN_BENCHMARK_ACTIVE_DAYS })}>
              {t('benchmarks.chartTitle', {
                metric: t(`metric.${metric}.label`),
                dimension: t(`benchmarks.dimension.${dimension}`),
              })}
            </SectionTitle>
            {chartData.length === 0 ? (
              <EmptyText className="px-0">{t('benchmarks.notMeasured')}</EmptyText>
            ) : (
              <RankedBars data={chartData} overallPct={overall ? overall.avg * 100 : null} metric={metric} />
            )}
          </Card>

          <Card padded={false}>
            <Table>
              <thead>
                <tr>
                  <SortableTh col="group" sort={sort} onToggle={(k) => setSort((s) => toggleSort(s, k))}>
                    {t('benchmarks.col.group')}
                  </SortableTh>
                  <SortableTh col="campaigns" align="right" sort={sort} onToggle={(k) => setSort((s) => toggleSort(s, k))}>
                    {t('benchmarks.col.campaigns')}
                  </SortableTh>
                  <SortableTh col="impressions" align="right" sort={sort} onToggle={(k) => setSort((s) => toggleSort(s, k))}>
                    {t('benchmarks.col.impressions')}
                  </SortableTh>
                  {TABLE_METRICS.map((m) => (
                    <SortableTh key={m} col={m} align="center" sort={sort} onToggle={(k) => setSort((s) => toggleSort(s, k))}>
                      {t(`metric.${m}.label`)}
                    </SortableTh>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((g) => (
                  <GroupRow key={g.key} group={g} dimension={dimension} />
                ))}
                {rows.length === 0 && (
                  <TableEmptyRow colSpan={3 + TABLE_METRICS.length}>{t('benchmarks.noMatches')}</TableEmptyRow>
                )}
              </tbody>
            </Table>
            {rows.length > 0 && (
              <CardFooter>
                <Pagination {...pagination} />
              </CardFooter>
            )}
          </Card>
        </>
      )}
    </Page>
  );
}

function GroupRow({ group, dimension }: { group: BenchmarkGroup; dimension: Dimension }) {
  const { t } = useI18n();

  return (
    <Tr>
      <Td>
        <TextLink to={paths.benchmarkGroup(dimension, group.key)} variant="record">
          {group.displayName}
        </TextLink>
        {group.lowSample && (
          <span className="ml-2 inline-flex align-middle">
            <LowSamplePill />
          </span>
        )}
      </Td>
      <Td align="right">{fmtInt(group.campaignCount)}</Td>
      <Td align="right">{fmtCompact(group.impressions)}</Td>
      {TABLE_METRICS.map((m) => {
        const stats = group.stats[m];
        return (
          <Td key={m} align="center">
            {stats ? (
              <span className="inline-flex items-center gap-1.5 font-semibold">
                {fmtMetric(m, stats.avg)}
                <TrendIcon trend={group.trends[m].trend} />
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-gray-400 dark:text-gray-500">
                {EMPTY_VALUE}
                <Tooltip text={t('benchmarks.notMeasured')} />
              </span>
            )}
          </Td>
        );
      })}
    </Tr>
  );
}
