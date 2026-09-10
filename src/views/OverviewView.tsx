import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, LayoutDashboard, Radio, Trophy } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts';
import { fmtCompact, fmtMetric } from '../mock/data';
import { useI18n, useFormatters } from '../lib/i18n';
import { usePageTitle } from '../lib/usePageTitle';
import { useSession, scopeCampaigns } from '../lib/session';
import { CHART_COLORS, useAxisStyle } from '../lib/chart';
import { buildOverviewSummary, type TrendMetric } from '../lib/overview';
import { DIMENSIONS, LOW_SAMPLE, type BenchmarkGroup, type Dimension } from '../lib/benchmarks';
import type { Campaign } from '../mock/types';
import { useCampaigns } from '../hooks/useCampaigns';
import { useBenchmarks } from '../hooks/useBenchmarks';
import { Button, Card, EmptyState, ErrorState, LoadingState, Pill, SectionTitle } from '../components/primitives';
import { Select, SelectContent, SelectItem, SelectTrigger } from '../components/ui/select';

const TREND_METRICS: TrendMetric[] = ['impressions', 'ctr', 'viewability'];

/** A client sees no cross-tenant benchmarks, so "top performer" here is
 *  ranked within their own campaigns instead of a portfolio-wide group. */
function topCampaignByCtr(campaigns: Campaign[]): Campaign | null {
  const withCtr = campaigns.filter((c) => c.sources[c.primarySource]?.totals.ctr != null);
  if (withCtr.length === 0) return null;
  return withCtr.reduce((best, c) =>
    c.sources[c.primarySource]!.totals.ctr! > best.sources[best.primarySource]!.totals.ctr! ? c : best
  );
}

/** Best-performing group per dimension, ranked by CTR — the same headline
 *  metric Benchmarks defaults to. A group whose sources never measure CTR
 *  (adserver-only) can't be "top" by a metric it has no data for. */
function topByCtr(groups: BenchmarkGroup[]): BenchmarkGroup | null {
  const withCtr = groups.filter((g) => g.stats.ctr !== null);
  if (withCtr.length === 0) return null;
  return withCtr.reduce((best, g) => (g.stats.ctr!.avg > best.stats.ctr!.avg ? g : best));
}

/**
 * The portfolio-snapshot landing page — KPI tiles plus a trend chart, the one
 * thing the Benchmarks page (industry/client/market breakdowns) doesn't cover.
 * Tenant-scoped like Campaigns, so a company_user sees their own numbers here
 * rather than the whole portfolio's.
 */
export default function OverviewView() {
  const { t } = useI18n();
  usePageTitle(t('overview.title'));
  const { role, companyId, isInternal } = useSession();
  const { data: allCampaigns, isLoading, isError, refetch } = useCampaigns();
  const [metric, setMetric] = useState<TrendMetric>('impressions');

  const scoped = useMemo(
    () => (allCampaigns ? scopeCampaigns(allCampaigns, role, companyId) : []),
    [allCampaigns, role, companyId]
  );
  const summary = useMemo(() => buildOverviewSummary(scoped, new Date()), [scoped]);

  // Benchmarks are a cross-tenant construct — never scoped to one company —
  // so these only fetch for isInternal, mirroring the route gate on
  // /benchmarks itself rather than just hiding the cards after the fact.
  const industryQ = useBenchmarks('industry', isInternal);
  const clientQ = useBenchmarks('client', isInternal);
  const marketQ = useBenchmarks('market', isInternal);
  const topQueries: Record<Dimension, ReturnType<typeof useBenchmarks>> = {
    industry: industryQ,
    client: clientQ,
    market: marketQ,
  };

  if (isLoading) {
    return <LoadingState label={t('common.loading')} />;
  }

  if (isError) {
    return <ErrorState label={t('common.loadError')} retryLabel={t('common.retry')} onRetry={() => refetch()} />;
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brame-dark dark:text-white">{t('overview.title')}</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
          {isInternal ? t('overview.subtitleAdmin') : t('overview.subtitleClient')}
        </p>
      </div>

      {summary.campaignCount === 0 ? (
        <EmptyState
          icon={<LayoutDashboard size={32} />}
          title={t('overview.empty.title')}
          body={t('overview.empty.body')}
        />
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-5">
            <SummaryTile label={t('overview.tile.campaigns')} value={String(summary.campaignCount)} />
            <SummaryTile label={t('overview.tile.live')} value={String(summary.liveCount)} />
            <SummaryTile label={t('overview.tile.impressions')} value={fmtCompact(summary.liveImpressions)} />
            <SummaryTile
              label={t('overview.tile.avgCtr')}
              value={summary.avgCtr != null ? fmtMetric('ctr', summary.avgCtr) : '—'}
            />
            <SummaryTile
              label={t('overview.tile.avgViewability')}
              value={summary.avgViewability != null ? fmtMetric('viewability', summary.avgViewability) : '—'}
            />
          </div>

          {isInternal && (
            <div className="mb-5">
              <div className="mb-2">
                <h2 className="text-base font-semibold text-brame-dark dark:text-white">{t('overview.topTitle')}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('overview.topHint')}</p>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {DIMENSIONS.map((d) => (
                  <TopGroupCard key={d} dimension={d} query={topQueries[d]} />
                ))}
              </div>
            </div>
          )}

          {!isInternal && (
            <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <BestCampaignCard campaigns={scoped} avgCtr={summary.avgCtr} />
              <LiveCampaignsCard campaigns={scoped} />
            </div>
          )}

          <Card className="mb-5">
            <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
              <SectionTitle hint={t('overview.trendHint')}>{t('overview.trendTitle')}</SectionTitle>
              <div className="w-40">
                <Select value={metric} onValueChange={(v) => setMetric(v as TrendMetric)}>
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
              <p className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                {t('overview.trendEmpty')}
              </p>
            ) : (
              <TrendChart daily={summary.daily} metric={metric} />
            )}
          </Card>

          {isInternal && (
            <Card className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="font-semibold text-brame-dark dark:text-white">{t('overview.benchmarksCta.title')}</div>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('overview.benchmarksCta.body')}</p>
              </div>
              <Link to="/benchmarks">
                <Button variant="primary" icon={<BarChart3 size={14} />}>
                  {t('overview.benchmarksCta.action')}
                </Button>
              </Link>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

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

function TopGroupCard({
  dimension,
  query,
}: {
  dimension: Dimension;
  query: ReturnType<typeof useBenchmarks>;
}) {
  const { t } = useI18n();
  const { data, isLoading, isError, refetch } = query;
  const top = data ? topByCtr(data.groups) : null;
  const overallCtr = data?.overall.ctr?.avg ?? null;

  let body: ReactNode;
  if (isLoading) {
    body = <LoadingState label={t('common.loading')} compact />;
  } else if (isError || !data) {
    body = (
      <ErrorState label={t('common.loadError')} retryLabel={t('common.retry')} onRetry={() => refetch()} compact />
    );
  } else if (!top) {
    body = <p className="text-sm text-gray-500 dark:text-gray-400">{t('overview.topNone')}</p>;
  } else {
    body = (
      <>
        <div className="flex items-start justify-between gap-2">
          <div className="text-lg font-bold text-brame-dark dark:text-white">{top.displayName}</div>
          {top.lowSample && (
            <Pill tone="amber" title={t('benchmarks.lowSampleHint', { n: LOW_SAMPLE })}>
              {t('benchmarks.lowSample')}
            </Pill>
          )}
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="tnum text-2xl font-bold text-brame-teal dark:text-brame-turquoise-light">
            {fmtMetric('ctr', top.stats.ctr!.avg)}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">{t('metric.ctr.label')}</span>
        </div>
        {overallCtr != null && (
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t('overview.vsPortfolio', { value: fmtMetric('ctr', overallCtr) })}
          </div>
        )}
      </>
    );
  }

  const content = (
    <Card className="h-full transition-colors hover:border-brame-teal/40 dark:hover:border-brame-turquoise/40">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {t('overview.topOf', { dimension: t(`benchmarks.dimension.${dimension}`) })}
      </div>
      {body}
    </Card>
  );

  return top ? (
    <Link to={`/benchmarks/${dimension}/${encodeURIComponent(top.key)}`} className="block h-full">
      {content}
    </Link>
  ) : (
    content
  );
}

/** Client-side counterpart to TopGroupCard — same "best by CTR" framing, but
 *  ranked within the client's own campaigns since they have no cross-tenant
 *  benchmarks to compare against. */
function BestCampaignCard({ campaigns, avgCtr }: { campaigns: Campaign[]; avgCtr: number | null }) {
  const { t } = useI18n();
  const top = useMemo(() => topCampaignByCtr(campaigns), [campaigns]);

  return (
    <Card className="h-full">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        <Trophy size={12} />
        {t('overview.yourBestTitle')}
      </div>
      {!top ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('overview.topNone')}</p>
      ) : (
        <Link to={`/campaigns/${top.id}`} className="block">
          <div className="text-lg font-bold text-brame-dark hover:text-brame-teal dark:text-white dark:hover:text-brame-turquoise-light">
            {top.name}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="tnum text-2xl font-bold text-brame-teal dark:text-brame-turquoise-light">
              {fmtMetric('ctr', top.sources[top.primarySource]!.totals.ctr!)}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">{t('metric.ctr.label')}</span>
          </div>
          {avgCtr != null && (
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t('overview.vsYourAverage', { value: fmtMetric('ctr', avgCtr) })}
            </div>
          )}
        </Link>
      )}
    </Card>
  );
}

/** A few live campaigns with delivery pacing — the "is anything at risk right
 *  now" glance a client's own Campaigns table would otherwise require a click
 *  to get to. */
function LiveCampaignsCard({ campaigns }: { campaigns: Campaign[] }) {
  const { t } = useI18n();
  const live = useMemo(() => campaigns.filter((c) => c.status === 'live').slice(0, 3), [campaigns]);

  return (
    <Card className="h-full">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        <Radio size={12} />
        {t('overview.liveCampaignsTitle')}
      </div>
      {live.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('overview.noLiveCampaigns')}</p>
      ) : (
        <div className="space-y-3">
          {live.map((c) => (
            <LiveCampaignRow key={c.id} campaign={c} />
          ))}
        </div>
      )}
      <Link
        to="/campaigns"
        className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brame-teal hover:underline dark:text-brame-turquoise-light"
      >
        {t('overview.viewAllCampaigns')}
        <ArrowRight size={11} />
      </Link>
    </Card>
  );
}

function LiveCampaignRow({ campaign }: { campaign: Campaign }) {
  const series = campaign.sources[campaign.primarySource];
  const pacing = series ? (series.totals.impressions ?? 0) / campaign.salesforce.bookedImpressions : null;

  return (
    <Link to={`/campaigns/${campaign.id}`} className="block">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium text-brame-dark dark:text-gray-100">{campaign.name}</span>
        {pacing != null && (
          <span className="tnum flex-shrink-0 text-xs text-gray-500 dark:text-gray-400">
            {fmtMetric('impressions', series!.totals.impressions ?? 0)}
          </span>
        )}
      </div>
      {pacing != null && (
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
          <div
            className={`h-full rounded-full ${pacing >= 0.95 ? 'bg-green-500' : pacing >= 0.6 ? 'bg-brame-teal' : 'bg-amber-400'}`}
            style={{ width: `${Math.min(pacing * 100, 100)}%` }}
          />
        </div>
      )}
    </Link>
  );
}

function TrendChart({
  daily,
  metric,
}: {
  daily: { date: string; impressions: number; ctr: number | null; viewability: number | null }[];
  metric: TrendMetric;
}) {
  const { t } = useI18n();
  const { fmtDate, fmtDateLong } = useFormatters();
  const { axis, grid, tooltipStyle } = useAxisStyle();
  const isPercent = metric !== 'impressions';

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={daily}>
          <defs>
            <linearGradient id="gTrend" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.teal} stopOpacity={0.28} />
              <stop offset="100%" stopColor={CHART_COLORS.teal} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
          <XAxis dataKey="date" tickFormatter={fmtDate} tick={axis} tickLine={false} />
          <YAxis
            tickFormatter={isPercent ? (v: number) => `${(v * 100).toFixed(1)}%` : fmtCompact}
            tick={axis}
            tickLine={false}
            axisLine={false}
          />
          <RTooltip
            formatter={(v: unknown) => [typeof v === 'number' ? fmtMetric(metric, v) : '—', t(`metric.${metric}.label`)]}
            labelFormatter={(l) => fmtDateLong(String(l))}
            contentStyle={tooltipStyle}
          />
          <Area
            type="monotone"
            dataKey={metric}
            name={t(`metric.${metric}.label`)}
            stroke={CHART_COLORS.teal}
            strokeWidth={2}
            fill="url(#gTrend)"
            connectNulls={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
