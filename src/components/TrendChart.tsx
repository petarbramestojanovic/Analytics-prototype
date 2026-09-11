import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts';
import { fmtCompact, fmtMetric } from '../mock/data';
import { useI18n, useFormatters } from '../lib/i18n';
import { CHART_COLORS, useAxisStyle } from '../lib/chart';
import type { TrendMetric } from '../lib/overview';

/**
 * The 90-day area chart behind Overview's trend card — extracted so a
 * client's own detail page (CompanyDetailView) can show the same visual,
 * scoped to just their campaigns, instead of a second hand-rolled chart.
 */
export default function TrendChart({
  daily,
  metric,
}: {
  daily: { date: string; impressions: number; ctr: number | null; viewability: number | null }[];
  metric: TrendMetric;
}) {
  const { t } = useI18n();
  const { fmtDate, fmtDateLong } = useFormatters();
  const { axis, grid, tooltipStyle } = useAxisStyle();
  const isPercent = metric !== 'impressions';

  // A gap is a day where no active campaign's *primary* source measured this
  // metric at all (e.g. an adserver-primary campaign can't report CTR) — the
  // RFC's "never invent a number for a source that doesn't measure it" rule
  // applied day-by-day, same as the empty states elsewhere in the app. The
  // line is deliberately broken there (connectNulls={false}) rather than
  // interpolated or padded with 0, so this note is the only thing standing
  // between that gap and looking like missing/broken data.
  const hasGap = metric !== 'impressions' && daily.some((d) => d[metric] == null);

  return (
    <div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={daily}>
            <defs>
              <linearGradient id="gTrend" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.teal} stopOpacity={0.28} />
                <stop offset="100%" stopColor={CHART_COLORS.teal} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
            <XAxis dataKey="date" tickFormatter={fmtDate} tick={axis} tickLine={false} />
            <YAxis
              tickFormatter={isPercent ? (v: number) => `${(v * 100).toFixed(1)}%` : fmtCompact}
              tick={axis}
              tickLine={false}
              axisLine={false}
            />
            <RTooltip
              formatter={(v: unknown) => [typeof v === 'number' ? fmtMetric(metric, v) : '—', t(`metric.${metric}.label`)]}
              labelFormatter={(l) => fmtDateLong(String(l))}
              contentStyle={tooltipStyle}
            />
            <Area
              type="monotone"
              dataKey={metric}
              name={t(`metric.${metric}.label`)}
              stroke={CHART_COLORS.teal}
              strokeWidth={2}
              fill="url(#gTrend)"
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {hasGap && <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">{t('trend.gapNote')}</p>}
    </div>
  );
}
