import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import type { ReportContent } from '../lib/reportContent';
import { formatReportValue, reportMetricLabel } from '../lib/reportSheets';

/** The headline figures as tiles. Drawn on white like the rest of the
 *  preview — it shows what a recipient sees, not part of the dashboard. */
export function ReportKpiTiles({
  content,
  large = false,
}: {
  content: ReportContent;
  /** Bigger numbers, for the PDF's first page. */
  large?: boolean;
}) {
  const { t } = useI18n();
  return (
    // Tiles share the row equally and grow into the last row's free space, so
    // three metrics fill the width instead of leaving a gap on the right.
    <div className="flex flex-wrap gap-3">
      {content.metrics.map((m) => (
        <div
          key={m}
          className="min-w-[7rem] flex-1 basis-[calc(25%-0.75rem)] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5"
        >
          <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
            {reportMetricLabel(t, m)}
          </div>
          <div
            className={cn(
              'tnum mt-0.5 font-bold text-gray-900',
              large ? 'text-xl' : 'text-lg',
            )}
          >
            {formatReportValue(m, content.summary[m])}
          </div>
        </div>
      ))}
    </div>
  );
}
