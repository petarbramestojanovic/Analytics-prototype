import { useMemo, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { useI18n } from '@/i18n';
import { TODAY } from '@/lib/clock';
import { cn } from '@/lib/cn';
import { fmtMetric } from '@/lib/format';
import { Button, Card, DeleteButton } from '@/components/ui';
import { FilterSelect, SectionTitle } from '@/components/page';
import type { BenchmarkCampaign } from '@/types';
import {
  BENCHMARK_METRICS,
  MIN_COMPARE_SAMPLE,
  SLICE_DIMS,
  rankBuckets,
  sliceKey,
  sliceStats,
  type BenchmarkMetric,
  type BenchmarkScope,
  type SliceDim,
} from '../lib/benchmarks';
import { bucketName, dimLabel } from '../lib/compareLabels';
import { MAX_COMPARE_CHARTS, type CompareChart } from '../lib/compareViews';

const SHOWN = 8;

function BucketChart({
  pool,
  campaign,
  scope,
  chart,
  onChange,
  onRemove,
}: {
  pool: BenchmarkCampaign[];
  campaign: BenchmarkCampaign | null;
  scope?: BenchmarkScope;
  chart: CompareChart;
  onChange: (next: CompareChart) => void;
  onRemove: () => void;
}) {
  const { t } = useI18n();
  const { metric, by } = chart;
  const ranked = useMemo(
    () => rankBuckets(pool, TODAY, by, metric, scope),
    [pool, by, metric, scope],
  );
  const brame = useMemo(
    () => sliceStats(pool, TODAY, [], undefined, scope)[metric]?.avg ?? null,
    [pool, metric, scope],
  );

  const ownKey = campaign ? sliceKey(campaign, by) : null;
  // Top of the ranking, but the campaign's own bucket is always on screen even
  // when it ranks below the cut.
  const ownIdx = ranked.findIndex((r) => r.key === ownKey);
  const rows = ranked.slice(0, SHOWN);
  if (ownIdx >= SHOWN) rows[SHOWN - 1] = ranked[ownIdx];
  const hidden = ranked.length - rows.length;
  const max = Math.max(brame ?? 0, ...rows.map((r) => r.avg)) || 1;

  return (
    <div className="flex min-w-0 flex-col rounded-xl border border-gray-200 p-4 dark:border-white/10">
      <div className="mb-3 flex items-center gap-1.5">
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-1.5">
          <FilterSelect
            className="min-w-0"
            value={metric}
            onChange={(m) => onChange({ ...chart, metric: m as BenchmarkMetric })}
            options={BENCHMARK_METRICS.map((m) => ({ value: m, label: t(`metric.${m}.label`) }))}
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
          {rows.map((r) => {
            const own = r.key === ownKey;
            return (
              <li key={r.key}>
                <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                  <span
                    className={cn(
                      'truncate',
                      own
                        ? 'font-semibold text-brame-dark dark:text-white'
                        : 'text-gray-600 dark:text-gray-300',
                    )}
                    title={bucketName(t, r.label)}
                  >
                    {bucketName(t, r.label)}
                  </span>
                  <span className="tnum shrink-0 font-medium text-brame-dark dark:text-gray-100">
                    {fmtMetric(metric, r.avg)}
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
                    style={{ width: `${(r.avg / max) * 100}%` }}
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
          })}
        </ul>
      )}

      <div className="mt-auto pt-3 text-[11px] text-gray-500 dark:text-gray-400">
        {hidden > 0 && <div>{t('cmp.charts.more', { count: hidden })}</div>}
        {brame !== null && (
          <div>{t('cmp.charts.average', { value: fmtMetric(metric, brame) })}</div>
        )}
      </div>
    </div>
  );
}

/**
 * Up to MAX_COMPARE_CHARTS ranked-bucket charts in one row. Each picks its own
 * metric and grouping; the picked campaign's bucket (if any) is highlighted in
 * each. With a `scope`, the ranking covers that period and those markets
 * instead of the rolling 12 months. `actions` sits next to the Add button —
 * the Overview puts its saved-views menu there.
 */
export function CompareCharts({
  pool,
  campaign,
  charts,
  onChange,
  scope,
  actions,
}: {
  pool: BenchmarkCampaign[];
  campaign: BenchmarkCampaign | null;
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
            hint={t(campaign ? 'cmp.charts.hint' : 'cmp.charts.hintPortfolio', {
              max: MAX_COMPARE_CHARTS,
            })}
          >
            {t('cmp.charts.title')}
          </SectionTitle>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          <Button size="sm" icon={<Plus size={14} />} onClick={add} disabled={full}>
            {full ? t('cmp.charts.max', { max: MAX_COMPARE_CHARTS }) : t('cmp.charts.add')}
          </Button>
        </div>
      </div>
      {charts.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('cmp.charts.empty')}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {charts.map((chart) => (
            <BucketChart
              key={chart.id}
              pool={pool}
              campaign={campaign}
              scope={scope}
              chart={chart}
              onChange={(next) => onChange(charts.map((c) => (c.id === chart.id ? next : c)))}
              onRemove={() => onChange(charts.filter((c) => c.id !== chart.id))}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
