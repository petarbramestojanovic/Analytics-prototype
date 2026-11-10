import type { TranslateFn } from '@/i18n';
import type { ReportContent } from './reportContent';
import { buildReportSheets } from './reportSheets';

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
  const blocks: string[][][] = [
    [
      [t('reports.preview.csv.report'), info.name],
      [t('reports.preview.scope'), info.scopeLabel],
      [t('reports.preview.period'), info.period],
    ],
    ...buildReportSheets(content, t, fmtDate, { plainCounts: true }).map((s) => [
      [s.title],
      s.headers,
      ...s.rows,
    ]),
  ];
  return blocks.map((rows) => rows.map((r) => r.map(cell).join(',')).join('\n')).join('\n\n');
}
