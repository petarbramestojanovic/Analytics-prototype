import { useCompanies } from '@/features/clients';
import type { BenchmarkValues } from '@/features/campaigns';
import type { Stats } from '../lib/benchmarks';
import { useBenchmarks } from '@/api/hooks/useBenchmarks';

const toValues = (stats: { ctr: Stats | null; engagementRate: Stats | null }): BenchmarkValues => ({
  ctr: stats.ctr?.avg,
  engagementRate: stats.engagementRate?.avg,
});

/**
 * The two benchmark reference lines a TrendChart can draw: the portfolio-wide
 * average ("frame") and the average for one company's own industry. Pass the
 * company whose industry applies (if any). Benchmarks are a cross-tenant
 * construct, so pass `enabled: false` for any seat that isn't internal — the
 * query then never runs, rather than fetching and hiding the result.
 */
export function useIndustryBenchmark(companyId: string | undefined, enabled = true) {
  const { data } = useBenchmarks('industry', enabled);
  const { data: companies } = useCompanies();
  const industry = companies?.find((c) => c.id === companyId)?.industry;
  const group = industry ? data?.groups.find((g) => g.key === industry) : undefined;

  return {
    industry,
    frameBenchmark: enabled && data ? toValues(data.overall) : undefined,
    industryBenchmark: enabled && group ? toValues(group.stats) : undefined,
  };
}
