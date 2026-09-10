import type { MetricKey } from '../mock/types';

/**
 * The metrics selectable when building an email report — the four already
 * shown on Overview/Campaigns, not the full MetricKey set. Several MetricKey
 * values (avg. dwell time, completion rate, unique users, …) are per-campaign
 * engagement detail that doesn't belong in a portfolio-level summary.
 */
export const REPORT_METRICS = ['impressions', 'ctr', 'viewability', 'engagementRate'] as const satisfies readonly MetricKey[];

export type ReportMetric = (typeof REPORT_METRICS)[number];
