import type { Campaign } from '../mock/types';

/**
 * Portfolio-snapshot numbers for the Overview page. Pure functions, no React
 * — the caller passes an already tenant-scoped campaign list (scopeCampaigns
 * from lib/session), so a company_user's Overview is their own numbers, not
 * the whole portfolio's.
 */

const TREND_WINDOW_DAYS = 90;

export type TrendMetric = 'impressions' | 'ctr' | 'viewability';
export const TREND_METRICS: TrendMetric[] = ['impressions', 'ctr', 'viewability'];

interface DailyAggregatePoint {
  date: string;
  impressions: number;
  ctr: number | null;
  viewability: number | null;
}

interface OverviewSummary {
  campaignCount: number;
  liveCount: number;
  liveImpressions: number;
  avgCtr: number | null;
  avgViewability: number | null;
  daily: DailyAggregatePoint[];
}

const primary = (c: Campaign) => c.sources[c.primarySource];

function average(values: number[]): number | null {
  return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null;
}

/**
 * Daily totals across every campaign's own primary source — the same
 * single-place-figures-are-summed judgment call the Campaigns list already
 * makes for "Impressions, live campaigns" (see README), just extended across
 * a date range. Impressions and viewability are summed from every source
 * (all three measure both); CTR is summed only across sources that measure it
 * at all, so an adserver-only day is excluded rather than counted as zero.
 */
function buildDailyAggregate(campaigns: Campaign[], today: Date): DailyAggregatePoint[] {
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - TREND_WINDOW_DAYS);
  const cutoffIso = cutoff.toISOString().slice(0, 10);

  const byDate = new Map<string, { impressions: number; viewable: number; ctaClicks: number; ctrImpressions: number }>();

  for (const c of campaigns) {
    const series = primary(c);
    if (!series) continue;
    const measuresCtr = series.totals.ctr !== undefined;

    for (const point of series.daily) {
      if (point.date < cutoffIso) continue;
      const bucket = byDate.get(point.date) ?? { impressions: 0, viewable: 0, ctaClicks: 0, ctrImpressions: 0 };
      bucket.impressions += point.impressions;
      bucket.viewable += point.viewable;
      if (measuresCtr) {
        bucket.ctaClicks += point.ctaClicks;
        bucket.ctrImpressions += point.impressions;
      }
      byDate.set(point.date, bucket);
    }
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, b]) => ({
      date,
      impressions: b.impressions,
      viewability: b.impressions ? b.viewable / b.impressions : null,
      ctr: b.ctrImpressions ? b.ctaClicks / b.ctrImpressions : null,
    }));
}

export function buildOverviewSummary(campaigns: Campaign[], today: Date): OverviewSummary {
  const live = campaigns.filter((c) => c.status === 'live');
  const liveImpressions = live.reduce((sum, c) => sum + (primary(c)?.totals.impressions ?? 0), 0);

  const ctrValues = live.map((c) => primary(c)?.totals.ctr).filter((v): v is number => v != null);
  const viewabilityValues = live.map((c) => primary(c)?.totals.viewability).filter((v): v is number => v != null);

  return {
    campaignCount: campaigns.length,
    liveCount: live.length,
    liveImpressions,
    avgCtr: average(ctrValues),
    avgViewability: average(viewabilityValues),
    daily: buildDailyAggregate(campaigns, today),
  };
}
