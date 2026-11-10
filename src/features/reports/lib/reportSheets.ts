import type { TranslateFn } from '@/i18n';
import { EMPTY_VALUE, fmtInt, fmtMetric, fmtPct } from '@/lib/format';
import type { MetricValues, ReportContent } from './reportContent';
import { COUNT_METRICS, type ReportMetric } from './reportMetrics';

type RateMetric = Exclude<ReportMetric, 'impressions' | 'viewable' | 'engagements' | 'ctaClicks'>;

/** One report value the way it appears in every rendering of a report. */
export function formatReportValue(metric: ReportMetric, value: number | null): string {
  if (value == null) return EMPTY_VALUE;
  return isCountMetric(metric) ? fmtInt(value) : fmtMetric(metric as RateMetric, value);
}

const isCountMetric = (metric: ReportMetric) => COUNT_METRICS.includes(metric);

/** The label a metric carries as a column header in a report. */
export const reportMetricLabel = (t: TranslateFn, metric: ReportMetric) =>
  t(`metric.${metric}.label`);

export interface ReportSheet {
  id: 'summary' | 'creatives' | 'campaigns' | 'daily';
  title: string;
  /** Column headers; the first `labelColumns` of them are text, the rest figures. */
  headers: string[];
  labelColumns: number;
  rows: string[][];
}

/**
 * The report as tables: summary, creative split, campaigns (portfolio scopes)
 * and the day-by-day breakdown. The one description of a report's contents —
 * the CSV, the Excel preview and the PDF all read from it, so they can never
 * disagree. `plainCounts` writes counts as bare digits (a spreadsheet reads
 * 9592804 as a number but "9'592'804" as text).
 */
export function buildReportSheets(
  content: ReportContent,
  t: TranslateFn,
  fmtDate: (iso: string) => string,
  { plainCounts = false }: { plainCounts?: boolean } = {},
): ReportSheet[] {
  const headers = content.metrics.map((m) => reportMetricLabel(t, m));
  const value = (m: ReportMetric, v: number | null) =>
    plainCounts && isCountMetric(m) && v != null ? String(Math.round(v)) : formatReportValue(m, v);
  const cells = (v: MetricValues) => content.metrics.map((m) => value(m, v[m]));

  const sheets: ReportSheet[] = [
    {
      id: 'summary',
      title: t('reports.preview.summary'),
      headers,
      labelColumns: 0,
      rows: [cells(content.summary)],
    },
    {
      id: 'creatives',
      title: t('reports.preview.creatives'),
      headers: [t('detail.col.creative'), t('creatives.col.share'), ...headers],
      labelColumns: 1,
      rows: content.creatives.map((c) => [c.format, fmtPct(c.share, 0), ...cells(c.values)]),
    },
  ];
  if (content.campaigns.length) {
    sheets.push({
      id: 'campaigns',
      title: t('reports.preview.campaigns'),
      headers: [t('campaigns.col.campaign'), ...headers],
      labelColumns: 1,
      rows: content.campaigns.map((c) => [c.name, ...cells(c.values)]),
    });
  }
  if (content.daily) {
    sheets.push({
      id: 'daily',
      title: t('reports.preview.daily'),
      headers: [t('daily.col.date'), ...headers],
      labelColumns: 1,
      rows: content.daily.map((d) => [fmtDate(d.date), ...cells(d.values)]),
    });
  }
  return sheets;
}
