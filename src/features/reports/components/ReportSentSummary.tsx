import { useMemo, useState } from 'react';
import { Eye } from 'lucide-react';
import { useI18n } from '@/i18n';
import { Button } from '@/components/ui';
import type { EmailReport } from '@/types';
import { useReportRendering } from '../hooks/useReportRendering';
import { reportDraft } from '../lib/reportContent';
import { humanCadence } from '../lib/reportMetrics';
import { reportScopeLabel } from '../lib/reportScope';
import { ReportPreviewDialog } from './ReportPreviewDialog';

/**
 * What a report that just went out contained, for the inbox: who it covers,
 * the period, the file and who got it — and the same preview the Reports page
 * has, so reading it never means leaving the inbox.
 */
export function ReportSentSummary({ report }: { report: EmailReport }) {
  const { t } = useI18n();
  const draft = useMemo(() => reportDraft(report), [report]);
  const { period, attachment } = useReportRendering(draft);
  const [previewing, setPreviewing] = useState(false);

  const rows = [
    { label: t('inbox.fact.report'), value: report.name },
    { label: t('reports.sent.covers'), value: reportScopeLabel(report.scope, t) },
    { label: t('reports.preview.period'), value: period },
    { label: t('reports.sent.schedule'), value: humanCadence(t, report) },
    { label: t('reports.preview.attachment'), value: attachment ?? t('reports.sent.noAttachment') },
    { label: t('reports.preview.to'), value: report.recipients.join(', ') },
  ];

  return (
    <>
      <dl className="mt-4 divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-white/5 dark:border-white/10">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-6 px-4 py-2.5 text-sm">
            <dt className="flex-shrink-0 text-gray-500 dark:text-gray-400">{row.label}</dt>
            <dd className="min-w-0 break-words text-right font-medium text-brame-dark dark:text-gray-100">{row.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-5">
        <Button variant="primary" icon={<Eye size={13} />} onClick={() => setPreviewing(true)}>
          {t('reports.sent.preview')}
        </Button>
      </div>
      <ReportPreviewDialog open={previewing} onClose={() => setPreviewing(false)} draft={draft} recipients={report.recipients}
        description={t('reports.sent.previewNote')} />
    </>
  );
}
