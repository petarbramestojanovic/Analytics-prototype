import { useMemo } from 'react';
import { Download, Layers } from 'lucide-react';
import { useI18n } from '@/i18n';
import { TODAY } from '@/lib/clock';
import { exportToXlsx } from '@/lib/exportXlsx';
import { EMPTY_VALUE, fmtCompact, fmtInt, fmtMetric, fmtPct } from '@/lib/format';
import { Button, Callout, Card, Pill, ProgressBar } from '@/components/ui';
import { SectionTitle } from '@/components/page';
import { Table, Td, Th, Tr } from '@/components/table';
import type { BenchmarkCreative } from '@/types';
import { TrendIcon } from './TrendIndicator';
import {
  BENCHMARK_METRICS,
  groupMechanics,
  meetsSample,
  MIN_COMPARE_SAMPLE,
  type BenchmarkMetric,
  type MechanicGroup,
  type Trend,
} from '../lib/benchmarks';

const MONTH_MS = 30 * 86_400_000;

/** Creatives started in the last three months against the three before — the
 *  demand signal for a mechanic, which is about how often it is booked. */
function demandTrend(group: MechanicGroup) {
  const now = TODAY.getTime();
  const starts = group.creatives.map((c) => new Date(c.flightStart).getTime());
  const recent = starts.filter((s) => s >= now - 3 * MONTH_MS).length;
  const prior = starts.filter((s) => s >= now - 6 * MONTH_MS && s < now - 3 * MONTH_MS).length;
  const trend: Trend = recent > prior ? 'improving' : recent < prior ? 'declining' : 'stable';
  return { recent, prior, trend };
}

/**
 * Benchmarks by game mechanic (Tap to Reveal, Matchmaker, Carousel …), BRAME
 * view only. A mechanic belongs to a creative — one size, one mechanic — and a
 * campaign can run several, so this counts and averages creatives, not
 * campaigns. The list of mechanics is whatever the data holds, so a new one
 * appears as soon as it is booked. Deliberately one level and no finer: split
 * by market or industry a mechanic would stand on one or two flights. An
 * average appears once at least MIN_COMPARE_SAMPLE creatives back it; how often
 * a mechanic is booked always shows, which is the other use: what to invest in
 * and what to retire.
 */
export function MechanicsView({ creatives }: { creatives: BenchmarkCreative[] }) {
  const { t } = useI18n();
  const groups = useMemo(() => groupMechanics(creatives, TODAY), [creatives]);
  const totalCreatives = groups.reduce((sum, g) => sum + g.creativeCount, 0);
  const top = groups[0];
  const lowDemand = groups.filter((g) => totalCreatives && g.creativeCount / totalCreatives < 0.08);

  const metricCell = (g: MechanicGroup, m: BenchmarkMetric) => {
    const stats = g.stats[m];
    if (!stats) return <span className="text-gray-300 dark:text-gray-600">{EMPTY_VALUE}</span>;
    if (stats.n < MIN_COMPARE_SAMPLE) {
      return (
        <span
          className="text-xs text-gray-400 dark:text-gray-500"
          title={t('mechanics.needs', { min: MIN_COMPARE_SAMPLE })}
        >
          {t('mechanics.thin', { n: stats.n })}
        </span>
      );
    }
    return <span className="tnum font-semibold">{fmtMetric(m, stats.avg)}</span>;
  };

  const exportRows = () =>
    exportToXlsx('benchmarks-mechanics.xlsx', groups, [
      { key: 'mechanic', header: t('mechanics.col.mechanic') },
      { key: 'creativeCount', header: t('mechanics.col.creatives') },
      { key: 'campaignCount', header: t('mechanics.col.campaigns') },
      {
        key: 'share',
        header: t('mechanics.col.share'),
        format: (g: MechanicGroup) =>
          fmtPct(totalCreatives ? g.creativeCount / totalCreatives : 0, 0),
      },
      { key: 'impressions', header: t('mechanics.col.impressions') },
      ...BENCHMARK_METRICS.map((m) => ({
        key: m,
        header: t(`metric.${m}.label`),
        format: (g: MechanicGroup) =>
          meetsSample(g.stats[m]) ? fmtMetric(m, g.stats[m]!.avg) : EMPTY_VALUE,
      })),
    ]);

  return (
    <div className="space-y-5">
      <Callout>{t('mechanics.note', { min: MIN_COMPARE_SAMPLE })}</Callout>

      <Card padded={false}>
        <div className="flex flex-wrap items-start justify-between gap-3 p-5 pb-3">
          <SectionTitle hint={t('mechanics.hint')}>
            <span className="inline-flex items-center gap-2">
              <Layers size={16} className="text-brame-teal" />
              {t('mechanics.title')}
            </span>
          </SectionTitle>
          <Button icon={<Download size={13} />} onClick={exportRows} disabled={groups.length === 0}>
            {t('common.exportCsv')}
          </Button>
        </div>

        {top && (
          <div className="flex flex-wrap gap-x-8 gap-y-1 px-5 pb-4 text-sm text-gray-500 dark:text-gray-400">
            <span>
              {t('mechanics.mostBooked')}{' '}
              <strong className="text-brame-dark dark:text-gray-100">
                {top.mechanic} ({fmtPct(top.creativeCount / totalCreatives, 0)})
              </strong>
            </span>
            {lowDemand.length > 0 && (
              <span>
                {t('mechanics.lowDemand')}{' '}
                <strong className="text-brame-dark dark:text-gray-100">
                  {lowDemand.map((g) => g.mechanic).join(', ')}
                </strong>
              </span>
            )}
          </div>
        )}

        <Table>
          <thead>
            <tr>
              <Th>{t('mechanics.col.mechanic')}</Th>
              <Th align="right">{t('mechanics.col.creatives')}</Th>
              <Th align="right">{t('mechanics.col.campaigns')}</Th>
              <Th>{t('mechanics.col.share')}</Th>
              <Th align="center">{t('mechanics.col.demand')}</Th>
              <Th align="right">{t('mechanics.col.impressions')}</Th>
              {BENCHMARK_METRICS.map((m) => (
                <Th key={m} align="center">
                  {t(`metric.${m}.label`)}
                </Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => {
              const share = totalCreatives ? g.creativeCount / totalCreatives : 0;
              const demand = demandTrend(g);
              return (
                <Tr key={g.mechanic}>
                  <Td className="font-medium text-brame-dark dark:text-gray-100">
                    {g.mechanic}
                    {share < 0.08 && (
                      <span className="ml-2 inline-flex align-middle">
                        <Pill tone="amber">{t('mechanics.lowDemandPill')}</Pill>
                      </span>
                    )}
                  </Td>
                  <Td align="right">{fmtInt(g.creativeCount)}</Td>
                  <Td align="right">{fmtInt(g.campaignCount)}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <ProgressBar
                        value={share / (groups[0].creativeCount / totalCreatives || 1)}
                        size="sm"
                        className="w-24"
                      />
                      <span className="tnum text-xs text-gray-500 dark:text-gray-400">
                        {fmtPct(share, 0)}
                      </span>
                    </div>
                  </Td>
                  <Td align="center">
                    <span
                      className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400"
                      title={t('mechanics.demandTitle', {
                        recent: demand.recent,
                        prior: demand.prior,
                      })}
                    >
                      <TrendIcon trend={demand.trend} />
                      <span className="tnum">
                        {demand.recent} / {demand.prior}
                      </span>
                    </span>
                  </Td>
                  <Td align="right">{fmtCompact(g.impressions)}</Td>
                  {BENCHMARK_METRICS.map((m) => (
                    <Td key={m} align="center">
                      {metricCell(g, m)}
                    </Td>
                  ))}
                </Tr>
              );
            })}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
