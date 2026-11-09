import { Scale } from 'lucide-react';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import { fmtMetric, fmtSignedPct } from '@/lib/format';
import { Card, Tooltip } from '@/components/ui';
import { Eyebrow } from '@/components/display';
import { useBenchmarkContext } from '@/api/hooks/useBenchmarks';
import {
  BENCHMARK_METRICS,
  meetsSample,
  MIN_COMPARE_SAMPLE,
  type BenchmarkMetric,
} from '../lib/benchmarks';

interface Bar {
  key: 'campaign' | 'client' | 'industry' | 'brame';
  label: string;
  value: number | null;
  n?: number;
  className: string;
}

/**
 * A value put in context: this campaign (optionally), its client, its
 * industry and — for Klea seats only — KLEA overall, as bars on one scale
 * per metric. So "2.4% CTR" reads as above or below the peers it competes with.
 * A bar whose average rests on fewer than MIN_COMPARE_SAMPLE campaigns is not
 * drawn; it says so instead of setting an expectation the data can't carry.
 */
export function ContextComparison({
  companyId,
  isInternal,
  own,
  ownLabel,
  className,
}: {
  companyId: string;
  /** Klea seats also get the KLEA bar; clients and accounts never do. */
  isInternal: boolean;
  /** The campaign's own values, when this sits on a campaign page. */
  own?: Partial<Record<BenchmarkMetric, number | null | undefined>>;
  ownLabel?: string;
  className?: string;
}) {
  const { t } = useI18n();
  const { data } = useBenchmarkContext(companyId, isInternal);
  if (!data) return null;

  return (
    <Card className={className}>
      <Eyebrow icon={<Scale size={12} />}>
        {t('benchmarkContext.title')}
        <Tooltip
          text={t(isInternal ? 'benchmarkContext.helpInternal' : 'benchmarkContext.help', {
            min: MIN_COMPARE_SAMPLE,
          })}
        />
      </Eyebrow>

      <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-3">
        {BENCHMARK_METRICS.map((metric) => {
          const industry = data.industry[metric];
          const client = data.client[metric];
          const brame = data.brame?.[metric] ?? null;
          const bars: Bar[] = [
            ...(own && own[metric] != null
              ? [
                  {
                    key: 'campaign' as const,
                    label: ownLabel ?? t('benchmarkContext.thisCampaign'),
                    value: own[metric]!,
                    className: 'bg-brame-teal',
                  },
                ]
              : []),
            {
              key: 'client',
              label: t('benchmarkContext.client'),
              value: meetsSample(client) ? client.avg : null,
              n: client?.n,
              className: 'bg-brame-turquoise',
            },
            {
              key: 'industry',
              label: data.industryName ?? t('benchmarkContext.industry'),
              value: meetsSample(industry) ? industry.avg : null,
              n: industry?.n,
              className: 'bg-gray-400 dark:bg-gray-500',
            },
            ...(data.brame
              ? [
                  {
                    key: 'brame' as const,
                    label: t('benchmarkContext.brame'),
                    value: meetsSample(brame) ? brame.avg : null,
                    n: brame?.n,
                    className: 'bg-brame-dark dark:bg-white/80',
                  },
                ]
              : []),
          ];
          const max = Math.max(...bars.map((b) => b.value ?? 0)) * 1.15 || 1;
          const reference = bars.find((b) => b.key === 'industry')?.value ?? null;
          const subject = bars[0];

          return (
            <div key={metric}>
              <div className="text-sm font-semibold text-brame-dark dark:text-gray-100">
                {t(`metric.${metric}.label`)}
              </div>
              {reference != null && subject.value != null && subject.key !== 'industry' && (
                <div
                  className={cn(
                    'tnum mt-0.5 text-xs font-medium',
                    subject.value >= reference
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400',
                  )}
                >
                  {t('benchmarkContext.vsIndustry', {
                    delta: fmtSignedPct((subject.value - reference) / reference, 0),
                  })}
                </div>
              )}
              <div className="mt-3 space-y-2.5">
                {bars.map((b) => (
                  <div key={b.key}>
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                      <span className="truncate text-gray-500 dark:text-gray-400">{b.label}</span>
                      <span className="tnum flex-shrink-0 font-semibold text-brame-dark dark:text-gray-100">
                        {b.value != null ? (
                          fmtMetric(metric, b.value)
                        ) : (
                          <span className="font-normal text-gray-400">
                            {t('benchmarkContext.notEnough', { min: MIN_COMPARE_SAMPLE })}
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                      {b.value != null && (
                        <div
                          className={cn('h-full rounded-full', b.className)}
                          style={{ width: `${(b.value / max) * 100}%` }}
                        />
                      )}
                    </div>
                    {b.n != null && b.value != null && (
                      <div className="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">
                        {t('benchmarkContext.basedOn', { n: b.n })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
