import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowRight, Check, Eye, Mail, Pencil, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { useFormatters, useI18n } from '@/i18n';
import { Button, Card, DeleteButton, Switch } from '@/components/ui';
import { IconBadge } from '@/components/display';
import { paths } from '@/config/paths';
import type { EmailReport } from '@/types';
import { useReportRuns, useSendTestEmailReport, useSetEmailReportEnabled } from '@/api/hooks/useEmailReports';
import { reportDraft } from '../lib/reportContent';
import { humanCadence, reportFormatLabel, reportMetrics } from '../lib/reportMetrics';
import { reportScopeLabel } from '../lib/reportScope';
import { ReportPreviewDialog } from './ReportPreviewDialog';
import { ReportStatusPill } from './ReportStatusPill';

/** One labelled fact in the card's details row. */
function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-brame-dark dark:text-gray-100">{children}</dd>
    </div>
  );
}

/**
 * One saved report in the Reports list. The header carries the name, who it
 * covers and what you do to it (run, edit, remove, switch on or off). Underneath: how it
 * is set up, then how its last send went, with the ways to look at it (preview,
 * history) in the footer.
 */
export function EmailReportCard({
  report,
  onEdit,
  onDelete,
}: {
  report: EmailReport;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const { relativeTime } = useFormatters();
  const setEnabled = useSetEmailReportEnabled();
  const sendTest = useSendTestEmailReport();
  const { data: runs = [] } = useReportRuns();
  const [previewing, setPreviewing] = useState(false);
  // Run now confirms right here, then gets out of the way: a run you started
  // yourself is on the report's history, not something to hunt for in the inbox.
  const [confirmed, setConfirmed] = useState(false);
  useEffect(() => {
    if (!confirmed) return;
    const timer = window.setTimeout(() => setConfirmed(false), 6000);
    return () => window.clearTimeout(timer);
  }, [confirmed]);
  const draft = useMemo(() => reportDraft(report), [report]);

  const lastRun = runs.find((r) => r.reportId === report.id);
  const failed = lastRun?.status === 'failed';
  const [firstRecipient, ...otherRecipients] = report.recipients;

  let lastSend: { tone: 'ok' | 'failed' | 'none'; text: string };
  if (confirmed) lastSend = { tone: 'ok', text: t('reports.email.sentNow', { count: report.recipients.length }) };
  else if (failed) lastSend = { tone: 'failed', text: `${t('reports.card.lastFailed')} · ${lastRun?.failureReason ?? ''}` };
  else if (report.lastSentAt) lastSend = { tone: 'ok', text: t('reports.email.lastSent', { time: relativeTime(report.lastSentAt) }) };
  else lastSend = { tone: 'none', text: t('reports.email.neverSent') };

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-start gap-3">
          <IconBadge icon={<Mail size={16} />} active={report.enabled} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h3 className="font-medium text-brame-dark dark:text-gray-100">{report.name}</h3>
              <ReportStatusPill enabled={report.enabled} />
            </div>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{reportScopeLabel(report.scope, t)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            icon={<Play size={12} />}
            onClick={() => sendTest.mutate(report.id, { onSuccess: () => setConfirmed(true) })}
            disabled={sendTest.isPending}
          >
            {sendTest.isPending ? t('reports.email.running') : t('reports.runNow')}
          </Button>
          <Button size="sm" icon={<Pencil size={12} />} onClick={onEdit}>
            {t('common.edit')}
          </Button>
          <DeleteButton label={t('common.remove')} onClick={onDelete} />
          <span className="mx-1 h-5 w-px bg-gray-200 dark:bg-white/10" aria-hidden />
          <Switch
            checked={report.enabled}
            onChange={(next) => setEnabled.mutate({ id: report.id, enabled: next })}
            disabled={setEnabled.isPending}
            label={report.enabled ? t('reports.paused') : t('reports.active')}
          />
        </div>
      </div>

      <dl className="mt-4 grid gap-x-8 gap-y-4 border-t border-gray-100 pt-4 dark:border-white/5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1.6fr)]">
        <Detail label={t('reports.card.schedule')}>
          {humanCadence(t, report)}
          <span className="block text-gray-500 dark:text-gray-400">{reportFormatLabel(t, report.format)}</span>
        </Detail>
        <Detail label={t('reports.card.recipients')}>
          <span title={report.recipients.join(', ')} className="block truncate">
            {firstRecipient}
          </span>
          {otherRecipients.length > 0 && (
            <span className="block text-gray-500 dark:text-gray-400">
              {t('reports.card.moreRecipients', { count: otherRecipients.length })}
            </span>
          )}
        </Detail>
        <Detail label={t('reports.card.figures')}>
          <span className="text-gray-600 dark:text-gray-300">
            {reportMetrics(report)
              .map((m) => t(`metric.${m}.label`))
              .join(' · ')}
          </span>
        </Detail>
      </dl>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-gray-100 pt-3 text-xs dark:border-white/5">
        <span
          role="status"
          className={cn(
            'inline-flex min-w-0 items-center gap-1.5',
            lastSend.tone === 'failed' ? 'text-red-600 dark:text-red-300' : 'text-gray-500 dark:text-gray-400'
          )}
        >
          {lastSend.tone === 'ok' && confirmed ? (
            <Check size={12} className="flex-shrink-0 text-green-600 dark:text-green-300" />
          ) : (
            <span
              aria-hidden
              className={cn(
                'h-1.5 w-1.5 flex-shrink-0 rounded-full',
                lastSend.tone === 'ok' && 'bg-green-500',
                lastSend.tone === 'failed' && 'bg-red-500',
                lastSend.tone === 'none' && 'bg-gray-300 dark:bg-white/20'
              )}
            />
          )}
          <span className="truncate">{lastSend.text}</span>
        </span>
        <span className="inline-flex items-center gap-4 font-medium text-brame-teal dark:text-brame-lime">
          <button type="button" onClick={() => setPreviewing(true)} className="inline-flex items-center gap-1 hover:underline">
            <Eye size={12} />
            {t('reports.preview.button')}
          </button>
          <Link to={paths.reportHistory(report.name)} className="inline-flex items-center gap-1 hover:underline">
            {t('reports.email.viewHistory')}
            <ArrowRight size={12} />
          </Link>
        </span>
      </div>

      <ReportPreviewDialog open={previewing} onClose={() => setPreviewing(false)} draft={draft} recipients={report.recipients} />
    </Card>
  );
}
