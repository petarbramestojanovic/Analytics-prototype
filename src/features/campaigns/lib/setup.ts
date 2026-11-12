import type { Campaign } from '@/types';
import { primarySeries, SOURCE_KEYS } from './sources';

/** The setup gaps a campaign can have — the Overview's two tiles count them and
 *  link to the Campaigns list filtered by the same rule, so a tile and the list
 *  behind it can never disagree. */
export const SETUP_FILTERS = ['all', 'awaiting', 'noConnector'] as const;
export type SetupFilter = (typeof SETUP_FILTERS)[number];

/** No data yet from the campaign's primary source. */
export const isAwaitingSetup = (c: Campaign): boolean => !primarySeries(c);

/** How many of the three sources have no connector for this campaign. */
export const missingConnectors = (c: Campaign): number =>
  SOURCE_KEYS.filter((s) => !c.sources[s]).length;

export function matchesSetup(filter: string, c: Campaign): boolean {
  if (filter === 'awaiting') return isAwaitingSetup(c);
  if (filter === 'noConnector') return missingConnectors(c) > 0;
  return true;
}
