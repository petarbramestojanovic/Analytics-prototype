import type { MetricKey } from '@/types';

/**
 * Locale-independent number formatting. Date/time/relative-time formatting is
 * locale-aware and lives in src/i18n (useFormatters()) so it reacts to the
 * language switch.
 */

/** Rendered wherever a value is missing or not measured — never a zero. */
export const EMPTY_VALUE = '—';

export const fmtInt = (n: number) => Math.round(n).toLocaleString('de-CH').replace(/’/g, "'");

export const fmtCompact = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return `${Math.round(n)}`;
};

export const fmtPct = (n: number, decimals = 1) => `${(n * 100).toFixed(decimals)}%`;

/** A relative change with an explicit sign — "+4.2%", "-1.0%". */
export const fmtSignedPct = (n: number, decimals = 1) => `${n > 0 ? '+' : ''}${fmtPct(n, decimals)}`;

export const fmtSeconds = (n: number) => `${n.toFixed(1)}s`;

export const fmtDuration = (ms: number) => fmtSeconds(ms / 1000);

/** Formats a metric the way it is shown everywhere in the app. `null`/
 *  `undefined` (not measured) render as EMPTY_VALUE. */
export function fmtMetric(metric: MetricKey, value: number | null | undefined): string {
  if (value == null) return EMPTY_VALUE;
  switch (metric) {
    case 'viewability':
    case 'engagementRate':
    case 'completionRate':
      return fmtPct(value);
    case 'ctr':
      return fmtPct(value, 2);
    case 'avgDwell':
      return fmtSeconds(value);
    default:
      return fmtCompact(value);
  }
}
