import type { CreativeDailyPoint, MetricKey } from '@/types';
import type { TrendPoint } from './trend';

/** One day of the Daily Metrics table. A field is `null` when the source
 *  doesn't measure it — shown as "not measured", never as a zero. */
export interface DailyRow {
  date: string;
  /** 1-based day of the flight, as in the KPI dashboard's "Day 3". */
  day: number;
  impressions: number;
  engagements: number | null;
  engagementRate: number | null;
  clicks: number | null;
  ctr: number | null;
  viewability: number | null;
  /** Null unless the campaign tracks conversions and the source reports them. */
  conversions: number | null;
}

type Counts = CreativeDailyPoint;

/** What a source can put in the Daily table, from its `measures`. */
function capabilities(measures: readonly MetricKey[], daily: readonly Counts[]) {
  return {
    engagement: measures.includes('engagementRate'),
    clicks: measures.includes('ctr') || measures.includes('ctaClicks'),
    viewability: measures.includes('viewability'),
    // Only where the campaign tracks conversions at all (the days carry them).
    conversions: measures.includes('conversions') && daily.some((d) => d.conversions !== undefined),
  };
}

const ratio = (n: number, d: number) => (d ? n / d : null);

/**
 * Turns a daily series (a source's, or one creative's) into table rows.
 * Rates are recomputed from the counts — never averaged across days — so the
 * total row is a true weighted rate rather than a mean of daily percentages.
 */
export function buildDailyRows(daily: readonly Counts[], measures: readonly MetricKey[]): DailyRow[] {
  const cap = capabilities(measures, daily);
  return daily.map((d, i) => ({
    date: d.date,
    day: i + 1,
    impressions: d.impressions,
    engagements: cap.engagement ? d.engagements : null,
    engagementRate: cap.engagement ? ratio(d.engagements, d.impressions) : null,
    clicks: cap.clicks ? d.ctaClicks : null,
    ctr: cap.clicks ? ratio(d.ctaClicks, d.impressions) : null,
    viewability: cap.viewability ? ratio(d.viewable, d.impressions) : null,
    conversions: cap.conversions ? (d.conversions ?? 0) : null,
  }));
}

/** The whole-period row: sums for counts, weighted rates for percentages. */
export function totalDailyRow(daily: readonly Counts[], measures: readonly MetricKey[]): DailyRow | null {
  if (!daily.length) return null;
  const sum = (k: 'impressions' | 'viewable' | 'engagements' | 'ctaClicks') => daily.reduce((a, d) => a + d[k], 0);
  const [row] = buildDailyRows(
    [
      {
        date: daily[daily.length - 1].date,
        impressions: sum('impressions'),
        viewable: sum('viewable'),
        engagements: sum('engagements'),
        ctaClicks: sum('ctaClicks'),
        ...(daily.some((d) => d.conversions !== undefined) && {
          conversions: daily.reduce((a, d) => a + (d.conversions ?? 0), 0),
        }),
      },
    ],
    measures
  );
  return { ...row, day: daily.length };
}

/** The same rows as chart points, so the chart and the table above/below it
 *  can never disagree. Delivery is left null: it's a campaign-level running
 *  total against the booking, which a day or a creative doesn't have. */
export function dailyRowsToTrend(rows: readonly DailyRow[]): TrendPoint[] {
  return rows.map((r) => ({
    date: r.date,
    impressions: r.impressions,
    delivery: null,
    engagementRate: r.engagementRate,
    ctr: r.ctr,
    viewability: r.viewability,
  }));
}
