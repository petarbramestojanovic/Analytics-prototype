import { BarChart3 } from 'lucide-react';
import { useI18n } from '@/i18n';
import { usePageTitle } from '@/hooks/usePageTitle';
import { EmptyState, ErrorState, PageSkeleton } from '@/components/feedback';
import { Page, PageHeader } from '@/components/page';
import { useBenchmarkCreatives, useBenchmarkPool } from '@/api/hooks/useBenchmarks';
import { BenchmarkViewTabs } from '../components/BenchmarkViewTabs';
import { CrossCompare } from '../components/CrossCompare';
import { LadderMatrix } from '../components/LadderMatrix';
import { MechanicsView } from '../components/MechanicsView';
import type { BenchmarkView } from '../lib/benchmarkView';

type PoolView = Extract<BenchmarkView, 'compare' | 'mechanics'>;

/** The Compare and Mechanics views of the Benchmarks page — both Brame-internal
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

function CompareBody() {
  const { t } = useI18n();
  const { data: pool, isLoading, isError, refetch } = useBenchmarkPool();
  if (isLoading) return <PageSkeleton variant="list" />;
  if (isError || !pool) return <ErrorState onRetry={() => refetch()} />;
  if (pool.length === 0) {
    return <EmptyState icon={<BarChart3 size={32} />} title={t('benchmarks.empty.title')} body={t('benchmarks.empty.body')} />;
  }
  return (
    <div className="space-y-5">
      <LadderMatrix pool={pool} />
      <CrossCompare pool={pool} />
    </div>
  );
}

function MechanicsBody() {
  const { t } = useI18n();
  const { data: creatives, isLoading, isError, refetch } = useBenchmarkCreatives();
  if (isLoading) return <PageSkeleton variant="list" />;
  if (isError || !creatives) return <ErrorState onRetry={() => refetch()} />;
  if (creatives.length === 0) {
    return <EmptyState icon={<BarChart3 size={32} />} title={t('benchmarks.empty.title')} body={t('benchmarks.empty.body')} />;
  }
  return <MechanicsView creatives={creatives} />;
}
