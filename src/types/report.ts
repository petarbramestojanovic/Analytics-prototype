import type { MetricKey } from './campaign';

/** What a report summarizes — one client's whole portfolio, one agency's
 *  whole book, or a single campaign. Same shape as AlertRuleScope
 *  (lib/alertRules.tsx), one level added for the agency case. */
export type ReportScope =
  | { level: 'client'; companyId: string; companyName: string }
  | { level: 'agency'; agencyId: string; agencyName: string }
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
  /** Restricted in the UI to REPORT_METRICS — the four metrics already shown
   *  on Overview/Campaigns — even though the type allows any MetricKey. */
  metrics: MetricKey[];
  /** Aggregated totals for the period, or a day-by-day breakdown. */
  granularity: 'total' | 'daily';
  cadence: 'daily' | 'weekly' | 'monthly';
  /** Only meaningful when cadence is 'weekly'; daily is every day and
   *  monthly is always the 1st. */
  dayOfWeek?: 'mon' | 'tue' | 'wed' | 'thu' | 'fri';
  format: 'excel' | 'pdf' | 'email';
  /** Whether this report sends automatically on `cadence`. A saved report
   *  with this off is never pushed on a schedule — only run on demand. */
  enabled: boolean;
  lastSentAt: string | null;
}

