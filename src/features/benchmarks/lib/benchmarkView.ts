export const BENCHMARK_VIEWS = ['rankings', 'compare', 'mechanics'] as const;
export type BenchmarkView = (typeof BENCHMARK_VIEWS)[number];

/** Narrows the `view` URL param, falling back to the rankings. */
export function parseBenchmarkView(value: string | null): BenchmarkView {
  return (BENCHMARK_VIEWS as readonly string[]).includes(value ?? '') ? (value as BenchmarkView) : 'rankings';
}
