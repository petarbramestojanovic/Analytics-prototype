import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { paths } from '@/config/paths';
import { useI18n } from '@/i18n';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Pill } from '@/components/ui';
import { LoadingState } from '@/components/feedback';
import { NotFoundState, Page, PageHeader } from '@/components/page';
import { SummaryTile } from '@/components/display';
import { buildPortfolioSummary, ChartCard, computePortfolioAlerts, PortfolioSummaryTiles, useCampaigns } from '@/features/campaigns';
import { useAlertThresholds } from '@/features/alerts';
import { useIndustryBenchmark } from '@/features/benchmarks';
import { reportScopeCompanyId, useEmailReports } from '@/features/reports';
import { useClientSeat } from '@/features/seats';
import { useCompanies } from '@/api/hooks/useOrganizations';
import { ClientAlertsCard } from '../components/ClientAlertsCard';
import { ClientCampaignsCard } from '../components/ClientCampaignsCard';
import { ClientReportsCard } from '../components/ClientReportsCard';

/**
 * The client profile the Clients directory links into — everything about one
 * tenant in one place (campaigns, alerts, users, scheduled reports). Separate
 * from the Seats page, which stays the cross-tenant seat-management screen.
 */
export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const { data: companies, isLoading: companiesLoading } = useCompanies();
  const { data: allCampaigns, isLoading: campaignsLoading } = useCampaigns();
  const { data: allReports } = useEmailReports();
  const { seat, members: users } = useClientSeat(id);
  const thresholds = useAlertThresholds();
  // This page only exists under /admin — a client never lands here — so
  // benchmarks (a cross-tenant construct) are always fetched.
  const benchmarks = useIndustryBenchmark(id, true);

  const company = companies?.find((c) => c.id === id);
  usePageTitle(company?.name);

  const campaigns = useMemo(() => (allCampaigns ?? []).filter((c) => c.companyId === id), [allCampaigns, id]);
  const reports = useMemo(
    () => (allReports ?? []).filter((r) => reportScopeCompanyId(r.scope, allCampaigns ?? []) === id),
    [allReports, allCampaigns, id]
  );
  const summary = useMemo(() => buildPortfolioSummary(campaigns, new Date()), [campaigns]);
  // Same standing check the portfolio Alerts page runs, pre-filtered to this
  // client's own campaigns — so a problem here can't read differently from
  // what the Alerts page already shows.
  const alerts = useMemo(() => computePortfolioAlerts(campaigns, thresholds), [campaigns, thresholds]);

  if (companiesLoading || campaignsLoading) return <LoadingState />;

  if (!company) {
    return (
      <NotFoundState
        title={t('companyDetail.notFoundTitle')}
        body={t('companyDetail.notFoundBody')}
        backTo={paths.clients}
        backLabel={t('companyDetail.backToClients')}
      />
    );
  }

  return (
    <Page>
      <PageHeader
        className="mb-5"
        back={{ to: paths.clients, label: t('companyDetail.back') }}
        title={company.name}
        badges={
          <>
            <Pill tone="purple">{company.industry}</Pill>
            <Pill tone="teal" icon={<ShieldCheck size={10} />}>
              {t('companies.isolatedTenant')}
            </Pill>
          </>
        }
        subtitle={t('companies.summary', {
          users: users.length,
          campaigns: summary.campaignCount,
          live: summary.liveCount,
        })}
      />

      <PortfolioSummaryTiles
        summary={summary}
        extra={
          <Link to={paths.seats(seat?.id)}>
            <SummaryTile
              label={t('companyDetail.usersTitle')}
              value={String(users.length)}
              className="transition-colors hover:border-brame-teal/40 dark:hover:border-brame-turquoise/40"
            />
          </Link>
        }
      />

      <ClientCampaignsCard campaigns={campaigns} />
      <ClientAlertsCard alerts={alerts} campaigns={campaigns} />

      <ChartCard
        daily={summary.daily}
        emptyLabel={t('overview.trendEmpty')}
        title={t('companyDetail.trendTitle')}
        hint={t('companyDetail.trendHint')}
        frameBenchmark={benchmarks.frameBenchmark}
        industryBenchmark={benchmarks.industryBenchmark}
        industryLabel={benchmarks.industry}
      />

      <ClientReportsCard reports={reports} />
    </Page>
  );
}
