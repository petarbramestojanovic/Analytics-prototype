import { DEFAULT_PRESET, RANGE_PRESETS } from '@/lib/dateRange';
import { matchesSelection } from '@/lib/selection';
import { DIRECT_ACCOUNT_KEY } from '@/features/campaigns';
import type { Campaign } from '@/types';

/** Overview filter state — mirrored into the URL and localStorage by
 *  useListFilters, so a link reproduces the exact view. `year` is 0 until the
 *  user picks one for a seasonal preset. The three entity filters use the same
 *  keys as the Campaigns list, so the two pages read each other's links. */
export const DEFAULT_OVERVIEW_FILTERS = {
  companyFilter: 'all',
  accountFilter: 'all',
  countryFilter: 'all',
  range: DEFAULT_PRESET as string,
  from: '',
  to: '',
  year: 0,
  /** Compare the period with the same period a year earlier. */
  yoy: false,
};

export type OverviewFilterState = typeof DEFAULT_OVERVIEW_FILTERS;

/** The period presets, plus 'all' — every day any campaign delivered. */
export const OVERVIEW_ALLOWED = { range: ['all', ...RANGE_PRESETS] as readonly string[] };

/** The entity filters (who / where) — each a multi-select (see lib/selection).
 *  The period is applied separately because it works on delivery days, not on
 *  the campaign itself. Client and account only narrow for internal seats,
 *  which are the only ones offered them (a client seat is one company already). */
export function applyEntityFilters(
  campaigns: Campaign[],
  f: OverviewFilterState,
  isInternal: boolean,
): Campaign[] {
  return campaigns.filter(
    (c) =>
      (!isInternal || matchesSelection(f.companyFilter, c.companyId)) &&
      (!isInternal || matchesSelection(f.accountFilter, c.accountId ?? DIRECT_ACCOUNT_KEY)) &&
      matchesSelection(f.countryFilter, c.salesforce.market),
  );
}

/** How many of the entity filters are set (the period isn't counted). */
export function entityFilterCount(f: OverviewFilterState, isInternal: boolean): number {
  return [isInternal && f.companyFilter, isInternal && f.accountFilter, f.countryFilter].filter(
    (v) => v && v !== 'all',
  ).length;
}
