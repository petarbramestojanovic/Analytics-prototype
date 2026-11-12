// Shapes mirror the RFC's `app` / `analytics` / `external` schemas closely
// enough that swapping mock for supabase-js later is a data-layer change, not a
// component rewrite. Nothing here combines sources — RFC §4 rule 3 forbids it,
// and the backend owns that question anyway.

export type SourceKey = 'atk' | 'nexd' | 'custom';

type ConnectorState = 'connected' | 'not_configured';

/** Which metrics a platform actually measures. Drives what each source's UI
 *  renders — a source never shows an empty tile for something it cannot see. */
export type MetricKey =
  | 'impressions'
  | 'viewable'
  | 'viewability'
  | 'plays'
  | 'engagementRate'
  | 'avgDwell'
  | 'completionRate'
  | 'ctaClicks'
  | 'ctr'
  | 'uniqueUsers'
  | 'conversions';

export interface SourceMeta {
  key: SourceKey;
  label: string;
  /** 'live' = real-time (our own instrumentation). 'nightly' = complete
   *  through yesterday only, per RFC §4 rule 3. */
  cadence: 'live' | 'nightly';
  lastSyncedAt: string | null;
  connector: ConnectorState;
  measures: MetricKey[];
}

export interface DailyPoint {
  date: string;
  impressions: number;
  viewable: number;
  plays: number;
  engagements: number;
  ctaClicks: number;
  avgDwell: number;
  uniqueUsers: number;
  /** Only on campaigns that track conversions (see `conversionTracking`). */
  conversions?: number;
}

export interface SourceSeries {
  totals: Partial<Record<MetricKey, number>>;
  daily: DailyPoint[];
}

interface PageStep {
  page: string;
  label: string;
  views: number;
  avgDwell: number;
  exits: number;
}

interface CtaRow {
  id: string;
  label: string;
  destination: string;
  clicks: number;
  uniqueClicks: number;
  ctr: number;
}

interface DeviceRow {
  device: 'Mobile' | 'Tablet' | 'Desktop';
  impressions: number;
  viewability: number;
  engagementRate: number;
}

/** One creative's counts for one day — the subset of DailyPoint a creative
 *  breakdown carries. Rates are always derived from these, never stored. */
export type CreativeDailyPoint = Pick<
  DailyPoint,
  'date' | 'impressions' | 'viewable' | 'engagements' | 'ctaClicks' | 'conversions'
> & {
  /** Impressions on smartphones and tablets (desktop is the rest). Set on a
   *  creative's days; absent on a campaign's own daily series. */
  mobileImpressions?: number;
};

export interface CreativeRow {
  id: string;
  name: string;
  /** The size, e.g. 300x250, 300x600, 320x480. */
  format: string;
  /** The game mechanic this creative runs (Tap to Reveal, Matchmaker, Carousel …).
   *  A mechanic belongs to a creative, not to the campaign: one campaign can run
   *  several creatives with different mechanics. */
  mechanic: string;
  impressions: number;
  engagementRate: number;
  avgDwell: number;
  ctaClicks: number;
  /** Day-by-day counts; `impressions`/`ctaClicks` above are their sums. */
  daily: CreativeDailyPoint[];
}

export interface Clicktag {
  id: string;
  label: string;
  url: string;
}

/** A Salesforce user (sales person or campaign manager). `avatarUrl` is the
 *  Salesforce profile photo; null falls back to initials. */
export interface Person {
  id: string;
  name: string;
  avatarUrl: string | null;
}

/** How a campaign is delivering against where it should be *by now* (delivered
 *  share of booked vs. share of the runtime elapsed) — not against the full
 *  booking. Computed by the backend. */
export type DeliveryHealth = 'good' | 'okay' | 'poor';

/** The metrics a campaign can be sold against or guaranteed on: the rates. */
export type GoalMetric = 'engagementRate' | 'ctr' | 'viewability' | 'completionRate';

/** The campaign's main goal as briefed in Salesforce. `target` is in the
 *  metric's own unit (a 0–1 rate); null = named, no target set. */
export interface PrimaryKpi {
  metric: GoalMetric;
  target: number | null;
}

/** What Klea contractually guarantees the client — a floor on a rate.
 *  Klea-internal: never shown to the client. */
interface PerformanceGuarantee {
  metric: GoalMetric;
  value: number;
}

interface Money {
  amount: number;
  currency: 'CHF' | 'EUR';
}

/** `live` and `ended` follow the flight. `archived` is hidden from every list. */
export type CampaignStatus = 'live' | 'ended' | 'archived';

export interface Campaign {
  /** Our UUID stays the primary key (RFC §5). */
  id: string;
  salesforceId: string;
  name: string;
  companyId: string;
  companyName: string;
  status: CampaignStatus;
  /** Null means booked directly with the client, no account in the middle. */
  accountId: string | null;
  accountName: string | null;
  /** App-owned (RFC §4 rule 3) — editable in Campaign setup, never synced
   *  from Salesforce. Headline numbers everywhere key off this field. */
  primarySource: SourceKey;
  flightStart: string;
  flightEnd: string;
  /** Salesforce-owned commercial metadata — read-only replica in the app. */
  salesforce: {
    salesPerson: Person;
    campaignManager: Person;
    market: string;
    /** Commercial category (e.g. Food Retail) — Salesforce-owned. */
    category: string;
    bookedImpressions: number;
    productLine: string;
    /** The main goal, briefed in Salesforce. Null until sales has set one. */
    primaryKpi: PrimaryKpi | null;
    /** Klea-internal: the performance floor guaranteed to the client. */
    performanceGuarantee: PerformanceGuarantee | null;
    /** Klea-internal: the campaign's total budget. */
    totalBudget: Money | null;
    /** Whether the campaign tracks conversions at all; the conversion metric
     *  only shows (and is only delivered by the sources that measure it) when on. */
    conversionTracking: boolean;
    lastSyncedAt: string;
  };
  /** App-owned technical setup — never touched by a sync (RFC §4 rule 4). */
  appOwned: {
    campaignTag: string;
    language: string;
    nexdLiveIds: string[];
    atkPixelMapping: string;
    clicktags: Clicktag[];
  };
  /** Backend-computed pacing read. The percentage shown in the UI is the
   *  current status (delivered ÷ booked); this drives the colour. */
  delivery: {
    /** Null when there is nothing to judge yet (no delivery, not started). */
    health: DeliveryHealth | null;
    /** Share of the booking that should be delivered by today (0–1), from
     *  the elapsed share of the runtime. Shown in the tooltip. */
    expectedPacing: number | null;
  };
  sources: Record<SourceKey, SourceSeries | null>;
  pages: PageStep[];
  ctas: CtaRow[];
  devices: DeviceRow[];
  creatives: CreativeRow[];
}

