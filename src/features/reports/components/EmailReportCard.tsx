import { Clock, Mail, Pencil, Trash2 } from 'lucide-react';
import { useFormatters, useI18n } from '@/i18n';
import { Button, Pill, Switch } from '@/components/ui';
import { ItemCard } from '@/components/display';
import type { EmailReport } from '@/types';
import { useSendTestEmailReport, useSetEmailReportEnabled } from '@/api/hooks/useEmailReports';
import { humanCadence, reportFormatLabel, reportMetrics } from '../lib/reportMetrics';
import { reportScopeLabel } from '../lib/reportScope';
import { ReportStatusPill } from './ReportStatusPill';

/** One saved report in the Reports list — with run-now, edit, remove and the
 *  schedule on/off switch. */
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

  return (
    <ItemCard
      icon={<Mail size={16} />}
      active={report.enabled}
      title={report.name}
      badges={
        <>
          <span className="text-sm text-gray-400 dark:text-gray-500">
            · {reportScopeLabel(report.scope, t)}
          </span>
          <ReportStatusPill enabled={report.enabled} />
        </>
      }
      actions={
        <>
          <Button size="sm" onClick={() => sendTest.mutate(report.id)} disabled={sendTest.isPending}>
            {sendTest.isPending ? t('reports.email.running') : t('reports.runNow')}
          </Button>
          <Button size="sm" icon={<Pencil size={12} />} onClick={onEdit}>
            {t('common.edit')}
          </Button>
          <Button size="sm" icon={<Trash2 size={12} />} onClick={onDelete}>
            {t('common.remove')}
          </Button>
          <Switch
            checked={report.enabled}
            onChange={(next) => setEnabled.mutate({ id: report.id, enabled: next })}
            disabled={setEnabled.isPending}
            label={report.enabled ? t('reports.paused') : t('reports.active')}
          />
        </>
      }
    >
      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{report.recipients.join(', ')}</div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
        <span className="inline-flex items-center gap-1">
          <Clock size={11} />
          {humanCadence(t, report)}
        </span>
        <span>{reportFormatLabel(t, report.format)}</span>
        <span className="flex flex-wrap gap-1">
          {reportMetrics(report).map((m) => (
            <Pill key={m} tone="teal">
              {t(`metric.${m}.label`)}
            </Pill>
          ))}
        </span>
        <span>
          {report.lastSentAt
            ? t('reports.email.lastSent', { time: relativeTime(report.lastSentAt) })
            : t('reports.email.neverSent')}
        </span>
      </div>
    </ItemCard>
  );
}
