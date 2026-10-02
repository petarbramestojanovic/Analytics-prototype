import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, LayoutDashboard } from 'lucide-react';
import { paths } from '@/config/paths';
import { useI18n } from '@/i18n';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Button, Card } from '@/components/ui';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { Page, PageHeader, SectionTitle } from '@/components/page';
import { useSession } from '@/features/session';
import { buildPortfolioSummary, ChartCard, PortfolioSummaryTiles, useScopedCampaigns } from '@/features/campaigns';
import { DIMENSIONS, useBenchmarks, useIndustryBenchmark, type Dimension } from '@/features/benchmarks';
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
  const { campaigns, isLoading, isError, refetch } = useScopedCampaigns();
  const summary = useMemo(() => buildPortfolioSummary(campaigns, new Date()), [campaigns]);

  // Benchmarks are a cross-tenant construct — never scoped to one company —
  // so these only fetch for internal seats, mirroring the route gate on
  // /benchmarks itself rather than just hiding the cards after the fact.
  const topQueries: Record<Dimension, ReturnType<typeof useBenchmarks>> = {
    industry: useBenchmarks('industry', isInternal),
    client: useBenchmarks('client', isInternal),
    market: useBenchmarks('market', isInternal),
  };
  const { frameBenchmark } = useIndustryBenchmark(undefined, isInternal);

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  return (
    <Page>
      <PageHeader title={t('overview.title')} subtitle={isInternal ? t('overview.subtitleAdmin') : t('overview.subtitleClient')} />

      {summary.campaignCount === 0 ? (
        <EmptyState icon={<LayoutDashboard size={32} />} title={t('overview.empty.title')} body={t('overview.empty.body')} />
      ) : (
        <>
          <PortfolioSummaryTiles summary={summary} showImpressions />

          {isInternal ? (
            <div className="mb-5">
              <SectionTitle className="mb-2" hint={t('overview.topHint')}>
                {t('overview.topTitle')}
              </SectionTitle>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {DIMENSIONS.map((d) => (
                  <TopGroupCard key={d} dimension={d} query={topQueries[d]} />
                ))}
              </div>
            </div>
          ) : (
            <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
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
          />

          {isInternal && (
            <Card className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="font-semibold text-brame-dark dark:text-white">{t('overview.benchmarksCta.title')}</div>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('overview.benchmarksCta.body')}</p>
              </div>
              <Link to={paths.benchmarks()}>
                <Button variant="primary" icon={<BarChart3 size={14} />}>
                  {t('overview.benchmarksCta.action')}
                </Button>
              </Link>
            </Card>
          )}
        </>
      )}
    </Page>
  );
}
