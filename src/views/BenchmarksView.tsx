import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BarChart3, Download, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fmtCompact, fmtInt, fmtMetric, fmtPct } from '../mock/data';
import { useI18n } from '../lib/i18n';
import { usePageTitle } from '../lib/usePageTitle';
import { CHART_COLORS, useAxisStyle } from '../lib/chart';
import {
  BENCHMARK_METRICS,
  DIMENSIONS,
  LOW_SAMPLE,
  MIN_BENCHMARK_ACTIVE_DAYS,
  type BenchmarkGroup,
  type BenchmarkMetric,
  type Dimension,
  type Trend,
} from '../lib/benchmarks';
import { useBenchmarks } from '../hooks/useBenchmarks';
import { usePagination } from '../hooks/usePagination';
import { exportToCsv } from '../lib/exportCsv';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Pagination,
  Pill,
  SearchInput,
  SectionTitle,
  SegmentedControl,
  SortableTh,
  TableScroll,
  Td,
  Th,
  Tooltip,
} from '../components/primitives';
import { Select, SelectContent, SelectItem, SelectTrigger } from '../components/ui/select';

type SortKey = 'group' | 'campaigns' | 'impressions' | 'avg' | 'p50' | 'p75' | 'p90';
const PAGE_SIZE = 10;

function isDimension(v: string | null): v is Dimension {
  return v !== null && (DIMENSIONS as string[]).includes(v);
}

function isMetric(v: string | null): v is BenchmarkMetric {
  return v !== null && (BENCHMARK_METRICS as string[]).includes(v);
}

/**
 * Cross-client comparison, redone from the KPI platform's three separate
 * category/country/client pages. One view with a dimension switcher rather
 * than three near-identical files — the only thing that actually differed
 * between them was which field the rows grouped on.
 */
export default function BenchmarksView() {
  const { t } = useI18n();
  usePageTitle(t('benchmarks.title'));

  // Dimension and metric live in the URL so a "look at Food Retail's CTR"
  // link survives being pasted into Slack.
  const [params, setParams] = useSearchParams();
  const dimension: Dimension = isDimension(params.get('dimension')) ? (params.get('dimension') as Dimension) : 'industry';
  const metric: BenchmarkMetric = isMetric(params.get('metric')) ? (params.get('metric') as BenchmarkMetric) : 'ctr';

  const setParam = (key: string, value: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set(key, value);
        return next;
      },
      { replace: true }
    );

  const [q, setQ] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'impressions', desc: true });

  const { data, isLoading, isError, refetch } = useBenchmarks(dimension);

  const rows = useMemo(() => {
    const groups = data?.groups ?? [];
    const needle = q.trim().toLowerCase();
    const filtered = needle ? groups.filter((g) => g.displayName.toLowerCase().includes(needle)) : groups;

    // Missing stats sort last regardless of direction — a group whose sources
    // never measured this metric is not "the worst performer".
    const value = (g: BenchmarkGroup, key: SortKey): number | string => {
      switch (key) {
        case 'group':
          return g.displayName.toLowerCase();
        case 'campaigns':
          return g.campaignCount;
        case 'impressions':
          return g.impressions;
        default:
          return g.stats[metric]?.[key] ?? -1;
      }
    };

    return [...filtered].sort((a, b) => {
      const av = value(a, sort.key);
      const bv = value(b, sort.key);
      const cmp = typeof av === 'string' && typeof bv === 'string' ? av.localeCompare(bv) : Number(av) - Number(bv);
      return sort.desc ? -cmp : cmp;
    });
  }, [data, q, sort, metric]);

  const toggleSort = (key: SortKey) => setSort((prev) => ({ key, desc: prev.key === key ? !prev.desc : true }));

  const { page, setPage, pageCount, paged: pagedRows, from, to } = usePagination(rows, PAGE_SIZE);

  useEffect(() => setPage(0), [q, sort, dimension, metric, setPage]);

  const exportRows = () =>
    exportToCsv(
      `benchmarks-${dimension}.csv`,
      rows,
      [
        { key: 'displayName', header: t('benchmarks.col.group') },
        { key: 'campaignCount', header: t('benchmarks.col.campaigns') },
        { key: 'impressions', header: t('benchmarks.col.impressions') },
        { key: 'avg', header: t('benchmarks.col.avg'), format: (g) => (g.stats[metric] ? fmtMetric(metric, g.stats[metric]!.avg) : '—') },
        { key: 'p50', header: t('benchmarks.col.p50'), format: (g) => (g.stats[metric] ? fmtMetric(metric, g.stats[metric]!.p50) : '—') },
        { key: 'p75', header: t('benchmarks.col.p75'), format: (g) => (g.stats[metric] ? fmtMetric(metric, g.stats[metric]!.p75) : '—') },
        { key: 'p90', header: t('benchmarks.col.p90'), format: (g) => (g.stats[metric] ? fmtMetric(metric, g.stats[metric]!.p90) : '—') },
        { key: 'trend', header: t('benchmarks.col.trend'), format: (g) => t(`benchmarks.trend.${g.trend}`) },
      ]
    );

  const overall = data?.overall[metric] ?? null;

  const chartData = useMemo(
    () =>
      rows
        .filter((g) => g.stats[metric] !== null)
        .map((g) => ({ name: g.displayName, value: g.stats[metric]!.avg * 100, key: g.key }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 12),
    [rows, metric]
  );

  if (isLoading) {
    return <LoadingState label={t('common.loading')} />;
  }

  if (isError || !data) {
    return <ErrorState label={t('common.loadError')} retryLabel={t('common.retry')} onRetry={() => refetch()} />;
  }

  const metricLabel = t(`metric.${metric}.label`);

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brame-dark dark:text-white">{t('benchmarks.title')}</h1>
          <p className="mt-1 max-w-3xl text-sm text-gray-500 dark:text-gray-400">{t('benchmarks.subtitle')}</p>
        </div>
        <Button variant="primary" icon={<Download size={13} />} onClick={exportRows} disabled={rows.length === 0}>
          {t('common.exportCsv')}
        </Button>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryTile
          label={t('benchmarks.tile.campaigns')}
          value={fmtInt(data.windowCampaignCount)}
          hint={t('benchmarks.tile.campaignsHint')}
        />
        <SummaryTile label={t('benchmarks.tile.buckets')} value={String(data.groups.length)} />
        <SummaryTile
          label={t('benchmarks.tile.overallCtr')}
          value={data.overall.ctr ? fmtPct(data.overall.ctr.avg, 2) : '—'}
        />
        <SummaryTile
          label={t('benchmarks.tile.overallViewability')}
          value={data.overall.viewability ? fmtPct(data.overall.viewability.avg) : '—'}
        />
      </div>

      {/* One filter bar, same composition as the Campaigns list: search plus
          every filter control inside one bordered card row. Dimension is the
          loudest control here — every number below only means something once
          you know what it was grouped by. */}
      <Card padded={false} className="mb-5">
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 p-4 dark:border-white/10">
          <SearchInput value={q} onChange={setQ} placeholder={t('benchmarks.search')} className="min-w-56" />

          <div className="w-56">
            <Select value={metric} onValueChange={(v) => setParam('metric', v)}>
              <SelectTrigger />
              <SelectContent>
                {BENCHMARK_METRICS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {t(`metric.${m}.label`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <SegmentedControl
            value={dimension}
            onChange={(d) => setParam('dimension', d)}
            className="flex h-10 items-center gap-1 rounded-lg bg-gray-100 p-1 dark:bg-white/5"
            indicatorClassName="rounded-md bg-white shadow-sm dark:bg-brame-dark-light"
            itemClassName="flex h-full items-center rounded-md px-3 text-xs font-medium transition-colors"
            activeItemClassName="text-brame-dark dark:text-white"
            inactiveItemClassName="text-gray-500 hover:text-brame-dark dark:text-gray-400 dark:hover:text-gray-100"
            options={DIMENSIONS.map((d) => ({ value: d, label: t(`benchmarks.dimension.${d}`) }))}
          />
        </div>
      </Card>

      {data.groups.length === 0 ? (
        <EmptyState icon={<BarChart3 size={32} />} title={t('benchmarks.empty.title')} body={t('benchmarks.empty.body')} />
      ) : (
        <>
          <Card className="mb-5">
            <SectionTitle
              hint={t('benchmarks.chartHint', { days: MIN_BENCHMARK_ACTIVE_DAYS })}
            >
              {t('benchmarks.chartTitle', {
                metric: metricLabel,
                dimension: t(`benchmarks.dimension.${dimension}`),
              })}
            </SectionTitle>
            {chartData.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                {t('benchmarks.notMeasured')}
              </p>
            ) : (
              <RankedBars data={chartData} overallPct={overall ? overall.avg * 100 : null} metric={metric} />
            )}
          </Card>

          <Card padded={false}>
            <TableScroll>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-white/10">
                    <SortableTh col="group" active={sort.key === 'group'} desc={sort.desc} onToggle={toggleSort}>
                      {t('benchmarks.col.group')}
                    </SortableTh>
                    <SortableTh col="campaigns" align="right" active={sort.key === 'campaigns'} desc={sort.desc} onToggle={toggleSort}>
                      {t('benchmarks.col.campaigns')}
                    </SortableTh>
                    <SortableTh col="impressions" align="right" active={sort.key === 'impressions'} desc={sort.desc} onToggle={toggleSort}>
                      {t('benchmarks.col.impressions')}
                    </SortableTh>
                    <SortableTh col="avg" align="right" active={sort.key === 'avg'} desc={sort.desc} onToggle={toggleSort}>
                      {t('benchmarks.col.avg')}
                    </SortableTh>
                    <SortableTh col="p50" align="right" active={sort.key === 'p50'} desc={sort.desc} onToggle={toggleSort}>
                      {t('benchmarks.col.p50')}
                    </SortableTh>
                    <SortableTh col="p75" align="right" active={sort.key === 'p75'} desc={sort.desc} onToggle={toggleSort}>
                      {t('benchmarks.col.p75')}
                    </SortableTh>
                    <SortableTh col="p90" align="right" active={sort.key === 'p90'} desc={sort.desc} onToggle={toggleSort}>
                      {t('benchmarks.col.p90')}
                    </SortableTh>
                    <Th>{t('benchmarks.col.trend')}</Th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.map((g) => (
                    <GroupRow key={g.key} group={g} dimension={dimension} metric={metric} />
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                        {t('benchmarks.noMatches')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TableScroll>
            {rows.length > 0 && (
              <div className="border-t border-gray-200 p-4 dark:border-white/10">
                <Pagination page={page} pageCount={pageCount} from={from} to={to} total={rows.length} onPageChange={setPage} />
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function SummaryTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card padded={false} className="p-3">
      <div className="flex items-center gap-1 truncate text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        <span className="truncate">{label}</span>
        {hint && <Tooltip text={hint} />}
      </div>
      <div className="tnum mt-0.5 text-xl font-bold text-brame-dark dark:text-white">{value}</div>
    </Card>
  );
}


function GroupRow({
  group,
  dimension,
  metric,
}: {
  group: BenchmarkGroup;
  dimension: Dimension;
  metric: BenchmarkMetric;
}) {
  const { t } = useI18n();
  const stats = group.stats[metric];

  return (
    <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50 dark:border-white/5 dark:hover:bg-white/5">
      <Td>
        <Link
          to={`/benchmarks/${dimension}/${encodeURIComponent(group.key)}`}
          className="font-medium text-brame-dark hover:text-brame-teal dark:text-gray-100 dark:hover:text-brame-turquoise-light"
        >
          {group.displayName}
        </Link>
        {group.lowSample && (
          <span className="ml-2 inline-flex align-middle">
            <Pill tone="amber" title={t('benchmarks.lowSampleHint', { n: LOW_SAMPLE })}>
              {t('benchmarks.lowSample')}
            </Pill>
          </span>
        )}
      </Td>
      <Td align="right">{fmtInt(group.campaignCount)}</Td>
      <Td align="right">{fmtCompact(group.impressions)}</Td>
      {stats ? (
        <>
          <Td align="right" className="font-semibold">
            {fmtMetric(metric, stats.avg)}
          </Td>
          <Td align="right">{fmtMetric(metric, stats.p50)}</Td>
          <Td align="right">{fmtMetric(metric, stats.p75)}</Td>
          <Td align="right">{fmtMetric(metric, stats.p90)}</Td>
        </>
      ) : (
        // Not measured is not zero — one labelled blank spanning the stat
        // columns says why, instead of four misleading dashes.
        <td colSpan={4} className="px-4 py-3 text-right text-sm text-gray-400 dark:text-gray-500">
          <span className="inline-flex items-center gap-1">
            —
            <Tooltip text={t('benchmarks.notMeasured')} />
          </span>
        </td>
      )}
      <Td>
        <TrendCell trend={group.trend} pct={group.trendPct} />
      </Td>
    </tr>
  );
}

function TrendCell({ trend, pct }: { trend: Trend; pct: number }) {
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

  return (
    <span className="inline-flex items-center gap-1.5">
      <Pill tone={tone} icon={icon}>
        {t(`benchmarks.trend.${trend}`)}
      </Pill>
      {trend !== 'stable' && (
        <span className="tnum text-xs text-gray-400 dark:text-gray-500">
          {pct > 0 ? '+' : ''}
          {(pct * 100).toFixed(1)}%
        </span>
      )}
    </span>
  );
}

/**
 * Horizontal bars with the portfolio average as a reference line, carried over
 * from the KPI dashboard's BenchmarkComparison. Solid fill at or above the
 * average, pale below — so the ranking reads without consulting the legend.
 */
function RankedBars({
  data,
  overallPct,
  metric,
}: {
  data: { name: string; value: number; key: string }[];
  overallPct: number | null;
  metric: BenchmarkMetric;
}) {
  const { axis, grid, tooltipStyle, tooltipItemStyle, tooltipLabelStyle, cursorFill } = useAxisStyle();
  // Bars need room to stay legible as buckets multiply; clients especially.
  const height = Math.max(220, data.length * 34);

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={grid} horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={(v: number) => `${v.toFixed(1)}%`}
            tick={axis}
            tickLine={false}
            axisLine={false}
            domain={[0, 'dataMax + 0.5']}
          />
          <YAxis type="category" dataKey="name" width={130} tick={axis} tickLine={false} axisLine={false} />
          <RTooltip
            cursor={{ fill: cursorFill }}
            formatter={(v: unknown) => [typeof v === 'number' ? fmtMetric(metric, v / 100) : '—', '']}
            contentStyle={tooltipStyle}
            itemStyle={tooltipItemStyle}
            labelStyle={tooltipLabelStyle}
          />
          {overallPct !== null && (
            <ReferenceLine x={overallPct} stroke={CHART_COLORS.purple} strokeDasharray="4 4" strokeWidth={1.5} />
          )}
          {/* fill here is what Recharts uses to color the tooltip's item text;
              the per-Cell fill below only affects each bar's own paint. */}
          <Bar dataKey="value" fill={CHART_COLORS.teal} radius={[0, 4, 4, 0]} barSize={18} isAnimationActive={false}>
            {data.map((d) => (
              <Cell
                key={d.key}
                fill={overallPct !== null && d.value >= overallPct ? CHART_COLORS.teal : CHART_COLORS.turquoiseLight}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
