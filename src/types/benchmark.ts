import type { DeliveryHealth } from './campaign';

/**
 * A campaign reduced to the fields a benchmark needs. Deliberately not the full
 * `Campaign`: benchmarks read a 12-month rolling window of flights, so only
 * the totals a comparison needs are kept. Mirrors the KPI platform's
 * `campaign_totals` row.
 */
export interface BenchmarkCampaign {
  id: string;
  name: string;
  companyId: string;
  companyName: string;
  industry: string;
  /** Null for direct bookings, same convention as Campaign.agencyId. */
  agencyId: string | null;
  agencyName: string | null;
  /** Salesforce's market — the country dimension. */
  market: string;
  flightStart: string;
  flightEnd: string;
  /** Days with impressions > 0. Under MIN_BENCHMARK_ACTIVE_DAYS the campaign
   *  still counts toward volume but is left out of averages and percentiles,
   *  so one first-day snapshot cannot define an industry's benchmark. */
  activeDays: number;
  impressions: number;
  ctr: number | null;
  viewability: number | null;
  /** Null when the flight was measured by an adserver alone — engagement is
   *  unmeasurable there, and null must never be flattened to 0. */
  engagementRate: number | null;
  /** Delivered impressions against what Salesforce booked — same
   *  `deliveryPacing()` judgment call as the Campaigns list and Campaign
   *  Details, computed once at projection time from the full Campaign. */
  deliveryPacing: number | null;
  /** The backend's pacing-vs-elapsed-runtime read — what colours the bar. */
  deliveryHealth: DeliveryHealth | null;
}

/**
 * One creative reduced to what a mechanic benchmark needs. The mechanic lives
 * here, not on `BenchmarkCampaign`: a creative is one size and one mechanic,
 * and a campaign can run several of them. Mechanics are benchmarked across
 * creatives, at this level only.
 */
export interface BenchmarkCreative {
  id: string;
  campaignId: string;
  campaignName: string;
  companyId: string;
  companyName: string;
  industry: string;
  market: string;
  /** The size: 300x250, 300x600, 320x480 … */
  format: string;
  /** Whatever mechanic the creative runs — the list is open-ended. */
  mechanic: string;
  flightStart: string;
  flightEnd: string;
  /** Days with impressions > 0, same floor as a campaign. */
  activeDays: number;
  impressions: number;
  ctr: number | null;
  viewability: number | null;
  engagementRate: number | null;
}
