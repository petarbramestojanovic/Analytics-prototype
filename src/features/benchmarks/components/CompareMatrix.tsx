import { useMemo, type ReactNode } from 'react';
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

/** Every other column is tinted, so a column reads as a column. The subject's
 *  own column (teal) comes first, so the first benchmark is plain. */
const stripe = (i: number) => (i % 2 === 1 ? 'bg-gray-100/70 dark:bg-white/[0.05]' : '');

const deltaPp = (own: number, bench: number) => (own - bench) * 100;
const fmtPp = (pp: number) =>
  `${pp >= 0 ? '▲' : '▼'} ${Math.abs(pp).toFixed(Math.abs(pp) < 10 ? 2 : 1)} pp`;

function Cell({
  metric,
  own,
  stats,
  single = false,
}: {
  metric: BenchmarkMetric;
  own: number | null;
  stats: Stats | null;
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
      <div className="text-lg font-medium text-brame-dark dark:text-gray-100">
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
  toolbar,
  actions,
}: {
  pool: BenchmarkCampaign[];
  subject: CompareSubject | null;
  columns: MatrixColumn[];
  onChange: (columns: MatrixColumn[]) => void;
  /** What the matrix is about — the campaign / segment picker. It sits in the
   *  matrix's own header and affects nothing outside it. */
  toolbar?: ReactNode;
  /** Header actions, right of the title (the saved-views menu). */
  actions?: ReactNode;
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
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {t('cmp.matrix.count', { count: columns.length, max: MAX_MATRIX_COLUMNS })}
          </span>
          {actions}
        </div>
      </div>
      {toolbar && (
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 px-5 pb-4 dark:border-white/10">
          {toolbar}
        </div>
      )}

      {!subject ? (
        <p className="px-5 pb-5 text-sm text-gray-500 dark:text-gray-400">
          {t('cmp.matrix.noSubject')}
        </p>
      ) : (
        <>
          <div className="flex overflow-x-auto">
            {/* Fixed columns, filling the card when there is room; on a phone the
                table keeps a readable width per column and scrolls sideways. */}
            <table
              className="w-full flex-1 table-fixed border-collapse text-sm"
              style={{ minWidth: 256 + drawn.length * 104 }}
            >
              <thead>
                <tr className="align-top">
                  <th className="sticky left-0 z-10 bg-white dark:bg-brame-dark-light w-28" />
                  <th className="border-b border-brame-teal/30 bg-brame-teal/10 px-3 py-3 text-left dark:bg-brame-lime/10">
                    <div className="text-xs text-gray-500 dark:text-gray-400">{heading!.kind}</div>
                    <div className="break-words font-medium text-brame-dark dark:text-gray-100">
                      {heading!.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {subject.subtitle}
                      {subject.kind !== 'campaign' &&
                        `${subject.subtitle ? ' · ' : ''}${t('cmp.matrix.sampleValue', { n: subject.campaigns.length })}`}
                    </div>
                  </th>
                  {drawn.map((col, i) => {
                    const head = headerOf(col, subject, t);
                    return (
                      <th
                        key={col.id}
                        className={cn('border-b border-gray-200 px-3 py-3 text-left dark:border-white/10', stripe(i))}
                      >
                        {/* The remove button shares the kind line, so the name below
                            keeps the column's full width — eight columns must fit. */}
                        <div className="flex items-start justify-between gap-1">
                          <div className="min-w-0 break-words text-xs font-normal text-gray-500 dark:text-gray-400">
                            {head.kind}
                          </div>
                          <DeleteButton
                            className="-mr-2 -mt-1.5 shrink-0"
                            label={t('cmp.matrix.remove', { name: head.name })}
                            onClick={() => onChange(columns.filter((c) => c.id !== col.id))}
                          />
                        </div>
                        <div className="break-words font-medium text-brame-dark dark:text-gray-100">
                          {head.name}
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
                  return (
                    <tr
                      key={metric}
                      className="border-b border-gray-100 align-top last:border-0 dark:border-white/5"
                    >
                      <th
                        scope="row"
                        className="sticky left-0 z-10 bg-white dark:bg-brame-dark-light px-3 py-4 text-left font-medium text-brame-dark dark:text-gray-100"
                      >
                        {t(`metric.${metric}.label`)}
                      </th>
                      <td className="bg-brame-teal/10 px-3 py-4 align-top dark:bg-brame-lime/10">
                        <div className="tnum text-lg font-medium text-brame-dark dark:text-gray-100">
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
                      </td>
                      {drawn.map((col, i) => (
                        <td key={col.id} className={cn('px-3 py-4', stripe(i))}>
                          <Cell
                            metric={metric}
                            own={own}
                            stats={cells[i]?.stats?.[metric] ?? null}
                            single={cells[i]?.single}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
                <tr className="border-t border-gray-200 text-xs text-gray-500 dark:border-white/10 dark:text-gray-400">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-white dark:bg-brame-dark-light px-3 py-3 text-left font-medium text-brame-dark dark:text-gray-100"
                  >
                    {t('cmp.matrix.sample')}
                  </th>
                  <td className="bg-brame-teal/10 px-3 py-3 dark:bg-brame-lime/10">
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
                      <td key={col.id} className={cn('px-3 py-3', stripe(i))}>
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
                rootClassName="flex w-32 shrink-0 self-stretch p-2"
                className="w-[min(22rem,calc(100vw-1rem))] p-4"
                trigger={({ toggle }) => (
                  <button
                    type="button"
                    onClick={toggle}
                    className="group flex min-h-40 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 transition-colors hover:border-brame-teal/50 hover:bg-brame-teal/5 hover:text-brame-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brame-teal/50 dark:border-white/15 dark:text-gray-400 dark:hover:border-brame-lime/50 dark:hover:bg-brame-lime/10 dark:hover:text-brame-lime"
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
