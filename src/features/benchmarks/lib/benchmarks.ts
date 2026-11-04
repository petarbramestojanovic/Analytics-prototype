import type { BenchmarkCampaign, BenchmarkCreative } from '@/types';

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

/** A comparison number is only shown when at least this many campaigns stand
 *  behind it — below that it would set an expectation the data can't carry. */
export const MIN_COMPARE_SAMPLE = 3;


/** The metrics a benchmark is computed for. A subset of MetricKey, so the
 *  existing metric.*.label translations and fmtMetric apply unchanged. */
export type BenchmarkMetric = 'ctr' | 'viewability' | 'engagementRate';

export const BENCHMARK_METRICS: BenchmarkMetric[] = ['ctr', 'viewability', 'engagementRate'];

/** Narrows a URL param to a Dimension, falling back to `fallback`. */
export function parseDimension(value: string | null | undefined, fallback: Dimension = 'industry'): Dimension {
  return value && (DIMENSIONS as string[]).includes(value) ? (value as Dimension) : fallback;
}

/** Narrows a URL param to a BenchmarkMetric, falling back to `fallback`. */
export function parseBenchmarkMetric(value: string | null | undefined, fallback: BenchmarkMetric = 'ctr'): BenchmarkMetric {
  return value && (BENCHMARK_METRICS as string[]).includes(value) ? (value as BenchmarkMetric) : fallback;
}

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
  /** CTR trend — kept for BenchmarkDetailView's headline trend pill. */
  trend: Trend;
  trendPct: number;
  /** Same trend computation, per metric — the small sign the Benchmarks list
   *  shows next to each of the three metric columns. */
  trends: Record<BenchmarkMetric, { trend: Trend; trendPct: number }>;
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

/** What every benchmark row — a campaign or a creative — has to carry for the
 *  statistics: the active-day floor input and the three metrics. */
interface Measured {
  activeDays: number;
  ctr: number | null;
  viewability: number | null;
  engagementRate: number | null;
}

/** Rows eligible to shape an average, i.e. past the active-day floor. */
function eligible<T extends Measured>(pool: T[]): T[] {
  return pool.filter((c) => c.activeDays >= MIN_BENCHMARK_ACTIVE_DAYS);
}

function statsFor<T extends Measured>(pool: T[]): Record<BenchmarkMetric, Stats | null> {
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
 * Last 3 months' mean value against the prior 3 — the platform's definition,
 * generalized to any benchmark metric (originally CTR-only). Deliberately not
 * "this month vs last": campaign flights are long and sparse enough that a
 * monthly comparison mostly measures which flights happened to end when.
 */
function trendFor(pool: BenchmarkCampaign[], metric: BenchmarkMetric, now: Date): { trend: Trend; trendPct: number } {
  const monthsAgo = (n: number) => {
    const d = new Date(now);
    d.setMonth(d.getMonth() - n);
    return d.toISOString().slice(0, 10);
  };
  const threeMonths = monthsAgo(3);
  const sixMonths = monthsAgo(6);

  const meanMetric = (rows: BenchmarkCampaign[]) => {
    const values = rows.map((c) => c[metric]).filter((v): v is number => v !== null);
    if (values.length === 0) return null;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  };

  const usable = eligible(pool);
  const recent = meanMetric(usable.filter((c) => c.flightStart >= threeMonths));
  const prior = meanMetric(usable.filter((c) => c.flightStart >= sixMonths && c.flightStart < threeMonths));

  if (recent === null || prior === null || prior === 0) return { trend: 'stable', trendPct: 0 };

  const change = (recent - prior) / prior;
  if (change > TREND_DEADBAND) return { trend: 'improving', trendPct: change };
  if (change < -TREND_DEADBAND) return { trend: 'declining', trendPct: change };
  return { trend: 'stable', trendPct: change };
}

function trendsFor(pool: BenchmarkCampaign[], now: Date): Record<BenchmarkMetric, { trend: Trend; trendPct: number }> {
  return {
    ctr: trendFor(pool, 'ctr', now),
    viewability: trendFor(pool, 'viewability', now),
    engagementRate: trendFor(pool, 'engagementRate', now),
  };
}

/** Which field a dimension groups on, and how the bucket is labelled. */
const groupers: Record<Dimension, (c: BenchmarkCampaign) => { key: string; displayName: string }> = {
  industry: (c) => ({ key: c.industry, displayName: c.industry }),
  client: (c) => ({ key: c.companyId, displayName: c.companyName }),
  market: (c) => ({ key: c.market, displayName: c.market }),
};

/** Narrows the benchmark pool beyond the default rolling window. */
export interface BenchmarkScope {
  /** A chosen period, replacing the rolling 12 months: a flight counts if it
   *  overlaps the range at all (benchmarks are per flight, not per day). */
  range?: { start: string; end: string };
  /** Salesforce markets to include; empty or omitted = all. */
  markets?: string[];
}

/** Rolling 12-month window, matching the platform's benchmarkWindowCutoff() —
 *  or the chosen range, and the chosen markets, when a scope is given. */
function withinWindow<T extends { flightStart: string; flightEnd: string; market: string }>(
  pool: T[],
  now: Date,
  scope?: BenchmarkScope
): T[] {
  const inMarket = (c: T) => !scope?.markets?.length || scope.markets.includes(c.market);
  if (scope?.range) {
    const { start, end } = scope.range;
    return pool.filter((c) => c.flightEnd >= start && c.flightStart <= end && inMarket(c));
  }
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - WINDOW_MONTHS);
  const cutoffIso = cutoff.toISOString().slice(0, 10);
  return pool.filter((c) => c.flightEnd >= cutoffIso && inMarket(c));
}

export function groupBenchmarks(
  pool: BenchmarkCampaign[],
  dimension: Dimension,
  now: Date,
  scope?: BenchmarkScope
): BenchmarkGroup[] {
  const grouper = groupers[dimension];
  const buckets = new Map<string, { displayName: string; rows: BenchmarkCampaign[] }>();

  for (const campaign of withinWindow(pool, now, scope)) {
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
        ...trendFor(rows, 'ctr', now),
        trends: trendsFor(rows, now),
        campaigns: [...rows].sort((a, b) => b.impressions - a.impressions),
      };
    })
    .sort((a, b) => b.impressions - a.impressions);
}

/** Portfolio-wide reference — the chart's reference line and the "vs overall"
 *  comparisons. Computed from the pool, never hardcoded: the old dashboard
 *  baked 0.0209 / 0.7441 into its cards and they went stale silently. */
export function overallStats(
  pool: BenchmarkCampaign[],
  now: Date,
  scope?: BenchmarkScope
): Record<BenchmarkMetric, Stats | null> {
  return statsFor(withinWindow(pool, now, scope));
}

// ---------------------------------------------------------------------------
// Comparisons across the benchmark levels
//
// The same window, the same active-day floor and the same statistics as the
// ranked views above — just cut differently. A number is only worth showing
// next to another one when both rest on enough campaigns (MIN_COMPARE_SAMPLE).
// ---------------------------------------------------------------------------

type MetricStats = Record<BenchmarkMetric, Stats | null>;

/** Stats for the campaigns in the window that match `keep`. */
const statsWhere = (win: BenchmarkCampaign[], keep: (c: BenchmarkCampaign) => boolean): MetricStats =>
  statsFor(win.filter(keep));

/** True when `stats` rests on enough campaigns to be set beside another number. */
export const meetsSample = (stats: Stats | null | undefined): stats is Stats =>
  !!stats && stats.n >= MIN_COMPARE_SAMPLE;

export type LadderLevel = 'campaign' | 'client';

/** One row of the benchmark ladder: a campaign (or a client) and, in the same
 *  line, the average of every level above it — its client, its industry, its
 *  market, and BRAME overall. */
export interface LadderRow {
  key: string;
  label: string;
  sublabel: string;
  /** This row's own value for the metric. */
  value: number;
  /** Campaigns behind `value` (1 for a campaign row). */
  n: number;
  client: Stats | null;
  industry: Stats | null;
  market: Stats | null;
  brame: Stats | null;
}

/**
 * The matrix across levels. Campaign rows read "this campaign vs its client,
 * its industry, its market, BRAME"; client rows read "this client vs its
 * industry, BRAME" (a client spans markets, so there is no single one).
 * Sorted best first.
 */
export function buildLadder(
  pool: BenchmarkCampaign[],
  level: LadderLevel,
  metric: BenchmarkMetric,
  now: Date,
  scope?: BenchmarkScope
): LadderRow[] {
  const win = withinWindow(pool, now, scope);
  const brame = statsFor(win)[metric];
  const memo = new Map<string, Stats | null>();
  const levelStats = (dim: 'client' | 'industry' | 'market', value: string) => {
    const k = `${dim}:${value}`;
    if (!memo.has(k)) {
      const pick = (c: BenchmarkCampaign) => (dim === 'client' ? c.companyId : dim === 'industry' ? c.industry : c.market);
      memo.set(k, statsWhere(win, (c) => pick(c) === value)[metric]);
    }
    return memo.get(k)!;
  };

  const usable = eligible(win).filter((c) => c[metric] !== null);

  if (level === 'campaign') {
    return usable
      .map((c) => ({
        key: c.id,
        label: c.name,
        sublabel: `${c.companyName} · ${c.market}`,
        value: c[metric]!,
        n: 1,
        client: levelStats('client', c.companyId),
        industry: levelStats('industry', c.industry),
        market: levelStats('market', c.market),
        brame,
      }))
      .sort((a, b) => b.value - a.value);
  }

  const clients = new Map<string, BenchmarkCampaign>();
  for (const c of usable) if (!clients.has(c.companyId)) clients.set(c.companyId, c);
  return [...clients.values()]
    .flatMap((c) => {
      const own = levelStats('client', c.companyId);
      return own
        ? [{ key: c.companyId, label: c.companyName, sublabel: c.industry, value: own.avg, n: own.n, client: null, industry: levelStats('industry', c.industry), market: null, brame }]
        : [];
    })
    .sort((a, b) => b.value - a.value);
}

interface CrossColumn {
  market: string;
  stats: MetricStats;
  campaigns: number;
}

export interface CrossComparison {
  columns: CrossColumn[];
  /** The subject across every market. */
  all: MetricStats;
  brame: MetricStats;
}

export interface CrossSubject {
  key: string;
  label: string;
  /** Distinct markets it has campaigns in — a split needs at least two. */
  markets: number;
}

/** The industries or clients that can be split by market. */
export function crossSubjects(
  pool: BenchmarkCampaign[],
  dimension: 'industry' | 'client',
  now: Date,
  scope?: BenchmarkScope
): CrossSubject[] {
  const by = new Map<string, { label: string; markets: Set<string> }>();
  for (const c of withinWindow(pool, now, scope)) {
    const key = dimension === 'industry' ? c.industry : c.companyId;
    const label = dimension === 'industry' ? c.industry : c.companyName;
    const entry = by.get(key) ?? { label, markets: new Set<string>() };
    entry.markets.add(c.market);
    by.set(key, entry);
  }
  return [...by.entries()]
    .map(([key, v]) => ({ key, label: v.label, markets: v.markets.size }))
    .sort((a, b) => b.markets - a.markets || a.label.localeCompare(b.label));
}

/** One industry or client split by market — "Automotive: AT vs DE",
 *  "IKEA: AT vs DE" — next to its all-market average and BRAME's. */
export function crossCompareByMarket(
  pool: BenchmarkCampaign[],
  subject: { dimension: 'industry' | 'client'; key: string },
  now: Date,
  scope?: BenchmarkScope
): CrossComparison {
  const win = withinWindow(pool, now, scope);
  const inSubject = (c: BenchmarkCampaign) => (subject.dimension === 'industry' ? c.industry : c.companyId) === subject.key;
  const subjectRows = win.filter(inSubject);
  const markets = [...new Set(subjectRows.map((c) => c.market))].sort();
  return {
    columns: markets.map((market) => ({
      market,
      stats: statsFor(subjectRows.filter((c) => c.market === market)),
      campaigns: subjectRows.filter((c) => c.market === market).length,
    })),
    all: statsFor(subjectRows),
    brame: statsFor(win),
  };
}

/** A client's place among its peers: its own average, its industry's, and —
 *  only when asked for — BRAME's. The BRAME row is left out for clients and
 *  agencies, who see their client and its industry and nothing wider. */
export interface BenchmarkContext {
  industryName: string | null;
  client: MetricStats;
  industry: MetricStats;
  brame: MetricStats | null;
}

export function benchmarkContext(
  pool: BenchmarkCampaign[],
  companyId: string,
  now: Date,
  includeBrame: boolean
): BenchmarkContext {
  const win = withinWindow(pool, now);
  const own = win.filter((c) => c.companyId === companyId);
  const industryName = own[0]?.industry ?? pool.find((c) => c.companyId === companyId)?.industry ?? null;
  return {
    industryName,
    client: statsFor(own),
    industry: industryName ? statsWhere(win, (c) => c.industry === industryName) : statsFor([]),
    brame: includeBrame ? statsFor(win) : null,
  };
}

// ---------------------------------------------------------------------------
// Mechanics
//
// A mechanic belongs to a creative (one size, one mechanic), and a campaign can
// run several — so mechanics are benchmarked across creatives, never campaigns.
// They are deliberately kept to this one level: no mechanic × market or
// mechanic × industry, so an average never rests on one or two flights.
// ---------------------------------------------------------------------------

export interface MechanicGroup {
  /** The mechanic's name — whatever the data holds; the list is open-ended. */
  mechanic: string;
  /** Creatives running it in the window. */
  creativeCount: number;
  /** Distinct campaigns those creatives belong to. */
  campaignCount: number;
  impressions: number;
  stats: Record<BenchmarkMetric, Stats | null>;
  /** The creatives, so a caller can read their flight dates (demand trend). */
  creatives: BenchmarkCreative[];
}

/** Every mechanic in the window with its averages over its creatives. */
export function groupMechanics(creatives: BenchmarkCreative[], now: Date, scope?: BenchmarkScope): MechanicGroup[] {
  const by = new Map<string, BenchmarkCreative[]>();
  for (const c of withinWindow(creatives, now, scope)) {
    if (!c.mechanic) continue;
    by.set(c.mechanic, [...(by.get(c.mechanic) ?? []), c]);
  }
  return [...by.entries()]
    .map(([mechanic, rows]) => ({
      mechanic,
      creativeCount: rows.length,
      campaignCount: new Set(rows.map((r) => r.campaignId)).size,
      impressions: rows.reduce((sum, r) => sum + r.impressions, 0),
      stats: statsFor(rows),
      creatives: rows,
    }))
    .sort((a, b) => b.creativeCount - a.creativeCount);
}
