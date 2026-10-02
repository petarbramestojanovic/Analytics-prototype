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
  | 'uniqueUsers';

export interface SourceMeta {
  key: SourceKey;
  label: string;
  fullLabel: string;
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

interface CreativeRow {
  id: string;
  name: string;
  format: string;
  impressions: number;
  engagementRate: number;
  avgDwell: number;
  ctaClicks: number;
}

interface UtmRow {
  source: string;
  medium: string;
  campaign: string;
  sessions: number;
  ctaClicks: number;
}

export interface Clicktag {
  id: string;
  label: string;
  url: string;
}

export type CampaignStatus = 'live' | 'scheduled' | 'ended' | 'archived';

export interface Campaign {
  /** Our UUID stays the primary key (RFC §5). */
  id: string;
  salesforceId: string;
  name: string;
  companyId: string;
  companyName: string;
  status: CampaignStatus;
  /** Null means booked directly with the client, no agency in the middle. */
  agencyId: string | null;
  agencyName: string | null;
  /** App-owned (RFC §4 rule 3) — editable in Campaign setup, never synced
   *  from Salesforce. Headline numbers everywhere key off this field. */
  primarySource: SourceKey;
  flightStart: string;
  flightEnd: string;
  /** Salesforce-owned commercial metadata — read-only replica in the app. */
  salesforce: {
    owner: string;
    market: string;
    bookedImpressions: number;
    productLine: string;
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
  sources: Record<SourceKey, SourceSeries | null>;
  pages: PageStep[];
  ctas: CtaRow[];
  devices: DeviceRow[];
  creatives: CreativeRow[];
  utm: UtmRow[];
}

