import { useMemo } from 'react';
import { BarChart3, LayoutDashboard } from 'lucide-react';
import { paths } from '@/config/paths';
import { STORAGE_KEYS } from '@/config/storageKeys';
import { useFormatters, useI18n } from '@/i18n';
import { ALL, parseSelection } from '@/lib/selection';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useListFilters } from '@/hooks/useListFilters';
import { TODAY, TODAY_ISO } from '@/lib/clock';
import { ButtonLink, Card } from '@/components/ui';
import { EmptyState, ErrorState, PageSkeleton } from '@/components/feedback';
import { Page, PageHeader, SectionTitle } from '@/components/page';
import { useSession } from '@/features/session';
import {
  buildPortfolioSummary,
  ChartCard,
  PortfolioSummaryTiles,
  useScopedCampaigns,
} from '@/features/campaigns';
import {
  ContextComparison,
  DIMENSIONS,
  useBenchmarks,
  useIndustryBenchmark,
  type BenchmarkScope,
  type Dimension,
} from '@/features/benchmarks';
import { OverviewFilters } from '../components/OverviewFilters';
import { PrimaryKpiCard } from '../components/PrimaryKpiCard';
import { previousYear, resolveRange, type RangePreset } from '../lib/dateRange';
import {
  applyEntityFilters,
  DEFAULT_OVERVIEW_FILTERS,
  entityFilterCount,
  OVERVIEW_ALLOWED,
} from '../lib/overviewFilters';
import { BestCampaignCard } from '../components/BestCampaignCard';
import { LiveCampaignsCard } from '../components/LiveCampaignsCard';
import { TopGroupCard } from '../components/TopGroupCard';

/**
 * The portfolio-snapshot landing page — KPI tiles plus a trend chart, the one
 * thing the Benchmarks page (industry/client/market breakdowns) doesn't cover.
 * Tenant-scoped like Campaigns, so an agency or client seat sees their own
 * numbers here rather than the whole portfolio's.
 */
export function OverviewPage() {
  const { t } = useI18n();
  usePageTitle(t('overview.title'));
  const { isInternal } = useSession();
  const { fmtDateRange } = useFormatters();
  const { campaigns: scoped, isLoading, isError, refetch } = useScopedCampaigns();
  const { filters, setFilter, resetFilters, filtersActive } = useListFilters(
    STORAGE_KEYS.overviewFilters,
    DEFAULT_OVERVIEW_FILTERS,
    OVERVIEW_ALLOWED,
  );

  const range = useMemo(
    () =>
      resolveRange(
        {
          preset: filters.range as RangePreset,
          from: filters.from,
          to: filters.to,
          seasonYear: filters.year,
        },
        TODAY_ISO,
      ),
    [filters.range, filters.from, filters.to, filters.year],
  );
  const campaigns = useMemo(
    () => applyEntityFilters(scoped, filters, isInternal),
    [scoped, filters, isInternal],
  );
  const summary = useMemo(() => buildPortfolioSummary(campaigns, TODAY, range), [campaigns, range]);
  // The same window a year earlier, for the year-over-year comparison.
  const previous = useMemo(
    () => (filters.yoy ? buildPortfolioSummary(campaigns, TODAY, previousYear(range)) : undefined),
    [filters.yoy, campaigns, range],
  );
  const companyIds = useMemo(() => [...new Set(scoped.map((c) => c.companyId))], [scoped]);
  const singleCompanyId = companyIds.length === 1 ? companyIds[0] : undefined;

  // Benchmarks are cross-tenant and keyed by flight, not by salesperson or
  // campaign manager — so they follow the period and the country, and the
  // other filters visibly don't apply (see the note under "Top performers").
  const benchmarkScope = useMemo<BenchmarkScope>(
    () => ({ range, markets: parseSelection(filters.countryFilter) }),
    [range, filters.countryFilter],
  );
  const benchmarkFiltersIgnored =
    entityFilterCount({ ...filters, countryFilter: ALL }, isInternal) > 0;

  // Benchmarks are a cross-tenant construct — never scoped to one company —
  // so these only fetch for internal seats, mirroring the route gate on
  // /benchmarks itself rather than just hiding the cards after the fact.
  const topQueries: Record<Dimension, ReturnType<typeof useBenchmarks>> = {
    industry: useBenchmarks('industry', isInternal, benchmarkScope),
    client: useBenchmarks('client', isInternal, benchmarkScope),
    market: useBenchmarks('market', isInternal, benchmarkScope),
  };
  const { frameBenchmark } = useIndustryBenchmark(undefined, isInternal, benchmarkScope);

  if (isLoading) return <PageSkeleton variant="dashboard" />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  return (
    <Page fill>
      <PageHeader
        title={t('overview.title')}
        subtitle={t(isInternal ? 'overview.subtitleAdmin' : 'overview.subtitleClient', {
          range: fmtDateRange(range.start, range.end, true),
        })}
      />

      <OverviewFilters
        campaigns={scoped}
        filters={filters}
        range={range}
        onChange={setFilter}
        onReset={resetFilters}
        active={filtersActive}
        isInternal={isInternal}
      />

      {summary.campaignCount === 0 ? (
        scoped.length === 0 ? (
          <EmptyState
            icon={<LayoutDashboard size={32} />}
            title={t('overview.empty.title')}
            body={t('overview.empty.body')}
          />
        ) : (
          <EmptyState
            icon={<LayoutDashboard size={32} />}
            title={t('overview.emptyFiltered.title')}
            body={t('overview.emptyFiltered.body')}
          />
        )
      ) : (
        <>
          <PortfolioSummaryTiles summary={summary} previous={previous} showEngagement />

          <PrimaryKpiCard campaigns={campaigns} />

          {previous && previous.campaignCount === 0 && (
            <p className="-mt-2 mb-4 text-xs text-gray-500 dark:text-gray-400">
              {t('overview.range.yoyEmpty')}
            </p>
          )}

          {/* A client seat sees its own client against its industry — never
              BRAME, never another client. (An agency seat spans several
              clients, so it gets this per campaign instead.) */}
          {!isInternal && singleCompanyId && (
            <ContextComparison companyId={singleCompanyId} isInternal={false} className="mb-4" />
          )}

          {isInternal ? (
            <div className="mb-4">
              <SectionTitle className="mb-2" hint={t('overview.topHint')}>
                {t('overview.topTitle')}
              </SectionTitle>
              {benchmarkFiltersIgnored && (
                <p className="-mt-1 mb-2 text-xs text-gray-500 dark:text-gray-400">
                  {t('overview.topScopeNote')}
                </p>
              )}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {DIMENSIONS.map((d) => (
                  <TopGroupCard key={d} dimension={d} query={topQueries[d]} />
                ))}
              </div>
            </div>
          ) : (
            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <BestCampaignCard campaigns={campaigns} avgCtr={summary.avgCtr} />
              <LiveCampaignsCard campaigns={campaigns} />
            </div>
          )}

          <ChartCard
            daily={summary.daily}
            emptyLabel={t('overview.trendEmpty')}
            title={t('overview.trendTitle')}
            hint={t('overview.trendHint')}
            frameBenchmark={frameBenchmark}
            className="mb-4 flex flex-1 flex-col"
          />

          {isInternal && (
            <Card className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="font-semibold text-brame-dark dark:text-white">
                  {t('overview.benchmarksCta.title')}
                </div>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {t('overview.benchmarksCta.body')}
                </p>
              </div>
              <ButtonLink to={paths.benchmarks()} variant="primary" icon={<BarChart3 size={14} />}>
                {t('overview.benchmarksCta.action')}
              </ButtonLink>
            </Card>
          )}
        </>
      )}
    </Page>
  );
}
