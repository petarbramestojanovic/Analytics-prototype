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
  /** Set on the standard rules carried over from the KPI dashboard v1. They
   *  ship switched on, can be edited or switched off, but not deleted; the
   *  key picks their translated name and description. */
  builtInKey?: string;
  /** Whose inbox gets an item when this rule flags a campaign. Left out, it
   *  is everyone in the Admin and Klea seats — the people who work with
   *  alerts. Empty lists mean the rule only fills the alert log. */
  notify?: AlertNotify;
}

/** Who a rule tells: whole seats (everyone in them) and/or single members. */
export interface AlertNotify {
  seatIds: string[];
  memberIds: string[];
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

/** The latest day a source reported `metric` is below/above a fixed limit —
 *  v1's "viewability under 70%" and "engagement rate over 10%". */
export interface ValueThresholdRule extends AlertRuleBase {
  type: 'valueThreshold';
  comparison: 'below' | 'above';
  /** The limit in the metric's own unit: a fraction for a rate (0.7 = 70%),
   *  seconds for a dwell time, a plain count otherwise. */
  limit: number;
}

/** The last 7 days' average against the campaign's own first 7 days — v1's
 *  decline rules. Needs at least 14 days of data. `absolute` compares
 *  percentage points (v1's viewability rule); `relative` compares a share of
 *  the starting value (v1's CTR and engagement-rate rules). Declines only. */
export interface StartDeclineRule extends AlertRuleBase {
  type: 'startDecline';
  mode: 'absolute' | 'relative';
  /** Fraction: 0.08 = 8 percentage points (absolute) or 8% of the start. */
  thresholdPct: number;
}

/** `metric` is below `otherMetric` on the latest day carrying both — v1's
 *  "engagement rate below CTR" (an engagement can't be rarer than a click).
 *  The two must be in the same unit (two rates, or two counts). */
export interface MetricBelowMetricRule extends AlertRuleBase {
  type: 'metricBelowMetric';
  otherMetric: MetricKey;
}

/** A rate fell by at least `dropPct` percentage points, day over day, on each
 *  of the last `days` reporting days — "viewability drops 1 pp on 5
 *  consecutive days". Rates only: a point difference means nothing for a count. */
export interface ConsecutiveDropRule extends AlertRuleBase {
  type: 'consecutiveDrop';
  /** Fraction of a point per day: 0.01 = 1 percentage point. */
  dropPct: number;
  days: number;
}

/** One device bucket's share of the campaign's impressions is below/above a
 *  limit — "mobile share under 50%". It reads the campaign's device split
 *  (tablet counts as mobile), so it has no daily series and no source; the
 *  rule's `metric` is always `impressions`, the thing the share is of. */
export interface DeviceShareRule extends AlertRuleBase {
  type: 'deviceShare';
  device: 'mobile' | 'desktop';
  comparison: 'below' | 'above';
  /** Fraction, e.g. 0.5 = 50%. */
  limitPct: number;
}

export type AlertRule =
  | SourceDivergenceRule
  | MetricTrendRule
  | ValueThresholdRule
  | StartDeclineRule
  | MetricBelowMetricRule
  | ConsecutiveDropRule
  | DeviceShareRule;

// A plain `Omit<AlertRule, 'id'>` collapses the union to its common fields
// (keyof a union is the *intersection* of each member's keys) — this
// distributes the Omit over each member first so `direction`/`windowDays`
// survive for the metricTrend branch.
type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;
export type AlertRuleInput = DistributiveOmit<AlertRule, 'id'>;
