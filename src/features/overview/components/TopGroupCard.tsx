import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { paths } from '@/config/paths';
import { useI18n } from '@/i18n';
import { Card } from '@/components/ui';
import { ErrorState, LoadingState } from '@/components/feedback';
import { Eyebrow } from '@/components/display';
import { LowSamplePill, useBenchmarks, type BenchmarkGroup, type Dimension } from '@/features/benchmarks';
import { HeadlineCtr } from './HeadlineCtr';

/** Best-performing group per dimension, ranked by CTR — the same headline
 *  metric Benchmarks defaults to. A group whose sources never measure CTR
 *  (adserver-only) can't be "top" by a metric it has no data for. */
function topByCtr(groups: BenchmarkGroup[]): BenchmarkGroup | null {
  const withCtr = groups.filter((g) => g.stats.ctr !== null);
  if (withCtr.length === 0) return null;
  return withCtr.reduce((best, g) => (g.stats.ctr!.avg > best.stats.ctr!.avg ? g : best));
}

/** "Top industry / client / market" — links into that benchmark group. */
export function TopGroupCard({ dimension, query }: { dimension: Dimension; query: ReturnType<typeof useBenchmarks> }) {
  const { t } = useI18n();
  const { data, isLoading, isError, refetch } = query;
  const top = data ? topByCtr(data.groups) : null;
  const overallCtr = data?.overall.ctr?.avg ?? null;

  let body: ReactNode;
  if (isLoading) body = <LoadingState compact />;
  else if (isError || !data) body = <ErrorState onRetry={() => refetch()} compact />;
  else if (!top) body = <p className="text-sm text-gray-500 dark:text-gray-400">{t('overview.topNone')}</p>;
  else
    body = (
      <>
        <div className="flex items-start justify-between gap-2">
          <div className="text-lg font-bold text-brame-dark dark:text-white">{top.displayName}</div>
          {top.lowSample && <LowSamplePill />}
        </div>
        <HeadlineCtr value={top.stats.ctr!.avg} comparison={overallCtr != null ? { key: 'overview.vsPortfolio', value: overallCtr } : undefined} />
      </>
    );

  const content = (
    <Card className="h-full transition-colors hover:border-brame-teal/40 dark:hover:border-brame-turquoise/40">
      <Eyebrow>{t('overview.topOf', { dimension: t(`benchmarks.dimension.${dimension}`) })}</Eyebrow>
      {body}
    </Card>
  );

  return top ? (
    <Link to={paths.benchmarkGroup(dimension, top.key)} className="block h-full">
      {content}
    </Link>
  ) : (
    content
  );
}
