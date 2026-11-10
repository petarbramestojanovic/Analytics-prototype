import { useMemo, useState, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { useI18n } from '@/i18n';
import { TODAY } from '@/lib/clock';
import { cn } from '@/lib/cn';
import { fmtMetric } from '@/lib/format';
import {
  Card,
  DeleteButton,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui';
import { FilterSelect, SectionTitle } from '@/components/page';
import type { BenchmarkCampaign } from '@/types';
import {
  BENCHMARK_METRICS,
  MIN_COMPARE_SAMPLE,
  SLICE_DIMS,
  rankBuckets,
  sliceStats,
  type BenchmarkMetric,
  type BenchmarkScope,
  type BucketRank,
  type SliceDim,
} from '../lib/benchmarks';
import { bucketName, dimLabel } from '../lib/compareLabels';
import type { CompareSubject } from '../lib/compareSubject';
import { MAX_COMPARE_CHARTS, type CompareChart } from '../lib/compareViews';

/** Buckets on the card itself; the rest open in a modal. */
const SHOWN = 10;

/** The dropdown is narrow, so a long metric name gets a short form there. */
const SHORT_METRIC_LABEL: Partial<Record<BenchmarkMetric, string>> = {
  engagementRate: 'cmp.charts.metricShort.engagementRate',
};

/** One ranked bucket: its name and value over a bar, with the KLEA average as
 *  a dashed tick on the track. */
function BucketRow({
  rank,
  own,
  metric,
  brame,
  max,
}: {
  rank: BucketRank;
  own: boolean;
  metric: BenchmarkMetric;
  brame: number | null;
  max: number;
}) {
  const { t } = useI18n();
  return (
    <li>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
        <span
          className={cn(
            'truncate',
            own
              ? 'font-semibold text-brame-dark dark:text-white'
              : 'text-gray-600 dark:text-gray-300',
          )}
          title={bucketName(t, rank.label)}
        >
          {bucketName(t, rank.label)}
        </span>
        <span className="tnum shrink-0 font-medium text-brame-dark dark:text-gray-100">
          {fmtMetric(metric, rank.avg)}
        </span>
      </div>
      <div className="relative h-2 rounded-full bg-gray-100 dark:bg-white/10">
        <div
          className={cn(
            'h-full rounded-full',
            own
              ? 'bg-brame-teal dark:bg-brame-turquoise'
              : 'bg-brame-teal/30 dark:bg-brame-turquoise/30',
          )}
          style={{ width: `${(rank.avg / max) * 100}%` }}
        />
        {brame !== null && (
          <span
            className="absolute -top-0.5 h-3 border-l border-dashed border-gray-500 dark:border-gray-400"
            style={{ left: `${(brame / max) * 100}%` }}
          />
        )}
      </div>
    </li>
  );
}

function BucketChart({
  pool,
  subject,
  scope,
  chart,
  onChange,
  onRemove,
}: {
  pool: BenchmarkCampaign[];
  subject: CompareSubject | null;
  scope?: BenchmarkScope;
  chart: CompareChart;
  onChange: (next: CompareChart) => void;
  onRemove: () => void;
}) {
  const { t } = useI18n();
  const [showAll, setShowAll] = useState(false);
  const { metric, by } = chart;
  const ranked = useMemo(
    () => rankBuckets(pool, TODAY, by, metric, scope),
    [pool, by, metric, scope],
  );
  const brame = useMemo(
    () => sliceStats(pool, TODAY, [], undefined, scope)[metric]?.avg ?? null,
    [pool, metric, scope],
  );

  // The bucket the subject sits in for this grouping (its own, for a client
  // or industry grouped by itself); none where it spans several.
  const ownKey = subject?.keys[by] ?? null;
  // Top of the ranking, but the subject's own bucket is always on screen even
  // when it ranks below the cut.
  const ownIdx = ranked.findIndex((r) => r.key === ownKey);
  const rows = ranked.slice(0, SHOWN);
  if (ownIdx >= SHOWN) rows[SHOWN - 1] = ranked[ownIdx];
  const hidden = ranked.length - rows.length;
  const max = Math.max(brame ?? 0, ...rows.map((r) => r.avg)) || 1;
  const maxAll = Math.max(brame ?? 0, ...ranked.map((r) => r.avg)) || 1;

  return (
    <div className="flex min-w-0 flex-col rounded-xl border border-gray-200 p-4 dark:border-white/10">
      <div className="mb-3 flex items-center gap-1.5">
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-1.5">
          <FilterSelect
            className="min-w-0"
            value={metric}
            onChange={(m) => onChange({ ...chart, metric: m as BenchmarkMetric })}
            options={BENCHMARK_METRICS.map((m) => ({
              value: m,
              label: t(SHORT_METRIC_LABEL[m] ?? `metric.${m}.label`),
            }))}
          />
          <FilterSelect
            className="min-w-0"
            value={by}
            onChange={(d) => onChange({ ...chart, by: d as SliceDim })}
            options={SLICE_DIMS.map((d) => ({ value: d, label: dimLabel(t, d) }))}
          />
        </div>
        <DeleteButton field label={t('cmp.charts.remove')} onClick={onRemove} />
      </div>

      {rows.length === 0 ? (
        <p className="py-6 text-sm text-gray-500 dark:text-gray-400">
          {t('cmp.charts.none', { min: MIN_COMPARE_SAMPLE })}
        </p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r) => (
            <BucketRow
              key={r.key}
              rank={r}
              own={r.key === ownKey}
              metric={metric}
              brame={brame}
              max={max}
            />
          ))}
        </ul>
      )}

      <div className="mt-auto pt-3 text-[11px] text-gray-500 dark:text-gray-400">
        {hidden > 0 && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            aria-label={t('cmp.charts.moreOpen', { count: ranked.length })}
            className="rounded font-medium text-brame-teal hover:underline dark:text-brame-turquoise"
          >
            {t('cmp.charts.more', { count: hidden })}
          </button>
        )}
        {brame !== null && (
          <div>{t('cmp.charts.average', { value: fmtMetric(metric, brame) })}</div>
        )}
      </div>

      <Dialog open={showAll} onOpenChange={setShowAll}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t('cmp.charts.modalTitle', {
                metric: t(`metric.${metric}.label`),
                dim: dimLabel(t, by),
              })}
            </DialogTitle>
            <DialogDescription>
              {t('cmp.charts.modalBody', { count: ranked.length })}
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-2.5">
            {ranked.map((r) => (
              <BucketRow
                key={r.key}
                rank={r}
                own={r.key === ownKey}
                metric={metric}
                brame={brame}
                max={maxAll}
              />
            ))}
          </ul>
          {brame !== null && (
            <p className="mt-4 text-[11px] text-gray-500 dark:text-gray-400">
              {t('cmp.charts.average', { value: fmtMetric(metric, brame) })}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** The empty slot after the last chart: click to add one. It is a grid cell
 *  like the charts, so on hover it fills exactly the space a new chart takes. */
function AddChartSlot({ onAdd }: { onAdd: () => void }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={onAdd}
      className="group flex min-h-48 min-w-0 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500 transition-colors hover:border-brame-teal/50 hover:bg-brame-teal/5 hover:text-brame-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brame-teal/50 dark:border-white/15 dark:text-gray-400 dark:hover:border-brame-turquoise/50 dark:hover:bg-brame-turquoise/10 dark:hover:text-brame-turquoise"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-current">
        <Plus size={16} />
      </span>
      {t('cmp.charts.add')}
    </button>
  );
}

/**
 * Up to MAX_COMPARE_CHARTS ranked-bucket charts in one row. Each picks its own
 * metric and grouping; the picked campaign's, client's or industry's bucket (if
 * any) is highlighted in each. With a `scope`, the ranking covers that period and those markets
 * instead of the rolling 12 months. While there is room, an empty "Add chart"
 * slot sits after the last chart. `actions` sits in the header — the Overview
 * puts its saved-views menu there.
 */
export function CompareCharts({
  pool,
  subject,
  charts,
  onChange,
  scope,
  actions,
}: {
  pool: BenchmarkCampaign[];
  subject: CompareSubject | null;
  charts: CompareChart[];
  onChange: (charts: CompareChart[]) => void;
  scope?: BenchmarkScope;
  actions?: ReactNode;
}) {
  const { t } = useI18n();
  const full = charts.length >= MAX_COMPARE_CHARTS;

  const add = () =>
    onChange([...charts, { id: `c-${Date.now().toString(36)}`, metric: 'ctr', by: 'industry' }]);

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-3xl">
          <SectionTitle
            hint={t(subject ? 'cmp.charts.hint' : 'cmp.charts.hintPortfolio', {
              max: MAX_COMPARE_CHARTS,
            })}
          >
            {t('cmp.charts.title')}
          </SectionTitle>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {charts.map((chart) => (
          <BucketChart
            key={chart.id}
            pool={pool}
            subject={subject}
            scope={scope}
            chart={chart}
            onChange={(next) => onChange(charts.map((c) => (c.id === chart.id ? next : c)))}
            onRemove={() => onChange(charts.filter((c) => c.id !== chart.id))}
          />
        ))}
        {!full && <AddChartSlot onAdd={add} />}
      </div>
      <div className="mt-4 flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
        <span
          aria-hidden
          className="h-3 border-l border-dashed border-gray-500 dark:border-gray-400"
        />
        {t('cmp.charts.legend')}
      </div>
    </Card>
  );
}
