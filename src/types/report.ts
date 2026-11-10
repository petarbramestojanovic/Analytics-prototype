
/** The figures a report can carry — the same columns as the v1 report
 *  template (Impressions, Visibility, ENG, ENG-Rate, Clicks, CTR,
 *  Viewability). `engagements` is a count derived from the daily series, which
 *  is why it is not one of the campaign `MetricKey`s. */
export type ReportMetricKey =
  | 'impressions'
  | 'viewable'
  | 'engagements'
  | 'engagementRate'
  | 'ctaClicks'
  | 'ctr'
  | 'viewability';

/** What a report summarizes — one client's whole portfolio, one account's
 *  whole book, or a single campaign. Same shape as AlertRuleScope
 *  (lib/alertRules.tsx), one level added for the account case. */
export type ReportScope =
  | { level: 'client'; companyId: string; companyName: string }
  | { level: 'account'; accountId: string; accountName: string }
  | { level: 'campaign'; campaignId: string; campaignName: string };

/**
 * A human-readable performance summary sent to people. A target can have
 * more than one (e.g. a weekly ops summary and a monthly exec rollup), which
 * is why this is keyed by its own id rather than one-per-scope.
 */
export interface EmailReport {
  id: string;
  scope: ReportScope;
  name: string;
  recipients: string[];
  /** In the order they are offered (see REPORT_METRICS). */
  metrics: ReportMetricKey[];
  /** Aggregated totals for the period, or a day-by-day breakdown. */
  granularity: 'total' | 'daily';
  cadence: 'daily' | 'weekly' | 'monthly';
  /** Only meaningful when cadence is 'weekly'; daily is every day and
   *  monthly is always the 1st. */
  dayOfWeek?: 'mon' | 'tue' | 'wed' | 'thu' | 'fri';
  format: 'excel' | 'csv' | 'pdf' | 'email';
  /** Whether this report sends automatically on `cadence`. A saved report
   *  with this off is never pushed on a schedule — only run on demand. */
  enabled: boolean;
  lastSentAt: string | null;
}

