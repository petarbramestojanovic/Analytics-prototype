import type { MetricKey } from '@/types';

/**
 * User-defined alert rules — the Outlook-rules-style layer on top of the
 * fixed default divergence thresholds (AlertThresholdsProvider). Same family
 * (client-side preference persisted to localStorage, no backend to actually
 * deliver anything — see features/preferences) as everything else
 * that isn't backed by the mock store.
 */
export type AlertRuleScope =
  | { level: 'portfolio' }
  | { level: 'company'; companyId: string; companyName: string }
  | { level: 'campaign'; campaignId: string; campaignName: string };

interface AlertRuleBase {
  id: string;
  name: string;
  enabled: boolean;
  metric: MetricKey;
  scope: AlertRuleScope;
}

/** Compares the campaign's primary source against its other reporting
 *  sources for one metric — the same check `divergence.ts` runs at a single
 *  flat threshold, here at a threshold the user picks per rule. */
export interface SourceDivergenceRule extends AlertRuleBase {
  type: 'sourceDivergence';
  /** Fraction, e.g. 0.03 = 3%. */
  thresholdPct: number;
}

/** Compares one metric's most recent value against its value `windowDays`
 *  earlier, within the campaign's primary source — the "CTR drops 5% over 5
 *  days" case, which has no single-point-in-time equivalent above. */
export interface MetricTrendRule extends AlertRuleBase {
  type: 'metricTrend';
  direction: 'drop' | 'rise';
  /** Fraction, e.g. 0.05 = 5%. */
  thresholdPct: number;
  windowDays: number;
}

export type AlertRule = SourceDivergenceRule | MetricTrendRule;

// A plain `Omit<AlertRule, 'id'>` collapses the union to its common fields
// (keyof a union is the *intersection* of each member's keys) — this
// distributes the Omit over each member first so `direction`/`windowDays`
// survive for the metricTrend branch.
type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;
export type AlertRuleInput = DistributiveOmit<AlertRule, 'id'>;
