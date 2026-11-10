import type { TranslateFn } from '@/i18n';
import type { EmailReport, ReportMetricKey } from '@/types';

/**
 * The figures selectable when building a report, in customer-journey order —
 * the same columns the v1 report template carries: delivered, viewable,
 * engaged, clicked. Detail such as dwell time or completion rate stays
 * per-campaign and doesn't belong in a summary.
 */
export const REPORT_METRICS = [
  'impressions',
  'viewable',
  'engagements',
  'engagementRate',
  'ctaClicks',
  'ctr',
  'viewability',
] as const satisfies readonly ReportMetricKey[];

export type ReportMetric = (typeof REPORT_METRICS)[number];

/** Counts, as opposed to rates: shown as whole numbers, written to a
 *  spreadsheet as plain digits. */
export const COUNT_METRICS: readonly ReportMetric[] = ['impressions', 'viewable', 'engagements', 'ctaClicks'];

/** What a new report starts with. */
export const DEFAULT_REPORT_METRICS: ReportMetric[] = ['impressions', 'ctr', 'viewability', 'engagementRate'];

/** Renders a report's cadence for display — shared by the Reports list and
 *  a client's own reports section. */
export function humanCadence(t: TranslateFn, report: EmailReport): string {
  if (report.cadence === 'daily') return t('reports.email.cadenceDailyLabel');
  if (report.cadence === 'monthly') return t('reports.email.cadenceMonthlyLabel');
  return t('reports.email.cadenceWeeklyLabel', {
    day: t(`reports.email.day.${report.dayOfWeek ?? 'mon'}`),
  });
}

/** Narrows a report's stored metrics to the selectable report metrics. */
export function reportMetrics(report: EmailReport): ReportMetric[] {
  return report.metrics.filter((m): m is ReportMetric =>
    (REPORT_METRICS as readonly string[]).includes(m),
  );
}

/** The report's delivery format as a readable label. */
export function reportFormatLabel(t: TranslateFn, format: EmailReport['format']): string {
  if (format === 'excel') return t('reports.email.formatExcel');
  if (format === 'csv') return t('reports.email.formatCsv');
  if (format === 'pdf') return t('reports.email.formatPdf');
  return t('reports.email.formatEmailBody');
}
