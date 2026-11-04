import type { SourceSeries } from '@/types';
import { CHART_COLORS } from '@/components/charts';

/**
 * The four metrics the one shared trend chart (components/TrendChart.tsx)
 * can plot — the same four everywhere it appears (Overview, a client's own
 * detail page, Campaign Details), just fed different data. Keeping the type
 * and the color-per-metric mapping here means a metric is never given two
 * different colors in two different views.
 */
export type TrendMetric = 'delivery' | 'impressions' | 'engagementRate' | 'ctr' | 'viewability';

/** What the chart offers by default. Viewability is opt-in per caller (the
 *  daily views pass it via `availableMetrics`) so existing charts are unchanged. */
export const TREND_METRICS: TrendMetric[] = ['delivery', 'impressions', 'engagementRate', 'ctr'];

/** Every metric the chart can plot, for decoding a remembered pick. */
export const ALL_TREND_METRICS: TrendMetric[] = [...TREND_METRICS, 'viewability'];

export const TREND_METRIC_COLORS: Record<TrendMetric, string> = {
  delivery: CHART_COLORS.purple,
  impressions: CHART_COLORS.teal,
  engagementRate: CHART_COLORS.turquoise,
  ctr: CHART_COLORS.amber,
  viewability: CHART_COLORS.blue,
};

/** Only these two are ever benchmarked (lib/benchmarks.ts BENCHMARK_METRICS
 *  also includes viewability, which isn't one of the four trend metrics). */
export type BenchmarkableTrendMetric = 'engagementRate' | 'ctr';

export interface TrendPoint {
  date: string;
  impressions: number;
  /** Cumulative delivered-vs-booked ratio through this day. Always
   *  computable — impressions are never withheld — unlike engagementRate/ctr
   *  below, which stay null on a day the primary source can't measure them. */
  delivery: number | null;
  engagementRate: number | null;
  ctr: number | null;
  /** Only the daily views plot this; other callers may leave it out. */
  viewability?: number | null;
}

/**
 * One campaign's own daily series turned into the shared trend shape —
 * delivery as a running total against booked impressions, engagementRate/ctr
 * left null on any day (i.e. entirely) the source doesn't measure them, same
 * "never invent a number" rule the rest of the app follows.
 */
export function buildCampaignTrend(series: SourceSeries, bookedImpressions: number): TrendPoint[] {
  const measuresEngagement = series.totals.engagementRate !== undefined;
  const measuresCtr = series.totals.ctr !== undefined;
  const measuresViewability = series.totals.viewability !== undefined;
  let cumulativeImpressions = 0;

  return series.daily.map((point) => {
    cumulativeImpressions += point.impressions;
    return {
      date: point.date,
      impressions: point.impressions,
      delivery: bookedImpressions ? cumulativeImpressions / bookedImpressions : null,
      engagementRate: measuresEngagement && point.impressions ? point.engagements / point.impressions : null,
      ctr: measuresCtr && point.impressions ? point.ctaClicks / point.impressions : null,
      viewability: measuresViewability && point.impressions ? point.viewable / point.impressions : null,
    };
  });
}
