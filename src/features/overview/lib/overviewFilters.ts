import { DEFAULT_PRESET, RANGE_PRESETS } from '@/lib/dateRange';

/** Overview filter state — the period is the only filter. Mirrored into the URL
 *  and localStorage by useListFilters, so a link reproduces the exact view.
 *  `year` is 0 until the user picks one for a seasonal preset. */
export const DEFAULT_OVERVIEW_FILTERS = {
  range: DEFAULT_PRESET as string,
  from: '',
  to: '',
  year: 0,
  /** Compare the period with the same period a year earlier. */
  yoy: false,
};

/** The period presets, plus 'all' — every day any campaign delivered. */
export const OVERVIEW_ALLOWED = { range: ['all', ...RANGE_PRESETS] as readonly string[] };
