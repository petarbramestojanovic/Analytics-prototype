import type { Campaign } from '@/types';
import { primarySeries, SOURCE_KEYS } from './sources';

/** The setup gaps a campaign can have — what the Campaigns list's Setup filter
 *  narrows to. */
export const SETUP_FILTERS = ['all', 'awaiting', 'noConnector'] as const;
export type SetupFilter = (typeof SETUP_FILTERS)[number];

/** No data yet from the campaign's primary source. */
const isAwaitingSetup = (c: Campaign): boolean => !primarySeries(c);

/** How many of the three sources have no connector for this campaign. */
const missingConnectors = (c: Campaign): number =>
  SOURCE_KEYS.filter((s) => !c.sources[s]).length;

export function matchesSetup(filter: string, c: Campaign): boolean {
  if (filter === 'awaiting') return isAwaitingSetup(c);
  if (filter === 'noConnector') return missingConnectors(c) > 0;
  return true;
}
