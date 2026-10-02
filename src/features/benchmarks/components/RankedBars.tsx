import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts';
import { CHART_COLORS, useAxisStyle } from '@/components/charts';
import { EMPTY_VALUE, fmtMetric } from '@/lib/format';
import type { BenchmarkMetric } from '../lib/benchmarks';

/**
 * Horizontal bars with the portfolio average as a reference line, carried over
 * from the KPI dashboard's BenchmarkComparison. Solid fill at or above the
 * average, pale below — so the ranking reads without consulting the legend.
 */
export function RankedBars({
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
            formatter={(v: unknown) => [typeof v === 'number' ? fmtMetric(metric, v / 100) : EMPTY_VALUE, '']}
            contentStyle={tooltipStyle}
            itemStyle={tooltipItemStyle}
            labelStyle={tooltipLabelStyle}
          />
          {overallPct !== null && (
            <ReferenceLine x={overallPct} stroke={CHART_COLORS.purple} strokeDasharray="4 4" strokeWidth={1.5} />
          )}
          {/* fill here is what Recharts uses to color the tooltip's item text;
              the per-Cell fill below only affects each bar's own paint. */}
          <Bar
            dataKey="value"
            fill={CHART_COLORS.teal}
            radius={[0, 4, 4, 0]}
            barSize={18}
            animationDuration={500}
            animationEasing="ease-out"
          >
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
