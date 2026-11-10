import { useMemo, useState, type ReactNode } from 'react';
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
import { useNavigate } from 'react-router-dom';
import { paths } from '@/config/paths';
import { STORAGE_KEYS } from '@/config/storageKeys';
import { TODAY_ISO } from '@/lib/clock';
import { useFormatters, useI18n } from '@/i18n';
import { useListFilters } from '@/hooks/useListFilters';
import { usePersistentState } from '@/hooks/usePersistentState';
import { usePageTitle } from '@/hooks/usePageTitle';
import { ALL, matchesSelection, parseSelection, serializeSelection } from '@/lib/selection';
import { exportToXlsx } from '@/lib/exportXlsx';
import { fmtCompact } from '@/lib/format';
import { codecs } from '@/lib/storage';
import { matchesQuery } from '@/lib/text';
import { Avatar, Button, Card, Collapse, Tabs } from '@/components/ui';
import { ErrorState, TableSkeleton } from '@/components/feedback';
import {
  ActiveFilterChips,
  FilterChip,
  FilterField,
  FilterSheet,
  FilterMultiSelect,
  DateFilter,
  FilterToggleButton,
  ListToolbar,
  Page,
  PageHeader,
  SearchInput,
  ToolbarButton,
  ToolbarResetButton,
} from '@/components/page';
import { ColumnVisibilityMenu, DataTable } from '@/components/table';
import { StatGrid, SummaryTile } from '@/components/display';
import { useSession } from '@/features/session';
import type { Campaign } from '@/types';
import { useScopedCampaigns } from '../../hooks/useScopedCampaigns';
import { PersonLabel } from '../../components/PersonLabel';
import {
  accountOptions,
  categoryOptions,
  companyOptions,
  DIRECT_ACCOUNT_KEY,
  marketOptions,
  personOptions,
} from '../../lib/filterOptions';
import { isLiveCampaign, primarySeries, SOURCE_KEYS } from '../../lib/sources';
import {
  campaignExportColumns,
  useCampaignColumns,
  useCampaignHeaderHints,
} from './campaignColumns';
import { SORT_ONLY_COLUMNS } from './sortOnlyColumns';

const STATUS_FILTERS = ['all', 'live', 'paused', 'ended'] as const satisfies readonly (
  'all' | Campaign['status']
)[];
type StatusFilter = (typeof STATUS_FILTERS)[number];

// In the URL (shareable) and persisted (a reload doesn't drop what an admin
// was just looking at). `sort` is "<columnId>" or "-<columnId>" for desc.
const DEFAULT_FILTERS = {
  q: '',
  statusFilter: 'all' as StatusFilter,
  companyFilter: 'all',
  countryFilter: 'all',
  accountFilter: 'all',
  categoryFilter: 'all',
  salesFilter: 'all',
  managerFilter: 'all',
  // Flight-date bounds (YYYY-MM-DD, empty = off): starts on/after, ends on/before.
  startFrom: '',
  endTo: '',
  sort: '',
};

const encodeSort = (s: SortingState) => (s[0] ? `${s[0].desc ? '-' : ''}${s[0].id}` : '');
const decodeSort = (raw: string): SortingState =>
  raw ? [{ id: raw.replace(/^-/, ''), desc: raw.startsWith('-') }] : [];

const resolve = <T,>(updater: Updater<T>, prev: T) =>
  typeof updater === 'function' ? (updater as (p: T) => T)(prev) : updater;

/** The sort-only columns never render, whatever a saved preference says. */
const HIDDEN_SORT_COLUMNS: VisibilityState = Object.fromEntries(
  SORT_ONLY_COLUMNS.map((id) => [id, false]),
);

const DEFAULT_COLUMN_VISIBILITY: VisibilityState = { engagements: false };

export function CampaignsPage() {
  const { isInternal } = useSession();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { fmtDateLong } = useFormatters();
  usePageTitle(t('campaigns.title'));
  const { campaigns: scoped, isLoading, isError, refetch } = useScopedCampaigns();
  const { filters, setFilter, resetFilters, filtersActive } = useListFilters(
    STORAGE_KEYS.campaignsFilters,
    DEFAULT_FILTERS,
    {
      statusFilter: STATUS_FILTERS,
    },
  );
  const {
    q,
    statusFilter,
    companyFilter,
    countryFilter,
    accountFilter,
    categoryFilter,
    salesFilter,
    managerFilter,
  } = filters;
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Which columns are shown is a personal preference, not part of a shared
  // link — so it lives in localStorage only.
  const [columnVisibility, setColumnVisibility] = usePersistentState<VisibilityState>(
    STORAGE_KEYS.campaignsColumns,
    // Engagements (the raw count) is opt-in; the rate column covers the default view.
    DEFAULT_COLUMN_VISIBILITY,
    codecs.json<VisibilityState>(),
  );

  // Company/country/account/category and the Salesforce people are internal-only
  // cuts across the whole portfolio — a client is already scoped to one
  // company, so narrowing further would be pointless for them.
  const rows = useMemo(
    () =>
      scoped.filter(
        (c) =>
          (statusFilter === 'all' || c.status === statusFilter) &&
          (!filters.startFrom || c.flightStart >= filters.startFrom) &&
          (!filters.endTo || c.flightEnd <= filters.endTo) &&
          (!isInternal || matchesSelection(companyFilter, c.companyId)) &&
          (!isInternal || matchesSelection(countryFilter, c.salesforce.market)) &&
          (!isInternal || matchesSelection(accountFilter, c.accountId ?? DIRECT_ACCOUNT_KEY)) &&
          (!isInternal || matchesSelection(categoryFilter, c.salesforce.category)) &&
          (!isInternal || matchesSelection(salesFilter, c.salesforce.salesPerson.id)) &&
          (!isInternal || matchesSelection(managerFilter, c.salesforce.campaignManager.id)),
      ),
    [
      scoped,
      statusFilter,
      filters.startFrom,
      filters.endTo,
      isInternal,
      companyFilter,
      countryFilter,
      accountFilter,
      categoryFilter,
      salesFilter,
      managerFilter,
    ],
  );

  // The dropdowns offer every value in the scoped portfolio, not just the
  // rows left after other filters — so a filter is never a dead end.
  const accounts = useMemo(
    () => accountOptions(scoped, t('campaigns.account.direct')),
    [scoped, t],
  );
  const companies = useMemo(() => companyOptions(scoped), [scoped]);
  const markets = useMemo(() => marketOptions(scoped), [scoped]);
  const categories = useMemo(() => categoryOptions(scoped), [scoped]);
  const salesPeople = useMemo(
    () => personOptions(scoped, (c) => c.salesforce.salesPerson),
    [scoped],
  );
  const managers = useMemo(
    () => personOptions(scoped, (c) => c.salesforce.campaignManager),
    [scoped],
  );

  type PanelFilter = {
    key:
      | 'accountFilter'
      | 'companyFilter'
      | 'countryFilter'
      | 'categoryFilter'
      | 'salesFilter'
      | 'managerFilter';
    label: string;
    allLabel: string;
    options: { value: string; label: ReactNode }[];
    /** Chip content for a single selected value. */
    chip: (value: string) => ReactNode;
    /** "4 sales people" — what the chip reads when several are selected. */
    /** For people filters: the Salesforce users, so the chip can show a few
     *  of their photos. */
    people?: { value: string; label: string; avatarUrl: string | null }[];
  };
  const plain = (options: { value: string; label: string }[]) => (value: string) =>
    options.find((o) => o.value === value)?.label ?? value;
  const person =
    (options: { value: string; label: string; avatarUrl: string | null }[]) => (value: string) => {
      const o = options.find((p) => p.value === value);
      return o ? <PersonLabel name={o.label} avatarUrl={o.avatarUrl} size={16} /> : value;
    };
  const personItems = (options: { value: string; label: string; avatarUrl: string | null }[]) =>
    options.map((o) => ({
      value: o.value,
      label: <PersonLabel name={o.label} avatarUrl={o.avatarUrl} />,
    }));
  const panelFilters: PanelFilter[] = [
    {
      key: 'salesFilter',
      label: t('campaigns.filter.label.sales'),
      allLabel: t('campaigns.filter.allSales'),
      options: personItems(salesPeople),
      chip: person(salesPeople),
      people: salesPeople,
    },
    {
      key: 'managerFilter',
      label: t('campaigns.filter.label.manager'),
      allLabel: t('campaigns.filter.allManagers'),
      options: personItems(managers),
      chip: person(managers),
      people: managers,
    },
    {
      key: 'companyFilter',
      label: t('campaigns.filter.label.company'),
      allLabel: t('campaigns.filter.allCompanies'),
      options: companies,
      chip: plain(companies),
    },
    {
      key: 'accountFilter',
      label: t('campaigns.filter.label.account'),
      allLabel: t('campaigns.filter.allAccounts'),
      options: accounts,
      chip: plain(accounts),
    },
    {
      key: 'countryFilter',
      label: t('campaigns.filter.label.country'),
      allLabel: t('campaigns.filter.allCountries'),
      options: markets,
      chip: plain(markets),
    },
    {
      key: 'categoryFilter',
      label: t('campaigns.filter.label.category'),
      allLabel: t('campaigns.filter.allCategories'),
      options: categories,
      chip: plain(categories),
    },
  ];
  // The dropdowns are internal-only cuts; the two flight-date fields are
  // offered to every seat.
  const activePanelFilters = (isInternal ? panelFilters : []).filter(
    (f) => filters[f.key] !== 'all',
  );
  const dateFilters = [
    {
      key: 'startFrom' as const,
      label: t('campaigns.col.startDate'),
      chip: 'campaigns.filter.startChip' as const,
    },
    {
      key: 'endTo' as const,
      label: t('campaigns.col.endDate'),
      chip: 'campaigns.filter.endChip' as const,
    },
  ];
  const activeDateFilters = dateFilters.filter((f) => filters[f.key] !== '');
  const activeFilterCount = activePanelFilters.length + activeDateFilters.length;

  /** One chip per filter, already labelled ("Sales"): the value itself when
   *  there is one, otherwise just how many are picked — with up to three
   *  profile photos for people filters. */
  const panelChipContent = (f: PanelFilter) => {
    const picked = parseSelection(filters[f.key]);
    if (picked.length === 1) return f.chip(picked[0]);
    const faces = (f.people ?? []).filter((p) => picked.includes(p.value)).slice(0, 3);
    return (
      <>
        {faces.length > 0 && (
          <span className="flex -space-x-1.5">
            {faces.map((p) => (
              <span
                key={p.value}
                className="rounded-full ring-2 ring-gray-50 dark:ring-brame-dark-light"
              >
                <Avatar name={p.label} imageUrl={p.avatarUrl} size={16} />
              </span>
            ))}
          </span>
        )}
        {picked.length}
      </>
    );
  };

  const columns = useCampaignColumns(isInternal);
  const headerHint = useCampaignHeaderHints();
  // A sort from a link is only honoured if this seat actually has that column.
  const sorting = useMemo(
    () =>
      decodeSort(filters.sort).filter((s) =>
        columns.some((c) => c.id === s.id && c.enableSorting !== false),
      ),
    [filters.sort, columns],
  );
  const table = useReactTable({
    data: rows,
    columns,
    state: {
      sorting,
      globalFilter: q,
      columnVisibility: { ...columnVisibility, ...HIDDEN_SORT_COLUMNS },
    },
    onSortingChange: (updater) => setFilter({ sort: encodeSort(resolve(updater, sorting)) }),
    onGlobalFilterChange: (v: string) => setFilter({ q: v }),
    onColumnVisibilityChange: (updater) => setColumnVisibility((prev) => resolve(updater, prev)),
    globalFilterFn: (row, _id, value) =>
      matchesQuery(
        String(value),
        row.original.name,
        row.original.companyName,
        row.original.salesforce.category,
      ),
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

  const live = scoped.filter(isLiveCampaign);
  const exportRows = () =>
    exportToXlsx(
      'campaigns.xlsx',
      table.getFilteredRowModel().rows.map((r) => r.original),
      campaignExportColumns(t, isInternal),
    );

  return (
    <Page fill>
      <PageHeader
        title={t('campaigns.title')}
        subtitle={isInternal ? t('campaigns.subtitleAdmin') : t('campaigns.subtitleClient')}
        actions={
          <Button
            variant="primary"
            icon={<Download size={13} />}
            onClick={exportRows}
            disabled={rows.length === 0}
          >
            {t('common.exportCsv')}
          </Button>
        }
      />

      <StatGrid>
        <SummaryTile label={t('campaigns.tile.live')} value={String(live.length)} />
        <SummaryTile
          label={t('campaigns.tile.impressions')}
          value={fmtCompact(
            live.reduce((a, c) => a + (primarySeries(c)?.totals.impressions ?? 0), 0),
          )}
        />
        {/* Setup and connector gaps are campaign-management info, not for clients. */}
        {isInternal && (
          <>
            <SummaryTile
              label={t('campaigns.tile.awaitingSetup')}
              value={String(scoped.filter((c) => !primarySeries(c)).length)}
            />
            <SummaryTile
              label={t('campaigns.tile.noConnector')}
              value={String(
                scoped.reduce((a, c) => a + SOURCE_KEYS.filter((s) => !c.sources[s]).length, 0),
              )}
            />
          </>
        )}
      </StatGrid>

      <>
        <Card padded={false} className={fillsPage ? 'flex flex-1 flex-col' : undefined}>
          <ListToolbar bare>
            <SearchInput
              className="min-w-56"
              value={q}
              onChange={(v) => setFilter({ q: v })}
              placeholder={t('campaigns.search')}
            />

            <Tabs
              value={statusFilter}
              onChange={(v) => setFilter({ statusFilter: v })}
              options={STATUS_FILTERS.map((value) => ({
                value,
                label: t(`campaigns.filter.${value}`),
              }))}
            />

            <FilterToggleButton
              open={filtersOpen}
              count={activeFilterCount}
              label={t('campaigns.filter.toggle')}
              onClick={() => setFiltersOpen((o) => !o)}
            />

            <ColumnVisibilityMenu
              table={table}
              // Device split's header is an icon pair, not text.
              labelFor={(id) => (id === 'deviceSplit' ? t('campaigns.col.deviceSplit') : undefined)}
              trigger={
                <ToolbarButton icon={<SlidersHorizontal size={13} />}>
                  {t('campaigns.columns.toggle')}
                </ToolbarButton>
              }
            />

            <ToolbarResetButton
              active={filtersActive}
              onReset={resetFilters}
              label={t('campaigns.filter.reset')}
            />
          </ListToolbar>

          <Collapse open={!filtersOpen && activeFilterCount > 0}>
            <ActiveFilterChips>
              {activeDateFilters.map((f) => (
                <FilterChip
                  key={f.key}
                  label={f.label}
                  removeLabel={t('campaigns.filter.remove')}
                  onRemove={() => setFilter({ [f.key]: '' })}
                >
                  {t(f.chip, { date: fmtDateLong(filters[f.key]) })}
                </FilterChip>
              ))}
              {activePanelFilters.map((f) => (
                <FilterChip
                  key={f.key}
                  label={f.label}
                  removeLabel={t('campaigns.filter.remove')}
                  onRemove={() => setFilter({ [f.key]: ALL })}
                >
                  {panelChipContent(f)}
                </FilterChip>
              ))}
            </ActiveFilterChips>
          </Collapse>

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
              stickyStartColumnId="campaign"
              fill={fillsPage}
              dense
              headerHint={headerHint}
              onRowClick={(c, e) =>
                e.metaKey || e.ctrlKey
                  ? window.open(paths.campaign(c.id), '_blank', 'noopener')
                  : navigate(paths.campaign(c.id))
              }
            />
          )}
        </Card>

        <FilterSheet
          open={filtersOpen}
          title={t('campaigns.filter.toggle')}
          onClose={() => setFiltersOpen(false)}
          footer={
            <>
              <span className="tnum text-xs text-gray-500 dark:text-gray-400">
                {t('campaigns.filter.results', {
                  count: table.getFilteredRowModel().rows.length,
                })}
              </span>
              <Button size="sm" onClick={resetFilters} disabled={!filtersActive}>
                {t('campaigns.filter.reset')}
              </Button>
            </>
          }
        >
          <FilterField label={t('campaigns.col.startDate')}>
            <DateFilter
              value={filters.startFrom}
              today={TODAY_ISO}
              placeholder={t('campaigns.filter.startPlaceholder')}
              onChange={(startFrom) => setFilter({ startFrom })}
            />
          </FilterField>
          <FilterField label={t('campaigns.col.endDate')}>
            <DateFilter
              value={filters.endTo}
              today={TODAY_ISO}
              placeholder={t('campaigns.filter.endPlaceholder')}
              onChange={(endTo) => setFilter({ endTo })}
            />
          </FilterField>
          {isInternal &&
            panelFilters.map((f) => (
              <FilterField key={f.key} label={f.label}>
                <FilterMultiSelect
                  className="w-full"
                  values={parseSelection(filters[f.key])}
                  onChange={(v) => setFilter({ [f.key]: serializeSelection(v) })}
                  allLabel={f.allLabel}
                  options={f.options}
                />
              </FilterField>
            ))}
        </FilterSheet>
      </>
    </Page>
  );
}
