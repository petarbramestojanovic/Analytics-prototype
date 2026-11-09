import { useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useI18n, type TranslateFn } from '@/i18n';
import { TODAY } from '@/lib/clock';
import { cn } from '@/lib/cn';
import { EMPTY_VALUE, fmtMetric } from '@/lib/format';
import { Button, Card, Popover } from '@/components/ui';
import { FilterSelect, SectionTitle } from '@/components/page';
import type { BenchmarkCampaign } from '@/types';
import {
  BENCHMARK_METRICS,
  MIN_COMPARE_SAMPLE,
  SLICE_DIMS,
  meetsSample,
  sliceKey,
  sliceLabel,
  sliceOptions,
  sliceStats,
  type BenchmarkMetric,
  type SliceDim,
  type SlicePart,
  type Stats,
} from '../lib/benchmarks';
import { bucketName, dimLabel } from '../lib/compareLabels';
import {
  BRAME_COLUMN,
  MAX_MATRIX_COLUMNS,
  fixedColumn,
  ownColumn,
  type MatrixColumn,
} from '../lib/compareViews';

const partsFor = (col: MatrixColumn, campaign: BenchmarkCampaign): SlicePart[] =>
  col.kind === 'brame'
    ? []
    : col.kind === 'own'
      ? col.dims.map((dim) => ({ dim, value: sliceKey(campaign, dim) }))
      : [{ dim: col.dim, value: col.value }];

/** A column's two header lines: what kind of benchmark, and which bucket. */
function headerOf(col: MatrixColumn, campaign: BenchmarkCampaign | null, t: TranslateFn) {
  if (col.kind === 'brame') return { kind: t('cmp.matrix.brame'), name: t('cmp.matrix.network') };
  if (col.kind === 'fixed') {
    return { kind: `${dimLabel(t, col.dim)} · ${t('cmp.matrix.specific')}`, name: col.label };
  }
  return {
    kind: col.dims.map((d) => dimLabel(t, d)).join(' × '),
    name: campaign
      ? col.dims.map((d) => bucketName(t, sliceLabel(campaign, d))).join(' · ')
      : EMPTY_VALUE,
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
}: {
  metric: BenchmarkMetric;
  own: number | null;
  stats: Stats | null;
  max: number;
}) {
  const { t } = useI18n();
  if (!stats) return <span className="text-gray-300 dark:text-gray-600">{EMPTY_VALUE}</span>;
  if (stats.n < MIN_COMPARE_SAMPLE) {
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
 * The matrix: metrics down, benchmarks across. The campaign is always the first
 * column; every other column can be removed, and more can be added up to
 * MAX_MATRIX_COLUMNS — the campaign's own client / market / industry / account
 * (alone or combined), a specific bucket, or KLEA overall.
 */
export function CompareMatrix({
  pool,
  campaign,
  columns,
  onChange,
}: {
  pool: BenchmarkCampaign[];
  campaign: BenchmarkCampaign | null;
  columns: MatrixColumn[];
  onChange: (columns: MatrixColumn[]) => void;
}) {
  const { t } = useI18n();
  const full = columns.length >= MAX_MATRIX_COLUMNS;

  const cells = useMemo(
    () =>
      campaign
        ? columns.map((col) => sliceStats(pool, TODAY, partsFor(col, campaign), campaign.id))
        : columns.map(() => null),
    [pool, campaign, columns],
  );

  const add = (col: MatrixColumn) => {
    if (full || columns.some((c) => c.id === col.id)) return;
    onChange([...columns, col]);
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
          <Popover
            align="end"
            className="w-[min(22rem,calc(100vw-1rem))] p-4"
            trigger={({ toggle }) => (
              <Button size="sm" icon={<Plus size={14} />} onClick={toggle} disabled={full}>
                {full ? t('cmp.matrix.max', { max: MAX_MATRIX_COLUMNS }) : t('cmp.matrix.add')}
              </Button>
            )}
          >
            {(close) => (
              <AddColumnPanel
                pool={pool}
                existing={columns}
                onAdd={(col) => {
                  add(col);
                  close();
                }}
              />
            )}
          </Popover>
        </div>
      </div>

      {!campaign ? (
        <p className="px-5 pb-5 text-sm text-gray-500 dark:text-gray-400">
          {t('cmp.matrix.noCampaign')}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-max border-collapse text-sm">
            <thead>
              <tr className="align-top">
                <th className="w-36 min-w-36" />
                <th className="min-w-44 border-b border-brame-teal/30 bg-brame-teal/10 px-4 py-3 text-left dark:bg-brame-turquoise/10">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {t('cmp.matrix.campaign')}
                  </div>
                  <div className="font-semibold text-brame-dark dark:text-gray-100">
                    {campaign.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {campaign.companyName}
                  </div>
                </th>
                {columns.map((col) => {
                  const head = headerOf(col, campaign, t);
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
                        <button
                          type="button"
                          aria-label={t('cmp.matrix.remove', { name: head.name })}
                          onClick={() => onChange(columns.filter((c) => c.id !== col.id))}
                          className="mt-0.5 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-brame-dark dark:hover:bg-white/10 dark:hover:text-gray-100"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {BENCHMARK_METRICS.map((metric) => {
                const max = Math.max(
                  campaign[metric] ?? 0,
                  ...cells.map((c) => (meetsSample(c?.[metric]) ? c![metric]!.avg : 0)),
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
                        {campaign[metric] === null
                          ? EMPTY_VALUE
                          : fmtMetric(metric, campaign[metric])}
                      </div>
                      <div className="mt-[22px] h-1 overflow-hidden rounded-full bg-brame-teal/15 dark:bg-white/10">
                        <div
                          className="h-full rounded-full bg-brame-teal dark:bg-brame-turquoise"
                          style={{
                            width: `${max && campaign[metric] ? Math.min(100, (campaign[metric]! / max) * 100) : 0}%`,
                          }}
                        />
                      </div>
                    </td>
                    {columns.map((col, i) => (
                      <td key={col.id} className="px-4 py-4">
                        <Cell
                          metric={metric}
                          own={campaign[metric]}
                          stats={cells[i]?.[metric] ?? null}
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
                  {t('cmp.matrix.sampleValue', { n: 1 })}
                </td>
                {columns.map((col, i) => {
                  const n = Math.max(0, ...BENCHMARK_METRICS.map((m) => cells[i]?.[m]?.n ?? 0));
                  return (
                    <td key={col.id} className="px-4 py-3">
                      {n ? t('cmp.matrix.sampleValue', { n }) : EMPTY_VALUE}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
          {columns.length === 0 && (
            <p className="px-5 pb-5 text-sm text-gray-500 dark:text-gray-400">
              {t('cmp.matrix.empty')}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

type AddTarget = SliceDim | 'brame';
const OWN = '__own__';

/** Two dropdowns: what to compare against, then which one. The second follows
 *  the first — "Same as the campaign" or one specific bucket of that kind. */
function AddColumnPanel({
  pool,
  existing,
  onAdd,
}: {
  pool: BenchmarkCampaign[];
  existing: MatrixColumn[];
  onAdd: (col: MatrixColumn) => void;
}) {
  const { t } = useI18n();
  const [target, setTarget] = useState<AddTarget>('industry');
  const [value, setValue] = useState(OWN);

  const options = useMemo(
    () => (target === 'brame' ? [] : sliceOptions(pool, TODAY, target)),
    [pool, target],
  );

  const column: MatrixColumn =
    target === 'brame'
      ? BRAME_COLUMN
      : value === OWN
        ? ownColumn([target])
        : fixedColumn(target, value, bucketName(t, options.find((o) => o.value === value)?.label));
  const taken = existing.some((c) => c.id === column.id);

  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-brame-dark dark:text-gray-100">
        {t('cmp.add.title')}
      </div>
      <FilterSelect
        className="w-full"
        value={target}
        onChange={(v) => {
          setTarget(v as AddTarget);
          setValue(OWN);
        }}
        options={[
          ...SLICE_DIMS.map((d) => ({ value: d, label: dimLabel(t, d) })),
          { value: 'brame', label: t('cmp.add.brame') },
        ]}
      />
      {target === 'brame' ? (
        <FilterSelect
          className="w-full"
          value={OWN}
          onChange={() => {}}
          options={[{ value: OWN, label: t('cmp.matrix.network') }]}
        />
      ) : (
        <FilterSelect
          className="w-full"
          value={value}
          onChange={setValue}
          options={[
            { value: OWN, label: t('cmp.add.sameAsCampaign') },
            ...options.map((o) => ({ value: o.value, label: bucketName(t, o.label) })),
          ]}
        />
      )}
      <div className="flex justify-end pt-1">
        <Button variant="primary" size="sm" disabled={taken} onClick={() => onAdd(column)}>
          {taken ? t('cmp.add.exists') : t('cmp.add.submit')}
        </Button>
      </div>
    </div>
  );
}
