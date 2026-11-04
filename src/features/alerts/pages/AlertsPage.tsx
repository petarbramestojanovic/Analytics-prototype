import { useMemo } from 'react';
import { Download, ShieldCheck } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useSearchParamState } from '@/hooks/useSearchParamState';
import { usePagination } from '@/hooks/usePagination';
import { exportToXlsx } from '@/lib/exportXlsx';
import { fmtPct, fmtSignedPp } from '@/lib/format';
import { matchesQuery } from '@/lib/text';
import { Button, Card } from '@/components/ui';
import { EmptyState, EmptyText } from '@/components/feedback';
import { FilterSelect, PageHeader, SearchInput, SectionTitle } from '@/components/page';
import { Pagination } from '@/components/table';
import { useSession } from '@/features/session';
import { companyOptions, useCampaigns } from '@/features/campaigns';
import { AlertLogTable } from '../components/AlertLogTable';
import { ThresholdSettings } from '../components/ThresholdSettings';
import type { AlertLogRow } from '../lib/alertLog';

const PAGE_SIZE = 10;

/** The title block of the Triggered alerts level: title, subtitle and the
 *  default watch/investigate thresholds. */
export function AlertsHeader() {
  const { t } = useI18n();
  return (
    <div className="mb-6 grid grid-cols-1 items-center gap-4 lg:grid-cols-12">
      <PageHeader title={t('alerts.title')} subtitle={t('alerts.subtitle')} className="mb-0 lg:col-span-6" />
      <ThresholdSettings className="lg:col-span-6" />
    </div>
  );
}

/**
 * The alerts that have triggered: the list level. Each row opens its own
 * detail page. The rules behind them live on the other level, one tab over
 * (see AlertsHomePage). The default thresholds stay wired to the exact same
 * computation the Compare tab uses, so nothing here can disagree with a
 * campaign's Compare tab; rules only ever add rows.
 */
export function AlertLog({ rows: allRows }: { rows: AlertLogRow[] }) {
  const { t } = useI18n();
  const { isInternal } = useSession();
  const { data: campaigns = [] } = useCampaigns();
  const [q, setQ] = useSearchParamState('q');
  const [companyFilter, setCompanyFilter] = useSearchParamState('company', 'all');

  const rows = useMemo(
    () =>
      allRows.filter(
        (row) =>
          (!isInternal || companyFilter === 'all' || row.companyId === companyFilter) &&
          matchesQuery(q, row.campaignName, row.companyName)
      ),
    [allRows, companyFilter, isInternal, q]
  );
  const { paged, pagination } = usePagination(rows, PAGE_SIZE, [q, companyFilter]);

  const exportRows = () =>
    exportToXlsx('alerts.xlsx', rows, [
      { key: 'campaignName', header: t('alerts.col.campaign') },
      { key: 'companyName', header: t('alerts.col.company') },
      { key: 'ruleLabel', header: t('alerts.col.rule') },
      { key: 'detail', header: t('alerts.col.comparing') },
      { key: 'metric', header: t('alerts.col.metric'), format: (r) => t(`metric.${r.metric}.label`) },
      { key: 'delta', header: t('alerts.col.delta'), format: (r) => (r.deltaKind === 'pp' ? fmtSignedPp(r.delta) : fmtPct(r.delta, 1)) },
      { key: 'severity', header: t('alerts.col.read'), format: (r) => t(`detail.read.${r.severity}`) },
    ]);

  return (
    <Card padded={false}>
      <div className="p-5 pb-0">
        <SectionTitle
          action={
            <Button variant="primary" icon={<Download size={13} />} onClick={exportRows} disabled={rows.length === 0}>
              {t('common.exportCsv')}
            </Button>
          }
        >
          {t('alerts.title')}
        </SectionTitle>
      </div>

      {allRows.length === 0 ? (
        <div className="px-5 pb-5">
          <EmptyState icon={<ShieldCheck size={32} />} title={t('alerts.empty.title')} body={t('alerts.empty.body')} />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 p-5 pb-4">
            <SearchInput value={q} onChange={setQ} placeholder={t('alerts.search')} className="min-w-56" />
            {isInternal && (
              <FilterSelect
                value={companyFilter}
                onChange={setCompanyFilter}
                allLabel={t('campaigns.filter.allCompanies')}
                options={companyOptions(campaigns)}
              />
            )}
          </div>

          {rows.length === 0 ? (
            <EmptyText className="pb-5 pt-0">{t('alerts.noMatches')}</EmptyText>
          ) : (
            <>
              <AlertLogTable rows={paged} />
              <div className="p-5 pt-4">
                <Pagination {...pagination} />
              </div>
            </>
          )}
        </>
      )}
    </Card>
  );
}
