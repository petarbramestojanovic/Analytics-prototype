import { useMemo, useState } from 'react';
import { CheckCircle2, Clock, RefreshCw, Search, Send, ShieldCheck, XCircle } from 'lucide-react';
import { deliveries } from '../mock/data';
import type { DeliveryAttempt, ReportSchedule } from '../mock/types';
import { useSession } from '../lib/session';
import { useI18n, useFormatters } from '../lib/i18n';
import { usePageTitle } from '../lib/usePageTitle';
import { useSchedules, useSetScheduleEnabled } from '../hooks/useSchedules';
import { Select, SelectContent, SelectItem, SelectTrigger } from '../components/ui/select';
import { Button, Card, Pill, SectionTitle, Td, Th, type PillTone } from '../components/primitives';

const statusMeta: Record<DeliveryAttempt['status'], { tone: PillTone; icon: typeof CheckCircle2; key: string }> = {
  acknowledged: { tone: 'green', icon: CheckCircle2, key: 'reports.status.acknowledged' },
  retrying: { tone: 'amber', icon: RefreshCw, key: 'reports.status.retrying' },
  failed: { tone: 'red', icon: XCircle, key: 'reports.status.failed' },
};

const SCHEDULES_PAGE_SIZE = 8;
const DELIVERIES_PAGE_SIZE = 10;

/**
 * Scheduled report pushes. The delivery log is the reason this screen exists —
 * a webhook that fails silently is worse than no webhook, so every attempt is
 * visible to whoever the client will call.
 *
 * Client-side filtering here is a stopgap for the mock data set. Once this is
 * backed by the real API with 100+ clients, the company filter should become
 * a server-side query param instead of filtering an already-fetched list.
 */
export default function ReportsView() {
  const { role, companyId } = useSession();
  const { t } = useI18n();
  usePageTitle(t('reports.title'));
  const { data: allSchedules, isLoading } = useSchedules();
  const isAdmin = role === 'brame_admin';

  const [q, setQ] = useState('');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | DeliveryAttempt['status']>('all');
  const [schedulesPage, setSchedulesPage] = useState(0);
  const [deliveriesPage, setDeliveriesPage] = useState(0);

  const scopedSchedules = useMemo(
    () => (isAdmin ? (allSchedules ?? []) : (allSchedules ?? []).filter((s) => s.companyId === companyId)),
    [allSchedules, isAdmin, companyId]
  );
  const scopedDeliveries = useMemo(
    () =>
      isAdmin ? deliveries : deliveries.filter((d) => scopedSchedules.some((s) => s.id === d.scheduleId)),
    [isAdmin, scopedSchedules]
  );

  // Company filter is admin-only — a client is already scoped to their own
  // company above, so narrowing further would be pointless for them.
  const companyOptions = useMemo(
    () => [...new Map(scopedSchedules.map((s) => [s.companyId, s.companyName])).entries()].sort((a, b) => a[1].localeCompare(b[1])),
    [scopedSchedules]
  );
  const companyIdByScheduleId = useMemo(
    () => new Map(scopedSchedules.map((s) => [s.id, s.companyId])),
    [scopedSchedules]
  );

  const needle = q.trim().toLowerCase();
  const filteredSchedules = useMemo(
    () =>
      scopedSchedules.filter(
        (s) =>
          (!isAdmin || companyFilter === 'all' || s.companyId === companyFilter) &&
          (needle === '' || s.companyName.toLowerCase().includes(needle) || s.endpoint.toLowerCase().includes(needle))
      ),
    [scopedSchedules, isAdmin, companyFilter, needle]
  );
  const filteredDeliveries = useMemo(
    () =>
      scopedDeliveries.filter((d) => {
        const dCompanyId = companyIdByScheduleId.get(d.scheduleId);
        return (
          (!isAdmin || companyFilter === 'all' || dCompanyId === companyFilter) &&
          (statusFilter === 'all' || d.status === statusFilter) &&
          (needle === '' || d.companyName.toLowerCase().includes(needle))
        );
      }),
    [scopedDeliveries, isAdmin, companyFilter, statusFilter, needle, companyIdByScheduleId]
  );

  const schedulesPageCount = Math.max(1, Math.ceil(filteredSchedules.length / SCHEDULES_PAGE_SIZE));
  const clampedSchedulesPage = Math.min(schedulesPage, schedulesPageCount - 1);
  const pagedSchedules = filteredSchedules.slice(
    clampedSchedulesPage * SCHEDULES_PAGE_SIZE,
    (clampedSchedulesPage + 1) * SCHEDULES_PAGE_SIZE
  );

  const deliveriesPageCount = Math.max(1, Math.ceil(filteredDeliveries.length / DELIVERIES_PAGE_SIZE));
  const clampedDeliveriesPage = Math.min(deliveriesPage, deliveriesPageCount - 1);
  const pagedDeliveries = filteredDeliveries.slice(
    clampedDeliveriesPage * DELIVERIES_PAGE_SIZE,
    (clampedDeliveriesPage + 1) * DELIVERIES_PAGE_SIZE
  );

  const handleCompanyFilterChange = (value: string) => {
    setCompanyFilter(value);
    setSchedulesPage(0);
    setDeliveriesPage(0);
  };
  const handleQueryChange = (value: string) => {
    setQ(value);
    setSchedulesPage(0);
    setDeliveriesPage(0);
  };
  const handleStatusFilterChange = (value: typeof statusFilter) => {
    setStatusFilter(value);
    setDeliveriesPage(0);
  };

  if (isLoading) {
    return <div className="px-8 py-16 text-center text-sm text-gray-500 dark:text-gray-400">{t('common.loading')}</div>;
  }

  return (
    <div className="px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brame-dark dark:text-white">{t('reports.title')}</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500 dark:text-gray-400">{t('reports.subtitle')}</p>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder={t('reports.search')}
            className="h-10 w-full rounded-lg border border-gray-300 pl-9 pr-3 text-sm text-brame-dark outline-none focus:border-brame-teal dark:border-white/15 dark:bg-brame-dark-light dark:text-gray-100 dark:placeholder:text-gray-500"
          />
        </div>

        {isAdmin && (
          <div className="w-56">
            <Select value={companyFilter} onValueChange={handleCompanyFilterChange}>
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
      </div>

      <div className="mb-5 space-y-3">
        {pagedSchedules.map((s) => (
          <ScheduleRow key={s.id} schedule={s} />
        ))}
        {filteredSchedules.length === 0 && (
          <Card className="border-dashed text-center dark:border-white/15">
            <p className="py-6 text-sm text-gray-500 dark:text-gray-400">
              {scopedSchedules.length === 0 ? t('reports.noSchedules') : t('reports.noMatches')}
            </p>
          </Card>
        )}
        {filteredSchedules.length > SCHEDULES_PAGE_SIZE && (
          <PaginationBar
            page={clampedSchedulesPage}
            pageCount={schedulesPageCount}
            pageSize={SCHEDULES_PAGE_SIZE}
            total={filteredSchedules.length}
            onChange={setSchedulesPage}
          />
        )}
      </div>

      <Card padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-0">
          <SectionTitle hint={t('reports.deliveryLogHint')}>{t('reports.deliveryLogTitle')}</SectionTitle>
          <div className="flex h-9 items-center gap-1 rounded-lg bg-gray-100 p-1 dark:bg-white/5">
            {(
              [
                ['all', t('reports.filter.all')],
                ['acknowledged', t('reports.status.acknowledged')],
                ['retrying', t('reports.status.retrying')],
                ['failed', t('reports.status.failed')],
              ] as const
            ).map(([s, label]) => (
              <button
                key={s}
                onClick={() => handleStatusFilterChange(s)}
                className={`flex h-full items-center rounded-md px-3 text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-white text-brame-dark shadow-sm dark:bg-brame-dark-light dark:text-white'
                    : 'text-gray-500 hover:text-brame-dark dark:text-gray-400 dark:hover:text-gray-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto px-5 pb-5">
          <table className="w-full">
            <thead>
              <tr>
                {isAdmin && <Th>{t('reports.col.company')}</Th>}
                <Th>{t('reports.col.sent')}</Th>
                <Th>{t('reports.col.status')}</Th>
                <Th align="right">{t('reports.col.attempts')}</Th>
                <Th align="right">{t('reports.col.http')}</Th>
                <Th align="right">{t('reports.col.duration')}</Th>
              </tr>
            </thead>
            <tbody>
              {pagedDeliveries.map((d) => (
                <DeliveryRow key={d.id} delivery={d} showCompany={isAdmin} />
              ))}
              {filteredDeliveries.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                    {t('reports.noMatches')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredDeliveries.length > DELIVERIES_PAGE_SIZE && (
          <div className="px-5 pb-5">
            <PaginationBar
              page={clampedDeliveriesPage}
              pageCount={deliveriesPageCount}
              pageSize={DELIVERIES_PAGE_SIZE}
              total={filteredDeliveries.length}
              onChange={setDeliveriesPage}
            />
          </div>
        )}
      </Card>
    </div>
  );
}

function PaginationBar({
  page,
  pageCount,
  pageSize,
  total,
  onChange,
}: {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-between border-t border-gray-200 pt-3 dark:border-white/10">
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {t('table.showingRange', {
          from: total === 0 ? 0 : page * pageSize + 1,
          to: Math.min((page + 1) * pageSize, total),
          total,
        })}
      </span>
      <div className="flex items-center gap-1">
        <Button size="sm" onClick={() => onChange(Math.max(0, page - 1))} disabled={page <= 0}>
          {t('table.previous')}
        </Button>
        <Button size="sm" onClick={() => onChange(Math.min(pageCount - 1, page + 1))} disabled={page >= pageCount - 1}>
          {t('table.next')}
        </Button>
      </div>
    </div>
  );
}

function DeliveryRow({ delivery: d, showCompany }: { delivery: DeliveryAttempt; showCompany: boolean }) {
  const { t } = useI18n();
  const { fmtTime, relativeTime } = useFormatters();
  const meta = statusMeta[d.status];
  const Icon = meta.icon;
  return (
    <tr>
      {showCompany && <Td className="font-medium">{d.companyName}</Td>}
      <Td>
        <div>{fmtTime(d.sentAt)}</div>
        <div className="text-xs text-gray-400 dark:text-gray-500">{relativeTime(d.sentAt)}</div>
      </Td>
      <Td>
        <Pill tone={meta.tone} icon={<Icon size={11} />}>
          {t(meta.key)}
        </Pill>
        {d.status === 'retrying' && (
          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{t('reports.nextTry')}</span>
        )}
      </Td>
      <Td align="right">{d.attempts}</Td>
      <Td align="right">{d.httpStatus ?? '—'}</Td>
      <Td align="right">{d.durationMs >= 1000 ? `${(d.durationMs / 1000).toFixed(1)}s` : `${d.durationMs}ms`}</Td>
    </tr>
  );
}

function ScheduleRow({ schedule }: { schedule: ReportSchedule }) {
  const { t } = useI18n();
  const setEnabled = useSetScheduleEnabled();
  const enabled = schedule.enabled;

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
            <Send size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-brame-dark dark:text-gray-100">{schedule.companyName}</span>
              <Pill tone={enabled ? 'green' : 'neutral'}>
                {enabled ? t('reports.active') : t('reports.paused')}
              </Pill>
            </div>
            <code className="mt-1 block text-xs text-gray-500 dark:text-gray-400">{schedule.endpoint}</code>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
              <span className="inline-flex items-center gap-1">
                <Clock size={11} />
                {schedule.humanSchedule} · {schedule.timezone}
              </span>
              <span className="inline-flex items-center gap-1">
                <ShieldCheck size={11} />
                {t('reports.hmacSigned')}
              </span>
              <code className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-white/10">{schedule.cron}</code>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm">{t('reports.sendTest')}</Button>
          <button
            onClick={() => setEnabled.mutate({ id: schedule.id, enabled: !enabled })}
            disabled={setEnabled.isPending}
            className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors disabled:opacity-60 ${
              enabled ? 'bg-brame-teal' : 'bg-gray-300 dark:bg-white/15'
            }`}
            aria-label={enabled ? t('reports.paused') : t('reports.active')}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                enabled ? 'left-[22px]' : 'left-0.5'
              }`}
            />
          </button>
        </div>
      </div>
    </Card>
  );
}
