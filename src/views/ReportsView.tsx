import { useMemo, useState } from 'react';
import { Clock, Mail, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import type { EmailReport } from '../mock/types';
import { REPORT_METRICS } from '../lib/reportMetrics';
import { useSession } from '../lib/session';
import { useI18n, useFormatters } from '../lib/i18n';
import { usePageTitle } from '../lib/usePageTitle';
import {
  useDeleteEmailReport,
  useEmailReports,
  useSendTestEmailReport,
  useSetEmailReportEnabled,
} from '../hooks/useEmailReports';
import EmailReportModal from '../components/EmailReportModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { Select, SelectContent, SelectItem, SelectTrigger } from '../components/ui/select';
import { Button, Card, LoadingState, Pill, SegmentedControl, Switch } from '../components/primitives';

type StatusFilter = 'all' | 'active' | 'paused';

/**
 * Human-readable performance summaries, sent to people on a schedule —
 * tenant-scoped like Campaigns, so a company_user manages only their own.
 */
export default function ReportsView() {
  const { companyId, companyName, isInternal } = useSession();
  const { t } = useI18n();
  usePageTitle(t('reports.title'));
  const { data: allEmailReports, isLoading } = useEmailReports();
  const deleteEmailReport = useDeleteEmailReport();

  const [creatingReport, setCreatingReport] = useState(false);
  const [editingReport, setEditingReport] = useState<EmailReport | null>(null);
  const [deletingReport, setDeletingReport] = useState<EmailReport | null>(null);

  const [q, setQ] = useState('');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const scopedEmailReports = useMemo(
    () =>
      isInternal ? (allEmailReports ?? []) : (allEmailReports ?? []).filter((r) => r.companyId === companyId),
    [allEmailReports, isInternal, companyId]
  );

  // Company filter is internal-only — a client is already scoped to their
  // own company above, so narrowing further would be pointless for them.
  const companyOptions = useMemo(
    () => [...new Map(scopedEmailReports.map((r) => [r.companyId, r.companyName])).entries()].sort((a, b) => a[1].localeCompare(b[1])),
    [scopedEmailReports]
  );

  const needle = q.trim().toLowerCase();
  const filteredEmailReports = useMemo(
    () =>
      scopedEmailReports.filter(
        (r) =>
          (!isInternal || companyFilter === 'all' || r.companyId === companyFilter) &&
          (statusFilter === 'all' || (statusFilter === 'active') === r.enabled) &&
          (needle === '' ||
            r.name.toLowerCase().includes(needle) ||
            r.companyName.toLowerCase().includes(needle) ||
            r.recipients.some((email) => email.toLowerCase().includes(needle)))
      ),
    [scopedEmailReports, isInternal, companyFilter, statusFilter, needle]
  );

  if (isLoading) {
    return <LoadingState label={t('common.loading')} />;
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brame-dark dark:text-white">{t('reports.title')}</h1>
          <p className="mt-1 max-w-3xl text-sm text-gray-500 dark:text-gray-400">{t('reports.subtitle')}</p>
        </div>
        <Button variant="primary" icon={<Plus size={13} />} onClick={() => setCreatingReport(true)}>
          {t('reports.emailNew')}
        </Button>
      </div>

      {scopedEmailReports.length > 0 && (
        <Card padded={false} className="mb-5">
          <div className="flex flex-wrap items-center gap-3 p-4">
            <div className="relative min-w-56 flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('reports.search')}
                className="h-10 w-full rounded-lg border border-gray-300 pl-9 pr-3 text-sm text-brame-dark outline-none focus:border-brame-teal dark:border-white/15 dark:bg-brame-dark-light dark:text-gray-100 dark:placeholder:text-gray-500"
              />
            </div>

            {isInternal && (
              <div className="w-56">
                <Select value={companyFilter} onValueChange={setCompanyFilter}>
                  <SelectTrigger />
                  <SelectContent>
                    <SelectItem value="all">{t('reports.filter.allClients')}</SelectItem>
                    {companyOptions.map(([id, name]) => (
                      <SelectItem key={id} value={id}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <SegmentedControl
              value={statusFilter}
              onChange={setStatusFilter}
              className="flex h-10 items-center gap-1 rounded-lg bg-gray-100 p-1 dark:bg-white/5"
              indicatorClassName="rounded-md bg-white shadow-sm dark:bg-brame-dark-light"
              itemClassName="flex h-full items-center px-3 text-xs font-medium transition-colors"
              activeItemClassName="text-brame-dark dark:text-white"
              inactiveItemClassName="text-gray-500 hover:text-brame-dark dark:text-gray-400 dark:hover:text-gray-100"
              options={(
                [
                  ['all', t('reports.filter.all')],
                  ['active', t('reports.active')],
                  ['paused', t('reports.paused')],
                ] as const
              ).map(([value, label]) => ({ value, label }))}
            />
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {filteredEmailReports.map((r) => (
          <EmailReportRow key={r.id} report={r} onEdit={() => setEditingReport(r)} onDelete={() => setDeletingReport(r)} />
        ))}
        {filteredEmailReports.length === 0 && (
          <Card className="border-dashed text-center dark:border-white/15">
            <p className="py-6 text-sm text-gray-500 dark:text-gray-400">
              {scopedEmailReports.length === 0 ? t('reports.emailEmpty') : t('reports.noMatches')}
            </p>
          </Card>
        )}
      </div>

      <EmailReportModal
        open={creatingReport}
        onOpenChange={setCreatingReport}
        companyId={isInternal ? undefined : companyId}
        companyName={isInternal ? undefined : companyName}
      />
      <EmailReportModal
        report={editingReport ?? undefined}
        open={editingReport !== null}
        onOpenChange={(open) => {
          if (!open) setEditingReport(null);
        }}
      />
      <ConfirmDialog
        open={deletingReport !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingReport(null);
        }}
        title={t('reports.email.deleteTitle')}
        description={
          deletingReport
            ? t('reports.email.deleteBody', { name: deletingReport.name, count: deletingReport.recipients.length })
            : ''
        }
        onConfirm={() => {
          if (deletingReport) deleteEmailReport.mutate(deletingReport.id, { onSuccess: () => setDeletingReport(null) });
        }}
        pending={deleteEmailReport.isPending}
      />
    </div>
  );
}

function humanCadence(t: (key: string, vars?: Record<string, string | number>) => string, report: EmailReport): string {
  if (report.cadence === 'monthly') return t('reports.email.cadenceMonthlyLabel');
  return t('reports.email.cadenceWeeklyLabel', { day: t(`reports.email.day.${report.dayOfWeek ?? 'mon'}`) });
}

function EmailReportRow({
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
  const enabled = report.enabled;

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 rounded-lg p-2 ${
              enabled
                ? 'bg-brame-teal/10 text-brame-teal dark:bg-brame-teal/20 dark:text-brame-turquoise-light'
                : 'bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-gray-500'
            }`}
          >
            <Mail size={16} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-brame-dark dark:text-gray-100">{report.name}</span>
              <span className="text-sm text-gray-400 dark:text-gray-500">· {report.companyName}</span>
              <Pill tone={enabled ? 'green' : 'neutral'}>
                {enabled ? t('reports.active') : t('reports.paused')}
              </Pill>
            </div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{report.recipients.join(', ')}</div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
              <span className="inline-flex items-center gap-1">
                <Clock size={11} />
                {humanCadence(t, report)}
              </span>
              <span>
                {report.format === 'pdf' ? t('reports.email.formatPdf') : t('reports.email.formatEmailBody')}
              </span>
              <span className="flex flex-wrap gap-1">
                {report.metrics
                  .filter((m): m is (typeof REPORT_METRICS)[number] => (REPORT_METRICS as readonly string[]).includes(m))
                  .map((m) => (
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
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => sendTest.mutate(report.id)} disabled={sendTest.isPending}>
            {sendTest.isPending ? t('reports.email.sending') : t('reports.sendTest')}
          </Button>
          <Button size="sm" icon={<Pencil size={12} />} onClick={onEdit}>
            {t('common.edit')}
          </Button>
          <Button size="sm" icon={<Trash2 size={12} />} onClick={onDelete}>
            {t('common.remove')}
          </Button>
          <Switch
            checked={enabled}
            onChange={(next) => setEnabled.mutate({ id: report.id, enabled: next })}
            disabled={setEnabled.isPending}
            label={enabled ? t('reports.paused') : t('reports.active')}
          />
        </div>
      </div>
    </Card>
  );
}
