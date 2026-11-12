import { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import { STORAGE_KEYS } from '@/config/storageKeys';
import { usePersistentState } from '@/hooks/usePersistentState';
import { useListFilters } from '@/hooks/useListFilters';
import { ALL, parseSelection, serializeSelection } from '@/lib/selection';
import { useI18n } from '@/i18n';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Tabs } from '@/components/ui';
import { FilterMultiSelect } from '@/components/page';
import { EmptyState, ErrorState, PageSkeleton } from '@/components/feedback';
import { Page, PageHeader } from '@/components/page';
import { useBenchmarkCreatives, useBenchmarkPool } from '@/api/hooks/useBenchmarks';
import { BenchmarkViewTabs } from '../components/BenchmarkViewTabs';
import { CampaignAutocomplete } from '../components/CampaignAutocomplete';
import { CompareCharts } from '../components/CompareCharts';
import { CompareMatrix } from '../components/CompareMatrix';
import { CrossMarket } from '../components/CrossMarket';
import { ViewsMenu } from '../components/ViewsMenu';
import { MechanicsView } from '../components/MechanicsView';
import type { BenchmarkCampaign } from '@/types';
import type { BenchmarkView } from '../lib/benchmarkView';
import { SLICE_DIMS, sliceKey, sliceLabel, type SliceDim, type SlicePart } from '../lib/benchmarks';
import { bucketName } from '../lib/compareLabels';
import {
  campaignSubjects,
  campaignsWhere,
  findCampaign,
  findSegment,
  parseSubjectKind,
  SUBJECT_KINDS,
  type SubjectKind,
} from '../lib/compareSubject';
import {
  defaultCharts,
  defaultColumns,
  DEFAULT_SUBJECT,
  defaultState,
  sanitizeState,
  type CompareState,
  type SubjectState,
} from '../lib/compareViews';

type PoolView = Extract<BenchmarkView, 'compare' | 'mechanics'>;

/** The Compare and Mechanics views of the Benchmarks page — both Klea-internal
 *  (the route already is). Each reads only what it needs: the campaign pool for
 *  the matrix, the creatives (size + mechanic) for the mechanics. */
export function BenchmarkPoolView({ view }: { view: PoolView }) {
  const { t } = useI18n();
  usePageTitle(t('benchmarks.title'));

  return (
    <Page>
      <PageHeader title={t('benchmarks.title')} subtitle={t(`benchmarks.subtitle.${view}`)} />
      <BenchmarkViewTabs view={view} />
      {view === 'compare' ? <CompareBody /> : <MechanicsBody />}
    </Page>
  );
}

/** The newest campaign that has every metric measured, so the first view is a
 *  full one rather than a row of dashes. */
const defaultCampaign = (pool: BenchmarkCampaign[]) => {
  const newest = [...pool].sort((a, b) => b.flightStart.localeCompare(a.flightStart));
  return (
    newest.find((c) => c.ctr !== null && c.viewability !== null && c.engagementRate !== null) ??
    newest[0] ??
    null
  );
};

/** What is being compared — kept in the URL (a link opens the same comparison)
 *  and in localStorage (leaving the page or reloading brings it back). A
 *  segment's cuts use the cut's own name as the key, so `market=DE,AT` is Germany
 *  and Austria together; `all` = no narrowing, as on the Campaigns list. */
const SUBJECT_DEFAULTS = { ...DEFAULT_SUBJECT, kind: 'campaign' as string };
// `client` and `industry` are what links from before segments carry.
const SUBJECT_ALLOWED = { kind: ['campaign', 'segment', 'client', 'industry'] };

function CompareBody() {
  const { t } = useI18n();
  const { data: pool, isLoading, isError, refetch } = useBenchmarkPool();
  const { filters, setFilter } = useListFilters(
    STORAGE_KEYS.benchmarkSubject,
    SUBJECT_DEFAULTS,
    SUBJECT_ALLOWED,
  );
  const [state, setState] = usePersistentState<CompareState>(
    STORAGE_KEYS.benchmarkCompare,
    defaultState,
    { parse: (raw) => sanitizeState(JSON.parse(raw)), serialize: (v) => JSON.stringify(v) },
  );

  const kind = parseSubjectKind(filters.kind);
  const cuts: SlicePart[] = SLICE_DIMS.flatMap((dim) =>
    filters[dim] === ALL ? [] : [{ dim, value: filters[dim] }],
  );

  const campaignOptions = useMemo(
    () =>
      campaignSubjects(pool ?? [])
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((x) => ({
          value: x.id,
          label: x.name,
          description: `${x.subtitle} · ${x.campaigns[0].market}`,
        })),
    [pool],
  );

  if (isLoading) return <PageSkeleton variant="list" />;
  if (isError || !pool) return <ErrorState onRetry={() => refetch()} />;
  if (pool.length === 0) {
    return (
      <EmptyState
        icon={<BarChart3 size={32} />}
        title={t('benchmarks.empty.title')}
        body={t('benchmarks.empty.body')}
      />
    );
  }

  // Without a (valid) campaign, the newest complete one is shown.
  const subject =
    kind === 'campaign'
      ? (findCampaign(pool, filters.campaign) ??
        findCampaign(pool, defaultCampaign(pool)?.id ?? null))
      : findSegment(pool, cuts);

  // What a saved view remembers: the campaign actually on screen (even when it
  // is the default one), or the segment's cuts.
  const currentSubject: SubjectState = {
    kind,
    campaign: subject?.kind === 'campaign' ? subject.id : filters.campaign,
    industry: filters.industry,
    market: filters.market,
    client: filters.client,
    account: filters.account,
  };
  const pickCampaign = (id: string) => setFilter({ campaign: id });
  const setCut = (dim: SliceDim, values: string[]) =>
    setFilter({ [dim]: serializeSelection(values) });
  const switchKind = (to: SubjectKind) => {
    // A first visit to Segment starts from the client with the most campaigns,
    // so there is a real sample to show; clear it to compare against all of KLEA.
    if (to === 'segment' && !cuts.length && filters.kind === 'campaign') {
      const counts = new Map<string, number>();
      for (const c of pool) counts.set(c.companyId, (counts.get(c.companyId) ?? 0) + 1);
      const [biggest] = [...counts].sort((a, b) => b[1] - a[1])[0] ?? [];
      setFilter({ kind: to, ...(biggest && { client: biggest }) });
      return;
    }
    setFilter({ kind: to });
  };

  /** Options for one cut: the values among campaigns that match the other cuts —
   *  so a combination is never a dead end — keeping the current pick. */
  const cutOptions = (dim: SliceDim) => {
    const others = cuts.filter((c) => c.dim !== dim);
    const labels = new Map<string, string | null>();
    for (const c of campaignsWhere(pool, others)) labels.set(sliceKey(c, dim), sliceLabel(c, dim));
    return [...labels]
      .map(([value, label]) => ({ value, label: bucketName(t, label) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  };

  return (
    <div>
      {/* Sticky, pinned just under the top bar: scrolling down through the matrix, charts and the cross-market
          view, the campaign they are all about stays in reach. */}
      <div className="sticky top-[var(--topbar-h,3.5rem)] z-10 -mx-4 mb-5 flex flex-wrap items-center gap-3 border-b border-gray-200 bg-brame-cream/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 dark:border-white/10 dark:bg-brame-dark/95">
        <Tabs
          onPage
          value={kind}
          onChange={switchKind}
          groupLabel={t('cmp.subject.label')}
          options={SUBJECT_KINDS.map((value) => ({ value, label: t(`cmp.subject.${value}`) }))}
        />
        {kind === 'campaign' ? (
          <CampaignAutocomplete
            value={subject?.id ?? null}
            onChange={pickCampaign}
            options={campaignOptions}
            label={t('cmp.subject.campaign')}
            placeholder={t('cmp.subject.placeholder.campaign')}
            noneLabel={t('cmp.subject.none.campaign')}
          />
        ) : (
          <>
            {SLICE_DIMS.map((dim) => (
              <FilterMultiSelect
                key={dim}
                className="w-48"
                values={parseSelection(filters[dim])}
                onChange={(v) => setCut(dim, v)}
                allLabel={t(`cmp.segment.any.${dim}`)}
                options={cutOptions(dim)}
              />
            ))}
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {subject
                ? t('cmp.matrix.sampleValue', { n: subject.campaigns.length })
                : t('cmp.segment.none')}
            </span>
          </>
        )}
        <div className="ml-auto">
          <ViewsMenu
            views={state.views}
            onLoad={(v) => {
              setState((s) => ({ ...s, columns: v.columns, charts: v.charts }));
              // The view is about something — bring that back too.
              if (v.subject) setFilter(v.subject);
            }}
            onSave={(name) =>
              setState((s) => ({
                ...s,
                views: [
                  ...s.views,
                  {
                    id: `v-${Date.now().toString(36)}`,
                    name,
                    subject: currentSubject,
                    columns: s.columns,
                    charts: s.charts,
                  },
                ],
              }))
            }
            onDelete={(id) =>
              setState((s) => ({ ...s, views: s.views.filter((v) => v.id !== id) }))
            }
            onReset={() => {
              setState((s) => ({ ...s, columns: defaultColumns(), charts: defaultCharts() }));
              setFilter(DEFAULT_SUBJECT);
            }}
          />
        </div>
      </div>
      <div className="space-y-5">
        <CompareMatrix
          pool={pool}
          subject={subject}
          columns={state.columns}
          onChange={(columns) => setState((s) => ({ ...s, columns }))}
        />
        <CompareCharts
          pool={pool}
          subject={subject}
          charts={state.charts}
          onChange={(charts) => setState((s) => ({ ...s, charts }))}
        />
        <CrossMarket pool={pool} />
      </div>
    </div>
  );
}

function MechanicsBody() {
  const { t } = useI18n();
  const { data: creatives, isLoading, isError, refetch } = useBenchmarkCreatives();
  if (isLoading) return <PageSkeleton variant="list" />;
  if (isError || !creatives) return <ErrorState onRetry={() => refetch()} />;
  if (creatives.length === 0) {
    return (
      <EmptyState
        icon={<BarChart3 size={32} />}
        title={t('benchmarks.empty.title')}
        body={t('benchmarks.empty.body')}
      />
    );
  }
  return <MechanicsView creatives={creatives} />;
}
