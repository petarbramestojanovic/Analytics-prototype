import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Mail, ShieldCheck, TriangleAlert } from 'lucide-react';
import { fmtMetric, fmtPct, sourceMeta } from '../mock/data';
import { useI18n, useFormatters } from '../lib/i18n';
import { usePageTitle } from '../lib/usePageTitle';
import { buildOverviewSummary, TREND_METRICS, type TrendMetric } from '../lib/overview';
import { useAlertThresholds } from '../lib/alertSettings';
import { computePortfolioAlerts, type DivergenceRow } from '../lib/divergence';
import type { Campaign } from '../mock/types';
import { useCompanies } from '../hooks/useCompanies';
import { useCampaigns } from '../hooks/useCampaigns';
import { useUsers } from '../hooks/useCompanies';
import { useEmailReports } from '../hooks/useEmailReports';
import TrendChart from '../components/TrendChart';
import { Select, SelectContent, SelectItem, SelectTrigger } from '../components/ui/select';
import {
  Button,
  Card,
  EmptyState,
  LoadingState,
  Pill,
  SectionTitle,
  TableScroll,
  Td,
  Th,
  Tooltip,
  type PillTone,
} from '../components/primitives';

const statusTone: Record<Campaign['status'], PillTone> = {
  live: 'green',
  scheduled: 'neutral',
  ended: 'neutral',
  archived: 'neutral',
};

const primary = (c: Campaign) => c.sources[c.primarySource];

/**
 * The client profile the Clients directory links into — everything about one
 * tenant in one place (campaigns, users, scheduled reports). Separate from
 * Users (CompaniesView), which stays the per-company admin screen.
 */
export default function CompanyDetailView() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const { data: companies, isLoading: companiesLoading } = useCompanies();
  const { data: allCampaigns, isLoading: campaignsLoading } = useCampaigns();
  const { data: allReports } = useEmailReports();
  const { data: companyUsers } = useUsers(id);
  const thresholds = useAlertThresholds();
  const [trendMetric, setTrendMetric] = useState<TrendMetric>('impressions');

  const company = companies?.find((c) => c.id === id);
  usePageTitle(company?.name);

  const campaigns = useMemo(() => (allCampaigns ?? []).filter((c) => c.companyId === id), [allCampaigns, id]);
  const reports = useMemo(() => (allReports ?? []).filter((r) => r.companyId === id), [allReports, id]);
  const summary = useMemo(() => buildOverviewSummary(campaigns, new Date()), [campaigns]);
  const campaignsById = useMemo(() => new Map(campaigns.map((c) => [c.id, c])), [campaigns]);

  // Same standing check the portfolio Alerts page runs, just pre-filtered to
  // this client's own campaigns — so a problem here can't read differently
  // from what /admin/alerts already shows.
  const alerts = useMemo(
    () =>
      computePortfolioAlerts(campaigns, thresholds).sort((a, b) => {
        if (a.read !== b.read) return a.read === 'investigate' ? -1 : 1;
        return b.absDelta - a.absDelta;
      }),
    [campaigns, thresholds]
  );

  if (companiesLoading || campaignsLoading) {
    return <LoadingState label={t('common.loading')} />;
  }

  if (!company) {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <EmptyState
          icon={<TriangleAlert size={32} />}
          title={t('companyDetail.notFoundTitle')}
          body={t('companyDetail.notFoundBody')}
          action={
            <Link to="/admin/clients">
              <Button variant="primary" icon={<ArrowLeft size={14} />}>
                {t('companyDetail.backToClients')}
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <Link
        to="/admin/clients"
        className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brame-teal dark:text-gray-400 dark:hover:text-brame-turquoise-light"
      >
        <ArrowLeft size={14} />
        {t('companyDetail.back')}
      </Link>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-brame-dark dark:text-white">{company.name}</h1>
            <Pill tone="purple">{company.industry}</Pill>
            <Pill tone="teal" icon={<ShieldCheck size={10} />}>
              {t('companies.isolatedTenant')}
            </Pill>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('companies.summary', { users: companyUsers?.length ?? 0, campaigns: summary.campaignCount, live: summary.liveCount })}
          </p>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <SummaryTile label={t('overview.tile.campaigns')} value={String(summary.campaignCount)} />
        <SummaryTile label={t('overview.tile.live')} value={String(summary.liveCount)} />
        <SummaryTile
          label={t('overview.tile.avgCtr')}
          value={summary.avgCtr != null ? fmtMetric('ctr', summary.avgCtr) : '—'}
        />
        <SummaryTile
          label={t('overview.tile.avgViewability')}
          value={summary.avgViewability != null ? fmtMetric('viewability', summary.avgViewability) : '—'}
        />
        <UsersTile companyId={company.id} count={companyUsers?.length ?? 0} />
      </div>

      <Card padded={false} className="mb-5">
        <div className="flex items-center justify-between border-b border-gray-200 p-5 dark:border-white/10">
          <SectionTitle hint={t('companyDetail.campaignsHint')}>{t('companyDetail.campaignsTitle')}</SectionTitle>
        </div>
        {campaigns.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
            {t('companyDetail.campaignsEmpty')}
          </p>
        ) : (
          <TableScroll>
            <table className="w-full">
              <thead>
                <tr>
                  <Th>{t('campaigns.col.campaign')}</Th>
                  <Th>{t('campaigns.col.primarySource')}</Th>
                  <Th align="right">{t('campaigns.col.impressions')}</Th>
                  <Th align="right">{t('campaigns.col.delivery')}</Th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <CampaignRow key={c.id} campaign={c} />
                ))}
              </tbody>
            </table>
          </TableScroll>
        )}
      </Card>

      <Card padded={false} className="mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-5 dark:border-white/10">
          <SectionTitle hint={t('companyDetail.alertsHint')}>{t('companyDetail.alertsTitle')}</SectionTitle>
          <Link
            to="/admin/alerts"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-brame-teal hover:underline dark:text-brame-turquoise-light"
          >
            {t('companyDetail.manageAlerts')}
            <ArrowRight size={11} />
          </Link>
        </div>
        {alerts.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <ShieldCheck size={28} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('companyDetail.alertsEmpty')}</p>
          </div>
        ) : (
          <TableScroll>
            <table className="w-full">
              <thead>
                <tr>
                  <Th>{t('alerts.col.campaign')}</Th>
                  <Th>{t('alerts.col.comparing')}</Th>
                  <Th>{t('alerts.col.metric')}</Th>
                  <Th align="right">{t('alerts.col.delta')}</Th>
                  <Th>{t('alerts.col.read')}</Th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((row, i) => (
                  <AlertRow
                    key={`${row.campaignId}-${row.check}-${row.metric}-${i}`}
                    row={row}
                    campaign={campaignsById.get(row.campaignId)}
                  />
                ))}
              </tbody>
            </table>
          </TableScroll>
        )}
      </Card>

      <Card className="mb-5">
        <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
          <SectionTitle hint={t('companyDetail.trendHint')}>{t('companyDetail.trendTitle')}</SectionTitle>
          <div className="w-40">
            <Select value={trendMetric} onValueChange={(v) => setTrendMetric(v as TrendMetric)}>
              <SelectTrigger />
              <SelectContent>
                {TREND_METRICS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {t(`metric.${m}.label`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {summary.daily.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">{t('overview.trendEmpty')}</p>
        ) : (
          <TrendChart daily={summary.daily} metric={trendMetric} />
        )}
      </Card>

      <Card padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-5 dark:border-white/10">
          <SectionTitle hint={t('companyDetail.reportsHint')}>{t('companyDetail.reportsTitle')}</SectionTitle>
          <Link
            to="/reports"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-brame-teal hover:underline dark:text-brame-turquoise-light"
          >
            {t('companyDetail.manageReports')}
            <ArrowRight size={11} />
          </Link>
        </div>
        {reports.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
            {t('companyDetail.reportsEmpty')}
          </p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-white/5">
            {reports.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Mail size={13} className="text-gray-400 dark:text-gray-500" />
                    <span className="text-sm font-medium text-brame-dark dark:text-gray-100">{r.name}</span>
                    <Pill tone={r.enabled ? 'green' : 'neutral'}>
                      {r.enabled ? t('reports.active') : t('reports.paused')}
                    </Pill>
                  </div>
                  <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    {r.cadence === 'weekly' ? t('reports.email.cadenceWeekly') : t('reports.email.cadenceMonthly')} ·{' '}
                    {r.recipients.length} {t('companyDetail.recipients')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function AlertRow({ row, campaign }: { row: DivergenceRow; campaign: Campaign | undefined }) {
  const { t } = useI18n();
  const baselineLabel = campaign ? sourceMeta(campaign, row.baseline).label : row.baseline;
  const checkLabel = campaign ? sourceMeta(campaign, row.check).label : row.check;

  return (
    <tr className="transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
      <Td>
        <Link
          to={`/campaigns/${row.campaignId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-brame-dark hover:text-brame-teal hover:underline dark:text-gray-100 dark:hover:text-brame-turquoise-light"
        >
          {row.campaignName}
        </Link>
      </Td>
      <Td>
        <span className="inline-flex items-center gap-1.5">
          {baselineLabel} <span className="text-gray-400">vs</span> {checkLabel}
          {row.cadenceGap && <Tooltip text={t('alerts.cadenceGapNote')} />}
        </span>
      </Td>
      <Td>{t(`metric.${row.metric}.label`)}</Td>
      <Td align="right">
        <span className={row.read === 'watch' ? 'text-amber-700 dark:text-amber-300' : 'text-red-600 dark:text-red-400'}>
          {row.delta > 0 ? '+' : ''}
          {fmtPct(row.delta, 1)}
        </span>
      </Td>
      <Td>
        <Pill tone={row.tone}>{t(`detail.read.${row.read}`)}</Pill>
      </Td>
    </tr>
  );
}

function CampaignRow({ campaign }: { campaign: Campaign }) {
  const { t } = useI18n();
  const { fmtDate } = useFormatters();
  const series = primary(campaign);
  const meta = sourceMeta(campaign, campaign.primarySource);
  const pacing = series ? (series.totals.impressions ?? 0) / campaign.salesforce.bookedImpressions : null;

  return (
    <tr className="transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
      <Td>
        <Link
          to={`/campaigns/${campaign.id}`}
          target="_blank"
          rel="noopener noreferrer"
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
      </Td>
      <Td>{meta.label}</Td>
      <Td align="right" className="tnum">
        {series ? fmtMetric('impressions', series.totals.impressions) : '—'}
      </Td>
      <Td align="right">
        {pacing == null ? (
          '—'
        ) : (
          <div className="flex items-center justify-end gap-2">
            <div className="h-1.5 w-14 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
              <div
                className={`h-full rounded-full ${pacing >= 0.95 ? 'bg-green-500' : pacing >= 0.6 ? 'bg-brame-teal' : 'bg-amber-400'}`}
                style={{ width: `${Math.min(pacing * 100, 100)}%` }}
              />
            </div>
            <span className="w-10 text-xs text-gray-500 dark:text-gray-400">{fmtPct(pacing, 0)}</span>
          </div>
        )}
      </Td>
    </tr>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <Card padded={false} className="p-3">
      <div className="truncate text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </div>
      <div className="tnum mt-0.5 text-xl font-bold text-brame-dark dark:text-white">{value}</div>
    </Card>
  );
}

/** Same tile, but a link into Users — the tile this account's user count and
 *  management both live behind, rather than a second users table duplicating
 *  that page here. */
function UsersTile({ companyId, count }: { companyId: string; count: number }) {
  const { t } = useI18n();
  return (
    <Link to={`/admin/companies?company=${companyId}`} className="block">
      <Card
        padded={false}
        className="p-3 transition-colors hover:border-brame-teal/40 dark:hover:border-brame-turquoise/40"
      >
        <div className="truncate text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {t('companyDetail.usersTitle')}
        </div>
        <div className="tnum mt-0.5 text-xl font-bold text-brame-dark dark:text-white">{count}</div>
      </Card>
    </Link>
  );
}
