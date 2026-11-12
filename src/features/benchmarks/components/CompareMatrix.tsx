import { useMemo } from 'react';
import { Plus } from 'lucide-react';
import { useI18n, type TranslateFn } from '@/i18n';
import { TODAY } from '@/lib/clock';
import { cn } from '@/lib/cn';
import { EMPTY_VALUE, fmtMetric } from '@/lib/format';
import { Card, DeleteButton, Popover } from '@/components/ui';
import { SectionTitle } from '@/components/page';
import type { BenchmarkCampaign } from '@/types';
import {
  BENCHMARK_METRICS,
  MIN_COMPARE_SAMPLE,
  meetsSample,
  sliceStats,
  type BenchmarkMetric,
  type MetricStats,
  type Stats,
} from '../lib/benchmarks';
import { type CompareSubject } from '../lib/compareSubject';
import { columnStats, resolveColumn } from '../lib/compareColumns';
import { AddColumnPanel } from './AddColumnPanel';
import { bucketName, dimLabel, subjectHeading } from '../lib/compareLabels';
import { MAX_MATRIX_COLUMNS, type MatrixColumn } from '../lib/compareViews';

/** A column's two header lines: what kind of benchmark, and which bucket. */
function headerOf(col: MatrixColumn, subject: CompareSubject, t: TranslateFn) {
  if (col.kind === 'brame') return { kind: t('cmp.matrix.brame'), name: t('cmp.matrix.network') };
  if (col.kind === 'fixed') {
    return { kind: `${dimLabel(t, col.dim)} · ${t('cmp.matrix.specific')}`, name: col.label };
  }
  if (col.kind === 'campaign') {
    return { kind: `${t('cmp.subject.campaign')} · ${t('cmp.matrix.specific')}`, name: col.label };
  }
  if (col.kind === 'mix') {
    return {
      kind: col.parts.map((p) => dimLabel(t, p.dim)).join(' × '),
      name: col.parts
        .map((p) => (p.value === null ? bucketName(t, subject.labels[p.dim]) : p.label))
        .join(' · '),
    };
  }
  return {
    kind: col.dims.map((d) => dimLabel(t, d)).join(' × '),
    name: col.dims.map((d) => bucketName(t, subject.labels[d])).join(' · '),
  };
}

const deltaPp = (own: number, bench: number) => (own - bench) * 100;
const fmtPp = (pp: number) =>
  `${pp >= 0 ? '▲' : '▼'} ${Math.abs(pp).toFixed(Math.abs(pp) < 10 ? 2 : 1)} pp`;

function Cell({
  metric,
  own,
  stats,
  max,
  single = false,
}: {
  metric: BenchmarkMetric;
  own: number | null;
  stats: Stats | null;
  max: number;
  /** A named campaign, not an average — shown whatever its "sample" of one. */
  single?: boolean;
}) {
  const { t } = useI18n();
  if (!stats) return <span className="text-gray-300 dark:text-gray-600">{EMPTY_VALUE}</span>;
  if (!single && stats.n < MIN_COMPARE_SAMPLE) {
    return (
      <span className="text-xs text-gray-400 dark:text-gray-500">
        {t('cmp.matrix.thin', { n: stats.n, min: MIN_COMPARE_SAMPLE })}
      </span>
    );
  }
  const pp = own === null ? null : deltaPp(own, stats.avg);
  return (
    <div className="tnum">
      <div className="text-lg font-semibold text-brame-dark dark:text-gray-100">
        {fmtMetric(metric, stats.avg)}
      </div>
      {pp !== null && (
        <div
          className={cn(
            'text-xs font-medium',
            pp >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
          )}
        >
          {fmtPp(pp)}
        </div>
      )}
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
        <div
          className="h-full rounded-full bg-brame-teal/60 dark:bg-brame-turquoise/60"
          style={{ width: `${max ? Math.min(100, (stats.avg / max) * 100) : 0}%` }}
        />
      </div>
    </div>
  );
}

/**
 * The matrix: metrics down, benchmarks across. The subject — a campaign, a
 * client or an industry — is always the first column; every other column can be
 * removed, and more can be added up to MAX_MATRIX_COLUMNS — the subject's own
 * client / market / industry / account (alone or combined, where they apply), a
 * specific bucket, or KLEA overall.
 */
export function CompareMatrix({
  pool,
  subject,
  columns,
  onChange,
}: {
  pool: BenchmarkCampaign[];
  subject: CompareSubject | null;
  columns: MatrixColumn[];
  onChange: (columns: MatrixColumn[]) => void;
}) {
  const { t } = useI18n();
  const full = columns.length >= MAX_MATRIX_COLUMNS;

  const isCampaign = subject?.kind === 'campaign';
  const heading = subject ? subjectHeading(t, subject) : null;
  // A client or industry is its own bucket: its numbers are the average over
  // its campaigns (and show only once enough of them stand behind them).
  const subjectStats = useMemo<MetricStats | null>(
    () => (subject && !isCampaign ? sliceStats(pool, TODAY, subject.cuts) : null),
    [pool, subject, isCampaign],
  );
  const ownValue = (metric: BenchmarkMetric): number | null => {
    if (!subject) return null;
    if (isCampaign) return subject.campaigns[0][metric];
    const stats = subjectStats?.[metric];
    return meetsSample(stats) ? stats.avg : null;
  };

  // Columns that don't apply to the pick (a client has no "same client") are
  // kept in the saved view but not drawn.
  const drawn = useMemo(
    () => (subject ? columns.filter((col) => resolveColumn(col, subject, pool) !== null) : columns),
    [columns, subject, pool],
  );
  const hiddenCount = columns.length - drawn.length;

  const cells = useMemo(
    () =>
      subject
        ? drawn.map((col) => {
            const resolved = resolveColumn(col, subject, pool)!;
            return columnStats(resolved, subject, pool, TODAY);
          })
        : drawn.map(() => ({ stats: null, single: false })),
    [pool, subject, drawn],
  );

  const room = MAX_MATRIX_COLUMNS - columns.length;
  const add = (cols: MatrixColumn[]) => {
    const fresh = cols.filter(
      (c, i) => !columns.some((x) => x.id === c.id) && cols.findIndex((o) => o.id === c.id) === i,
    );
    if (fresh.length) onChange([...columns, ...fresh].slice(0, MAX_MATRIX_COLUMNS));
  };

  return (
    <Card padded={false}>
      <div className="flex flex-wrap items-start justify-between gap-3 p-5 pb-3">
        <div className="min-w-0 max-w-3xl">
          <SectionTitle hint={t('cmp.matrix.hint', { min: MIN_COMPARE_SAMPLE })}>
            {t('cmp.matrix.title')}
          </SectionTitle>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {t('cmp.matrix.count', { count: columns.length, max: MAX_MATRIX_COLUMNS })}
          </span>
        </div>
      </div>

      {!subject ? (
        <p className="px-5 pb-5 text-sm text-gray-500 dark:text-gray-400">
          {t('cmp.matrix.noSubject')}
        </p>
      ) : (
        <>
          <div className="flex overflow-x-auto">
            <table className="w-full min-w-max flex-1 border-collapse text-sm">
              <thead>
                <tr className="align-top">
                  <th className="w-36 min-w-36" />
                  <th className="min-w-44 border-b border-brame-teal/30 bg-brame-teal/10 px-4 py-3 text-left dark:bg-brame-turquoise/10">
                    <div className="text-xs text-gray-500 dark:text-gray-400">{heading!.kind}</div>
                    <div className="font-semibold text-brame-dark dark:text-gray-100">
                      {heading!.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {subject.subtitle}
                      {subject.kind !== 'campaign' &&
                        `${subject.subtitle ? ' · ' : ''}${t('cmp.matrix.sampleValue', { n: subject.campaigns.length })}`}
                    </div>
                  </th>
                  {drawn.map((col) => {
                    const head = headerOf(col, subject, t);
                    return (
                      <th
                        key={col.id}
                        className="min-w-40 border-b border-gray-200 px-4 py-3 text-left dark:border-white/10"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-xs font-normal text-gray-500 dark:text-gray-400">
                              {head.kind}
                            </div>
                            <div className="font-semibold text-brame-dark dark:text-gray-100">
                              {head.name}
                            </div>
                          </div>
                          <DeleteButton
                            className="-mr-1 -mt-0.5"
                            label={t('cmp.matrix.remove', { name: head.name })}
                            onClick={() => onChange(columns.filter((c) => c.id !== col.id))}
                          />
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {BENCHMARK_METRICS.map((metric) => {
                  const own = ownValue(metric);
                  const ownStats = subjectStats?.[metric] ?? null;
                  const max = Math.max(
                    own ?? 0,
                    ...cells.map((c) =>
                      c.stats?.[metric] && (c.single || meetsSample(c.stats[metric]))
                        ? c.stats[metric]!.avg
                        : 0,
                    ),
                  );
                  return (
                    <tr
                      key={metric}
                      className="border-b border-gray-100 align-top last:border-0 dark:border-white/5"
                    >
                      <th
                        scope="row"
                        className="px-4 py-4 text-left font-medium text-brame-dark dark:text-gray-100"
                      >
                        {t(`metric.${metric}.label`)}
                      </th>
                      <td className="bg-brame-teal/10 px-4 py-4 dark:bg-brame-turquoise/10">
                        <div className="tnum text-lg font-semibold text-brame-dark dark:text-gray-100">
                          {own !== null ? (
                            fmtMetric(metric, own)
                          ) : ownStats ? (
                            <span className="text-xs font-normal text-gray-400 dark:text-gray-500">
                              {t('cmp.matrix.thin', { n: ownStats.n, min: MIN_COMPARE_SAMPLE })}
                            </span>
                          ) : (
                            EMPTY_VALUE
                          )}
                        </div>
                        <div className="mt-[22px] h-1 overflow-hidden rounded-full bg-brame-teal/15 dark:bg-white/10">
                          <div
                            className="h-full rounded-full bg-brame-teal dark:bg-brame-turquoise"
                            style={{
                              width: `${max && own ? Math.min(100, (own / max) * 100) : 0}%`,
                            }}
                          />
                        </div>
                      </td>
                      {drawn.map((col, i) => (
                        <td key={col.id} className="px-4 py-4">
                          <Cell
                            metric={metric}
                            own={own}
                            stats={cells[i]?.stats?.[metric] ?? null}
                            single={cells[i]?.single}
                            max={max}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
                <tr className="border-t border-gray-200 text-xs text-gray-500 dark:border-white/10 dark:text-gray-400">
                  <th
                    scope="row"
                    className="px-4 py-3 text-left font-medium text-brame-dark dark:text-gray-100"
                  >
                    {t('cmp.matrix.sample')}
                  </th>
                  <td className="bg-brame-teal/10 px-4 py-3 dark:bg-brame-turquoise/10">
                    {t('cmp.matrix.sampleValue', {
                      n: isCampaign
                        ? 1
                        : Math.max(0, ...BENCHMARK_METRICS.map((m) => subjectStats?.[m]?.n ?? 0)),
                    })}
                  </td>
                  {drawn.map((col, i) => {
                    const n = Math.max(
                      0,
                      ...BENCHMARK_METRICS.map((m) => cells[i]?.stats?.[m]?.n ?? 0),
                    );
                    return (
                      <td key={col.id} className="px-4 py-3">
                        {n ? t('cmp.matrix.sampleValue', { n }) : EMPTY_VALUE}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
            {/* The next free column, as wide as a column and as tall as the
              table: hovering it shows exactly the space a new one will take. */}
            {!full && (
              <Popover
                align="end"
                rootClassName="flex w-44 shrink-0 self-stretch p-3"
                className="w-[min(22rem,calc(100vw-1rem))] p-4"
                trigger={({ toggle }) => (
                  <button
                    type="button"
                    onClick={toggle}
                    className="group flex min-h-40 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 transition-colors hover:border-brame-teal/50 hover:bg-brame-teal/5 hover:text-brame-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brame-teal/50 dark:border-white/15 dark:text-gray-400 dark:hover:border-brame-turquoise/50 dark:hover:bg-brame-turquoise/10 dark:hover:text-brame-turquoise"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-current">
                      <Plus size={16} />
                    </span>
                    {t('cmp.matrix.add')}
                  </button>
                )}
              >
                {(close) => (
                  <AddColumnPanel
                    pool={pool}
                    subject={subject}
                    existing={columns}
                    room={room}
                    onAdd={(cols) => {
                      add(cols);
                      close();
                    }}
                  />
                )}
              </Popover>
            )}
          </div>
          {hiddenCount > 0 && (
            <p className="px-5 pb-4 text-xs text-gray-500 dark:text-gray-400">
              {t('cmp.matrix.hidden', { count: hiddenCount })}
            </p>
          )}
          {columns.length === 0 && (
            <p className="px-5 pb-5 text-sm text-gray-500 dark:text-gray-400">
              {t('cmp.matrix.empty')}
            </p>
          )}
        </>
      )}
    </Card>
  );
}
