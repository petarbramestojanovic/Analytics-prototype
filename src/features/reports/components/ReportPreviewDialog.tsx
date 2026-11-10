import { useState } from 'react';
import { FileSpreadsheet, FileText, Mail, Rows3 } from 'lucide-react';
import { useI18n } from '@/i18n';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Tabs,
} from '@/components/ui';
import { useReportRendering } from '../hooks/useReportRendering';
import type { ReportDraft } from '../lib/reportContent';
import { ReportEmailPreview } from './ReportEmailPreview';
import { ReportExcelPreview } from './ReportExcelPreview';
import { ReportPdfPreview } from './ReportPdfPreview';

type PreviewTab = 'email' | 'file';

const FILE_ICON = { excel: FileSpreadsheet, pdf: FileText, csv: Rows3 } as const;

/**
 * What a report sends, built from the form's current values: the email, and —
 * on its own tab — the attachment drawn the way that file type really looks (a
 * paged PDF, an Excel workbook with a tab per sheet, plain CSV text). Always
 * drawn on white, like a real mail client, so it reads the same in light and
 * dark mode — it is what the recipient sees, not part of the dashboard.
 */
export function ReportPreviewDialog({
  open,
  onClose,
  draft,
  recipients,
}: {
  open: boolean;
  onClose: () => void;
  draft: ReportDraft;
  recipients: string[];
}) {
  const { t } = useI18n();
  const { content, name, scopeLabel, period, subject, attachment, csv } = useReportRendering(draft);
  const [tab, setTab] = useState<PreviewTab>('email');
  const format = draft.format;
  // An email-only report has no file; a format change can strand the tab.
  const activeTab: PreviewTab = format === 'email' ? 'email' : tab;
  const FileIcon = format === 'email' ? Mail : FILE_ICON[format];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t('reports.preview.title')}</DialogTitle>
          <DialogDescription>{t('reports.preview.description')}</DialogDescription>
        </DialogHeader>

        {format !== 'email' && (
          <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Tabs
              value={activeTab}
              onChange={setTab}
              groupLabel={t('reports.preview.title')}
              options={[
                {
                  value: 'email',
                  label: (
                    <span className="inline-flex items-center gap-1.5">
                      <Mail size={13} />
                      {t('reports.preview.tab.email')}
                    </span>
                  ),
                },
                {
                  value: 'file',
                  label: (
                    <span className="inline-flex items-center gap-1.5">
                      <FileIcon size={13} />
                      {t(`reports.preview.tab.${format}`)}
                    </span>
                  ),
                },
              ]}
            />
            {activeTab === 'file' && (
              <p className="min-w-0 flex-1 text-xs text-gray-500 dark:text-gray-400">
                {t(`reports.preview.fileNote.${format}`)}
              </p>
            )}
          </div>
        )}

        {activeTab === 'email' && (
          <ReportEmailPreview
            draft={draft}
            content={content}
            name={name}
            scopeLabel={scopeLabel}
            period={period}
            subject={subject}
            attachment={attachment}
            recipients={recipients}
          />
        )}

        {activeTab === 'file' && format === 'pdf' && (
          <ReportPdfPreview content={content} name={name} scopeLabel={scopeLabel} period={period} />
        )}
        {activeTab === 'file' && format === 'excel' && attachment && (
          <ReportExcelPreview
            content={content}
            name={name}
            scopeLabel={scopeLabel}
            period={period}
            fileName={attachment}
          />
        )}
        {activeTab === 'file' && format === 'csv' && (
          <pre className="max-h-96 overflow-auto rounded-xl border border-gray-200 bg-white p-4 font-mono text-xs leading-relaxed text-gray-800">
            {csv}
          </pre>
        )}

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            {t('common.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
