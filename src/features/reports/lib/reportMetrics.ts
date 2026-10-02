import type { TranslateFn } from '@/i18n';
import type { EmailReport, MetricKey } from '@/types';

/**
 * The metrics selectable when building an email report — the four already
 * shown on Overview/Campaigns, not the full MetricKey set. Several MetricKey
 * values (avg. dwell time, completion rate, unique users, …) are per-campaign
 * engagement detail that doesn't belong in a portfolio-level summary.
 */
export const REPORT_METRICS = ['impressions', 'ctr', 'viewability', 'engagementRate'] as const satisfies readonly MetricKey[];

export type ReportMetric = (typeof REPORT_METRICS)[number];

/** Renders a report's cadence for display — shared by the Reports list and
 *  a client's own reports section. */
export function humanCadence(t: TranslateFn, report: EmailReport): string {
  if (report.cadence === 'daily') return t('reports.email.cadenceDailyLabel');
  if (report.cadence === 'monthly') return t('reports.email.cadenceMonthlyLabel');
  return t('reports.email.cadenceWeeklyLabel', { day: t(`reports.email.day.${report.dayOfWeek ?? 'mon'}`) });
}

/** Narrows a report's stored metrics to the selectable report metrics. */
export function reportMetrics(report: EmailReport): ReportMetric[] {
  return report.metrics.filter((m): m is ReportMetric => (REPORT_METRICS as readonly string[]).includes(m));
}

/** The report's delivery format as a readable label. */
export function reportFormatLabel(t: TranslateFn, format: EmailReport['format']): string {
  if (format === 'excel') return t('reports.email.formatExcel');
  if (format === 'pdf') return t('reports.email.formatPdf');
  return t('reports.email.formatEmailBody');
}
