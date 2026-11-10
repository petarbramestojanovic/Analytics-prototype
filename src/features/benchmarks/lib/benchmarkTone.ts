import type { BenchmarkMetric } from './benchmarks';

/** A value counts as under its benchmark only once it is this much lower, as a
 *  share of the benchmark: 0.1 = more than 10% below. Carried over from the KPI
 *  dashboard v1 (`KPI_UNDERPERFORM_THRESHOLD`), so a campaign turns red
 *  exactly as it did there. Set to 0 to turn any shortfall red. */
const UNDERPERFORM_THRESHOLD = 0.1;

/** An average built from fewer campaigns than this isn't an independent
 *  benchmark: with one, it is the campaign's own value, so it could only ever
 *  read "on benchmark". Such a value is left uncoloured. */
const MIN_BENCHMARK_CAMPAIGNS = 2;

export type BenchmarkTone = 'onOrAbove' | 'below';

/** How one value compares with its benchmark average: `onOrAbove` or `below`.
 *  `null` when there's no benchmark to compare with. */
export function benchmarkTone(
  value: number | null | undefined,
  benchmarkAvg: number | null | undefined,
  /** How many campaigns the average rests on, when known. */
  sampleSize?: number
): BenchmarkTone | null {
  if (value == null || !benchmarkAvg || benchmarkAvg <= 0) return null;
  if (sampleSize !== undefined && sampleSize < MIN_BENCHMARK_CAMPAIGNS) return null;
  return value < benchmarkAvg * (1 - UNDERPERFORM_THRESHOLD) ? 'below' : 'onOrAbove';
}

/** Traffic light as in Analytics 1.0: a shortfall turns red, anything on or
 *  above the benchmark stays in the normal text colour (no green). */
export const BENCHMARK_TONE_TEXT: Record<BenchmarkTone, string> = {
  onOrAbove: '',
  below: 'text-red-600 dark:text-red-400',
};

/** The metrics that get the red traffic light: the three benchmarked rates —
 *  engagement rate, CTR and viewability. */
export const isToneMetric = (metric: string): metric is BenchmarkMetric =>
  metric === 'ctr' || metric === 'viewability' || metric === 'engagementRate';
