/**
 * The Overview's time-range presets. Pure functions over plain YYYY-MM-DD
 * strings (same convention as the rest of the app — see lib/clock.ts), so a
 * range compares directly against a daily point's `date`.
 *
 * Seasonal presets (Q4, Black Friday, Christmas) are tied to a calendar year;
 * `seasonYear` picks which. Quarters and YTD are always relative to today.
 */

import type { DateRange } from '@/features/campaigns';

export type { DateRange };

export const RANGE_PRESETS = [
  'last30',
  'last90',
  'thisQuarter',
  'lastQuarter',
  'ytd',
  'last12m',
  'q4',
  'blackFriday',
  'christmas',
  'custom',
] as const;

export type RangePreset = (typeof RANGE_PRESETS)[number];

export const DEFAULT_PRESET: RangePreset = 'last90';

/** Presets that depend on a calendar year the user can change. */
export const SEASONAL_PRESETS: readonly RangePreset[] = ['q4', 'blackFriday', 'christmas'];

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

/** A Date back to YYYY-MM-DD without a UTC round-trip. */
const toIso = (d: Date) => ymd(d.getFullYear(), d.getMonth() + 1, d.getDate());

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return toIso(new Date(y, m - 1, d + days));
}

/** Black Friday = the day after the 4th Thursday of November. */
function blackFriday(year: number): string {
  const firstOfNov = new Date(year, 10, 1);
  const firstThursday = 1 + ((4 - firstOfNov.getDay() + 7) % 7);
  return ymd(year, 11, firstThursday + 21 + 1);
}

/** Start (inclusive) of the season in `year`, used to pick a sensible default
 *  year: the latest season that has already begun. */
function seasonRange(preset: RangePreset, year: number): DateRange {
  switch (preset) {
    case 'q4':
      return { start: ymd(year, 10, 1), end: ymd(year, 12, 31) };
    case 'blackFriday': {
      // Black Friday week: 6 days before through Cyber Monday (3 days after).
      const bf = blackFriday(year);
      return { start: addDays(bf, -6), end: addDays(bf, 3) };
    }
    default:
      // Christmas run-up: 1 Dec through Christmas Day.
      return { start: ymd(year, 12, 1), end: ymd(year, 12, 25) };
  }
}

/** The most recent year whose season has already started — what "Q4" should
 *  mean in September (last year's), and in November (this year's, so far). */
export function defaultSeasonYear(preset: RangePreset, todayIso: string): number {
  const year = Number(todayIso.slice(0, 4));
  return seasonRange(preset, year).start <= todayIso ? year : year - 1;
}

function quarterStart(year: number, quarter: number): string {
  return ymd(year, quarter * 3 + 1, 1);
}

function quarterEnd(year: number, quarter: number): string {
  // Day 0 of the next quarter's first month = last day of this quarter.
  return toIso(new Date(year, quarter * 3 + 3, 0));
}

/** Presets whose dates are fixed by the calendar, not by today. */
const FIXED_PRESETS: readonly RangePreset[] = [
  'thisQuarter',
  'lastQuarter',
  'q4',
  'blackFriday',
  'christmas',
];

export interface RangeInput {
  preset: RangePreset;
  /** Custom range bounds (YYYY-MM-DD); either may be empty while typing. */
  from: string;
  to: string;
  /** Calendar year for the seasonal presets; 0 = pick the default. */
  seasonYear: number;
}

/**
 * Resolves a preset to concrete bounds. Open-ended or inverted custom input
 * falls back to the default window rather than producing a broken range.
 * Quarters and seasons are the full calendar period (Q4 is always 1 Oct –
 * 31 Dec); rolling windows (last N days, year to date) end today.
 */
export function resolveRange(input: RangeInput, todayIso: string): DateRange {
  const year = Number(todayIso.slice(0, 4));
  const quarter = Math.floor((Number(todayIso.slice(5, 7)) - 1) / 3);
  let range: DateRange;

  switch (input.preset) {
    case 'thisQuarter':
      range = { start: quarterStart(year, quarter), end: quarterEnd(year, quarter) };
      break;
    case 'lastQuarter': {
      const y = quarter === 0 ? year - 1 : year;
      const q = (quarter + 3) % 4;
      range = { start: quarterStart(y, q), end: quarterEnd(y, q) };
      break;
    }
    case 'ytd':
      range = { start: ymd(year, 1, 1), end: todayIso };
      break;
    case 'last12m':
      range = { start: addDays(todayIso, -365), end: todayIso };
      break;
    case 'q4':
    case 'blackFriday':
    case 'christmas':
      range = seasonRange(
        input.preset,
        input.seasonYear || defaultSeasonYear(input.preset, todayIso),
      );
      break;
    case 'custom':
      range =
        input.from && input.to && input.from <= input.to
          ? { start: input.from, end: input.to }
          : { start: addDays(todayIso, -90), end: todayIso };
      break;
    case 'last30':
      range = { start: addDays(todayIso, -30), end: todayIso };
      break;
    default:
      range = { start: addDays(todayIso, -90), end: todayIso };
  }

  // Calendar periods (a quarter, a season) keep their fixed dates even while
  // still running — the data simply stops at today. Only rolling windows and
  // custom picks are held to today.
  return FIXED_PRESETS.includes(input.preset) || range.end <= todayIso
    ? range
    : { ...range, end: todayIso };
}

/** The same calendar window one year earlier — the year-over-year comparison
 *  period. 29 Feb has no counterpart in a non-leap year, so it clamps to the
 *  last day of February. */
export function previousYear(range: DateRange): DateRange {
  const shift = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    const shifted = new Date(y - 1, m - 1, d);
    return shifted.getMonth() !== m - 1 ? toIso(new Date(y - 1, m, 0)) : toIso(shifted);
  };
  return { start: shift(range.start), end: shift(range.end) };
}
