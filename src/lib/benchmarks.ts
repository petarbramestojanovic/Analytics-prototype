import type { BenchmarkCampaign } from '../mock/types';

/**
 * The benchmark rules, ported from the KPI platform's read path
 * (service/src/lib/dashboard-helpers.ts). They are here rather than inline in
 * the views because the same numbers appear in three places — the ranked
 * chart, the table and each bucket's distribution panel — and a bucket that
 * read "above average" in one and "below" in another would be worse than no
 * benchmark at all.
 *
 * Pure functions, no React.
 */

/** A flight with fewer active days than this is counted toward volume but left
 *  out of every average and percentile. Without the floor, a campaign whose
 *  only ingested report was a first-day snapshot can define an industry's
 *  benchmark off a single unrepresentative day. */
export const MIN_BENCHMARK_ACTIVE_DAYS = 3;

/** Under this many contributing campaigns a bucket is flagged rather than
 *  silently trusted. */
export const LOW_SAMPLE = 5;

const WINDOW_MONTHS = 12;

/** Trend moves under this are noise, not a direction. */
const TREND_DEADBAND = 0.02;

export type Dimension = 'industry' | 'client' | 'market';

export const DIMENSIONS: Dimension[] = ['industry', 'client', 'market'];

/** The metrics a benchmark is computed for. A subset of MetricKey, so the
 *  existing metric.*.label translations and fmtMetric apply unchanged. */
export type BenchmarkMetric = 'ctr' | 'viewability' | 'engagementRate';

export const BENCHMARK_METRICS: BenchmarkMetric[] = ['ctr', 'viewability', 'engagementRate'];

export interface Stats {
  avg: number;
  p50: number;
  p75: number;
  p90: number;
  /** Contributing campaigns — not the bucket's total, which includes the ones
   *  excluded by the active-day floor and by unmeasured metrics. */
  n: number;
}

export type Trend = 'improving' | 'stable' | 'declining';

export interface BenchmarkGroup {
  key: string;
  displayName: string;
  /** Every campaign in the bucket, including those excluded from averages. */
  campaignCount: number;
  /** Campaigns that actually cleared the active-day floor. */
  eligibleCount: number;
  impressions: number;
  stats: Record<BenchmarkMetric, Stats | null>;
  lowSample: boolean;
  trend: Trend;
  trendPct: number;
  campaigns: BenchmarkCampaign[];
}

/**
 * Linear-interpolated percentile over an ascending array, matching the
 * platform's inlineStats() so the prototype and the live API agree.
 */
function percentile(ascending: number[], p: number): number {
  if (ascending.length === 0) return 0;
  if (ascending.length === 1) return ascending[0];
  const rank = (ascending.length - 1) * p;
  const low = Math.floor(rank);
  const high = Math.ceil(rank);
  if (low === high) return ascending[low];
  return ascending[low] + (ascending[high] - ascending[low]) * (rank - low);
}

function computeStats(values: number[]): Stats | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return {
    avg: sorted.reduce((sum, v) => sum + v, 0) / sorted.length,
    p50: percentile(sorted, 0.5),
    p75: percentile(sorted, 0.75),
    p90: percentile(sorted, 0.9),
    n: sorted.length,
  };
}

/** Campaigns eligible to shape an average, i.e. past the active-day floor. */
function eligible(pool: BenchmarkCampaign[]): BenchmarkCampaign[] {
  return pool.filter((c) => c.activeDays >= MIN_BENCHMARK_ACTIVE_DAYS);
}

function statsFor(pool: BenchmarkCampaign[]): Record<BenchmarkMetric, Stats | null> {
  const usable = eligible(pool);
  const collect = (metric: BenchmarkMetric) =>
    // A null metric means the source could not measure it — dropping the row
    // is right; coercing it to 0 would drag the whole bucket down.
    usable.map((c) => c[metric]).filter((v): v is number => v !== null);

  return {
    ctr: computeStats(collect('ctr')),
    viewability: computeStats(collect('viewability')),
    engagementRate: computeStats(collect('engagementRate')),
  };
}

/**
 * Last 3 months' mean CTR against the prior 3 — the platform's definition.
 * Deliberately not "this month vs last": campaign flights are long and sparse
 * enough that a monthly comparison mostly measures which flights happened to
 * end when.
 */
function trendFor(pool: BenchmarkCampaign[], now: Date): { trend: Trend; trendPct: number } {
  const monthsAgo = (n: number) => {
    const d = new Date(now);
    d.setMonth(d.getMonth() - n);
    return d.toISOString().slice(0, 10);
  };
  const threeMonths = monthsAgo(3);
  const sixMonths = monthsAgo(6);

  const meanCtr = (rows: BenchmarkCampaign[]) => {
    const values = rows.map((c) => c.ctr).filter((v): v is number => v !== null);
    if (values.length === 0) return null;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  };

  const usable = eligible(pool);
  const recent = meanCtr(usable.filter((c) => c.flightStart >= threeMonths));
  const prior = meanCtr(usable.filter((c) => c.flightStart >= sixMonths && c.flightStart < threeMonths));

  if (recent === null || prior === null || prior === 0) return { trend: 'stable', trendPct: 0 };

  const change = (recent - prior) / prior;
  if (change > TREND_DEADBAND) return { trend: 'improving', trendPct: change };
  if (change < -TREND_DEADBAND) return { trend: 'declining', trendPct: change };
  return { trend: 'stable', trendPct: change };
}

/** Which field a dimension groups on, and how the bucket is labelled. */
const groupers: Record<Dimension, (c: BenchmarkCampaign) => { key: string; displayName: string }> = {
  industry: (c) => ({ key: c.industry, displayName: c.industry }),
  client: (c) => ({ key: c.companyId, displayName: c.companyName }),
  market: (c) => ({ key: c.market, displayName: c.market }),
};

/** Rolling 12-month window, matching the platform's benchmarkWindowCutoff(). */
function withinWindow(pool: BenchmarkCampaign[], now: Date): BenchmarkCampaign[] {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - WINDOW_MONTHS);
  const cutoffIso = cutoff.toISOString().slice(0, 10);
  return pool.filter((c) => c.flightEnd >= cutoffIso);
}

export function groupBenchmarks(pool: BenchmarkCampaign[], dimension: Dimension, now: Date): BenchmarkGroup[] {
  const grouper = groupers[dimension];
  const buckets = new Map<string, { displayName: string; rows: BenchmarkCampaign[] }>();

  for (const campaign of withinWindow(pool, now)) {
    const { key, displayName } = grouper(campaign);
    if (!key) continue;
    const bucket = buckets.get(key);
    if (bucket) bucket.rows.push(campaign);
    else buckets.set(key, { displayName, rows: [campaign] });
  }

  return [...buckets.entries()]
    .map(([key, { displayName, rows }]) => {
      const eligibleRows = eligible(rows);
      return {
        key,
        displayName,
        campaignCount: rows.length,
        eligibleCount: eligibleRows.length,
        impressions: rows.reduce((sum, c) => sum + c.impressions, 0),
        stats: statsFor(rows),
        lowSample: eligibleRows.length < LOW_SAMPLE,
        ...trendFor(rows, now),
        campaigns: [...rows].sort((a, b) => b.impressions - a.impressions),
      };
    })
    .sort((a, b) => b.impressions - a.impressions);
}

/** Portfolio-wide reference — the chart's reference line and the "vs overall"
 *  comparisons. Computed from the pool, never hardcoded: the old dashboard
 *  baked 0.0209 / 0.7441 into its cards and they went stale silently. */
export function overallStats(pool: BenchmarkCampaign[], now: Date): Record<BenchmarkMetric, Stats | null> {
  return statsFor(withinWindow(pool, now));
}

export type PerformanceTier = 'top' | 'aboveAvg' | 'average' | 'belowAvg';

/** Where one campaign sits in its own bucket's distribution. */
export function performanceTier(
  value: number | null,
  stats: Pick<Stats, 'p50' | 'p75' | 'p90'> | null
): PerformanceTier | null {
  if (value === null || !stats) return null;
  if (value >= stats.p90) return 'top';
  if (value >= stats.p75) return 'aboveAvg';
  if (value >= stats.p50) return 'average';
  return 'belowAvg';
}
