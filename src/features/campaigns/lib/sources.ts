import { TODAY } from '@/lib/clock';
import type { Campaign, MetricKey, SourceKey, SourceMeta, SourceSeries } from '@/types';

/**
 * The three measurement sources and what each one can see — the "what each
 * platform measures" split is the reason each source gets its own UI instead
 * of one grid with holes in it. Every "for each source" loop in the app goes
 * through SOURCE_KEYS, so adding a fourth source starts here.
 */
export const SOURCE_KEYS: readonly SourceKey[] = ['atk', 'nexd', 'custom'];

/** Every metric any source can report, in display order. */
export const METRIC_KEYS: readonly MetricKey[] = [
  'impressions',
  'viewable',
  'viewability',
  'plays',
  'engagementRate',
  'avgDwell',
  'completionRate',
  'ctaClicks',
  'ctr',
  'uniqueUsers',
];

export const SOURCE_DEFINITIONS: Record<SourceKey, Pick<SourceMeta, 'key' | 'label' | 'fullLabel' | 'cadence' | 'measures'>> = {
  atk: {
    key: 'atk',
    label: 'ATK',
    fullLabel: 'ATK (Zeus adserver)',
    cadence: 'nightly',
    measures: ['impressions', 'viewable', 'viewability', 'plays', 'uniqueUsers'],
  },
  nexd: {
    key: 'nexd',
    label: 'NEXD',
    fullLabel: 'NEXD',
    cadence: 'nightly',
    measures: ['impressions', 'viewable', 'viewability', 'engagementRate', 'avgDwell', 'ctaClicks', 'ctr'],
  },
  custom: {
    key: 'custom',
    label: 'Brame',
    fullLabel: 'Brame instrumentation',
    cadence: 'live',
    measures: [...METRIC_KEYS],
  },
};

/** Last nightly pull, in the mock backend's pinned timeline. */
const LAST_NIGHTLY_SYNC = '2026-09-08T04:00:00+02:00';

/** A source's definition plus its connection state for one campaign. */
export function sourceMeta(campaign: Campaign, key: SourceKey): SourceMeta {
  const base = SOURCE_DEFINITIONS[key];
  const series = campaign.sources[key];
  return {
    ...base,
    connector: series ? 'connected' : 'not_configured',
    lastSyncedAt: series ? (base.cadence === 'live' ? TODAY.toISOString() : LAST_NIGHTLY_SYNC) : null,
  };
}

/** The series every headline number comes from (RFC §4 rule 3) — the
 *  campaign's own primary source, or null while it has no data yet. */
export function primarySeries(campaign: Campaign): SourceSeries | null {
  return campaign.sources[campaign.primarySource];
}

/** Sources that currently report data for this campaign. */
export function connectedSources(campaign: Campaign): SourceKey[] {
  return SOURCE_KEYS.filter((s) => campaign.sources[s]);
}

/** The reporting sources a primary number can be checked against — never the
 *  primary itself, never a source with no data. */
export function checkSources(campaign: Campaign): SourceKey[] {
  return connectedSources(campaign).filter((s) => s !== campaign.primarySource);
}
