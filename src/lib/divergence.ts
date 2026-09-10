// Divergence computation shared between the single-campaign Compare tab
// (CampaignDetailView) and the portfolio-wide Alerts page. Extracted so both
// always agree on what counts as "in line" vs "watch" vs "investigate" —
// there is exactly one place the threshold numbers are compared against a
// delta (toneForDelta/readForDelta below).

import { sourceMeta } from '../mock/data';
import type { Campaign, MetricKey, SourceKey } from '../mock/types';

export interface Thresholds {
  /** Fraction (e.g. 0.03 = 3%). Below this, two sources are "in line". */
  watch: number;
  /** Fraction (e.g. 0.1 = 10%). At/above this, a divergence needs investigating. */
  investigate: number;
}

type DivergenceTone = 'green' | 'amber' | 'red';
type DivergenceRead = 'inLine' | 'watch' | 'investigate';

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
  const lSeries = campaign.sources[left];
  const rSeries = campaign.sources[right];
  if (!lSeries || !rSeries) return [];

  const shared = lMeta.measures.filter((m) => rMeta.measures.includes(m));
  const cadenceGap = lMeta.cadence !== rMeta.cadence;

  return shared.map((metric) => {
    const baselineValue = lSeries.totals[metric] ?? 0;
    const checkValue = rSeries.totals[metric] ?? 0;
    const delta = baselineValue ? (checkValue - baselineValue) / baselineValue : 0;
    const absDelta = Math.abs(delta);
    return {
      campaignId: campaign.id,
      campaignName: campaign.name,
      companyName: campaign.companyName,
      baseline: left,
      check: right,
      metric,
      baselineValue,
      checkValue,
      delta,
      absDelta,
      tone: toneForDelta(absDelta, thresholds),
      read: readForDelta(absDelta, thresholds),
      cadenceGap,
    };
  });
}

/** Across the whole portfolio: every campaign's primary source vs each of
 *  its other reporting sources (RFC §4 rule 3 — never checked against
 *  itself, never summed). Only rows at watch/investigate severity are
 *  returned — "in line" is not an alert. */
export function computePortfolioAlerts(campaigns: Campaign[], thresholds: Thresholds): DivergenceRow[] {
  const rows: DivergenceRow[] = [];
  for (const campaign of campaigns) {
    if (!campaign.sources[campaign.primarySource]) continue;
    const others = (['atk', 'nexd', 'custom'] as SourceKey[]).filter(
      (s) => s !== campaign.primarySource && campaign.sources[s]
    );
    for (const other of others) {
      rows.push(...compareSources(campaign, campaign.primarySource, other, thresholds));
    }
  }
  return rows.filter((r) => r.read !== 'inLine');
}
