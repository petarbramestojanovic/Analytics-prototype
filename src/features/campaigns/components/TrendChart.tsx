import { useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { SlidersHorizontal } from 'lucide-react';
import { useFormatters, useI18n } from '@/i18n';
import { fmtCompact, fmtMetric, fmtPct, EMPTY_VALUE } from '@/lib/format';
import { useAxisStyle } from '@/components/charts';
import { SectionTitle, ToolbarButton } from '@/components/page';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui';
import {
  TREND_METRICS,
  TREND_METRIC_COLORS,
  type BenchmarkableTrendMetric,
  type TrendMetric,
  type TrendPoint,
} from '../lib/trend';

/** A benchmark value per metric, only ever set for the metrics that are
 *  actually benchmarked (engagementRate, ctr). */
export type BenchmarkValues = Partial<Record<BenchmarkableTrendMetric, number>>;

const BENCHMARKABLE: readonly BenchmarkableTrendMetric[] = ['engagementRate', 'ctr'];

const LINE_ANIMATION = { animationDuration: 500, animationEasing: 'ease-out' } as const;

/** Draw (and legend) order — the volume line first, then the rates. */
const LINE_ORDER: readonly TrendMetric[] = ['impressions', 'delivery', 'engagementRate', 'ctr'];

/**
 * The one trend chart used everywhere in the app that shows a daily series —
 * Overview, a client's own detail page, and each Campaign Details page — with
 * a metrics dropdown (top right) instead of each caller building its own. The
 * four metrics it can plot are always the same set (delivery, impressions,
 * engagement rate, CTR); only the underlying data and the available
 * benchmarks change between callers.
 */
export function TrendChart({
  title,
  hint,
  daily,
  defaultMetrics = ['impressions'],
  frameBenchmark,
  industryBenchmark,
  industryLabel,
}: {
  title: string;
  hint?: string;
  daily: TrendPoint[];
  defaultMetrics?: TrendMetric[];
  /** Brame's own portfolio-wide average — never scoped to one tenant. */
  frameBenchmark?: BenchmarkValues;
  /** Average for this campaign/client's own industry bucket. */
  industryBenchmark?: BenchmarkValues;
  industryLabel?: string;
}) {
  const { t } = useI18n();
  const { fmtDate, fmtDateLong } = useFormatters();
  const { axis, grid, tooltipStyle } = useAxisStyle();
  const [selected, setSelected] = useState<TrendMetric[]>(defaultMetrics);
  const [showFrame, setShowFrame] = useState(false);
  const [showIndustry, setShowIndustry] = useState(false);

  const metricLabel = (m: TrendMetric) => (m === 'delivery' ? t('trend.metric.delivery') : t(`metric.${m}.label`));
  const toggleMetric = (metric: TrendMetric, checked: boolean) =>
    setSelected((prev) => (checked ? [...prev, metric] : prev.filter((m) => m !== metric)));

  const showsImpressions = selected.includes('impressions');
  const pctMetrics = selected.filter((m) => m !== 'impressions');
  const benchmarked = BENCHMARKABLE.filter((m) => selected.includes(m));

  // A gap is a day where no active campaign's *primary* source measured this
  // metric at all — the RFC's "never invent a number for a source that
  // doesn't measure it" rule applied day-by-day. The line is deliberately
  // broken there (connectNulls={false}) rather than interpolated or padded
  // with 0.
  const hasGap = pctMetrics.some((m) => daily.some((d) => d[m] == null));

  const benchmarkLines = [
    { show: showFrame, values: frameBenchmark, key: 'frame', dash: '6 3', label: t('trend.benchmark.frameShort'), position: 'insideTopRight' },
    { show: showIndustry, values: industryBenchmark, key: 'industry', dash: '2 3', label: t('trend.benchmark.industryShort'), position: 'insideBottomRight' },
  ] as const;

  return (
    <div>
      <SectionTitle
        hint={hint}
        action={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <ToolbarButton size="xs" icon={<SlidersHorizontal size={12} />}>
                {t('trend.metricsToggle')}
              </ToolbarButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {TREND_METRICS.map((metric) => (
                <DropdownMenuCheckboxItem
                  key={metric}
                  checked={selected.includes(metric)}
                  onCheckedChange={(checked) => toggleMetric(metric, checked)}
                >
                  <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: TREND_METRIC_COLORS[metric] }} />
                  {metricLabel(metric)}
                </DropdownMenuCheckboxItem>
              ))}
              {(frameBenchmark || industryBenchmark) && <DropdownMenuSeparator />}
              {frameBenchmark && (
                <DropdownMenuCheckboxItem checked={showFrame} onCheckedChange={setShowFrame}>
                  {t('trend.benchmark.frame')}
                </DropdownMenuCheckboxItem>
              )}
              {industryBenchmark && (
                <DropdownMenuCheckboxItem checked={showIndustry} onCheckedChange={setShowIndustry}>
                  {t('trend.benchmark.industry', { industry: industryLabel ?? '' })}
                </DropdownMenuCheckboxItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        }
      >
        {title}
      </SectionTitle>

      {selected.length === 0 ? (
        <p className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">{t('trend.selectAtLeastOne')}</p>
      ) : (
        <>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
                <XAxis dataKey="date" tickFormatter={fmtDate} tick={axis} tickLine={false} />
                <YAxis
                  yAxisId="count"
                  hide={!showsImpressions}
                  orientation="left"
                  tickFormatter={fmtCompact}
                  tick={axis}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="pct"
                  hide={pctMetrics.length === 0}
                  orientation="right"
                  tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                  tick={axis}
                  tickLine={false}
                  axisLine={false}
                />
                <RTooltip
                  formatter={(v: unknown, name: unknown, item: unknown) => {
                    const dataKey = (item as { dataKey?: TrendMetric } | undefined)?.dataKey;
                    if (typeof v !== 'number') return [EMPTY_VALUE, String(name ?? '')];
                    const formatted = !dataKey || dataKey === 'delivery' ? fmtPct(v, 1) : fmtMetric(dataKey, v);
                    return [formatted, String(name ?? '')];
                  }}
                  labelFormatter={(l) => fmtDateLong(String(l))}
                  contentStyle={tooltipStyle}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />

                {LINE_ORDER.filter((m) => selected.includes(m)).map((m) => (
                  <Line
                    key={m}
                    yAxisId={m === 'impressions' ? 'count' : 'pct'}
                    type="monotone"
                    dataKey={m}
                    name={metricLabel(m)}
                    stroke={TREND_METRIC_COLORS[m]}
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                    {...LINE_ANIMATION}
                  />
                ))}

                {benchmarkLines.flatMap((line) =>
                  line.show
                    ? benchmarked
                        .filter((m) => line.values?.[m] != null)
                        .map((m) => (
                          <ReferenceLine
                            key={`${line.key}-${m}`}
                            yAxisId="pct"
                            y={line.values![m]}
                            stroke={TREND_METRIC_COLORS[m]}
                            strokeDasharray={line.dash}
                            strokeWidth={1.5}
                            label={{ value: line.label, position: line.position, fill: TREND_METRIC_COLORS[m], fontSize: 10 }}
                          />
                        ))
                    : []
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
          {hasGap && <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">{t('trend.gapNote')}</p>}
        </>
      )}
    </div>
  );
}
