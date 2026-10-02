import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useI18n } from '@/i18n';
import { usePageTitle } from '@/hooks/usePageTitle';
import { usePagination } from '@/hooks/usePagination';
import { matchesQuery } from '@/lib/text';
import { Button, Tabs } from '@/components/ui';
import { ConfirmDialog, LoadingState } from '@/components/feedback';
import { ListToolbar, Page, PageHeader, SearchInput } from '@/components/page';
import { Pagination } from '@/components/table';
import { EmptyCard } from '@/components/display';
import { useSession } from '@/features/session';
import type { EmailReport, ReportScope } from '@/types';
import { useDeleteEmailReport } from '@/api/hooks/useEmailReports';
import { EmailReportCard } from '../components/EmailReportCard';
import { EmailReportModal } from '../components/EmailReportModal';
import { useScopedReports } from '../hooks/useScopedReports';
import { reportScopeName } from '../lib/reportScope';

type StatusFilter = 'all' | 'active' | 'paused';
type LevelFilter = 'all' | ReportScope['level'];

const PAGE_SIZE = 5;

/**
 * Human-readable performance summaries, sent to people on a schedule —
 * tenant-scoped like Campaigns, so a client seat manages only their own.
 */
export function ReportsPage() {
  const { seatCategory, companyId, companyName, agencyId, agencyName, isInternal } = useSession();
  const { t } = useI18n();
  usePageTitle(t('reports.title'));
  const { reports, isLoading } = useScopedReports();
  const deleteEmailReport = useDeleteEmailReport();

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<EmailReport | null>(null);
  const [deleting, setDeleting] = useState<EmailReport | null>(null);

  const [q, setQ] = useState('');
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const filtered = useMemo(
    () =>
      reports.filter(
        (r) =>
          (levelFilter === 'all' || r.scope.level === levelFilter) &&
          (statusFilter === 'all' || (statusFilter === 'active') === r.enabled) &&
          matchesQuery(q, r.name, reportScopeName(r.scope), ...r.recipients)
      ),
    [reports, levelFilter, statusFilter, q]
  );

  const { paged, pagination } = usePagination(filtered, PAGE_SIZE, [levelFilter, statusFilter, q]);

  if (isLoading) return <LoadingState />;

  return (
    <Page>
      <PageHeader
        title={t('reports.title')}
        subtitle={t('reports.subtitle')}
        actions={
          <Button variant="primary" icon={<Plus size={13} />} onClick={() => setCreating(true)}>
            {t('reports.emailNew')}
          </Button>
        }
      />

      {reports.length > 0 && (
        <ListToolbar bordered={false} className="mb-5">
          <SearchInput value={q} onChange={setQ} placeholder={t('reports.search')} className="min-w-56" />
          {isInternal && (
            <Tabs
              value={levelFilter}
              onChange={setLevelFilter}
              options={[
                { value: 'all', label: t('reports.filter.all') },
                ...(['client', 'agency', 'campaign'] as const).map((value) => ({
                  value,
                  label: t(`reports.email.level.${value}`),
                })),
              ]}
            />
          )}
          <Tabs
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all', label: t('reports.filter.all') },
              { value: 'active', label: t('reports.active') },
              { value: 'paused', label: t('reports.paused') },
            ]}
          />
        </ListToolbar>
      )}

      <div className="space-y-3">
        {paged.map((r) => (
          <EmailReportCard key={r.id} report={r} onEdit={() => setEditing(r)} onDelete={() => setDeleting(r)} />
        ))}
        {filtered.length === 0 && (
          <EmptyCard>{reports.length === 0 ? t('reports.emailEmpty') : t('reports.noMatches')}</EmptyCard>
        )}
      </div>

      {filtered.length > 0 && (
        <div className="mt-5">
          <Pagination {...pagination} />
        </div>
      )}

      <EmailReportModal
        open={creating}
        onOpenChange={setCreating}
        companyId={seatCategory === 'client' ? companyId : undefined}
        companyName={seatCategory === 'client' ? companyName : undefined}
        agencyId={seatCategory === 'agency' ? agencyId : undefined}
        agencyName={seatCategory === 'agency' ? agencyName : undefined}
      />
      <EmailReportModal
        report={editing ?? undefined}
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t('reports.email.deleteTitle')}
        description={
          deleting ? t('reports.email.deleteBody', { name: deleting.name, count: deleting.recipients.length }) : ''
        }
        onConfirm={() => {
          if (deleting) deleteEmailReport.mutate(deleting.id, { onSuccess: () => setDeleting(null) });
        }}
        pending={deleteEmailReport.isPending}
      />
    </Page>
  );
}
