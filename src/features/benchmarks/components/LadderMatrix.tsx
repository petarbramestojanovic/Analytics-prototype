import { useMemo, useState } from 'react';
import { useI18n } from '@/i18n';
import { TODAY } from '@/lib/clock';
import { cn } from '@/lib/cn';
import { fmtMetric, fmtSignedPct } from '@/lib/format';
import { usePagination } from '@/hooks/usePagination';
import { Card, CardFooter, Tabs, Tooltip } from '@/components/ui';
import { FilterSelect, SectionTitle } from '@/components/page';
import { Pagination, Table, Td, Th, Tr } from '@/components/table';
import type { BenchmarkCampaign } from '@/types';
import {
  BENCHMARK_METRICS,
  buildLadder,
  MIN_COMPARE_SAMPLE,
  type BenchmarkMetric,
  type LadderLevel,
  type LadderRow,
  type Stats,
} from '../lib/benchmarks';

const PAGE_SIZE = 10;

/** A benchmark level's average next to the row's own value, with how far the
 *  row sits above or below it. Shows only `n=` below the sample floor. */
function LevelCell({
  metric,
  value,
  stats,
}: {
  metric: BenchmarkMetric;
  value: number;
  stats: Stats | null;
}) {
  const { t } = useI18n();
  if (!stats) return <span className="text-gray-300 dark:text-gray-600">—</span>;
  if (stats.n < MIN_COMPARE_SAMPLE) {
    return (
      <span
        className="text-xs text-gray-400 dark:text-gray-500"
        title={t('ladder.needs', { min: MIN_COMPARE_SAMPLE })}
      >
        n={stats.n}
      </span>
    );
  }
  const delta = stats.avg ? (value - stats.avg) / stats.avg : 0;
  return (
    <div className="tnum">
      <div className="font-medium text-brame-dark dark:text-gray-100">
        {fmtMetric(metric, stats.avg)}
      </div>
      <div
        className={cn(
          'text-[11px] font-medium',
          delta >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
        )}
      >
        {fmtSignedPct(delta, 0)}
      </div>
    </div>
  );
}

/**
 * The matrix across the benchmark levels: every campaign (or client) with its
 * own value, then the average of its client, its industry, its market and BRAME
 * overall — and how far it sits from each. Colour says above/below; "n=" says
 * how many campaigns stand behind an average too thin to show.
 */
export function LadderMatrix({ pool }: { pool: BenchmarkCampaign[] }) {
  const { t } = useI18n();
  const [level, setLevel] = useState<LadderLevel>('campaign');
  const [metric, setMetric] = useState<BenchmarkMetric>('engagementRate');

  const rows = useMemo(() => buildLadder(pool, level, metric, TODAY), [pool, level, metric]);
  const { paged, pagination } = usePagination(rows, PAGE_SIZE, [level, metric]);

  const levels: {
    key: 'client' | 'industry' | 'market' | 'brame';
    label: string;
    show: boolean;
  }[] = [
    { key: 'client', label: t('ladder.level.client'), show: level === 'campaign' },
    { key: 'industry', label: t('ladder.level.industry'), show: true },
    { key: 'market', label: t('ladder.level.market'), show: level === 'campaign' },
    { key: 'brame', label: t('ladder.level.brame'), show: true },
  ];

  return (
    <Card padded={false}>
      <div className="p-5 pb-3">
        <SectionTitle hint={t('ladder.hint', { min: MIN_COMPARE_SAMPLE })}>
          {t('ladder.title')}
        </SectionTitle>
        <div className="flex flex-wrap items-center gap-3">
          <Tabs
            value={level}
            onChange={setLevel}
            options={(['campaign', 'client'] as const).map((l) => ({
              value: l,
              label: t(`ladder.rows.${l}`),
            }))}
          />
          <FilterSelect
            className="w-52"
            value={metric}
            onChange={(m) => setMetric(m as BenchmarkMetric)}
            options={BENCHMARK_METRICS.map((m) => ({ value: m, label: t(`metric.${m}.label`) }))}
          />
        </div>
      </div>
      <Table>
        <thead>
          <tr>
            <Th>{t(`ladder.rows.${level}`)}</Th>
            <Th align="right">{t(`metric.${metric}.label`)}</Th>
            {levels
              .filter((l) => l.show)
              .map((l) => (
                <Th key={l.key} align="center">
                  <span className="inline-flex items-center gap-1">
                    {l.label}
                    {l.key === 'market' && <Tooltip text={t('ladder.marketHint')} />}
                  </span>
                </Th>
              ))}
          </tr>
        </thead>
        <tbody>
          {paged.map((r: LadderRow) => (
            <Tr key={r.key}>
              <Td>
                <div className="font-medium text-brame-dark dark:text-gray-100">{r.label}</div>
                <div className="text-xs text-gray-400 dark:text-gray-500">{r.sublabel}</div>
              </Td>
              <Td align="right" className="tnum font-semibold">
                {fmtMetric(metric, r.value)}
              </Td>
              {levels
                .filter((l) => l.show)
                .map((l) => (
                  <Td key={l.key} align="center">
                    <LevelCell metric={metric} value={r.value} stats={r[l.key]} />
                  </Td>
                ))}
            </Tr>
          ))}
        </tbody>
      </Table>
      <CardFooter>
        <Pagination {...pagination} />
      </CardFooter>
    </Card>
  );
}
