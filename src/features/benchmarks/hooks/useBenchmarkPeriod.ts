import { useMemo } from 'react';
import { STORAGE_KEYS } from '@/config/storageKeys';
import { useListFilters } from '@/hooks/useListFilters';
import { TODAY_ISO } from '@/lib/clock';
import { RANGE_PRESETS, resolveRange, type RangePreset } from '@/lib/dateRange';
import type { BenchmarkScope } from '../lib/benchmarks';

/** Starts on the last 12 months — the window benchmarks used before there was a
 *  picker. No "all time" or year-over-year: a benchmark is a per-flight average,
 *  not a delivery total. */
const PERIOD_DEFAULTS = { range: 'last12m' as string, from: '', to: '', year: 0, yoy: false };
const PERIOD_ALLOWED = { range: RANGE_PRESETS as readonly string[] };

/**
 * The period filter shared by the Benchmarks views that read it (Rankings and
 * Mechanics). One state, so the period you picked on one tab is still there on
 * the next; it lives in the URL and localStorage like any list filter.
 */
export function useBenchmarkPeriod() {
  const { filters, setFilter } = useListFilters(
    STORAGE_KEYS.benchmarkPeriod,
    PERIOD_DEFAULTS,
    PERIOD_ALLOWED,
  );
  const range = useMemo(
    () =>
      resolveRange(
        { preset: filters.range as RangePreset, from: filters.from, to: filters.to, seasonYear: filters.year },
        TODAY_ISO,
      ),
    [filters.range, filters.from, filters.to, filters.year],
  );
  const scope = useMemo<BenchmarkScope>(() => ({ range }), [range]);
  return { filters, setFilter, range, scope };
}
