import { useBenchmarkContext, useBenchmarks } from '@/api/hooks/useBenchmarks';
import { useCompanies } from '@/features/clients';
import { useSession } from '@/features/session';
import type { MetricKey } from '@/types';
import { LOW_SAMPLE } from '../lib/benchmarks';
import { isToneMetric } from '../lib/benchmarkTone';

/**
 * The industry average a campaign's engagement rate, CTR or viewability should be read against:
 * the average of the campaign's own industry (given, or its client's). Undefined for any other
 * metric and a client with no industry.
 *
 * Klea seats read it from the cross-tenant industry benchmarks. Clients and
 * accounts get only their own client's industry average, through the benchmark
 * context — never the wider benchmark pool.
 */
export function useMetricBenchmark(companyId: string | undefined, metric: MetricKey, industryName?: string) {
  const { isInternal } = useSession();
  const tone = isToneMetric(metric);
  const { data } = useBenchmarks('industry', isInternal && tone);
  const { data: companies } = useCompanies();
  const context = useBenchmarkContext(!isInternal && tone ? companyId : undefined, false).data;

  if (!tone) return undefined;

  if (!isInternal) {
    const stats = context?.industry[metric];
    return stats && context?.industryName
      ? { industry: context.industryName, avg: stats.avg, n: stats.n, lowSample: stats.n < LOW_SAMPLE }
      : undefined;
  }

  if (!data) return undefined;
  // A row that already knows its industry (a benchmark campaign) passes it
  // straight in; otherwise it's looked up from the campaign's client.
  const industry = industryName ?? companies?.find((c) => c.id === companyId)?.industry;
  const group = industry ? data.groups.find((g) => g.key === industry) : undefined;
  const stats = group ? group.stats[metric] : null;
  return stats ? { industry: group!.displayName, avg: stats.avg, n: stats.n, lowSample: group!.lowSample } : undefined;
}
