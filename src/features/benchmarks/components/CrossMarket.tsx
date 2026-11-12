import { useMemo, useState } from 'react';
import { useI18n } from '@/i18n';
import { TODAY } from '@/lib/clock';
import { cn } from '@/lib/cn';
import { EMPTY_VALUE, fmtCompact, fmtMetric } from '@/lib/format';
import { Card } from '@/components/ui';
import { FilterSelect, SectionTitle } from '@/components/page';
import type { BenchmarkCampaign } from '@/types';
import {
  MIN_COMPARE_SAMPLE,
  marketSplit,
  meetsSample,
  type MarketSplitRow,
  type Stats,
} from '../lib/benchmarks';

type MetricKey = 'ctr' | 'engagementRate' | 'clicks' | 'viewability';

interface MetricDef {
  key: MetricKey;
  stats: (r: Pick<MarketSplitRow, 'stats' | 'clicks'>) => Stats | null;
  format: (avg: number) => string;
}

const METRICS: MetricDef[] = [
  { key: 'ctr', stats: (r) => r.stats.ctr, format: (v) => fmtMetric('ctr', v) },
  {
    key: 'engagementRate',
    stats: (r) => r.stats.engagementRate,
    format: (v) => fmtMetric('engagementRate', v),
  },
  { key: 'clicks', stats: (r) => r.clicks, format: (v) => fmtCompact(Math.round(v)) },
  {
    key: 'viewability',
    stats: (r) => r.stats.viewability,
    format: (v) => fmtMetric('viewability', v),
  },
];

const metricLabelKey = (k: MetricKey) =>
  k === 'clicks' ? 'metric.ctaClicks.label' : `metric.${k}.label`;

/** The industry whose CTR clears the sample floor in the most markets (then the
 *  most campaigns), and those markets — a comparison that reads straight away. */
function startingPoint(pool: BenchmarkCampaign[]): { industry: string; markets: string[] } {
  const options = [...new Set(pool.map((c) => c.industry))].map((industry) => {
    const rows = marketSplit(pool, TODAY, [industry]).rows;
    const byCount = [...rows].sort((x, y) => y.campaigns - x.campaigns);
    const solid = byCount.filter((r) => meetsSample(r.stats.ctr));
    // Thin markets fill the remaining slots, so two countries are always shown.
    const fill = byCount.filter((r) => !solid.includes(r));
    return {
      industry,
      solid: solid.map((r) => r.market),
      ordered: [...solid, ...fill].map((r) => r.market),
      total: rows.reduce((n, r) => n + r.campaigns, 0),
    };
  });
  options.sort(
    (x, y) =>
      y.solid.length - x.solid.length || y.total - x.total || x.industry.localeCompare(y.industry),
  );
  const best = options[0];
  return { industry: best?.industry ?? '', markets: (best?.ordered ?? []).slice(0, 2) };
}

const signed = (n: number, text: string) =>
  Number(text) === 0 ? text : `${n < 0 ? '−' : '+'}${text}`;

/** How a market differs from the base, in brackets: percentage points for a
 *  rate, a plain count for clicks. Green above the base, red below — higher is
 *  better for every metric here. */
function Delta({ diff, isCount }: { diff: number; isCount: boolean }) {
  const text = isCount
    ? signed(diff, fmtCompact(Math.abs(Math.round(diff))))
    : `${signed(diff, (Math.abs(diff) * 100).toFixed(2))} pp`;
  // A difference that rounds to nothing is neither better nor worse.
  const level = /^[+−]/.test(text) ? (diff >= 0 ? 'up' : 'down') : 'same';
  return (
    <span
      className={cn(
        'tnum ml-1.5 whitespace-nowrap text-xs font-medium',
        level === 'up' && 'text-green-600 dark:text-green-400',
        level === 'down' && 'text-red-600 dark:text-red-400',
        level === 'same' && 'text-gray-500 dark:text-gray-400',
      )}
    >
      ({text})
    </span>
  );
}

function BaseBadge() {
  const { t } = useI18n();
  return (
    <span className="rounded bg-brame-teal/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brame-teal dark:bg-brame-turquoise/15 dark:text-brame-turquoise">
      {t('cmp.cross.base')}
    </span>
  );
}

/**
 * One industry, several markets: pick the industry and a metric, tick the
 * countries, and read a bar per country for the metric and every metric side
 * by side underneath. One country is the **base** (the first one picked, or
 * whichever you make the base): every other column shows, in brackets, how it
 * differs from it. Independent of what is picked at the top of the page.
 */
export function CrossMarket({ pool }: { pool: BenchmarkCampaign[] }) {
  const { t, dateLocale } = useI18n();
  // Start where there is a comparison to read straight away.
  const [start] = useState(() => startingPoint(pool));
  const [industry, setIndustry] = useState(start.industry);
  const [metricKey, setMetricKey] = useState<MetricKey>('ctr');
  // Never empty — the busiest countries of the starting industry to begin with.
  const [picked, setPicked] = useState<string[]>(start.markets);

  const industries = useMemo(() => [...new Set(pool.map((c) => c.industry))].sort(), [pool]);
  const markets = useMemo(() => [...new Set(pool.map((c) => c.market))].sort(), [pool]);
  const split = useMemo(() => marketSplit(pool, TODAY, [industry]), [pool, industry]);

  const countryName = useMemo(() => {
    try {
      const names = new Intl.DisplayNames([dateLocale], { type: 'region' });
      return (code: string) => names.of(code) ?? code;
    } catch {
      return (code: string) => code;
    }
  }, [dateLocale]);

  // A click adds a country (after the ones already picked) or drops it — but
  // never the last one.
  const toggleMarket = (m: string) =>
    setPicked((p) => (p.includes(m) ? (p.length > 1 ? p.filter((x) => x !== m) : p) : [...p, m]));

  const metric = METRICS.find((m) => m.key === metricKey) ?? METRICS[0];
  const isCount = metric.key === 'clicks';

  // The base is the first country picked until another is made the base; it
  // always leads the columns.
  const [wantedBase, setBase] = useState<string | null>(null);
  const base = wantedBase && picked.includes(wantedBase) ? wantedBase : picked[0];
  const rows = [base, ...picked.filter((m) => m !== base)].map((m) => ({
    market: m,
    row: split.rows.find((r) => r.market === m) ?? null,
  }));
  const baseRow = rows[0]?.row ?? null;

  /** How a market differs from the base for one metric — none for the base
   *  itself, or when either side is under the sample floor. */
  const diffFor = (m: MetricDef, market: string, row: MarketSplitRow | null): number | null => {
    if (market === base || !row || !baseRow) return null;
    const own = m.stats(row);
    const ref = m.stats(baseRow);
    return meetsSample(own) && meetsSample(ref) ? own.avg - ref.avg : null;
  };

  const max = Math.max(0, ...rows.map((r) => (r.row ? (metric.stats(r.row)?.avg ?? 0) : 0))) || 1;

  return (
    <Card>
      <div className="min-w-0 max-w-2xl">
        <SectionTitle hint={t('cmp.cross.hint', { min: MIN_COMPARE_SAMPLE })}>
          {t('cmp.cross.title')}
        </SectionTitle>
      </div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {/* Every country is a chip you can switch on and off. */}
        <div
          role="group"
          aria-label={t('cmp.cross.markets')}
          className="flex min-w-0 flex-1 flex-wrap gap-1.5"
        >
          {markets.map((m) => {
            const on = picked.includes(m);
            return (
              <button
                key={m}
                type="button"
                aria-pressed={on}
                onClick={() => toggleMarket(m)}
                className={cn(
                  'tnum rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brame-teal/50',
                  on
                    ? 'border-brame-teal bg-brame-teal text-white dark:border-brame-turquoise dark:bg-brame-turquoise dark:text-brame-dark'
                    : 'border-gray-200 text-gray-600 hover:border-brame-teal/50 hover:bg-brame-teal/5 dark:border-white/15 dark:text-gray-300 dark:hover:border-brame-turquoise/50 dark:hover:bg-brame-turquoise/10',
                )}
              >
                {countryName(m)}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterSelect
            className="w-44"
            value={industry}
            onChange={setIndustry}
            options={industries.map((i) => ({ value: i, label: i }))}
          />
          <FilterSelect
            className="w-40"
            value={metricKey}
            onChange={(k) => setMetricKey(k as MetricKey)}
            options={METRICS.map((m) => ({ value: m.key, label: t(metricLabelKey(m.key)) }))}
          />
        </div>
      </div>

      <div className="mb-5 rounded-lg bg-gray-50 px-4 py-3 dark:bg-white/5">
        {rows.length >= 2 ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <BaseBadge />
            <span className="font-medium text-brame-dark dark:text-gray-100">
              {countryName(base)}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {t('cmp.cross.baseNote', { market: countryName(base) })}
            </span>
          </div>
        ) : (
          <span className="text-sm text-gray-500 dark:text-gray-400">{t('cmp.cross.pickTwo')}</span>
        )}
      </div>

      <ul className="mb-6 space-y-2.5">
        {rows.map(({ market, row }) => {
          const s = row ? metric.stats(row) : null;
          return (
            <li
              key={market}
              className="grid grid-cols-[9rem_minmax(0,1fr)_9rem] items-center gap-3 text-sm"
            >
              <span className="flex min-w-0 items-center gap-1.5 font-medium text-brame-dark dark:text-gray-100">
                <span className="truncate">{countryName(market)}</span>
                {rows.length >= 2 && market === base && <BaseBadge />}
              </span>
              {!row ? (
                <span className="col-span-2 text-xs text-gray-500 dark:text-gray-400">
                  {t('cmp.cross.noCampaigns', { industry })}
                </span>
              ) : !s || s.n < MIN_COMPARE_SAMPLE ? (
                <span className="col-span-2 text-xs text-gray-400 dark:text-gray-500">
                  {s ? t('cmp.matrix.thin', { n: s.n, min: MIN_COMPARE_SAMPLE }) : EMPTY_VALUE}
                </span>
              ) : (
                <>
                  <div className="h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                    <div
                      className="h-full rounded-full bg-brame-teal"
                      style={{ width: `${(s.avg / max) * 100}%` }}
                    />
                  </div>
                  <span className="tnum text-right font-semibold text-brame-dark dark:text-gray-100">
                    {metric.format(s.avg)}
                    {diffFor(metric, market, row) !== null && (
                      <Delta diff={diffFor(metric, market, row)!} isCount={isCount} />
                    )}
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ul>

      <div className="overflow-x-auto">
        <table className="w-full min-w-max text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs text-gray-500 dark:border-white/10 dark:text-gray-400">
              <th className="py-2 pr-4 text-left font-semibold">{industry}</th>
              {rows.map((r) => (
                <th key={r.market} className="px-4 py-2 text-right font-medium">
                  <div className="flex items-center justify-end gap-1.5">
                    {r.market}
                    {rows.length >= 2 && r.market === base && <BaseBadge />}
                  </div>
                  {rows.length >= 2 && r.market !== base && (
                    <button
                      type="button"
                      onClick={() => setBase(r.market)}
                      className="mt-0.5 text-[11px] font-normal text-brame-teal hover:underline dark:text-brame-turquoise"
                    >
                      {t('cmp.cross.makeBase')}
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {METRICS.map((m) => (
              <tr key={m.key} className="border-b border-gray-100 dark:border-white/5">
                <th
                  scope="row"
                  className="py-2.5 pr-4 text-left font-medium text-brame-dark dark:text-gray-100"
                >
                  {t(metricLabelKey(m.key))}
                </th>
                {rows.map(({ market, row }) => {
                  const s = row ? m.stats(row) : null;
                  return (
                    <td
                      key={market}
                      className="tnum px-4 py-2.5 text-right text-brame-dark dark:text-gray-100"
                    >
                      {s && s.n >= MIN_COMPARE_SAMPLE ? (
                        <>
                          {m.format(s.avg)}
                          {diffFor(m, market, row) !== null && (
                            <Delta diff={diffFor(m, market, row)!} isCount={m.key === 'clicks'} />
                          )}
                        </>
                      ) : s ? (
                        <span className="text-xs text-gray-400">
                          {t('cmp.matrix.thin', { n: s.n, min: MIN_COMPARE_SAMPLE })}
                        </span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">{EMPTY_VALUE}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="text-xs text-gray-500 dark:text-gray-400">
              <th scope="row" className="py-2.5 pr-4 text-left font-normal">
                {t('cmp.cross.inSample')}
              </th>
              {rows.map(({ market, row }) => (
                <td key={market} className="tnum px-4 py-2.5 text-right">
                  {row?.campaigns ?? 0}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}
