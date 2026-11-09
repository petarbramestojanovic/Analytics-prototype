import { useMemo, useState } from 'react';
import { useI18n } from '@/i18n';
import { TODAY } from '@/lib/clock';
import { cn } from '@/lib/cn';
import { EMPTY_VALUE, fmtCompact, fmtMetric } from '@/lib/format';
import { Card } from '@/components/ui';
import { FilterCombobox, FilterSelect, SectionTitle } from '@/components/page';
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

/**
 * One industry, several markets: pick the industry and a metric, tick the
 * countries, and read the difference between the first two, a bar per country
 * for the metric, and every metric side by side underneath. Independent of
 * the campaign picked at the top of the page.
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

  // Searchable by name or code, so fifteen countries are as easy as three.
  const countryOptions = useMemo(
    () =>
      markets
        .map((m) => ({ value: m, label: countryName(m), description: m }))
        .sort((x, y) => x.label.localeCompare(y.label)),
    [markets, countryName],
  );

  const metric = METRICS.find((m) => m.key === metricKey) ?? METRICS[0];
  const rows = picked.map((m) => ({
    market: m,
    row: split.rows.find((r) => r.market === m) ?? null,
  }));

  // The difference between the first two countries picked.
  const [a, b] = rows;
  const sa = a?.row ? metric.stats(a.row) : null;
  const sb = b?.row ? metric.stats(b.row) : null;
  const diff = meetsSample(sa) && meetsSample(sb) ? sa.avg - sb.avg : null;
  const isCount = metric.key === 'clicks';
  const diffText =
    diff === null
      ? null
      : isCount
        ? signed(diff, Math.abs(Math.round(diff)).toString())
        : signed(diff, (Math.abs(diff) * 100).toFixed(2));

  const max = Math.max(0, ...rows.map((r) => (r.row ? (metric.stats(r.row)?.avg ?? 0) : 0))) || 1;

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-2xl">
          <SectionTitle hint={t('cmp.cross.hint', { min: MIN_COMPARE_SAMPLE })}>
            {t('cmp.cross.title')}
          </SectionTitle>
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterCombobox
            className="w-52"
            values={picked}
            onChange={(v) => v.length && setPicked(v)}
            allLabel={t('cmp.cross.markets')}
            searchPlaceholder={t('cmp.cross.searchMarkets')}
            options={countryOptions}
          />
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
        {a && b ? (
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-sm font-medium text-brame-dark dark:text-gray-100">
              {t('cmp.cross.versus', { industry, a: a.market, b: b.market })}
            </span>
            {diffText && (
              <>
                <span
                  className={cn(
                    'tnum text-xl font-bold',
                    (diff ?? 0) >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400',
                  )}
                >
                  {diffText}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {isCount ? t('cmp.cross.unitClicks') : t('cmp.cross.unitRate')}
                </span>
              </>
            )}
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
              className="grid grid-cols-[7.5rem_minmax(0,1fr)_4rem] items-center gap-3 text-sm"
            >
              <span className="truncate font-medium text-brame-dark dark:text-gray-100">
                {countryName(market)}
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
                  {r.market}
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
                        m.format(s.avg)
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
