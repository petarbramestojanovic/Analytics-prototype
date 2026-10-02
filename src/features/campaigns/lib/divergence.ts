// Divergence computation shared between the single-campaign Compare tab
// (CampaignDetailPage), the portfolio-wide Alerts page and custom alert rules
// (features/alerts). Extracted so all of them always agree on what counts as
// "in line" vs "watch" vs "investigate" — there is exactly one place a delta
// between two sources is computed (sourceDelta) and one place the threshold
// numbers are compared against it (toneForDelta/readForDelta below).

import type { Campaign, MetricKey, SourceKey } from '@/types';
import { checkSources, sourceMeta } from './sources';

export interface Thresholds {
  /** Fraction (e.g. 0.03 = 3%). Below this, two sources are "in line". */
  watch: number;
  /** Fraction (e.g. 0.1 = 10%). At/above this, a divergence needs investigating. */
  investigate: number;
}

export type DivergenceTone = 'green' | 'amber' | 'red';
export type DivergenceRead = 'inLine' | 'watch' | 'investigate';

export interface DivergenceRow {
  campaignId: string;
  campaignName: string;
  companyName: string;
  baseline: SourceKey;
  check: SourceKey;
  metric: MetricKey;
  baselineValue: number;
  checkValue: number;
  delta: number;
  absDelta: number;
  tone: DivergenceTone;
  read: DivergenceRead;
  /** Sources on different sync cadences (nightly vs live) diverge on the
   *  current day for that reason alone — flagged so a reviewer doesn't
   *  mistake a sync lag for a real tracking problem. */
  cadenceGap: boolean;
}

/** Relative change from `from` to `to` — 0 when there is no baseline. */
export function relativeChange(from: number, to: number): number {
  return from ? (to - from) / from : 0;
}

/** One metric, two sources of one campaign — or null when either source has
 *  no data or does not measure that metric at all (a comparison against
 *  absence is not a comparison). */
export function sourceDelta(campaign: Campaign, baseline: SourceKey, check: SourceKey, metric: MetricKey) {
  const bSeries = campaign.sources[baseline];
  const cSeries = campaign.sources[check];
  if (!bSeries || !cSeries) return null;
  if (!sourceMeta(campaign, baseline).measures.includes(metric)) return null;
  if (!sourceMeta(campaign, check).measures.includes(metric)) return null;

  const baselineValue = bSeries.totals[metric] ?? 0;
  const checkValue = cSeries.totals[metric] ?? 0;
  const delta = relativeChange(baselineValue, checkValue);
  return { baselineValue, checkValue, delta, absDelta: Math.abs(delta) };
}

function toneForDelta(absDelta: number, t: Thresholds): DivergenceTone {
  if (absDelta < t.watch) return 'green';
  if (absDelta < t.investigate) return 'amber';
  return 'red';
}

function readForDelta(absDelta: number, t: Thresholds): DivergenceRead {
  if (absDelta < t.watch) return 'inLine';
  if (absDelta < t.investigate) return 'watch';
  return 'investigate';
}

/** One campaign, two arbitrary sources — one row per metric both sources
 *  actually measure. Used by the Compare tab, where a user picks both sides. */
export function compareSources(
  campaign: Campaign,
  left: SourceKey,
  right: SourceKey,
  thresholds: Thresholds
): DivergenceRow[] {
  const lMeta = sourceMeta(campaign, left);
  const rMeta = sourceMeta(campaign, right);
  const cadenceGap = lMeta.cadence !== rMeta.cadence;

  return lMeta.measures.flatMap((metric) => {
    const d = sourceDelta(campaign, left, right, metric);
    if (!d) return [];
    return [
      {
        campaignId: campaign.id,
        campaignName: campaign.name,
        companyName: campaign.companyName,
        baseline: left,
        check: right,
        metric,
        ...d,
        tone: toneForDelta(d.absDelta, thresholds),
        read: readForDelta(d.absDelta, thresholds),
        cadenceGap,
      },
    ];
  });
}

/** Across the whole portfolio: every campaign's primary source vs each of
 *  its other reporting sources (RFC §4 rule 3 — never checked against
 *  itself, never summed). Only rows at watch/investigate severity are
 *  returned — "in line" is not an alert. Sorted most severe first. */
export function computePortfolioAlerts(campaigns: Campaign[], thresholds: Thresholds): DivergenceRow[] {
  const rows: DivergenceRow[] = [];
  for (const campaign of campaigns) {
    if (!campaign.sources[campaign.primarySource]) continue;
    for (const other of checkSources(campaign)) {
      rows.push(...compareSources(campaign, campaign.primarySource, other, thresholds));
    }
  }
  return rows.filter((r) => r.read !== 'inLine').sort(bySeverity);
}

/** Investigate before watch, then the largest divergence first. */
export function bySeverity(a: { read: DivergenceRead; absDelta: number }, b: { read: DivergenceRead; absDelta: number }) {
  if (a.read !== b.read) return a.read === 'investigate' ? -1 : 1;
  return b.absDelta - a.absDelta;
}
