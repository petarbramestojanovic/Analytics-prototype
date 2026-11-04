import type { ReactNode } from 'react';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import { fmtMetric } from '@/lib/format';
import { FloatingTip, TipRow, TipText, TipTitle } from '@/components/ui';
import type { MetricKey } from '@/types';
import { useMetricBenchmark } from '../hooks/useMetricBenchmark';
import { BENCHMARK_TONE_TEXT, benchmarkTone } from '../lib/benchmarkTone';

/**
 * An engagement rate, CTR or viewability value, coloured against the average
 * for the client's industry: green when it's on the benchmark or above, red
 * when it's below. Hover for the numbers. Anything with no benchmark to
 * compare with (another metric, an unknown industry, a seat that can't see
 * benchmarks) renders exactly as it was, uncoloured.
 */
export function BenchmarkValue({
  value,
  metric,
  companyId,
  industry: industryName,
  children,
  className,
}: {
  value: number | null | undefined;
  metric: MetricKey;
  companyId: string | undefined;
  /** The industry to compare with, when the caller already has it. */
  industry?: string;
  children: ReactNode;
  className?: string;
}) {
  const { t } = useI18n();
  const benchmark = useMetricBenchmark(companyId, metric, industryName);
  const tone = benchmarkTone(value, benchmark?.avg, benchmark?.n);
  if (!tone || !benchmark) return <span className={className}>{children}</span>;

  return (
    <FloatingTip
      focusable
      className={cn(BENCHMARK_TONE_TEXT[tone], className)}
      content={
        <>
          <TipTitle>{t(`benchmarkTone.${tone}`)}</TipTitle>
          <TipText>{t('benchmarkTone.industry', { industry: benchmark.industry })}</TipText>
          <TipRow label={t('benchmarkTone.value')} value={fmtMetric(metric, value)} />
          <TipRow label={t('benchmarkTone.average')} value={fmtMetric(metric, benchmark.avg)} />
          {benchmark.lowSample && <TipText>{t('benchmarkTone.lowSample', { n: benchmark.n })}</TipText>}
        </>
      }
    >
      {children}
    </FloatingTip>
  );
}
