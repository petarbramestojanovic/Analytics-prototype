import { useMemo } from 'react';
import { useI18n, useFormatters } from '@/i18n';
import { useSearchParamState } from '@/hooks/useSearchParamState';
import { DEFAULT_PAGE_SIZE, usePagination } from '@/hooks/usePagination';
import { matchesQuery } from '@/lib/text';
import { Card, Pill } from '@/components/ui';
import { EmptyCard } from '@/components/display';
import { ListToolbar, SearchInput } from '@/components/page';
import { Pagination, Table, Td, Th } from '@/components/table';
import type { EmailReport } from '@/types';
import { useReportRuns } from '@/api/hooks/useEmailReports';
import { reportFormatLabel } from '../lib/reportMetrics';
import { reportScopeLabel } from '../lib/reportScope';

/**
 * Every delivery attempt of the reports this seat can see — on schedule or run
 * by hand. This is where a send that worked is recorded; only a failed one also
 * reaches the inbox. The search lives in the URL, so a link from an inbox item
 * opens the history already narrowed to that report.
 */
export function ReportHistory({ reports }: { reports: EmailReport[] }) {
  const { t } = useI18n();
  const { fmtDateLong, fmtTime } = useFormatters();
  const { data: runs = [] } = useReportRuns();
  const [q, setQ] = useSearchParamState('q');

  const byId = useMemo(() => new Map(reports.map((r) => [r.id, r])), [reports]);
  const visible = useMemo(() => {
    const ids = new Set(reports.map((r) => r.id));
    return runs.filter((run) => ids.has(run.reportId) && matchesQuery(q, run.reportName));
  }, [runs, reports, q]);
  const { paged, pagination } = usePagination(visible, DEFAULT_PAGE_SIZE, [q]);

  return (
    <>
      <ListToolbar bordered={false} className="mb-5">
        <SearchInput value={q} onChange={setQ} placeholder={t('reports.history.search')} className="min-w-56" />
      </ListToolbar>
      {visible.length === 0 ? (
        <EmptyCard>{t('reports.history.empty')}</EmptyCard>
      ) : (
        <Card padded={false}>
          <Table className="px-5">
            <thead>
              <tr>
                <Th>{t('reports.history.col.report')}</Th>
                <Th>{t('reports.history.col.ran')}</Th>
                <Th>{t('reports.history.col.trigger')}</Th>
                <Th align="right">{t('reports.history.col.recipients')}</Th>
                <Th>{t('reports.history.col.format')}</Th>
                <Th>{t('reports.history.col.status')}</Th>
              </tr>
            </thead>
            <tbody>
              {paged.map((run) => (
                <tr key={run.id}>
                  <Td>
                    {run.reportName}
                    {byId.get(run.reportId) && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {reportScopeLabel(byId.get(run.reportId)!.scope, t)}
                      </div>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-gray-500 dark:text-gray-400">
                    {fmtDateLong(run.ranAt)} · {fmtTime(run.ranAt)}
                  </Td>
                  <Td className="text-gray-500 dark:text-gray-400">{t(`reports.history.trigger.${run.trigger}`)}</Td>
                  <Td align="right" className="tnum">
                    {run.recipientCount}
                  </Td>
                  <Td className="text-gray-500 dark:text-gray-400">{reportFormatLabel(t, run.format)}</Td>
                  <Td>
                    <Pill tone={run.status === 'sent' ? 'green' : 'red'}>
                      {t(`reports.history.status.${run.status}`)}
                    </Pill>
                    {run.failureReason && (
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{run.failureReason}</div>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
      {visible.length > 0 && (
        <div className="mt-5">
          <Pagination {...pagination} />
        </div>
      )}
    </>
  );
}
