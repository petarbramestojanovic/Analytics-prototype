import type { Campaign } from '@/types';
import { primarySeries as primary } from './sources';
import type { TrendPoint } from './trend';

/**
 * Portfolio-snapshot numbers for any set of campaigns — the Overview page,
 * one client's detail page and each Clients directory row all run this, so a
 * number never disagrees between them. Pure functions, no React — the caller
 * passes an already tenant-scoped campaign list (useScopedCampaigns), so an
 * agency or client seat's Overview is their own numbers, not the whole
 * portfolio's.
 */

const TREND_WINDOW_DAYS = 90;

export interface PortfolioSummary {
  campaignCount: number;
  liveCount: number;
  liveImpressions: number;
  /** Delivered impressions across every campaign, live or not. */
  totalImpressions: number;
  avgCtr: number | null;
  avgViewability: number | null;
  avgEngagementRate: number | null;
  daily: TrendPoint[];
}

function average(values: number[]): number | null {
  return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null;
}

/**
 * Daily totals across every campaign's own primary source — the same
 * single-place-figures-are-summed judgment call the Campaigns list already
 * makes for "Impressions, live campaigns" (see README), just extended across
 * a date range. Impressions are summed from every source; engagementRate and
 * CTR are summed only across sources that measure them at all, so a day
 * covered only by adserver-primary campaigns is excluded rather than counted
 * as zero. Delivery is a running total against the booked impressions of
 * every contributing campaign — approximate at the portfolio level (it only
 * counts impressions inside this window, not a campaign's full flight), but
 * good enough to show trend direction across many campaigns at once.
 */
function buildDailyAggregate(campaigns: Campaign[], today: Date): TrendPoint[] {
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - TREND_WINDOW_DAYS);
  const cutoffIso = cutoff.toISOString().slice(0, 10);

  const totalBooked = campaigns.reduce(
    (sum, c) => (primary(c) ? sum + c.salesforce.bookedImpressions : sum),
    0
  );

  const byDate = new Map<
    string,
    { impressions: number; engagements: number; engagementImpressions: number; ctaClicks: number; ctrImpressions: number }
  >();

  for (const c of campaigns) {
    const series = primary(c);
    if (!series) continue;
    const measuresEngagement = series.totals.engagementRate !== undefined;
    const measuresCtr = series.totals.ctr !== undefined;

    for (const point of series.daily) {
      if (point.date < cutoffIso) continue;
      const bucket =
        byDate.get(point.date) ?? { impressions: 0, engagements: 0, engagementImpressions: 0, ctaClicks: 0, ctrImpressions: 0 };
      bucket.impressions += point.impressions;
      if (measuresEngagement) {
        bucket.engagements += point.engagements;
        bucket.engagementImpressions += point.impressions;
      }
      if (measuresCtr) {
        bucket.ctaClicks += point.ctaClicks;
        bucket.ctrImpressions += point.impressions;
      }
      byDate.set(point.date, bucket);
    }
  }

  let cumulativeImpressions = 0;
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, b]) => {
      cumulativeImpressions += b.impressions;
      return {
        date,
        impressions: b.impressions,
        delivery: totalBooked ? cumulativeImpressions / totalBooked : null,
        engagementRate: b.engagementImpressions ? b.engagements / b.engagementImpressions : null,
        ctr: b.ctrImpressions ? b.ctaClicks / b.ctrImpressions : null,
      };
    });
}

export function buildPortfolioSummary(campaigns: Campaign[], today: Date): PortfolioSummary {
  const live = campaigns.filter((c) => c.status === 'live');
  const liveImpressions = live.reduce((sum, c) => sum + (primary(c)?.totals.impressions ?? 0), 0);

  const ctrValues = live.map((c) => primary(c)?.totals.ctr).filter((v): v is number => v != null);
  const viewabilityValues = live.map((c) => primary(c)?.totals.viewability).filter((v): v is number => v != null);
  const engagementValues = live.map((c) => primary(c)?.totals.engagementRate).filter((v): v is number => v != null);

  return {
    campaignCount: campaigns.length,
    liveCount: live.length,
    liveImpressions,
    totalImpressions: campaigns.reduce((sum, c) => sum + (primary(c)?.totals.impressions ?? 0), 0),
    avgCtr: average(ctrValues),
    avgViewability: average(viewabilityValues),
    avgEngagementRate: average(engagementValues),
    daily: buildDailyAggregate(campaigns, today),
  };
}
