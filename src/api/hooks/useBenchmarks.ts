import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  fetchBenchmarkContext,
  fetchBenchmarkCreatives,
  fetchBenchmarkGroup,
  fetchBenchmarkPool,
  fetchBenchmarks,
  queryKeys,
} from '@/api';
import type { BenchmarkScope, Dimension } from '@/features/benchmarks/lib/benchmarks';

export function useBenchmarks(dimension: Dimension, enabled = true, scope?: BenchmarkScope) {
  return useQuery({
    queryKey: queryKeys.benchmarks.byDimension(dimension, scope),
    queryFn: () => fetchBenchmarks(dimension, scope),
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

/** The whole benchmark pool, for the Compare and Mechanics views. Internal
 *  seats only — pass `enabled: false` for anyone else and it never runs. */
export function useBenchmarkPool(enabled = true) {
  return useQuery({
    queryKey: queryKeys.benchmarks.pool,
    queryFn: fetchBenchmarkPool,
    enabled,
  });
}

/** One client against its industry — and against BRAME only for Brame seats.
 *  The one benchmark read a client or agency seat is allowed. */
export function useBenchmarkContext(companyId: string | undefined, includeBrame: boolean) {
  return useQuery({
    queryKey: queryKeys.benchmarks.context(companyId ?? '', includeBrame),
    queryFn: () => fetchBenchmarkContext(companyId!, includeBrame),
    enabled: !!companyId,
  });
}

/** The creatives behind the pool, for the Mechanics view. Internal seats only. */
export function useBenchmarkCreatives(enabled = true) {
  return useQuery({
    queryKey: queryKeys.benchmarks.creatives,
    queryFn: fetchBenchmarkCreatives,
    enabled,
  });
}
