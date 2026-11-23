import { useMemo } from 'react';
import { LayoutDashboard } from 'lucide-react';
import { STORAGE_KEYS } from '@/config/storageKeys';
import { useFormatters, useI18n, type TranslationKey } from '@/i18n';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useListFilters } from '@/hooks/useListFilters';
import { TODAY, TODAY_ISO } from '@/lib/clock';
import { previousYear, resolveRange, type RangePreset } from '@/lib/dateRange';
import { EmptyState, ErrorState, PageSkeleton } from '@/components/feedback';
import { Page, PageHeader, PeriodPicker } from '@/components/page';
import { useSession } from '@/features/session';
import {
  buildPortfolioSummary,
  ChartCard,
  PortfolioSummaryTiles,
  useScopedCampaigns,
} from '@/features/campaigns';
import {
  ContextComparison,
  PortfolioBenchmarkCharts,
  useIndustryBenchmark,
  type BenchmarkScope,
} from '@/features/benchmarks';
import { DEFAULT_OVERVIEW_FILTERS, OVERVIEW_ALLOWED } from '../lib/overviewFilters';
import { BestCampaignCard } from '../components/BestCampaignCard';
import { LiveCampaignsCard } from '../components/LiveCampaignsCard';

/**
 * The portfolio-snapshot landing page — KPI tiles plus a trend chart, the one
 * thing the Benchmarks page (industry/client/market breakdowns) doesn't cover.
 * Tenant-scoped like Campaigns, so an account or client seat sees their own
 * numbers here rather than the whole portfolio's.
 */
export function OverviewPage() {
  const { t } = useI18n();
  usePageTitle(t('overview.title'));
  const { isInternal } = useSession();
  const { fmtDateRange } = useFormatters();
  const { campaigns, isLoading, isError, refetch } = useScopedCampaigns();
  const { filters, setFilter } = useListFilters(
    STORAGE_KEYS.overviewFilters,
    DEFAULT_OVERVIEW_FILTERS,
    OVERVIEW_ALLOWED,
  );

  // "All time" runs from the earliest flight to today; every other preset
  // resolves to its own dates.
  const allTime = filters.range === 'all';
  const earliestFlight = useMemo(
    () => campaigns.reduce((min, c) => (c.flightStart < min ? c.flightStart : min), TODAY_ISO),
    [campaigns],
  );
  const range = useMemo(
    () =>
      allTime
        ? { start: earliestFlight, end: TODAY_ISO }
        : resolveRange(
            {
              preset: filters.range as RangePreset,
              from: filters.from,
              to: filters.to,
              seasonYear: filters.year,
            },
            TODAY_ISO,
          ),
    [allTime, earliestFlight, filters.range, filters.from, filters.to, filters.year],
  );
  const summary = useMemo(() => buildPortfolioSummary(campaigns, TODAY, range), [campaigns, range]);
  // The same window a year earlier, for the year-over-year comparison.
  const previous = useMemo(
    () =>
      filters.yoy && !allTime
        ? buildPortfolioSummary(campaigns, TODAY, previousYear(range))
        : undefined,
    [filters.yoy, allTime, campaigns, range],
  );
  const companyIds = useMemo(() => [...new Set(campaigns.map((c) => c.companyId))], [campaigns]);
  const singleCompanyId = companyIds.length === 1 ? companyIds[0] : undefined;

  // Benchmarks are cross-tenant and keyed by flight, so they follow the period.
  const benchmarkScope = useMemo<BenchmarkScope>(() => ({ range }), [range]);

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
        actions={
          <PeriodPicker
            allowAll
            align="end"
            showYoy={!allTime}
            filters={filters}
            range={range}
            onChange={setFilter}
          />
        }
      />

      {summary.campaignCount === 0 ? (
        campaigns.length === 0 ? (
          <EmptyState
            icon={<LayoutDashboard size={32} />}
            title={t('overview.empty.title')}
            body={t('overview.empty.body')}
          />
        ) : (
          <EmptyState
            icon={<LayoutDashboard size={32} />}
            title={t('overview.emptyPeriod.title')}
            body={t('overview.emptyPeriod.body', {
              range: fmtDateRange(range.start, range.end, true),
            })}
          />
        )
      ) : (
        <>
          <PortfolioSummaryTiles
            summary={summary}
            previous={previous}
            showLive={false}
            showImpressions
            allImpressions
            showEngagement
            periodLabel={allTime ? t('overview.range.all') : t(`overview.range.${filters.range}` as TranslationKey)}
            rateNote={t(isInternal ? 'overview.tile.acrossIndustries' : 'overview.tile.acrossCampaigns')}
          />

          {previous && previous.campaignCount === 0 && (
            <p className="-mt-2 mb-6 text-xs text-gray-500 dark:text-gray-400">
              {t('overview.range.yoyEmpty')}
            </p>
          )}

          {/* A client seat sees its own client against its industry — never
              KLEA, never another client. (An account seat spans several
              clients, so it gets this per campaign instead.) */}
          {!isInternal && singleCompanyId && (
            <ContextComparison companyId={singleCompanyId} isInternal={false} className="mb-6" />
          )}

          {isInternal ? (
            <div className="mb-6">
              <PortfolioBenchmarkCharts scope={benchmarkScope} />
            </div>
          ) : (
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
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
            className="mb-6 flex flex-1 flex-col"
          />

        </>
      )}
    </Page>
  );
}
