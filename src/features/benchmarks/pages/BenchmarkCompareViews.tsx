import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import { STORAGE_KEYS } from '@/config/storageKeys';
import { usePersistentState } from '@/hooks/usePersistentState';
import { useI18n } from '@/i18n';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Tabs } from '@/components/ui';
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
import {
  findSubject,
  parseSubjectKind,
  SUBJECT_KINDS,
  subjectsOf,
  type SubjectKind,
} from '../lib/compareSubject';
import {
  defaultCharts,
  defaultColumns,
  defaultState,
  sanitizeState,
  type CompareState,
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

/** The URL param each kind keeps its pick in. `campaign` is the original one,
 *  so older links still open the same comparison. */
const PICK_PARAM: Record<SubjectKind, string> = {
  campaign: 'campaign',
  client: 'client',
  industry: 'industry',
};

function CompareBody() {
  const { t } = useI18n();
  const { data: pool, isLoading, isError, refetch } = useBenchmarkPool();
  const [params, setParams] = useSearchParams();
  const [state, setState] = usePersistentState<CompareState>(
    STORAGE_KEYS.benchmarkCompare,
    defaultState,
    { parse: (raw) => sanitizeState(JSON.parse(raw)), serialize: (v) => JSON.stringify(v) },
  );

  const kind = parseSubjectKind(params.get('kind'));

  const options = useMemo(
    () =>
      subjectsOf(pool ?? [], kind)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((x) => ({
          value: x.id,
          label: x.name,
          description:
            kind === 'campaign'
              ? `${x.subtitle} · ${x.campaigns[0].market}`
              : `${x.subtitle ? `${x.subtitle} · ` : ''}${t('cmp.matrix.sampleValue', { n: x.campaigns.length })}`,
        })),
    [pool, kind, t],
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

  // What is compared lives in the URL, so a link opens the same comparison.
  // Without a (valid) pick, the first sensible one of that kind is shown.
  const wanted = params.get(PICK_PARAM[kind]);
  const fallback = () => {
    if (kind === 'campaign') {
      const c = defaultCampaign(pool);
      return c ? findSubject(pool, 'campaign', c.id) : null;
    }
    // The biggest client / industry, so the first view has a real sample.
    const biggest = subjectsOf(pool, kind).sort(
      (a, b) => b.campaigns.length - a.campaigns.length,
    )[0];
    return biggest ?? null;
  };
  const subject = findSubject(pool, kind, wanted) ?? fallback();
  const pick = (id: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set(PICK_PARAM[kind], id);
        return next;
      },
      { replace: true },
    );
  const switchKind = (next: SubjectKind) =>
    setParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (next === 'campaign') params.delete('kind');
        else params.set('kind', next);
        return params;
      },
      { replace: true },
    );

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
        <CampaignAutocomplete
          // A fresh field per kind, so a half-typed search doesn't carry over.
          key={kind}
          value={subject?.id ?? null}
          onChange={pick}
          options={options}
          label={t(`cmp.subject.${kind}`)}
          placeholder={t(`cmp.subject.placeholder.${kind}`)}
          noneLabel={t(`cmp.subject.none.${kind}`)}
        />
        <div className="ml-auto">
          <ViewsMenu
            views={state.views}
            onLoad={(v) => setState((s) => ({ ...s, columns: v.columns, charts: v.charts }))}
            onSave={(name) =>
              setState((s) => ({
                ...s,
                views: [
                  ...s.views,
                  {
                    id: `v-${Date.now().toString(36)}`,
                    name,
                    columns: s.columns,
                    charts: s.charts,
                  },
                ],
              }))
            }
            onDelete={(id) =>
              setState((s) => ({ ...s, views: s.views.filter((v) => v.id !== id) }))
            }
            onReset={() =>
              setState((s) => ({ ...s, columns: defaultColumns(), charts: defaultCharts() }))
            }
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
