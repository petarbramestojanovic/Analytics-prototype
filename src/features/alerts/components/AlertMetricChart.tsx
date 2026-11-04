import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts';
import { useFormatters, useI18n } from '@/i18n';
import { fmtCompact, fmtMetric, fmtPct } from '@/lib/format';
import { CHART_COLORS, useAxisStyle } from '@/components/charts';
import { deviceSplit, sourceMeta } from '@/features/campaigns';
import type { Campaign, MetricKey } from '@/types';
import type { AlertLogRow } from '../lib/alertLog';
import { metricDailySeries } from '../lib/ruleEngine';
import type { AlertRule, DeviceShareRule } from '../types';

const RATES: readonly MetricKey[] = ['viewability', 'engagementRate', 'ctr'];

/**
 * The picture behind an alert: the KPI day by day, with the line it crossed
 * drawn in. A fixed limit shows as a dashed line; a decline-since-start rule
 * shades the two weeks it compared; a metric-below-metric rule plots both.
 * A source disagreement has no daily line, so it shows the two counts.
 */
export function AlertMetricChart({ campaign, row, rule }: { campaign: Campaign; row: AlertLogRow; rule?: AlertRule }) {
  const { t } = useI18n();
  const { fmtDate, fmtDateLong } = useFormatters();
  const { axis, grid, tooltipStyle, animate } = useAxisStyle();

  if (row.sources) return <SourceComparison campaign={campaign} row={row} />;
  if (rule?.type === 'deviceShare') return <DeviceShareComparison campaign={campaign} rule={rule} />;

  const main = metricDailySeries(campaign, row.metric);
  if (main.length === 0) return <p className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">{t('alerts.detail.noSeries')}</p>;

  const other = rule?.type === 'metricBelowMetric' ? rule.otherMetric : null;
  const otherSeries = other ? metricDailySeries(campaign, other) : [];
  const otherByDate = new Map(otherSeries.map((p) => [p.date, p.value]));
  const data = main.map((p) => ({ date: p.date, value: p.value, other: otherByDate.get(p.date) ?? null }));
  const isRate = RATES.includes(row.metric);
  const fmtValue = (v: number) => (isRate ? fmtPct(v, 1) : fmtMetric(row.metric, v));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
          <XAxis dataKey="date" tickFormatter={fmtDate} tick={axis} tickLine={false} minTickGap={28} />
          <YAxis tickFormatter={(v: number) => (isRate ? fmtPct(v, 0) : fmtCompact(v))} tick={axis} tickLine={false} axisLine={false} width={48} />
          <RTooltip
            labelFormatter={(l) => fmtDateLong(String(l))}
            formatter={(v: unknown, name: unknown) => [typeof v === 'number' ? fmtValue(v) : '—', String(name ?? '')]}
            contentStyle={tooltipStyle}
          />
          {rule?.type === 'valueThreshold' && (
            <ReferenceLine
              y={rule.limit}
              stroke={CHART_COLORS.amber}
              strokeDasharray="5 4"
              label={{ value: fmtValue(rule.limit), position: 'insideTopRight', fill: CHART_COLORS.amber, fontSize: 11 }}
            />
          )}
          {rule?.type === 'startDecline' && data.length >= 14 && (
            <>
              <ReferenceArea x1={data[0].date} x2={data[6].date} fill={CHART_COLORS.teal} fillOpacity={0.12} />
              <ReferenceArea x1={data[data.length - 7].date} x2={data[data.length - 1].date} fill={CHART_COLORS.amber} fillOpacity={0.14} />
            </>
          )}
          {rule?.type === 'consecutiveDrop' && data.length > rule.days && (
            <ReferenceArea x1={data[data.length - 1 - rule.days].date} x2={data[data.length - 1].date} fill={CHART_COLORS.amber} fillOpacity={0.14} />
          )}
          <Line
            isAnimationActive={animate}
            type="monotone"
            dataKey="value"
            name={t(`metric.${row.metric}.label`)}
            stroke={CHART_COLORS.turquoise}
            strokeWidth={2}
            dot={false}
          />
          {other && (
            <Line
              isAnimationActive={animate}
              type="monotone"
              dataKey="other"
              name={t(`metric.${other}.label`)}
              stroke={CHART_COLORS.purple}
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** The two device buckets side by side, the one the rule watches marked. */
function DeviceShareComparison({ campaign, rule }: { campaign: Campaign; rule: DeviceShareRule }) {
  const { t } = useI18n();
  const split = deviceSplit(campaign);
  if (!split) return <p className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">{t('alerts.detail.noSeries')}</p>;
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        {(['mobile', 'desktop'] as const).map((device) => (
          <div key={device} className="rounded-xl border border-gray-200 p-4 dark:border-white/10">
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {t(`detail.deviceTab.${device}`)}
              {device === rule.device && ` · ${t('alerts.detail.watched', { limit: fmtPct(rule.limitPct, 0) })}`}
            </div>
            <div className="tnum mt-1 text-2xl font-bold text-brame-dark dark:text-white">{fmtPct(split[device], 1)}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">{t('alerts.detail.deviceNote')}</p>
    </div>
  );
}

function SourceComparison({ campaign, row }: { campaign: Campaign; row: AlertLogRow }) {
  const { t } = useI18n();
  const { baseline, check } = row.sources!;
  const value = (key: typeof baseline) => fmtMetric(row.metric, campaign.sources[key]?.totals[row.metric]);
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        {[baseline, check].map((key, i) => (
          <div key={key} className="rounded-xl border border-gray-200 p-4 dark:border-white/10">
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {sourceMeta(campaign, key).label} · {t(i === 0 ? 'alerts.detail.primary' : 'alerts.detail.check')}
            </div>
            <div className="tnum mt-1 text-2xl font-bold text-brame-dark dark:text-white">{value(key)}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">{t('alerts.detail.sourcesNote')}</p>
    </div>
  );
}
