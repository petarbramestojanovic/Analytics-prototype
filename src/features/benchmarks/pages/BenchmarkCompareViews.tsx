import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import { STORAGE_KEYS } from '@/config/storageKeys';
import { usePersistentState } from '@/hooks/usePersistentState';
import { useI18n } from '@/i18n';
import { usePageTitle } from '@/hooks/usePageTitle';
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

function CompareBody() {
  const { t } = useI18n();
  const { data: pool, isLoading, isError, refetch } = useBenchmarkPool();
  const [params, setParams] = useSearchParams();
  const [state, setState] = usePersistentState<CompareState>(
    STORAGE_KEYS.benchmarkCompare,
    defaultState,
    { parse: (raw) => sanitizeState(JSON.parse(raw)), serialize: (v) => JSON.stringify(v) },
  );

  const options = useMemo(
    () =>
      [...(pool ?? [])]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => ({
          value: c.id,
          label: c.name,
          description: `${c.companyName} · ${c.market}`,
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

  // The campaign lives in the URL, so a link opens the same comparison.
  const wanted = params.get('campaign');
  const campaign = pool.find((c) => c.id === wanted) ?? defaultCampaign(pool);
  const pick = (id: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('campaign', id);
        return next;
      },
      { replace: true },
    );

  return (
    <div>
      {/* Sticky, pinned just under the top bar: scrolling down through the matrix, charts and the cross-market
          view, the campaign they are all about stays in reach. */}
      <div className="sticky top-[var(--topbar-h,3.5rem)] z-10 -mx-4 mb-5 flex flex-wrap items-center gap-3 border-b border-gray-200 bg-brame-cream/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 dark:border-white/10 dark:bg-brame-dark/95">
        <CampaignAutocomplete value={campaign?.id ?? null} onChange={pick} options={options} />
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
          campaign={campaign}
          columns={state.columns}
          onChange={(columns) => setState((s) => ({ ...s, columns }))}
        />
        <CompareCharts
          pool={pool}
          campaign={campaign}
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
