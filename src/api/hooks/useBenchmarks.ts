import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchBenchmarkGroup, fetchBenchmarks, queryKeys } from '@/api';
import type { Dimension } from '@/features/benchmarks/lib/benchmarks';

export function useBenchmarks(dimension: Dimension, enabled = true) {
  return useQuery({
    queryKey: queryKeys.benchmarks.byDimension(dimension),
    queryFn: () => fetchBenchmarks(dimension),
    enabled,
    // Switching Industry/Client/Market swaps the query key entirely, so
    // without this the whole page (chart, table, filter bar) would unmount
    // to a bare "Loading…" on every click instead of just refreshing in place.
    placeholderData: keepPreviousData,
  });
}

export function useBenchmarkGroup(dimension: Dimension, key?: string) {
  return useQuery({
    queryKey: queryKeys.benchmarks.group(dimension, key ?? ''),
    queryFn: () => fetchBenchmarkGroup(dimension, key!),
    enabled: !!key,
  });
}
