import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Radio,
  Search,
  Settings2,
  SlidersHorizontal,
  Star,
  Unplug,
} from 'lucide-react';
import { ResponsiveContainer, Area, AreaChart } from 'recharts';
import { YESTERDAY_ISO, fmtCompact, fmtMetric, fmtPct, sourceMeta } from '../mock/data';
import type { Campaign } from '../mock/types';
import { useSession, scopeCampaigns } from '../lib/session';
import { useI18n, useFormatters } from '../lib/i18n';
import { usePageTitle } from '../lib/usePageTitle';
import { useTheme } from '../lib/theme';
import { useCampaigns } from '../hooks/useCampaigns';
import EditCampaignModal from '../components/EditCampaignModal';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger } from '../components/ui/select';
import { Button, Card, Pill, Th, Td, type PillTone } from '../components/primitives';

const statusTone: Record<Campaign['status'], PillTone> = {
  live: 'green',
  scheduled: 'neutral',
  ended: 'neutral',
  archived: 'neutral',
};

const primary = (c: Campaign) => c.sources[c.primarySource];

export default function CampaignsView() {
  const { role, companyId } = useSession();
  const { t } = useI18n();
  usePageTitle(t('campaigns.title'));
  const { data: allCampaigns, isLoading, isError } = useCampaigns();
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Campaign['status']>('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [editing, setEditing] = useState<Campaign | null>(null);

  const isAdmin = role === 'brame_admin';

  const scoped = useMemo(
    () => (allCampaigns ? scopeCampaigns(allCampaigns, role, companyId) : []),
    [allCampaigns, role, companyId]
  );

  // Company/country are admin-only cuts across the whole portfolio — a
  // client is already scoped to one company by scopeCampaigns above, so
  // narrowing further by company would be pointless for them.
  const companyOptions = useMemo(
    () => [...new Map(scoped.map((c) => [c.companyId, c.companyName])).entries()],
    [scoped]
  );
  const countryOptions = useMemo(
    () => [...new Set(scoped.map((c) => c.salesforce.market))].sort(),
    [scoped]
  );

  const rows = useMemo(
    () =>
      scoped.filter(
        (c) =>
          (statusFilter === 'all' || c.status === statusFilter) &&
          (!isAdmin || companyFilter === 'all' || c.companyId === companyFilter) &&
          (!isAdmin || countryFilter === 'all' || c.salesforce.market === countryFilter)
      ),
    [scoped, statusFilter, isAdmin, companyFilter, countryFilter]
  );

  const live = scoped.filter((c) => c.status === 'live');
  const showCompany = role === 'brame_admin';

  const columns = useMemo<ColumnDef<Campaign>[]>(() => {
    const cols: ColumnDef<Campaign>[] = [
      {
        id: 'campaign',
        accessorFn: (c) => c.name,
        header: t('campaigns.col.campaign'),
        cell: ({ row }) => <CampaignCell campaign={row.original} />,
        enableHiding: false,
      },
      {
        id: 'company',
        accessorFn: (c) => c.companyName,
        header: t('campaigns.col.company'),
        cell: ({ row }) => <span>{row.original.companyName}</span>,
      },
      {
        id: 'country',
        accessorFn: (c) => c.salesforce.market,
        header: t('campaigns.col.country'),
        cell: ({ row }) => <Pill tone="teal">{row.original.salesforce.market}</Pill>,
      },
      {
        id: 'primarySource',
        accessorFn: (c) => sourceMeta(c, c.primarySource).label,
        header: t('campaigns.col.primarySource'),
        cell: ({ row }) => {
          const meta = sourceMeta(row.original, row.original.primarySource);
          return (
            <span className="inline-flex items-center gap-1.5 text-sm">
              <Star size={11} className="text-brame-teal" fill="currentColor" />
              {meta.label}
            </span>
          );
        },
      },
      {
        id: 'freshness',
        accessorFn: (c) => (primary(c) ? sourceMeta(c, c.primarySource).cadence : 'none'),
        header: t('campaigns.col.freshness'),
        cell: ({ row }) => <FreshnessCell campaign={row.original} />,
        enableSorting: false,
      },
      {
        id: 'impressions',
        accessorFn: (c) => primary(c)?.totals.impressions ?? -1,
        header: t('campaigns.col.impressions'),
        cell: ({ row }) => {
          const s = primary(row.original);
          return <span className="tnum">{s ? fmtMetric('impressions', s.totals.impressions) : '—'}</span>;
        },
      },
      {
        id: 'viewability',
        accessorFn: (c) => primary(c)?.totals.viewability ?? -1,
        header: t('campaigns.col.viewability'),
        cell: ({ row }) => {
          const s = primary(row.original);
          return <span className="tnum">{s ? fmtMetric('viewability', s.totals.viewability) : '—'}</span>;
        },
      },
      {
        id: 'engagement',
        accessorFn: (c) => primary(c)?.totals.engagementRate ?? -1,
        header: t('campaigns.col.engagement'),
        cell: ({ row }) => <EngagementCell campaign={row.original} />,
      },
      {
        id: 'delivery',
        accessorFn: (c) => {
          const s = primary(c);
          return s ? (s.totals.impressions ?? 0) / c.salesforce.bookedImpressions : -1;
        },
        header: t('campaigns.col.delivery'),
        cell: ({ row }) => <DeliveryCell campaign={row.original} />,
      },
      {
        id: 'trend',
        header: t('campaigns.col.trend'),
        cell: ({ row }) => <TrendCell campaign={row.original} />,
        enableSorting: false,
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => <RowActions campaign={row.original} onEdit={() => setEditing(row.original)} />,
      },
    ];
    return showCompany ? cols : cols.filter((c) => c.id !== 'company');
  }, [t, showCompany]);

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, globalFilter: q, columnVisibility },
    onSortingChange: setSorting,
    onGlobalFilterChange: setQ,
    onColumnVisibilityChange: setColumnVisibility,
    globalFilterFn: (row, _id, filterValue) => {
      const c = row.original;
      const needle = String(filterValue).toLowerCase();
      return c.name.toLowerCase().includes(needle) || c.companyName.toLowerCase().includes(needle);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 8 } },
  });

  return (
    <div className="px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brame-dark dark:text-white">{t('campaigns.title')}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {role === 'brame_admin' ? t('campaigns.subtitleAdmin') : t('campaigns.subtitleClient')}
        </p>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryTile label={t('campaigns.tile.live')} value={String(live.length)} />
        <SummaryTile
          label={t('campaigns.tile.impressions')}
          value={fmtCompact(live.reduce((a, c) => a + (primary(c)?.totals.impressions ?? 0), 0))}
          hint={t('campaigns.tile.impressionsHint')}
        />
        <SummaryTile
          label={t('campaigns.tile.awaitingSetup')}
          value={String(
            scoped.filter((c) =>
              (['atk', 'nexd', 'custom'] as const).some((s) => c.primarySource === s && !c.sources[s])
            ).length
          )}
        />
        <SummaryTile
          label={t('campaigns.tile.noConnector')}
          value={String(
            scoped.reduce((a, c) => a + (['atk', 'nexd', 'custom'] as const).filter((s) => !c.sources[s]).length, 0)
          )}
          hint={t('campaigns.tile.noConnectorHint')}
        />
      </div>

      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 p-4 dark:border-white/10">
          <div className="relative min-w-56 flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('campaigns.search')}
              className="h-10 w-full rounded-lg border border-gray-300 pl-9 pr-3 text-sm text-brame-dark outline-none focus:border-brame-teal dark:border-white/15 dark:bg-brame-dark-light dark:text-gray-100 dark:placeholder:text-gray-500"
            />
          </div>

          {isAdmin && (
            <div className="w-56">
              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger />
                <SelectContent>
                  <SelectItem value="all">{t('campaigns.filter.allCompanies')}</SelectItem>
                  {companyOptions.map(([id, name]) => (
                    <SelectItem key={id} value={id}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {isAdmin && (
            <div className="w-36">
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger />
                <SelectContent>
                  <SelectItem value="all">{t('campaigns.filter.allCountries')}</SelectItem>
                  {countryOptions.map((market) => (
                    <SelectItem key={market} value={market}>
                      {market}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex h-10 items-center gap-1 rounded-lg bg-gray-100 p-1 dark:bg-white/5">
            {(
              [
                ['all', t('campaigns.filter.all')],
                ['live', t('campaigns.filter.live')],
                ['scheduled', t('campaigns.filter.scheduled')],
                ['ended', t('campaigns.filter.ended')],
              ] as const
            ).map(([s, label]) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-xs font-medium text-brame-dark transition-colors hover:bg-gray-50 dark:border-white/15 dark:bg-brame-dark-light dark:text-gray-100 dark:hover:bg-white/10"
              >
                <SlidersHorizontal size={13} />
                {t('campaigns.columns.toggle')}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {table
                .getAllLeafColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(checked) => column.toggleVisibility(checked)}
                  >
                    {column.columnDef.header as string}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {isLoading ? (
          <div className="px-4 py-16 text-center text-sm text-gray-500 dark:text-gray-400">{t('common.loading')}</div>
        ) : isError ? (
          <div className="px-4 py-16 text-center text-sm text-red-600 dark:text-red-400">{t('common.loadError')}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  {table.getHeaderGroups().map((hg) => (
                    <tr key={hg.id}>
                      {hg.headers.map((header) => (
                        <Th
                          key={header.id}
                          align={['impressions', 'viewability', 'engagement', 'delivery'].includes(header.column.id) ? 'right' : 'left'}
                          className={
                            header.column.id === 'actions'
                              ? 'sticky right-0 bg-white dark:bg-brame-dark-light'
                              : ''
                          }
                        >
                          {header.isPlaceholder ? null : header.column.getCanSort() ? (
                            <button
                              onClick={header.column.getToggleSortingHandler()}
                              className="inline-flex items-center gap-1 hover:text-brame-dark dark:hover:text-gray-200"
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {{
                                asc: <ArrowUp size={11} />,
                                desc: <ArrowDown size={11} />,
                                false: <ArrowUpDown size={11} className="text-gray-300 dark:text-gray-600" />,
                              }[header.column.getIsSorted() as string]}
                            </button>
                          ) : (
                            flexRender(header.column.columnDef.header, header.getContext())
                          )}
                        </Th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="group transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
                      {row.getVisibleCells().map((cell) => (
                        <Td
                          key={cell.id}
                          align={['impressions', 'viewability', 'engagement', 'delivery'].includes(cell.column.id) ? 'right' : 'left'}
                          className={
                            cell.column.id === 'actions'
                              ? 'sticky right-0 bg-white group-hover:bg-gray-50 dark:bg-brame-dark-light dark:group-hover:bg-white/5'
                              : ''
                          }
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </Td>
                      ))}
                    </tr>
                  ))}
                  {table.getRowModel().rows.length === 0 && (
                    <tr>
                      <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                        {t('campaigns.noMatches')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-white/10">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {t('table.showingRange', {
                  from: rows.length === 0 ? 0 : table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1,
                  to: Math.min(
                    (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                    rows.length
                  ),
                  total: rows.length,
                })}
              </span>
              <div className="flex items-center gap-1">
                <Button size="sm" icon={<ChevronLeft size={13} />} onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                  {t('table.previous')}
                </Button>
                <Button size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                  {t('table.next')}
                  <ChevronRight size={13} />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <EditCampaignModal campaign={editing ?? undefined} open={!!editing} onOpenChange={(o) => !o && setEditing(null)} />
    </div>
  );
}

function CampaignCell({ campaign }: { campaign: Campaign }) {
  const { t } = useI18n();
  const { fmtDate } = useFormatters();
  return (
    <div>
      <Link
        to={`/campaigns/${campaign.id}`}
        className="whitespace-nowrap font-medium text-brame-dark hover:text-brame-teal hover:underline dark:text-gray-100 dark:hover:text-brame-turquoise-light"
      >
        {campaign.name}
      </Link>
      <div className="mt-1 flex items-center gap-1.5">
        <Pill tone={statusTone[campaign.status]}>{t(`status.${campaign.status}`)}</Pill>
        <span className="whitespace-nowrap text-xs text-gray-400 dark:text-gray-500">
          {fmtDate(campaign.flightStart)} – {fmtDate(campaign.flightEnd)}
        </span>
      </div>
    </div>
  );
}

function FreshnessCell({ campaign }: { campaign: Campaign }) {
  const { t } = useI18n();
  const { fmtDate } = useFormatters();
  const series = primary(campaign);
  const meta = sourceMeta(campaign, campaign.primarySource);
  if (!series) return <span className="text-xs text-gray-400 dark:text-gray-500">—</span>;
  if (meta.cadence === 'live')
    return (
      <Pill tone="green" icon={<Radio size={10} />}>
        {t('source.live')}
      </Pill>
    );
  const through = campaign.flightEnd < YESTERDAY_ISO ? campaign.flightEnd : YESTERDAY_ISO;
  return <Pill tone="amber">{t('campaigns.freshnessThrough', { date: fmtDate(through) })}</Pill>;
}

function EngagementCell({ campaign }: { campaign: Campaign }) {
  const { t } = useI18n();
  const series = primary(campaign);
  const meta = sourceMeta(campaign, campaign.primarySource);
  if (series?.totals.engagementRate != null) return <span className="tnum">{fmtMetric('engagementRate', series.totals.engagementRate)}</span>;
  return (
    <span
      className="inline-flex items-center gap-1 text-gray-400 dark:text-gray-500"
      title={t('campaigns.engagementNATitle', { source: meta.label })}
    >
      <Unplug size={11} />
      {t('campaigns.engagementNA')}
    </span>
  );
}

function DeliveryCell({ campaign }: { campaign: Campaign }) {
  const series = primary(campaign);
  const pacing = series ? (series.totals.impressions ?? 0) / campaign.salesforce.bookedImpressions : null;
  if (pacing == null) return <span>—</span>;
  return (
    <div className="flex items-center justify-end gap-2">
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
        <div
          className={`h-full rounded-full ${pacing >= 0.95 ? 'bg-green-500' : pacing >= 0.6 ? 'bg-brame-teal' : 'bg-amber-400'}`}
          style={{ width: `${Math.min(pacing * 100, 100)}%` }}
        />
      </div>
      <span className="w-10 text-xs text-gray-500 dark:text-gray-400">{fmtPct(pacing, 0)}</span>
    </div>
  );
}

function TrendCell({ campaign }: { campaign: Campaign }) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const series = primary(campaign);
  const sparkColor = theme === 'dark' ? '#7dd4d4' : '#077070';
  if (!series || series.daily.length <= 1) return <span className="text-xs text-gray-400 dark:text-gray-500">{t('campaigns.noDataYet')}</span>;
  return (
    <div className="h-8 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series.daily.slice(-14)}>
          <defs>
            <linearGradient id={`spark-${campaign.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={sparkColor} stopOpacity={0.35} />
              <stop offset="100%" stopColor={sparkColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="impressions" stroke={sparkColor} strokeWidth={1.5} fill={`url(#spark-${campaign.id})`} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function RowActions({ campaign, onEdit }: { campaign: Campaign; onEdit: () => void }) {
  const { t } = useI18n();
  const { role } = useSession();
  const navigate = useNavigate();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-brame-dark dark:hover:bg-white/10 dark:hover:text-gray-100"
          aria-label={t('common.edit')}
        >
          <MoreHorizontal size={16} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {/* Editing / setup are Brame-operational — not a client permission,
            regardless of that client's own Admin/Viewer role. */}
        {role === 'brame_admin' && (
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil size={13} />
            {t('campaigns.rowMenu.edit')}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => navigate(`/campaigns/${campaign.id}`)}>
          <ExternalLink size={13} />
          {t('campaigns.rowMenu.viewAnalytics')}
        </DropdownMenuItem>
        {role === 'brame_admin' && (
          <DropdownMenuItem onSelect={() => navigate(`/admin/setup?campaign=${campaign.id}`)}>
            <Settings2 size={13} />
            {t('campaigns.rowMenu.openSetup')}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SummaryTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</div>
      <div className="tnum mt-1 text-2xl font-bold text-brame-dark dark:text-white">{value}</div>
      {hint && <div className="mt-1 text-[11px] leading-snug text-gray-400 dark:text-gray-500">{hint}</div>}
    </Card>
  );
}
