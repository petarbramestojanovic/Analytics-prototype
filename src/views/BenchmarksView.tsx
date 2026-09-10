import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, ArrowUpDown, BarChart3, Minus, Search, TrendingDown, TrendingUp } from 'lucide-react';
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
import { Card, EmptyState, Pill, SectionTitle, TableScroll, Td, Th, Tooltip } from '../components/primitives';
import { Select, SelectContent, SelectItem, SelectTrigger } from '../components/ui/select';

type SortKey = 'group' | 'campaigns' | 'impressions' | 'avg' | 'p50' | 'p75' | 'p90';

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

  const { data, isLoading, isError } = useBenchmarks(dimension);

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
    return <div className="px-8 py-16 text-center text-sm text-gray-500 dark:text-gray-400">{t('common.loading')}</div>;
  }

  if (isError || !data) {
    return <div className="px-8 py-16 text-center text-sm text-red-600 dark:text-red-400">{t('common.loadError')}</div>;
  }

  const metricLabel = t(`metric.${metric}.label`);

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brame-dark dark:text-white">{t('benchmarks.title')}</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500 dark:text-gray-400">{t('benchmarks.subtitle')}</p>
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
          <div className="relative min-w-56 flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('benchmarks.search')}
              className="h-10 w-full rounded-lg border border-gray-300 pl-9 pr-3 text-sm text-brame-dark outline-none focus:border-brame-teal dark:border-white/15 dark:bg-brame-dark-light dark:text-gray-100 dark:placeholder:text-gray-500"
            />
          </div>

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

          <div className="flex h-10 items-center gap-1 rounded-lg bg-gray-100 p-1 dark:bg-white/5">
            {DIMENSIONS.map((d) => (
              <button
                key={d}
                onClick={() => setParam('dimension', d)}
                aria-pressed={dimension === d}
                className={`flex h-full items-center rounded-md px-3 text-xs font-medium transition-colors ${
                  dimension === d
                    ? 'bg-white text-brame-dark shadow-sm dark:bg-brame-dark-light dark:text-white'
                    : 'text-gray-500 hover:text-brame-dark dark:text-gray-400 dark:hover:text-gray-100'
                }`}
              >
                {t(`benchmarks.dimension.${d}`)}
              </button>
            ))}
          </div>
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
                    <SortableTh sort={sort} setSort={setSort} col="group">
                      {t('benchmarks.col.group')}
                    </SortableTh>
                    <SortableTh sort={sort} setSort={setSort} col="campaigns" align="right">
                      {t('benchmarks.col.campaigns')}
                    </SortableTh>
                    <SortableTh sort={sort} setSort={setSort} col="impressions" align="right">
                      {t('benchmarks.col.impressions')}
                    </SortableTh>
                    <SortableTh sort={sort} setSort={setSort} col="avg" align="right">
                      {t('benchmarks.col.avg')}
                    </SortableTh>
                    <SortableTh sort={sort} setSort={setSort} col="p50" align="right">
                      {t('benchmarks.col.p50')}
                    </SortableTh>
                    <SortableTh sort={sort} setSort={setSort} col="p75" align="right">
                      {t('benchmarks.col.p75')}
                    </SortableTh>
                    <SortableTh sort={sort} setSort={setSort} col="p90" align="right">
                      {t('benchmarks.col.p90')}
                    </SortableTh>
                    <Th>{t('benchmarks.col.trend')}</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((g) => (
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

function SortableTh({
  children,
  col,
  sort,
  setSort,
  align = 'left',
}: {
  children: React.ReactNode;
  col: SortKey;
  sort: { key: SortKey; desc: boolean };
  setSort: (s: { key: SortKey; desc: boolean }) => void;
  align?: 'left' | 'right';
}) {
  const active = sort.key === col;
  return (
    <Th align={align}>
      <button
        onClick={() => setSort({ key: col, desc: active ? !sort.desc : true })}
        className="inline-flex items-center gap-1 hover:text-brame-dark dark:hover:text-gray-200"
      >
        {children}
        {active ? (
          sort.desc ? (
            <ArrowDown size={11} />
          ) : (
            <ArrowUp size={11} />
          )
        ) : (
          <ArrowUpDown size={11} className="text-gray-300 dark:text-gray-600" />
        )}
      </button>
    </Th>
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
          <Bar dataKey="value" fill={CHART_COLORS.teal} radius={[0, 4, 4, 0]} barSize={18}>
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
