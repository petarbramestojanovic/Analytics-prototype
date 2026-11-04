import type { TranslateFn } from '@/i18n';
import { EMPTY_VALUE, fmtInt, fmtMetric } from '@/lib/format';
import type { MetricValues, ReportContent } from './reportContent';
import type { ReportMetric } from './reportMetrics';

/** One report value the way it appears in every rendering of a report. */
export function formatReportValue(metric: ReportMetric, value: number | null): string {
  if (value == null) return EMPTY_VALUE;
  return metric === 'impressions' ? fmtInt(value) : fmtMetric(metric, value);
}

const cell = (v: string) => (/[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/**
 * The report as CSV text: a small header block, then one table per section
 * (summary, creative split, campaigns, daily) separated by blank lines. The
 * same text is shown in the preview and would be the attachment.
 */
export function reportToCsv(
  info: { name: string; scopeLabel: string; period: string },
  content: ReportContent,
  t: TranslateFn,
  fmtDate: (iso: string) => string,
): string {
  const metricHeaders = content.metrics.map((m) => t(`metric.${m}.label`));
  // Plain digits for counts: a spreadsheet reads 9592804 as a number but
  // "9'592'804" as text.
  const csvValue = (m: ReportMetric, value: number | null) =>
    m === 'impressions' && value != null ? String(Math.round(value)) : formatReportValue(m, value);
  const valueCells = (v: MetricValues) => content.metrics.map((m) => csvValue(m, v[m]));
  const blocks: string[][][] = [
    [
      [t('reports.preview.csv.report'), info.name],
      [t('reports.preview.scope'), info.scopeLabel],
      [t('reports.preview.period'), info.period],
    ],
    [[t('reports.preview.summary')], metricHeaders, valueCells(content.summary)],
    [
      [t('reports.preview.creatives')],
      [t('detail.col.creative'), t('creatives.col.share'), ...metricHeaders],
      ...content.creatives.map((c) => [
        c.format,
        `${(c.share * 100).toFixed(0)}%`,
        ...valueCells(c.values),
      ]),
    ],
  ];
  if (content.campaigns.length) {
    blocks.push([
      [t('reports.preview.campaigns')],
      [t('campaigns.col.campaign'), ...metricHeaders],
      ...content.campaigns.map((c) => [c.name, ...valueCells(c.values)]),
    ]);
  }
  if (content.daily) {
    blocks.push([
      [t('reports.preview.daily')],
      [t('daily.col.date'), ...metricHeaders],
      ...content.daily.map((d) => [fmtDate(d.date), ...valueCells(d.values)]),
    ]);
  }
  return blocks.map((rows) => rows.map((r) => r.map(cell).join(',')).join('\n')).join('\n\n');
}
