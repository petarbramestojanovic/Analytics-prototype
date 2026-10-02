import { useI18n } from '@/i18n';
import { fmtInt, fmtMetric } from '@/lib/format';
import { ProgressBar, Tooltip } from '@/components/ui';
import type { BenchmarkMetric, Stats } from '../lib/benchmarks';

const PERCENTILES = ['p50', 'p75', 'p90'] as const;

/**
 * The distribution track from the KPI dashboard, rebuilt on the design
 * system's tokens. Bars are scaled against P90 so the three rows share one
 * axis and P50-vs-P90 is readable as a shape, not just three numbers.
 */
export function DistributionColumn({
  metric,
  stats,
  overall,
}: {
  metric: BenchmarkMetric;
  stats: Stats | null;
  overall: Stats | null;
}) {
  const { t } = useI18n();

  return (
    <div>
      <div className="mb-3 flex items-center gap-1.5">
        <span className="text-sm font-medium text-brame-dark dark:text-gray-200">{t(`metric.${metric}.label`)}</span>
        <Tooltip text={t(`metric.${metric}.help`)} />
      </div>

      {!stats ? (
        <p className="text-xs text-gray-400 dark:text-gray-500">{t('benchmarks.notMeasured')}</p>
      ) : (
        <>
          <div className="space-y-2">
            {PERCENTILES.map((p) => (
              <div key={p} className="flex items-center gap-3">
                <span className="w-9 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {t(`benchmarks.col.${p}`)}
                </span>
                <ProgressBar
                  size="lg"
                  value={stats.p90 > 0 ? stats[p] / stats.p90 : 0}
                  barClassName="bg-brame-teal dark:bg-brame-turquoise"
                  className="flex-1"
                />
                <span className="tnum w-16 text-right text-sm font-medium text-brame-teal dark:text-brame-turquoise-light">
                  {fmtMetric(metric, stats[p])}
                </span>
              </div>
            ))}
          </div>
          {/* The group's own sample size and the portfolio it is being
              compared against are different scopes — labelled separately,
              since one line reading "… · n=19" was ambiguous about which of
              the two the n belonged to. */}
          <p className="mt-2.5 text-xs text-gray-400 dark:text-gray-500">
            {t('benchmarkDetail.sampleSize', { n: fmtInt(stats.n) })}
            {overall && (
              <>
                {' · '}
                {t('benchmarkDetail.portfolioP50', { value: fmtMetric(metric, overall.p50) })}
              </>
            )}
          </p>
        </>
      )}
    </div>
  );
}
