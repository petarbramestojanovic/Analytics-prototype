import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Cable,
  ChevronRight,
  Monitor,
  MousePointerClick,
  Pencil,
  Settings2,
  Timer,
  TriangleAlert,
  Unplug,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fmtCompact, fmtInt, fmtMetric, fmtPct, sourceMeta } from '../mock/data';
import type { Campaign, MetricKey, SourceKey } from '../mock/types';
import { useI18n, useFormatters } from '../lib/i18n';
import { usePageTitle } from '../lib/usePageTitle';
import { useSession } from '../lib/session';
import { useAlertThresholds } from '../lib/alertSettings';
import { compareSources } from '../lib/divergence';
import { useCampaign } from '../hooks/useCampaigns';
import SourceSwitcher, { FreshnessBar, type SourceTab } from '../components/SourceSwitcher';
import EditCampaignModal from '../components/EditCampaignModal';
import { tooltipInt, tooltipIntOnly, useAxisStyle } from '../lib/chart';
import MetricTile from '../components/MetricTile';
import { Button, Card, EmptyState, LoadingState, Pill, SectionTitle, TableScroll, Td, Th } from '../components/primitives';

export default function CampaignDetailView() {
  const { id } = useParams<{ id: string }>();
  const { companyId, isInternal } = useSession();
  const { data: fetched, isLoading } = useCampaign(id);
  const { t } = useI18n();
  const [tab, setTab] = useState<SourceTab | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [editing, setEditing] = useState(false);

  // A client hitting another company's campaign URL directly must see exactly
  // what a real RLS policy would produce: the row does not exist for them.
  // Not an access-denied message — that would itself leak that the campaign
  // exists.
  const inScope = !fetched || isInternal || fetched.companyId === companyId;
  const campaign = inScope ? fetched : undefined;
  usePageTitle(campaign?.name);

  // Default the source tab to whatever is currently primary, but only once —
  // otherwise saving a primarySource edit while on this tab would yank the
  // view out from under a mid-review account manager.
  const activeTab = tab ?? campaign?.primarySource ?? 'atk';

  if (isLoading) {
    return <LoadingState label={t('common.loading')} />;
  }

  if (!campaign) {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <EmptyState
          icon={<TriangleAlert size={32} />}
          title={t('detail.notFoundTitle')}
          body={t('detail.notFoundBody')}
          action={
            <Link to="/campaigns">
              <Button variant="primary" icon={<ArrowLeft size={14} />}>
                {t('detail.backToCampaigns')}
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const onSyncNow = () => {
    setSyncing(true);
    window.setTimeout(() => setSyncing(false), 1600);
  };

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <Header campaign={campaign} onEdit={() => setEditing(true)} />

      <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-brame-dark-light dark:shadow-none">
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              {t('detail.measurementSourceTitle')}
            </div>
            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
              {t('detail.measurementSourceBody')}
            </p>
          </div>
        </div>
        <SourceSwitcher campaign={campaign} active={activeTab} onChange={setTab} />
        <div className="mt-3">
          {activeTab !== 'compare' && (
            <FreshnessBar campaign={campaign} source={activeTab} onSyncNow={onSyncNow} syncing={syncing} />
          )}
          {activeTab === 'compare' && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('detail.compareBody')}</p>
          )}
        </div>
      </div>

      {activeTab === 'compare' ? (
        <CompareView campaign={campaign} />
      ) : (
        <SourceView campaign={campaign} source={activeTab} onSwitchSource={setTab} />
      )}

      <EditCampaignModal campaign={campaign} open={editing} onOpenChange={setEditing} />
    </div>
  );
}

// ---------------------------------------------------------------------------

function Header({ campaign, onEdit }: { campaign: Campaign; onEdit: () => void }) {
  const { t } = useI18n();
  const { fmtDateLong } = useFormatters();
  const { role } = useSession();
  const series = campaign.sources[campaign.primarySource];
  const pacing = series ? (series.totals.impressions ?? 0) / campaign.salesforce.bookedImpressions : null;

  return (
    <div className="mb-5">
      <Link
        to="/campaigns"
        className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brame-teal dark:text-gray-400 dark:hover:text-brame-turquoise-light"
      >
        <ArrowLeft size={14} />
        {t('detail.back')}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-brame-dark dark:text-white">{campaign.name}</h1>
            <Pill tone={campaign.status === 'live' ? 'green' : 'neutral'}>{t(`status.${campaign.status}`)}</Pill>
            {campaign.status === 'archived' && <Pill tone="amber">{t('detail.archivedBadge')}</Pill>}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
            <span className="font-medium text-brame-dark dark:text-gray-200">{campaign.companyName}</span>
            <span>·</span>
            <span>
              {fmtDateLong(campaign.flightStart)} – {fmtDateLong(campaign.flightEnd)}
            </span>
            <span>·</span>
            <span>{campaign.salesforce.productLine}</span>
            <span>·</span>
            <span>{campaign.salesforce.market}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {pacing != null && (
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 dark:border-white/10 dark:bg-brame-dark-light">
              <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {t('detail.deliveredOfBooked')}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="tnum text-lg font-bold text-brame-dark dark:text-white">{fmtPct(pacing, 0)}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {t('detail.booked', { value: fmtCompact(campaign.salesforce.bookedImpressions) })}
                </span>
              </div>
            </div>
          )}
          {/* Editing a campaign — including which source is primary — is a
              Brame-operational decision, not a client permission, regardless
              of that client's own Admin/Viewer role within their company. */}
          {role === 'brame_admin' && (
            <>
              <Button icon={<Pencil size={14} />} onClick={onEdit}>
                {t('common.edit')}
              </Button>
              <Link to={`/admin/setup?campaign=${campaign.id}`}>
                <Button icon={<Settings2 size={14} />}>{t('detail.setup')}</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// One source's own view — renders only what that platform measures.
// ---------------------------------------------------------------------------

function SourceView({
  campaign,
  source,
  onSwitchSource,
}: {
  campaign: Campaign;
  source: SourceKey;
  onSwitchSource: (s: SourceKey) => void;
}) {
  const { t } = useI18n();
  const { fmtDate, fmtDateLong } = useFormatters();
  const { axis, grid, tooltipStyle } = useAxisStyle();
  const { role } = useSession();
  const meta = sourceMeta(campaign, source);
  const series = campaign.sources[source];

  if (!series) {
    const reason =
      source === 'nexd'
        ? t('detail.noDataReasonNexd')
        : campaign.status === 'scheduled'
          ? t('detail.noDataReasonScheduled', { date: fmtDateLong(campaign.flightStart) })
          : t('detail.noDataReasonGeneric');

    return (
      <EmptyState
        icon={<Unplug size={32} />}
        title={t('detail.noDataTitle', { source: meta.fullLabel })}
        body={`${reason} ${t('detail.noDataSuffix')}`}
        action={
          role === 'brame_admin' ? (
            <Link to={`/admin/setup?campaign=${campaign.id}`}>
              <Button variant="primary" icon={<Settings2 size={14} />}>
                {t('detail.openSetup')}
              </Button>
            </Link>
          ) : undefined
        }
      />
    );
  }

  const measures = new Set(meta.measures);
  const has = (m: MetricKey) => measures.has(m);

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span>{t('detail.showingMetrics', { count: meta.measures.length, source: meta.fullLabel })}</span>
          {meta.measures.length < 10 && (
            <span className="text-gray-400 dark:text-gray-500">{t('detail.metricsNotTracked')}</span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {meta.measures.map((m) => (
            <MetricTile
              key={m}
              metric={m}
              value={series.totals[m]}
              emphasis={m === 'impressions'}
              footnote={
                m === 'uniqueUsers'
                  ? t('metric.footnote.uniqueUsers')
                  : m === 'avgDwell'
                    ? t('metric.footnote.avgDwell')
                    : undefined
              }
            />
          ))}
        </div>
      </div>

      <Card>
        <SectionTitle hint={t('detail.deliveryHint', { source: meta.fullLabel })}>
          {t('detail.deliveryTitle')}
        </SectionTitle>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series.daily}>
              <defs>
                <linearGradient id="gImp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#077070" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#077070" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gView" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#40b8b8" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#40b8b8" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
              <XAxis dataKey="date" tickFormatter={fmtDate} tick={axis} tickLine={false} />
              <YAxis tickFormatter={fmtCompact} tick={axis} tickLine={false} axisLine={false} />
              <RTooltip
                formatter={tooltipInt}
                labelFormatter={(l) => fmtDateLong(String(l))}
                contentStyle={tooltipStyle}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="impressions"
                name={t('detail.legendImpressions')}
                stroke="#077070"
                strokeWidth={2}
                fill="url(#gImp)"
              />
              <Area
                type="monotone"
                dataKey="viewable"
                name={t('detail.legendViewable')}
                stroke="#40b8b8"
                strokeWidth={2}
                fill="url(#gView)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Engagement detail exists only for platforms that measure inside the
          unit. The adserver stops at delivery. */}
      {has('engagementRate') ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card>
            <SectionTitle hint={t('detail.pageFlowHint')}>{t('detail.pageFlowTitle')}</SectionTitle>
            <div className="space-y-2.5">
              {campaign.pages.map((p, i) => {
                const share = p.views / campaign.pages[0].views;
                return (
                  <div key={p.page}>
                    <div className="mb-1 flex items-baseline justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="tnum w-4 text-xs text-gray-400 dark:text-gray-500">{i + 1}</span>
                        <span className="font-medium text-brame-dark dark:text-gray-100">{p.label}</span>
                        <span className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                          <Timer size={11} />
                          {p.avgDwell}s
                        </span>
                      </span>
                      <span className="tnum text-gray-500 dark:text-gray-400">
                        {fmtInt(p.views)}
                        <span className="ml-1.5 text-xs text-gray-400 dark:text-gray-500">{fmtPct(share, 0)}</span>
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                      <div
                        className="h-full rounded-full bg-brame-teal transition-all"
                        style={{ width: `${share * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <SectionTitle hint={t('detail.ctaHint')}>{t('detail.ctaTitle')}</SectionTitle>
            <TableScroll>
              <table className="w-full">
                <thead>
                  <tr>
                    <Th>{t('detail.col.cta')}</Th>
                    <Th align="right">{t('detail.col.clicks')}</Th>
                    <Th align="right">{t('detail.col.unique')}</Th>
                    <Th align="right">{t('detail.col.ctr')}</Th>
                  </tr>
                </thead>
                <tbody>
                  {campaign.ctas.map((c) => (
                    <tr key={c.id}>
                      <Td>
                        <div className="flex items-center gap-1.5 font-medium text-brame-dark dark:text-gray-100">
                          <MousePointerClick size={12} className="text-brame-teal" />
                          {c.label}
                        </div>
                        <div className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{c.destination}</div>
                      </Td>
                      <Td align="right">{fmtInt(c.clicks)}</Td>
                      <Td align="right">{fmtInt(c.uniqueClicks)}</Td>
                      <Td align="right">{fmtPct(c.ctr, 2)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          </Card>
        </div>
      ) : (
        <Card className="border-dashed bg-gray-50/60 dark:border-white/15 dark:bg-white/5">
          <div className="flex items-start gap-3">
            <Cable size={18} className="mt-0.5 flex-shrink-0 text-gray-400 dark:text-gray-500" />
            <div>
              <h3 className="text-sm font-semibold text-brame-dark dark:text-gray-100">
                {t('detail.noInUnitTitle', { source: meta.fullLabel })}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('detail.noInUnitBody')}</p>
              {campaign.sources.custom && (
                <div className="mt-3">
                  <Button
                    variant="primary"
                    icon={<ArrowRight size={13} />}
                    onClick={() => onSwitchSource('custom')}
                  >
                    {t('detail.switchToBrame')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <SectionTitle hint={t('detail.devicesHint')}>{t('detail.devicesTitle')}</SectionTitle>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={campaign.devices} layout="vertical" barSize={22}>
                <CartesianGrid strokeDasharray="3 3" stroke={grid} horizontal={false} />
                <XAxis type="number" tickFormatter={fmtCompact} tick={axis} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="device" tick={axis} tickLine={false} axisLine={false} width={60} />
                <RTooltip formatter={tooltipIntOnly} contentStyle={tooltipStyle} />
                <Bar dataKey="impressions" name={t('detail.legendImpressions')} fill="#077070" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-1">
            {campaign.devices.map((d) => (
              <div key={d.device} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                  <Monitor size={11} />
                  {d.device}
                </span>
                <span className="tnum text-gray-500 dark:text-gray-400">
                  {fmtPct(d.viewability)} {t('detail.viewableSuffix')}
                  {has('engagementRate') && ` · ${fmtPct(d.engagementRate)} ${t('detail.engagedSuffix')}`}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle hint={t('detail.creativesHint')}>{t('detail.creativesTitle')}</SectionTitle>
          <TableScroll>
            <table className="w-full">
              <thead>
                <tr>
                  <Th>{t('detail.col.creative')}</Th>
                  <Th align="right">{t('detail.col.impr')}</Th>
                  {has('engagementRate') && <Th align="right">{t('detail.col.eng')}</Th>}
                  {has('avgDwell') && <Th align="right">{t('detail.col.dwell')}</Th>}
                </tr>
              </thead>
              <tbody>
                {campaign.creatives.map((cr) => (
                  <tr key={cr.id}>
                    <Td>
                      <div className="font-medium text-brame-dark dark:text-gray-100">{cr.format}</div>
                      <div className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{cr.name}</div>
                    </Td>
                    <Td align="right">{fmtCompact(cr.impressions)}</Td>
                    {has('engagementRate') && <Td align="right">{fmtPct(cr.engagementRate)}</Td>}
                    {has('avgDwell') && <Td align="right">{cr.avgDwell}s</Td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        </Card>
      </div>

      {/* UTM attribution only exists where our own tags are on the click. */}
      {source === 'custom' && (
        <Card>
          <SectionTitle hint={t('detail.attributionHint')}>{t('detail.attributionTitle')}</SectionTitle>
          <TableScroll>
            <table className="w-full">
              <thead>
                <tr>
                  <Th>{t('detail.col.source')}</Th>
                  <Th>{t('detail.col.medium')}</Th>
                  <Th>{t('detail.col.campaignTag')}</Th>
                  <Th align="right">{t('detail.col.sessions')}</Th>
                  <Th align="right">{t('detail.col.ctaClicks')}</Th>
                  <Th align="right">{t('detail.col.convToClick')}</Th>
                </tr>
              </thead>
              <tbody>
                {campaign.utm.map((u) => (
                  <tr key={`${u.source}-${u.medium}`}>
                    <Td className="font-medium">{u.source}</Td>
                    <Td>{u.medium}</Td>
                    <Td>
                      <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-white/10">{u.campaign}</code>
                    </Td>
                    <Td align="right">{fmtInt(u.sessions)}</Td>
                    <Td align="right">{fmtInt(u.ctaClicks)}</Td>
                    <Td align="right">{fmtPct(u.ctaClicks / u.sessions)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compare — "our count vs the adserver's count", the question account managers
// field today. Two sources side by side, never summed.
// ---------------------------------------------------------------------------

function CompareView({ campaign }: { campaign: Campaign }) {
  const { t } = useI18n();
  const { fmtDate, fmtDateLong } = useFormatters();
  const { axis, grid, tooltipStyle } = useAxisStyle();
  const thresholds = useAlertThresholds();
  const available = (['atk', 'nexd', 'custom'] as SourceKey[]).filter((s) => campaign.sources[s]);
  const [left, setLeft] = useState<SourceKey>(campaign.primarySource);
  // Default to "our count vs the adserver's count" — the question the RFC says
  // account managers field today. Fall back to any other reporting source.
  const [right, setRight] = useState<SourceKey>(
    (campaign.primarySource !== 'custom' && campaign.sources.custom ? 'custom' : undefined) ??
      available.find((s) => s !== campaign.primarySource) ??
      available[0]
  );

  // Hooks must run unconditionally, so the daily-overlay computation sits
  // above the "fewer than two sources" bail-out below rather than after it.
  const lSeries = campaign.sources[left];
  const rSeries = campaign.sources[right];
  const dailyOverlay = useMemo(() => {
    if (!lSeries || !rSeries) return [];
    const byDate = new Map<string, { date: string; left?: number; right?: number }>();
    for (const d of lSeries.daily) byDate.set(d.date, { date: d.date, left: d.impressions });
    for (const d of rSeries.daily) {
      const row = byDate.get(d.date) ?? { date: d.date };
      row.right = d.impressions;
      byDate.set(d.date, row);
    }
    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [lSeries, rSeries]);

  if (available.length < 2) {
    return (
      <EmptyState
        icon={<Unplug size={32} />}
        title={t('detail.compareNothingTitle')}
        body={t('detail.compareNothingBody')}
      />
    );
  }

  const lMeta = sourceMeta(campaign, left);
  const rMeta = sourceMeta(campaign, right);

  // Only metrics both platforms actually measure can be compared. Everything
  // else would be a comparison against absence. Tone/read here come from the
  // same thresholds (and the same function) the portfolio-wide Alerts page
  // uses, so a campaign never reads "in line" in one place and "investigate"
  // in the other.
  const divergenceRows = compareSources(campaign, left, right, thresholds);

  const cadenceGap = lMeta.cadence !== rMeta.cadence;

  return (
    <div className="space-y-5">
      <Card>
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <Picker label={t('detail.baseline')} value={left} onChange={setLeft} options={available} campaign={campaign} />
          <div className="pb-2 text-gray-300 dark:text-gray-600">{t('detail.vs')}</div>
          <Picker
            label={t('detail.checkAgainst')}
            value={right}
            onChange={setRight}
            options={available}
            campaign={campaign}
          />
        </div>

        {left === right ? (
          <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
            {t('detail.pickTwoDifferent')}
          </p>
        ) : (
          <>
            {cadenceGap && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                <TriangleAlert size={14} className="mt-0.5 flex-shrink-0" />
                <span>
                  {t('detail.cadenceGapWarning', {
                    a: lMeta.cadence === 'live' ? lMeta.label : rMeta.label,
                    b: lMeta.cadence === 'nightly' ? lMeta.label : rMeta.label,
                  })}
                </span>
              </div>
            )}

            <TableScroll>
              <table className="w-full">
                <thead>
                  <tr>
                    <Th>{t('detail.col.metric')}</Th>
                    <Th align="right">{lMeta.label}</Th>
                    <Th align="right">{rMeta.label}</Th>
                    <Th align="right">{t('detail.col.difference')}</Th>
                    <Th>{t('detail.col.read')}</Th>
                  </tr>
                </thead>
                <tbody>
                  {divergenceRows.map((row) => (
                    <tr key={row.metric}>
                      <Td className="font-medium">{t(`metric.${row.metric}.label`)}</Td>
                      <Td align="right">{fmtMetric(row.metric, row.baselineValue)}</Td>
                      <Td align="right">{fmtMetric(row.metric, row.checkValue)}</Td>
                      <Td align="right">
                        <span
                          className={
                            row.read === 'inLine'
                              ? 'text-gray-500 dark:text-gray-400'
                              : row.read === 'watch'
                                ? 'text-amber-700 dark:text-amber-300'
                                : 'text-red-600 dark:text-red-400'
                          }
                        >
                          {row.delta > 0 ? '+' : ''}
                          {fmtPct(row.delta, 1)}
                        </span>
                      </Td>
                      <Td>
                        <Pill tone={row.tone}>{t(`detail.read.${row.read}`)}</Pill>
                      </Td>
                    </tr>
                  ))}
                  {divergenceRows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                        {t('detail.noSharedMetrics', { a: lMeta.label, b: rMeta.label })}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TableScroll>

            <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
              {t('detail.sharedMetricsFootnote', { count: divergenceRows.length })}
            </p>
          </>
        )}
      </Card>

      {left !== right && (
        <Card>
          <SectionTitle hint={t('detail.dailyOverlayHint')}>{t('detail.dailyOverlayTitle')}</SectionTitle>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyOverlay}>
                <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
                <XAxis dataKey="date" tickFormatter={fmtDate} tick={axis} tickLine={false} />
                <YAxis tickFormatter={fmtCompact} tick={axis} tickLine={false} axisLine={false} />
                <RTooltip
                  formatter={tooltipInt}
                  labelFormatter={(l) => fmtDateLong(String(l))}
                  contentStyle={tooltipStyle}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="left" name={lMeta.label} stroke="#077070" strokeWidth={2} dot={false} />
                <Line
                  type="monotone"
                  dataKey="right"
                  name={rMeta.label}
                  stroke="#6b5b95"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">{t('detail.dailyOverlayFootnote')}</p>
        </Card>
      )}
    </div>
  );
}

function Picker({
  label,
  value,
  onChange,
  options,
  campaign,
}: {
  label: string;
  value: SourceKey;
  onChange: (s: SourceKey) => void;
  options: SourceKey[];
  campaign: Campaign;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as SourceKey)}
          className="appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-9 text-sm font-medium text-brame-dark outline-none focus:border-brame-teal dark:border-white/15 dark:bg-brame-dark-light dark:text-gray-100"
        >
          {options.map((s) => (
            <option key={s} value={s}>
              {sourceMeta(campaign, s).fullLabel}
            </option>
          ))}
        </select>
        <ChevronRight
          size={14}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-gray-400"
        />
      </div>
    </label>
  );
}
