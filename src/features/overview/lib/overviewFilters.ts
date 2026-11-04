import { matchesSelection } from '@/lib/selection';
import type { Campaign } from '@/types';
import { DEFAULT_PRESET, RANGE_PRESETS } from './dateRange';

/** Overview filter state — mirrored into the URL and localStorage by
 *  useListFilters, so a link reproduces the exact view. `year` is 0 until the
 *  user picks one for a seasonal preset. */
export const DEFAULT_OVERVIEW_FILTERS = {
  salesFilter: 'all',
  managerFilter: 'all',
  campaignFilter: 'all',
  countryFilter: 'all',
  range: DEFAULT_PRESET as string,
  from: '',
  to: '',
  year: 0,
  /** Compare the period with the same period a year earlier. */
  yoy: false,
};

export type OverviewFilterState = typeof DEFAULT_OVERVIEW_FILTERS;

export const OVERVIEW_ALLOWED = { range: RANGE_PRESETS as readonly string[] };

/** The entity filters (who / what / where) — each a multi-select (see lib/selection) — the period is applied separately
 *  because it works on delivery days, not on the campaign itself. Sales and
 *  manager only narrow for internal seats, which are the only ones offered them. */
export function applyEntityFilters(
  campaigns: Campaign[],
  f: OverviewFilterState,
  isInternal: boolean,
): Campaign[] {
  return campaigns.filter(
    (c) =>
      (!isInternal || matchesSelection(f.salesFilter, c.salesforce.salesPerson.id)) &&
      (!isInternal || matchesSelection(f.managerFilter, c.salesforce.campaignManager.id)) &&
      matchesSelection(f.campaignFilter, c.id) &&
      matchesSelection(f.countryFilter, c.salesforce.market),
  );
}

/** How many of the entity filters are set (the period isn't counted). */
export function entityFilterCount(f: OverviewFilterState, isInternal: boolean): number {
  return [
    isInternal && f.salesFilter,
    isInternal && f.managerFilter,
    f.campaignFilter,
    f.countryFilter,
  ].filter((v) => v && v !== 'all').length;
}
