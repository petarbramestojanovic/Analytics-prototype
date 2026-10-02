/**
 * A campaign reduced to the fields a benchmark needs. Deliberately not the full
 * `Campaign`: benchmarks read a 12-month rolling history of finished flights,
 * which is a far larger and much thinner set than the live campaigns the rest
 * of the app works with. Mirrors the KPI platform's `campaign_totals` row.
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
}

