import { useMemo } from 'react';
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
  type Updater,
  type VisibilityState,
} from '@tanstack/react-table';
import { Download, SlidersHorizontal } from 'lucide-react';
import { STORAGE_KEYS } from '@/config/storageKeys';
import { useI18n } from '@/i18n';
import { useListFilters } from '@/hooks/useListFilters';
import { usePersistentState } from '@/hooks/usePersistentState';
import { usePageTitle } from '@/hooks/usePageTitle';
import { exportToXlsx } from '@/lib/exportXlsx';
import { fmtCompact } from '@/lib/format';
import { codecs } from '@/lib/storage';
import { matchesQuery } from '@/lib/text';
import { Button, Card, Tabs } from '@/components/ui';
import { ErrorState, TableSkeleton } from '@/components/feedback';
import { FilterSelect, ListToolbar, Page, PageHeader, SearchInput, ToolbarButton, ToolbarResetButton } from '@/components/page';
import { ColumnVisibilityMenu, DataTable } from '@/components/table';
import { StatGrid, SummaryTile } from '@/components/display';
import { useSession } from '@/features/session';
import type { Campaign } from '@/types';
import { useScopedCampaigns } from '../../hooks/useScopedCampaigns';
import { agencyOptions, companyOptions, DIRECT_AGENCY_KEY, marketOptions } from '../../lib/filterOptions';
import { primarySeries, SOURCE_KEYS } from '../../lib/sources';
import { campaignExportColumns, useCampaignColumns } from './campaignColumns';

const STATUS_FILTERS = ['all', 'live', 'scheduled', 'ended'] as const satisfies readonly ('all' | Campaign['status'])[];
type StatusFilter = (typeof STATUS_FILTERS)[number];

// In the URL (shareable) and persisted (a reload doesn't drop what an admin
// was just looking at). `sort` is "<columnId>" or "-<columnId>" for desc.
const DEFAULT_FILTERS = {
  q: '',
  statusFilter: 'all' as StatusFilter,
  companyFilter: 'all',
  countryFilter: 'all',
  agencyFilter: 'all',
  sort: '',
};

const encodeSort = (s: SortingState) => (s[0] ? `${s[0].desc ? '-' : ''}${s[0].id}` : '');
const decodeSort = (raw: string): SortingState =>
  raw ? [{ id: raw.replace(/^-/, ''), desc: raw.startsWith('-') }] : [];

const resolve = <T,>(updater: Updater<T>, prev: T) =>
  typeof updater === 'function' ? (updater as (p: T) => T)(prev) : updater;

export function CampaignsPage() {
  const { isInternal } = useSession();
  const { t } = useI18n();
  usePageTitle(t('campaigns.title'));
  const { campaigns: scoped, isLoading, isError, refetch } = useScopedCampaigns();
  const { filters, setFilter, resetFilters, filtersActive } = useListFilters(STORAGE_KEYS.campaignsFilters, DEFAULT_FILTERS, {
    statusFilter: STATUS_FILTERS,
  });
  const { q, statusFilter, companyFilter, countryFilter, agencyFilter } = filters;
  // Which columns are shown is a personal preference, not part of a shared
  // link — so it lives in localStorage only.
  const [columnVisibility, setColumnVisibility] = usePersistentState<VisibilityState>(
    STORAGE_KEYS.campaignsColumns,
    {},
    codecs.json<VisibilityState>()
  );

  // Company/country/agency are internal-only cuts across the whole portfolio —
  // a client is already scoped to one company, so narrowing further would be
  // pointless for them.
  const rows = useMemo(
    () =>
      scoped.filter(
        (c) =>
          (statusFilter === 'all' || c.status === statusFilter) &&
          (!isInternal || companyFilter === 'all' || c.companyId === companyFilter) &&
          (!isInternal || countryFilter === 'all' || c.salesforce.market === countryFilter) &&
          (!isInternal || agencyFilter === 'all' || (c.agencyId ?? DIRECT_AGENCY_KEY) === agencyFilter)
      ),
    [scoped, statusFilter, isInternal, companyFilter, countryFilter, agencyFilter]
  );

  const columns = useCampaignColumns(isInternal);
  // A sort from a link is only honoured if this seat actually has that column.
  const sorting = useMemo(
    () => decodeSort(filters.sort).filter((s) => columns.some((c) => c.id === s.id && c.enableSorting !== false)),
    [filters.sort, columns]
  );
  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, globalFilter: q, columnVisibility },
    onSortingChange: (updater) => setFilter({ sort: encodeSort(resolve(updater, sorting)) }),
    onGlobalFilterChange: (v: string) => setFilter({ q: v }),
    onColumnVisibilityChange: (updater) => setColumnVisibility((prev) => resolve(updater, prev)),
    globalFilterFn: (row, _id, value) => matchesQuery(String(value), row.original.name, row.original.companyName),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  // Only stretch the card to the viewport when the page is full — a short
  // result set (few campaigns, a narrow filter, the last page) stays compact
  // instead of ballooning its rows.
  const fillsPage = table.getRowModel().rows.length >= table.getState().pagination.pageSize;

  const live = scoped.filter((c) => c.status === 'live');
  const exportRows = () =>
    exportToXlsx(
      'campaigns.xlsx',
      table.getFilteredRowModel().rows.map((r) => r.original),
      campaignExportColumns(t, isInternal)
    );

  return (
    <Page fill>
      <PageHeader
        title={t('campaigns.title')}
        subtitle={isInternal ? t('campaigns.subtitleAdmin') : t('campaigns.subtitleClient')}
        actions={
          <Button variant="primary" icon={<Download size={13} />} onClick={exportRows} disabled={rows.length === 0}>
            {t('common.exportCsv')}
          </Button>
        }
      />

      <StatGrid>
        <SummaryTile label={t('campaigns.tile.live')} value={String(live.length)} />
        <SummaryTile
          label={t('campaigns.tile.impressions')}
          value={fmtCompact(live.reduce((a, c) => a + (primarySeries(c)?.totals.impressions ?? 0), 0))}
        />
        <SummaryTile
          label={t('campaigns.tile.awaitingSetup')}
          value={String(scoped.filter((c) => !primarySeries(c)).length)}
        />
        <SummaryTile
          label={t('campaigns.tile.noConnector')}
          value={String(scoped.reduce((a, c) => a + SOURCE_KEYS.filter((s) => !c.sources[s]).length, 0))}
        />
      </StatGrid>

      <Card padded={false} className={fillsPage ? 'flex flex-1 flex-col' : undefined}>
        <ListToolbar bare>
          <SearchInput value={q} onChange={(v) => setFilter({ q: v })} placeholder={t('campaigns.search')} />

          {isInternal && (
            <>
              <FilterSelect
                className="w-40"
                value={agencyFilter}
                onChange={(v) => setFilter({ agencyFilter: v })}
                allLabel={t('campaigns.filter.allAgencies')}
                options={agencyOptions(scoped, t('campaigns.agency.direct'))}
              />
              <FilterSelect
                className="w-44"
                value={companyFilter}
                onChange={(v) => setFilter({ companyFilter: v })}
                allLabel={t('campaigns.filter.allCompanies')}
                options={companyOptions(scoped)}
              />
              <FilterSelect
                className="w-32"
                value={countryFilter}
                onChange={(v) => setFilter({ countryFilter: v })}
                allLabel={t('campaigns.filter.allCountries')}
                options={marketOptions(scoped)}
              />
            </>
          )}

          <Tabs
            value={statusFilter}
            onChange={(v) => setFilter({ statusFilter: v })}
            options={STATUS_FILTERS.map((value) => ({
              value,
              label: t(`campaigns.filter.${value}`),
            }))}
          />

          <ColumnVisibilityMenu
            table={table}
            // Device split's header is an icon pair, not text.
            labelFor={(id) => (id === 'deviceSplit' ? t('campaigns.col.deviceSplit') : undefined)}
            trigger={
              <ToolbarButton icon={<SlidersHorizontal size={13} />}>{t('campaigns.columns.toggle')}</ToolbarButton>
            }
          />

          <ToolbarResetButton active={filtersActive} onReset={resetFilters} label={t('campaigns.filter.reset')} />
        </ListToolbar>

        {isLoading ? (
          <TableSkeleton />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : (
          <DataTable
            table={table}
            emptyMessage={t('campaigns.noMatches')}
            align={(id) => (id === 'campaign' ? 'left' : 'center')}
            stickyColumnId="actions"
            fill={fillsPage}
          />
        )}
      </Card>
    </Page>
  );
}
