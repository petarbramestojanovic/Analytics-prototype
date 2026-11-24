import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BarChart3, Download, TrendingUp } from 'lucide-react';
import { paths } from '@/config/paths';
import { useI18n } from '@/i18n';
import { usePageTitle } from '@/hooks/usePageTitle';
import { DEFAULT_PAGE_SIZE, usePagination } from '@/hooks/usePagination';
import { cn } from '@/lib/cn';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { EMPTY_VALUE, fmtCompact, fmtInt, fmtMetric, fmtSignedPct } from '@/lib/format';
import { exportToXlsx } from '@/lib/exportXlsx';
import { compareValues, toggleSort, type SortState } from '@/lib/sort';
import { Button, CARD_LINK, Card, CardFooter, Pill, Tabs, Tooltip } from '@/components/ui';
import { EmptyState, EmptyText, ErrorState, PageSkeleton } from '@/components/feedback';
import { FilterSelect, Page, PageHeader, PeriodPicker, SectionTitle, SortBar } from '@/components/page';
import { Pagination, SortableTh, Table, Td, Th, Tr } from '@/components/table';
import { CardStat, RingProgress, StatGrid, SummaryTile, TextLink } from '@/components/display';
import { MetricIcon, relativeChange } from '@/features/campaigns';
import { useBenchmarks } from '@/api/hooks/useBenchmarks';
import { useBenchmarkPeriod } from '../hooks/useBenchmarkPeriod';
import { BenchmarkViewTabs } from '../components/BenchmarkViewTabs';
import { LowSamplePill } from '../components/LowSamplePill';
import { parseBenchmarkView } from '../lib/benchmarkView';
import { BenchmarkPoolView } from './BenchmarkCompareViews';
import { TrendIcon } from '../components/TrendIndicator';
import {
  BENCHMARK_METRICS,
  DIMENSIONS,
  MIN_BENCHMARK_ACTIVE_DAYS,
  MIN_COMPARE_SAMPLE,
  meetsSample,
  parseBenchmarkMetric,
  parseDimension,
  type BenchmarkGroup,
  type BenchmarkMetric,
  type Dimension,
  type Stats,
} from '../lib/benchmarks';

/** How far a group sits from the KLEA average, as a fraction — only once it
 *  clears the sample floor, so a thin bucket never reads as "strong" or "weak". */
const vsKlea = (own: Stats | null | undefined, overall: Stats | null): number | null =>
  meetsSample(own) && overall?.avg ? relativeChange(overall.avg, own.avg) : null;

/** How many groups the ranking cards show. */
const TOP_N = 10;

type SortKey = 'group' | 'campaigns' | 'impressions' | BenchmarkMetric;

/** Table column order — engagement rate, then CTR, then viewability, per the
 *  agreed reading order. The chart's own metric dropdown doesn't touch this:
 *  the table always shows all three, side by side. */
const TABLE_METRICS: BenchmarkMetric[] = ['engagementRate', 'ctr', 'viewability'];

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
  const [params] = useSearchParams();
  const view = parseBenchmarkView(params.get('view'));
  return view === 'rankings' ? <RankingsView /> : <BenchmarkPoolView view={view} />;
}

function RankingsView() {
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

  const [sort, setSort] = useState<SortState<SortKey>>({ key: 'impressions', desc: true });
  const { filters: period, setFilter: setPeriod, range, scope } = useBenchmarkPeriod();
  // The group table needs room for seven columns; below that, each group is a card.
  const wide = useIsDesktop();
  const { data, isLoading, isError, refetch } = useBenchmarks(dimension, true, scope);

  const rows = useMemo(
    () =>
      [...(data?.groups ?? [])].sort((a, b) => {
        const cmp = compareValues(sortValue(a, sort.key), sortValue(b, sort.key));
        return sort.desc ? -cmp : cmp;
      }),
    [data, sort],
  );

  const { paged, pagination } = usePagination(rows, DEFAULT_PAGE_SIZE, [sort, dimension]);

  // The best groups on this metric, best first.
  const overall = data?.overall[metric] ?? null;
  const ranking = useMemo(
    () =>
      (data?.groups ?? [])
        .filter((g) => g.stats[metric] !== null)
        .map((g) => ({ group: g, stats: g.stats[metric]! }))
        .sort((a, b) => b.stats.avg - a.stats.avg)
        .slice(0, TOP_N),
    [data, metric]
  );

  // Where KLEA is strongest: the industries furthest above the KLEA average
  // (the ICP view), counting only buckets that clear the sample floor.
  const strongest = useMemo(
    () =>
      overall?.avg
        ? (data?.groups ?? [])
            .filter((g) => meetsSample(g.stats[metric]))
            .map((g) => ({ g, delta: relativeChange(overall.avg, g.stats[metric]!.avg) }))
            .filter((x) => x.delta > 0.05)
            .sort((a, b) => b.delta - a.delta)
            .slice(0, 3)
        : [],
    [data, metric, overall]
  );

  if (isLoading) return <PageSkeleton variant="list" />;
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />;

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
          <>
            <PeriodPicker allowAll align="end" showYoy={false} filters={period} range={range} onChange={setPeriod} />
            <Button variant="primary" icon={<Download size={13} />} onClick={exportRows} disabled={rows.length === 0}>
              {t('common.exportCsv')}
            </Button>
          </>
        }
      />

      <BenchmarkViewTabs view="rankings" />

      <StatGrid columns={5}>
        <SummaryTile
          label={t('benchmarks.tile.impressions')}
          value={fmtCompact(data.totals.impressions)}
          hint={t('benchmarks.tile.impressionsHint')}
          icon={<MetricIcon metric="impressions" />}
        />
        <SummaryTile
          label={t('benchmarks.tile.engagements')}
          value={fmtCompact(data.totals.engagements)}
          hint={t('benchmarks.tile.engagementsHint')}
          icon={<MetricIcon metric="engagements" />}
        />
        <SummaryTile
          label={t('benchmarks.tile.avgEngagement')}
          value={fmtMetric('engagementRate', data.overall.engagementRate?.avg)}
          icon={<MetricIcon metric="engagementRate" />}
        />
        <SummaryTile
          label={t('benchmarks.tile.avgCtr')}
          value={fmtMetric('ctr', data.overall.ctr?.avg)}
          icon={<MetricIcon metric="ctr" />}
        />
        <SummaryTile
          label={t('benchmarks.tile.avgViewability')}
          value={fmtMetric('viewability', data.overall.viewability?.avg)}
          icon={<MetricIcon metric="viewability" />}
        />
      </StatGrid>

      {/* What the groups are cut by (tabs) and the metric they are ranked on
          (dropdown) — every figure below only means something once you know both. */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <Tabs
          onPage
          value={dimension}
          onChange={(d) => setParam('dimension', d)}
          groupLabel={t('benchmarks.groupBy')}
          options={DIMENSIONS.map((d) => ({ value: d, label: t(`benchmarks.dimension.${d}`) }))}
        />
        <div className="flex w-full items-center gap-3 sm:w-auto">
          <span className="shrink-0 text-sm text-gray-500 dark:text-gray-400">{t('benchmarks.rankBy')}</span>
          <FilterSelect
            className="min-w-0 flex-1 sm:w-52 sm:flex-none"
            value={metric}
            onChange={(m) => setParam('metric', m)}
            options={BENCHMARK_METRICS.map((m) => ({ value: m, label: t(`metric.${m}.label`) }))}
          />
        </div>
      </div>

      {data.groups.length === 0 ? (
        <EmptyState icon={<BarChart3 size={32} />} title={t('benchmarks.empty.title')} body={t('benchmarks.empty.body')} />
      ) : (
        <>
          {dimension === 'industry' && strongest.length > 0 && (
            <Card className="mb-5">
              <SectionTitle hint={t('benchmarks.strong.hint', { min: MIN_COMPARE_SAMPLE })}>
                {t('benchmarks.strong.title', { metric: t(`metric.${metric}.label`) })}
              </SectionTitle>
              <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {strongest.map(({ g, delta }) => (
                  <li key={g.key}>
                    <Link
                      to={paths.benchmarkGroup(dimension, g.key)}
                      className="flex h-full items-center gap-4 rounded-xl bg-brame-mint p-4 transition-colors hover:bg-brame-sky focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brame-teal/50 dark:bg-brame-lime/10 dark:hover:bg-brame-lime/15"
                    >
                      <span
                        aria-hidden
                        className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full sm:flex bg-white text-brame-teal dark:bg-white/10 dark:text-brame-lime"
                      >
                        <TrendingUp size={18} strokeWidth={1.75} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="break-words font-medium text-brame-dark dark:text-gray-100">{g.displayName}</div>
                        <div className="tnum text-xs text-gray-500 dark:text-gray-400">
                          {fmtMetric(metric, g.stats[metric]!.avg)} · {t('cmp.matrix.sampleValue', { n: g.campaignCount })}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="tnum font-heading text-xl font-medium text-brame-teal dark:text-brame-lime">
                          {fmtSignedPct(delta, 0)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{t('benchmarks.strong.vs')}</div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card className="mb-5">
            <SectionTitle hint={t('benchmarks.rankingHint', { days: MIN_BENCHMARK_ACTIVE_DAYS })}>
              {t('benchmarks.rankingTitle', {
                count: TOP_N,
                metric: t(`metric.${metric}.label`),
                dimension: t(`benchmarks.dimension.${dimension}`),
              })}
            </SectionTitle>
            {ranking.length === 0 ? (
              <EmptyText className="px-0">{t('benchmarks.notMeasured')}</EmptyText>
            ) : (
              <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {ranking.map(({ group, stats }, i) => (
                  <RankCard
                    key={group.key}
                    rank={i + 1}
                    group={group}
                    dimension={dimension}
                    metric={metric}
                    avg={stats.avg}
                    best={ranking[0].stats.avg}
                    overall={overall}
                  />
                ))}
              </ol>
            )}
          </Card>

          <Card padded={false}>
            {wide ? (
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
                  <Th align="center">
                    <span className="inline-flex items-center gap-1">
                      {t('benchmarks.col.vsBrame', { metric: t(`metric.${metric}.label`) })}
                      <Tooltip text={t('benchmarks.col.vsBrameHint')} />
                    </span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {paged.map((g) => (
                  <GroupRow key={g.key} group={g} dimension={dimension} metric={metric} overall={overall} />
                ))}
              </tbody>
            </Table>
            ) : (
              <>
                <GroupSortBar sort={sort} onSort={setSort} />
                <ul className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
                  {paged.map((g) => (
                    <li key={g.key}>
                      <GroupCard group={g} dimension={dimension} metric={metric} overall={overall} />
                    </li>
                  ))}
                </ul>
              </>
            )}
            <CardFooter>
              <Pagination {...pagination} />
            </CardFooter>
          </Card>
        </>
      )}
    </Page>
  );
}

/** One ranked group as a card: its place and name, the value, how far it sits
 *  from the KLEA average, and a ring showing how close it is to the top group. */
function RankCard({
  rank,
  group,
  dimension,
  metric,
  avg,
  best,
  overall,
}: {
  rank: number;
  group: BenchmarkGroup;
  dimension: Dimension;
  metric: BenchmarkMetric;
  avg: number;
  best: number;
  overall: Stats | null;
}) {
  const { t } = useI18n();
  const share = best > 0 ? avg / best : 0;
  const vsBrame = vsKlea(group.stats[metric], overall);
  const to = paths.benchmarkGroup(dimension, group.key);
  return (
    <li>
      <Link
        to={to}
        className={cn(CARD_LINK, 'flex h-full flex-col p-5')}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400">#{rank}</div>
            <div className="mt-0.5 line-clamp-2 break-words font-medium leading-snug text-brame-dark dark:text-gray-100" title={group.displayName}>
              {group.displayName}
            </div>
          </div>
          <RingProgress value={share} size={44} label={t('benchmarks.rank.ring', { pct: Math.round(share * 100) })}>
            {rank}
          </RingProgress>
        </div>
        <div className="tnum mt-auto pt-3 font-heading text-2xl font-medium tracking-tight text-brame-dark dark:text-white">
          {fmtMetric(metric, avg)}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs">
          {vsBrame === null ? (
            <span className="text-gray-500 dark:text-gray-400">{group.lowSample ? <LowSamplePill /> : EMPTY_VALUE}</span>
          ) : (
            <span
              className={cn(
                'tnum font-medium',
                vsBrame >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              )}
            >
              {fmtSignedPct(vsBrame, 0)} <span className="font-normal text-gray-500 dark:text-gray-400">{t('benchmarks.strong.vs')}</span>
            </span>
          )}
        </div>
      </Link>
    </li>
  );
}

/** The groups table on a small screen: a card per group — the numbers that
 *  matter, each metric with its trend, and how it sits against KLEA. */
function GroupCard({
  group,
  dimension,
  metric,
  overall,
}: {
  group: BenchmarkGroup;
  dimension: Dimension;
  metric: BenchmarkMetric;
  overall: Stats | null;
}) {
  const { t } = useI18n();
  const vsBrame = vsKlea(group.stats[metric], overall);
  return (
    <Link
      to={paths.benchmarkGroup(dimension, group.key)}
      className={cn(CARD_LINK, 'flex h-full flex-col p-4')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="break-words font-medium text-brame-dark dark:text-gray-100">{group.displayName}</div>
          <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {t('cmp.matrix.sampleValue', { n: group.campaignCount })} · {fmtCompact(group.impressions)}{' '}
            {t('benchmarks.col.impressions')}
          </div>
        </div>
        {vsBrame !== null ? (
          <Pill tone={vsBrame >= 0 ? 'green' : 'red'} className="tnum shrink-0">
            {fmtSignedPct(vsBrame, 0)}
          </Pill>
        ) : (
          group.lowSample && <LowSamplePill />
        )}
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-gray-100 pt-4 dark:border-white/10">
        {TABLE_METRICS.map((m) => {
          const stats = group.stats[m];
          return (
            <CardStat
              key={m}
              label={m === 'engagementRate' ? t('cmp.charts.metricShort.engagementRate') : t(`metric.${m}.label`)}
              valueClassName="inline-flex items-center gap-1"
            >
              {stats ? fmtMetric(m, stats.avg) : EMPTY_VALUE}
              {stats && <TrendIcon trend={group.trends[m].trend} />}
            </CardStat>
          );
        })}
      </dl>
    </Link>
  );
}

/** Cards have no column headers to click, so this is how they are sorted. */
function GroupSortBar({ sort, onSort }: { sort: SortState<SortKey>; onSort: (s: SortState<SortKey>) => void }) {
  const { t } = useI18n();
  const fields = [
    { value: 'group', label: t('benchmarks.col.group') },
    { value: 'campaigns', label: t('benchmarks.col.campaigns') },
    { value: 'impressions', label: t('benchmarks.col.impressions') },
    ...TABLE_METRICS.map((m) => ({ value: m, label: t(`metric.${m}.label`) })),
  ];
  return (
    <SortBar
      className="border-b"
      fields={fields}
      value={sort.key}
      desc={sort.desc}
      onChange={({ field, desc }) => onSort({ key: (field ?? sort.key) as SortKey, desc })}
    />
  );
}

function GroupRow({
  group,
  dimension,
  metric,
  overall,
}: {
  group: BenchmarkGroup;
  dimension: Dimension;
  metric: BenchmarkMetric;
  overall: Stats | null;
}) {
  const { t } = useI18n();
  const vsBrame = vsKlea(group.stats[metric], overall);

  return (
    <Tr to={paths.benchmarkGroup(dimension, group.key)}>
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
              <span className="inline-flex items-center gap-1.5 font-medium">
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
      <Td align="center">
        {vsBrame == null ? (
          <span className="text-gray-300 dark:text-gray-600">{EMPTY_VALUE}</span>
        ) : (
          <span
            className={cn(
              'tnum text-sm font-medium',
              vsBrame >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            )}
          >
            {fmtSignedPct(vsBrame, 0)}
          </span>
        )}
      </Td>
    </Tr>
  );
}
