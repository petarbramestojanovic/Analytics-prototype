import { useMemo } from 'react';
import { Building2, Radio } from 'lucide-react';
import { paths } from '@/config/paths';
import { STORAGE_KEYS } from '@/config/storageKeys';
import { useI18n } from '@/i18n';
import { useListFilters } from '@/hooks/useListFilters';
import { usePageTitle } from '@/hooks/usePageTitle';
import { usePagination } from '@/hooks/usePagination';
import { EMPTY_VALUE, fmtCompact, fmtMetric } from '@/lib/format';
import { matchesQuery } from '@/lib/text';
import { compareValues, toggleSort } from '@/lib/sort';
import { Card, CardFooter, Tabs } from '@/components/ui';
import { EmptyText, LoadingState } from '@/components/feedback';
import { ListToolbar, Page, PageHeader, SearchInput, ToolbarResetButton } from '@/components/page';
import { Pagination, SortableTh, Table, Td, Th, Tr } from '@/components/table';
import { TextLink } from '@/components/display';
import { buildPortfolioSummary, useCampaigns, type PortfolioSummary } from '@/features/campaigns';
import type { Company } from '@/types';
import { useCompanies } from '@/api/hooks/useOrganizations';

const PAGE_SIZE = 10;

type LiveFilter = 'all' | 'live';
type SortKey = 'name' | 'campaigns' | 'live' | 'ctr';

// Persisted like the Campaigns list's filters — only the explicit "Reset
// filters" button clears them back to defaults.
const DEFAULT_FILTERS = { q: '', liveFilter: 'all' as LiveFilter, sortKey: 'name' as SortKey, sortDesc: false };

type ClientStats = PortfolioSummary & { markets: string[] };

const sortValue: Record<SortKey, (c: Company, s?: ClientStats) => number | string> = {
  name: (c) => c.name,
  campaigns: (_c, s) => s?.campaignCount ?? 0,
  live: (_c, s) => s?.liveCount ?? 0,
  ctr: (_c, s) => s?.avgCtr ?? -1,
};

/**
 * A directory into each client's full profile (ClientDetailPage) — campaigns,
 * performance and reports in one place.
 */
export function ClientsPage() {
  const { t } = useI18n();
  usePageTitle(t('clients.title'));
  const { data: companies = [], isLoading } = useCompanies();
  const { data: allCampaigns = [] } = useCampaigns();
  const { filters, setFilter, resetFilters, filtersActive } = useListFilters(STORAGE_KEYS.clientsFilters, DEFAULT_FILTERS);
  const { q, liveFilter, sortKey, sortDesc } = filters;
  const sort = { key: sortKey, desc: sortDesc };
  const onSort = (key: SortKey) => {
    const next = toggleSort(sort, key);
    setFilter({ sortKey: next.key, sortDesc: next.desc });
  };

  // Same summary the client's own detail page shows, so a number here never
  // disagrees with what you see after clicking in. Markets come from the
  // campaigns themselves so search can match "CH" or "DE".
  const statsByCompany = useMemo(() => {
    const map = new Map<string, ClientStats>();
    for (const company of companies) {
      const own = allCampaigns.filter((c) => c.companyId === company.id);
      map.set(company.id, {
        ...buildPortfolioSummary(own, new Date()),
        markets: [...new Set(own.map((c) => c.salesforce.market))],
      });
    }
    return map;
  }, [companies, allCampaigns]);

  const filtered = useMemo(() => {
    const rows = companies.filter((c) => {
      const stats = statsByCompany.get(c.id);
      if (liveFilter === 'live' && !stats?.liveCount) return false;
      return matchesQuery(q, c.name, c.industry, ...(stats?.markets ?? []));
    });
    return rows.sort((a, b) => {
      const va = sortValue[sortKey](a, statsByCompany.get(a.id));
      const vb = sortValue[sortKey](b, statsByCompany.get(b.id));
      const cmp = compareValues(va, vb);
      return sortDesc ? -cmp : cmp;
    });
  }, [companies, q, liveFilter, sortKey, sortDesc, statsByCompany]);

  const { paged, pagination } = usePagination(filtered, PAGE_SIZE, [q, liveFilter]);

  return (
    <Page>
      <PageHeader title={t('clients.title')} subtitle={t('clients.subtitle')} />

      <Card padded={false}>
        <ListToolbar bare>
          <SearchInput value={q} onChange={(v) => setFilter({ q: v })} placeholder={t('clients.search')} className="max-w-sm" />
          <Tabs
            value={liveFilter}
            onChange={(v) => setFilter({ liveFilter: v })}
            groupLabel={t('clients.filter.live')}
            size="sm"
            options={[
              { value: 'all', label: t('clients.filter.all') },
              { value: 'live', label: t('clients.filter.liveOnly') },
            ]}
          />
          <ToolbarResetButton active={filtersActive} onReset={resetFilters} label={t('clients.filter.reset')} size="sm" />
        </ListToolbar>

        {isLoading ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyText className="py-12">{t('clients.noMatches')}</EmptyText>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <SortableTh col="name" sort={sort} onToggle={onSort}>
                    {t('campaigns.col.company')}
                  </SortableTh>
                  <SortableTh col="campaigns" align="right" sort={sort} onToggle={onSort}>
                    {t('overview.tile.campaigns')}
                  </SortableTh>
                  <SortableTh col="live" align="right" sort={sort} onToggle={onSort}>
                    {t('overview.tile.live')}
                  </SortableTh>
                  <Th align="right">{t('campaigns.col.impressions')}</Th>
                  <Th align="right">{t('metric.engagementRate.label')}</Th>
                  <SortableTh col="ctr" align="right" sort={sort} onToggle={onSort}>
                    {t('metric.ctr.label')}
                  </SortableTh>
                  <Th align="right">{t('metric.viewability.label')}</Th>
                </tr>
              </thead>
              <tbody>
                {paged.map((company) => (
                  <ClientRow key={company.id} company={company} stats={statsByCompany.get(company.id)} />
                ))}
              </tbody>
            </Table>
            <CardFooter>
              <Pagination {...pagination} />
            </CardFooter>
          </>
        )}
      </Card>
    </Page>
  );
}

function ClientRow({ company, stats }: { company: Company; stats?: ClientStats }) {
  return (
    <Tr>
      <Td>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-gray-500">
            <Building2 size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <TextLink to={paths.client(company.id)} variant="record" className="truncate">
                {company.name}
              </TextLink>
              {!!stats?.liveCount && <Radio size={11} className="flex-shrink-0 text-green-500" />}
            </div>
            <div className="truncate text-xs text-gray-400 dark:text-gray-500">{company.industry}</div>
          </div>
        </div>
      </Td>
      <Td align="right">{stats?.campaignCount ?? 0}</Td>
      <Td align="right">{stats?.liveCount ?? 0}</Td>
      <Td align="right">{stats ? fmtCompact(stats.totalImpressions) : EMPTY_VALUE}</Td>
      <Td align="right">{fmtMetric('engagementRate', stats?.avgEngagementRate)}</Td>
      <Td align="right">{fmtMetric('ctr', stats?.avgCtr)}</Td>
      <Td align="right">{fmtMetric('viewability', stats?.avgViewability)}</Td>
    </Tr>
  );
}
