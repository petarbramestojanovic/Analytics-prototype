import { useMemo, useState } from 'react';
import { useI18n } from '@/i18n';
import { TODAY } from '@/lib/clock';
import { cn } from '@/lib/cn';
import { fmtMetric } from '@/lib/format';
import { Card, Tabs } from '@/components/ui';
import { FilterSelect, SectionTitle } from '@/components/page';
import { Table, Td, Th, Tr } from '@/components/table';
import type { BenchmarkCampaign } from '@/types';
import {
  BENCHMARK_METRICS,
  crossCompareByMarket,
  crossSubjects,
  meetsSample,
  MIN_COMPARE_SAMPLE,
  type BenchmarkMetric,
  type Stats,
} from '../lib/benchmarks';

type Subject = 'industry' | 'client';

/** One value on a row scale: the number, a bar sized against the row's best, and
 *  how many campaigns it rests on. Below the sample floor it just says so. */
function Cell({
  metric,
  stats,
  max,
  best,
}: {
  metric: BenchmarkMetric;
  stats: Stats | null;
  max: number;
  best: boolean;
}) {
  const { t } = useI18n();
  if (!stats) return <span className="text-gray-300 dark:text-gray-600">—</span>;
  if (stats.n < MIN_COMPARE_SAMPLE) {
    return (
      <span className="text-xs text-gray-400 dark:text-gray-500">
        {t('ladder.thin', { n: stats.n, min: MIN_COMPARE_SAMPLE })}
      </span>
    );
  }
  return (
    <div className="mx-auto w-24 text-left">
      <div
        className={cn(
          'tnum text-sm font-semibold',
          best ? 'text-green-600 dark:text-green-400' : 'text-brame-dark dark:text-gray-100',
        )}
      >
        {fmtMetric(metric, stats.avg)}
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
        <div
          className={cn('h-full rounded-full', best ? 'bg-green-500' : 'bg-brame-teal')}
          style={{ width: `${max ? (stats.avg / max) * 100 : 0}%` }}
        />
      </div>
      <div className="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">
        {t('benchmarkContext.basedOn', { n: stats.n })}
      </div>
    </div>
  );
}

/**
 * One industry or client split by market — "Automotive: AT vs DE",
 * "IKEA: AT vs DE" — with its all-market average and BRAME's beside it. The
 * best market for each metric is marked.
 */
export function CrossCompare({ pool }: { pool: BenchmarkCampaign[] }) {
  const { t } = useI18n();
  const [dimension, setDimension] = useState<Subject>('industry');
  const subjects = useMemo(() => crossSubjects(pool, dimension, TODAY), [pool, dimension]);
  const [picked, setPicked] = useState<Record<Subject, string>>({ industry: '', client: '' });
  // Default to whatever has the most markets to compare.
  const subjectKey = picked[dimension] || subjects[0]?.key || '';
  const result = useMemo(
    () => (subjectKey ? crossCompareByMarket(pool, { dimension, key: subjectKey }, TODAY) : null),
    [pool, dimension, subjectKey],
  );

  return (
    <Card>
      <SectionTitle hint={t('cross.hint', { min: MIN_COMPARE_SAMPLE })}>
        {t('cross.title')}
      </SectionTitle>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs
          value={dimension}
          onChange={setDimension}
          options={(['industry', 'client'] as const).map((d) => ({
            value: d,
            label: t(`benchmarks.dimension.${d}`),
          }))}
        />
        <FilterSelect
          className="w-64"
          value={subjectKey}
          onChange={(key) => setPicked((p) => ({ ...p, [dimension]: key }))}
          options={subjects.map((s) => ({
            value: s.key,
            label: `${s.label} · ${t('cross.marketsCount', { count: s.markets })}`,
          }))}
        />
      </div>

      {!result || result.columns.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('cross.empty')}</p>
      ) : (
        <>
          {result.columns.length < 2 && (
            <p className="mb-3 text-sm text-amber-700 dark:text-amber-300">
              {t('cross.oneMarket')}
            </p>
          )}
          <Table>
            <thead>
              <tr>
                <Th>{t('cross.metric')}</Th>
                {result.columns.map((c) => (
                  <Th key={c.market} align="center">
                    {c.market}
                  </Th>
                ))}
                <Th align="center">{t('cross.all')}</Th>
                <Th align="center">{t('ladder.level.brame')}</Th>
              </tr>
            </thead>
            <tbody>
              {BENCHMARK_METRICS.map((metric) => {
                const shown = result.columns.map((c) => c.stats[metric]).filter(meetsSample);
                const max = Math.max(
                  0,
                  ...shown.map((s) => s.avg),
                  result.all[metric]?.avg ?? 0,
                  result.brame[metric]?.avg ?? 0,
                );
                const best = shown.length > 1 ? Math.max(...shown.map((s) => s.avg)) : null;
                return (
                  <Tr key={metric}>
                    <Td className="font-medium">{t(`metric.${metric}.label`)}</Td>
                    {result.columns.map((c) => (
                      <Td key={c.market} align="center">
                        <Cell
                          metric={metric}
                          stats={c.stats[metric]}
                          max={max}
                          best={
                            best != null &&
                            meetsSample(c.stats[metric]) &&
                            c.stats[metric]!.avg === best
                          }
                        />
                      </Td>
                    ))}
                    <Td align="center">
                      <Cell metric={metric} stats={result.all[metric]} max={max} best={false} />
                    </Td>
                    <Td align="center">
                      <Cell metric={metric} stats={result.brame[metric]} max={max} best={false} />
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </>
      )}
    </Card>
  );
}
