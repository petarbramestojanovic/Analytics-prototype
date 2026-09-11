import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, ChevronRight, Radio, X } from 'lucide-react';
import { fmtMetric } from '../mock/data';
import { useI18n } from '../lib/i18n';
import { usePageTitle } from '../lib/usePageTitle';
import { buildOverviewSummary } from '../lib/overview';
import { useCompanies } from '../hooks/useCompanies';
import { useCampaigns } from '../hooks/useCampaigns';
import { usePagination } from '../hooks/usePagination';
import { Card, LoadingState, Pagination, SearchInput, SegmentedControl } from '../components/primitives';
import { Select, SelectContent, SelectItem, SelectTrigger } from '../components/ui/select';

const PAGE_SIZE = 10;
// The Layout shell's sticky topbar (Layout.tsx) is a fixed 57px — subtracting
// it here lets the 10 rows below stretch to fill the rest of the viewport
// exactly, instead of guessing row padding that only fits one screen height.
const TOPBAR_HEIGHT = 57;

type LiveFilter = 'all' | 'live';
type SortBy = 'name' | 'campaigns' | 'live' | 'ctr';

// Filters are a browser-side preference, same family as the Campaigns list's
// own filters (views/CampaignsView.tsx) — persisted so a reload doesn't drop
// what you were just looking at. Only the explicit "Reset filters" button
// clears them back to defaults.
const FILTERS_KEY = 'brame-prototype-clients-filters';

interface StoredFilters {
  q: string;
  liveFilter: LiveFilter;
  sortBy: SortBy;
}

const DEFAULT_FILTERS: StoredFilters = { q: '', liveFilter: 'all', sortBy: 'name' };

function readStoredFilters(): StoredFilters {
  if (typeof window === 'undefined') return DEFAULT_FILTERS;
  try {
    const raw = window.localStorage.getItem(FILTERS_KEY);
    return raw ? { ...DEFAULT_FILTERS, ...JSON.parse(raw) } : DEFAULT_FILTERS;
  } catch {
    return DEFAULT_FILTERS;
  }
}

/**
 * A directory into each client's full profile (ClientDetailView) — campaigns,
 * performance and reports in one place. Separate from Users (CompaniesView),
 * which stays focused on the per-company user/role admin
 * screen rather than growing into a second thing it isn't.
 */
export default function ClientsView() {
  const { t } = useI18n();
  usePageTitle(t('clients.title'));
  const { data: companies, isLoading } = useCompanies();
  const { data: allCampaigns } = useCampaigns();
  const [initialFilters] = useState(readStoredFilters);
  const [q, setQ] = useState(initialFilters.q);
  const [liveFilter, setLiveFilter] = useState<LiveFilter>(initialFilters.liveFilter);
  const [sortBy, setSortBy] = useState<SortBy>(initialFilters.sortBy);

  useEffect(() => {
    window.localStorage.setItem(FILTERS_KEY, JSON.stringify({ q, liveFilter, sortBy }));
  }, [q, liveFilter, sortBy]);

  const filtersActive = q !== '' || liveFilter !== 'all' || sortBy !== 'name';

  const resetFilters = () => {
    setQ('');
    setLiveFilter('all');
    setSortBy('name');
  };

  // One pass per client — campaign/live counts and the same avg CTR/viewability
  // calculation the client's own detail page uses (buildOverviewSummary),
  // so a number here never disagrees with what you see after clicking in.
  // Markets come from the campaigns themselves (Salesforce's market field
  // isn't a property of the client record) — collected here too so search
  // can match "CH" or "DE" without a client-level market field to query.
  const statsByCompany = useMemo(() => {
    const map = new Map<
      string,
      {
        campaignCount: number;
        liveCount: number;
        avgCtr: number | null;
        avgViewability: number | null;
        markets: string[];
      }
    >();
    for (const company of companies ?? []) {
      const companyCampaigns = (allCampaigns ?? []).filter((c) => c.companyId === company.id);
      const summary = buildOverviewSummary(companyCampaigns, new Date());
      map.set(company.id, {
        campaignCount: summary.campaignCount,
        liveCount: summary.liveCount,
        avgCtr: summary.avgCtr,
        avgViewability: summary.avgViewability,
        markets: [...new Set(companyCampaigns.map((c) => c.salesforce.market))],
      });
    }
    return map;
  }, [companies, allCampaigns]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const base = (companies ?? []).filter((c) => {
      if (!needle) return true;
      if (c.name.toLowerCase().includes(needle) || c.industry.toLowerCase().includes(needle)) return true;
      return (statsByCompany.get(c.id)?.markets ?? []).some((m) => m.toLowerCase().includes(needle));
    });
    const byLive = base.filter((c) => liveFilter === 'all' || (statsByCompany.get(c.id)?.liveCount ?? 0) > 0);
    return [...byLive].sort((a, b) => {
      const sa = statsByCompany.get(a.id);
      const sb = statsByCompany.get(b.id);
      switch (sortBy) {
        case 'campaigns':
          return (sb?.campaignCount ?? 0) - (sa?.campaignCount ?? 0);
        case 'live':
          return (sb?.liveCount ?? 0) - (sa?.liveCount ?? 0);
        case 'ctr':
          return (sb?.avgCtr ?? -1) - (sa?.avgCtr ?? -1);
        default:
          return a.name.localeCompare(b.name);
      }
    });
  }, [companies, q, liveFilter, sortBy, statsByCompany]);

  const { page, setPage, pageCount, paged, from, to } = usePagination(filtered, PAGE_SIZE);

  // A new search/filter narrows the result set, so the previously selected
  // page may no longer exist — always land back on page 1 rather than an
  // empty page.
  useEffect(() => setPage(0), [q, liveFilter, sortBy, setPage]);

  return (
    <div
      className="flex flex-col px-4 py-4 sm:px-6 lg:px-8"
      style={{ height: `calc(100vh - ${TOPBAR_HEIGHT}px)` }}
    >
      <div className="mb-4 shrink-0">
        <h1 className="text-2xl font-bold text-brame-dark dark:text-white">{t('clients.title')}</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500 dark:text-gray-400">{t('clients.subtitle')}</p>
      </div>

      <Card padded={false} className="flex flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-gray-200 p-3 dark:border-white/10">
          <SearchInput value={q} onChange={setQ} placeholder={t('clients.search')} className="max-w-sm" />

          <SegmentedControl
            value={liveFilter}
            onChange={setLiveFilter}
            groupLabel={t('clients.filter.live')}
            className="flex h-9 items-center gap-1 rounded-lg bg-gray-100 p-1 dark:bg-white/5"
            indicatorClassName="rounded-md bg-white shadow-sm dark:bg-brame-dark-light"
            itemClassName="flex h-full items-center px-3 text-xs font-medium transition-colors"
            activeItemClassName="text-brame-dark dark:text-white"
            inactiveItemClassName="text-gray-500 hover:text-brame-dark dark:text-gray-400 dark:hover:text-gray-100"
            options={[
              { value: 'all', label: t('clients.filter.all') },
              { value: 'live', label: t('clients.filter.liveOnly') },
            ]}
          />

          <div className="w-48">
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
              <SelectTrigger />
              <SelectContent>
                <SelectItem value="name">{t('clients.sort.name')}</SelectItem>
                <SelectItem value="campaigns">{t('clients.sort.campaigns')}</SelectItem>
                <SelectItem value="live">{t('clients.sort.live')}</SelectItem>
                <SelectItem value="ctr">{t('clients.sort.ctr')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div
            className={`grid transition-[grid-template-columns] duration-300 ease-out ${
              filtersActive ? 'grid-cols-[1fr]' : 'grid-cols-[0fr]'
            }`}
          >
            <div className="min-w-0 overflow-hidden">
              <button
                type="button"
                onClick={resetFilters}
                tabIndex={filtersActive ? 0 : -1}
                aria-hidden={!filtersActive}
                className={`inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border border-gray-300 bg-white px-3 text-xs font-medium text-brame-dark transition-[opacity,background-color] duration-200 hover:bg-gray-50 dark:border-white/15 dark:bg-brame-dark-light dark:text-gray-100 dark:hover:bg-white/10 ${
                  filtersActive ? 'opacity-100 delay-150' : 'opacity-0'
                }`}
              >
                <X size={13} />
                {t('clients.filter.reset')}
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <LoadingState label={t('common.loading')} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">{t('clients.noMatches')}</p>
          </div>
        ) : (
          <>
            <div className="flex flex-1 flex-col divide-y divide-gray-100 overflow-hidden dark:divide-white/5">
              {paged.map((company) => {
                const stats = statsByCompany.get(company.id);
                return (
                  <Link
                    key={company.id}
                    to={`/admin/clients/${company.id}`}
                    className="flex flex-1 items-center gap-4 px-5 transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
                  >
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-gray-500">
                      <Building2 size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-semibold text-brame-dark dark:text-gray-100">
                          {company.name}
                        </span>
                        {(stats?.liveCount ?? 0) > 0 && (
                          <Radio size={11} className="flex-shrink-0 text-green-500" />
                        )}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-gray-400 dark:text-gray-500">
                        {t('clients.directoryRow', {
                          industry: company.industry,
                          campaigns: stats?.campaignCount ?? 0,
                          live: stats?.liveCount ?? 0,
                        })}
                      </div>
                    </div>
                    <div className="hidden shrink-0 items-center gap-6 sm:flex">
                      <div className="text-right">
                        <div className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                          {t('metric.ctr.label')}
                        </div>
                        <div className="tnum text-sm font-semibold text-brame-dark dark:text-gray-100">
                          {stats?.avgCtr != null ? fmtMetric('ctr', stats.avgCtr) : '—'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                          {t('metric.viewability.label')}
                        </div>
                        <div className="tnum text-sm font-semibold text-brame-dark dark:text-gray-100">
                          {stats?.avgViewability != null ? fmtMetric('viewability', stats.avgViewability) : '—'}
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={16} className="flex-shrink-0 text-gray-300 dark:text-gray-600" />
                  </Link>
                );
              })}
            </div>

            <div className="shrink-0 border-t border-gray-200 px-4 py-2 dark:border-white/10">
              <Pagination page={page} pageCount={pageCount} from={from} to={to} total={filtered.length} onPageChange={setPage} />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
