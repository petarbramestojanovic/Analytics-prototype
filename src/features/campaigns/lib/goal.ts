import type { PillTone } from '@/components/ui';
import type { Campaign, GoalMetric } from '@/types';
import { primarySeries } from './sources';

/**
 * The campaign's main goal (primary KPI) and, for Klea, its performance
 * guarantee — both briefed in Salesforce, read-only here. The actual value
 * comes from the campaign's own primary source, like every other headline
 * number; a source that doesn't measure the metric reads `no-data`, never zero.
 */
export type GoalStatus = 'met' | 'close' | 'behind' | 'no-target' | 'no-data';

/** Within this share of target still reads "close" rather than "behind". */
const CLOSE_THRESHOLD = 0.9;

export const GOAL_STATUS_TONE: Record<GoalStatus, PillTone> = {
  met: 'green',
  close: 'amber',
  behind: 'red',
  'no-target': 'neutral',
  'no-data': 'neutral',
};

export function goalStatus(value: number | null, target: number | null): GoalStatus {
  if (value == null) return 'no-data';
  if (target == null || target <= 0) return 'no-target';
  const attainment = value / target;
  return attainment >= 1 ? 'met' : attainment >= CLOSE_THRESHOLD ? 'close' : 'behind';
}

export interface GoalRead {
  metric: GoalMetric;
  target: number | null;
  value: number | null;
  /** value ÷ target; null when either is missing. */
  attainment: number | null;
  status: GoalStatus;
}

const actual = (campaign: Campaign, metric: GoalMetric) =>
  primarySeries(campaign)?.totals[metric] ?? null;

/** The main goal against its actual, or null if none was briefed. */
export function goalRead(campaign: Campaign): GoalRead | null {
  const kpi = campaign.salesforce.primaryKpi;
  if (!kpi) return null;
  const value = actual(campaign, kpi.metric);
  return {
    metric: kpi.metric,
    target: kpi.target,
    value,
    attainment: value != null && kpi.target ? value / kpi.target : null,
    status: goalStatus(value, kpi.target),
  };
}

export interface GuaranteeRead {
  metric: GoalMetric;
  guaranteed: number;
  value: number | null;
  /** `breach` when the actual is below the guaranteed floor. */
  status: 'ok' | 'breach' | 'no-data';
}

/** The guaranteed floor against the actual, or null when none was agreed. */
export function guaranteeRead(campaign: Campaign): GuaranteeRead | null {
  const g = campaign.salesforce.performanceGuarantee;
  if (!g) return null;
  const value = actual(campaign, g.metric);
  return {
    metric: g.metric,
    guaranteed: g.value,
    value,
    status: value == null ? 'no-data' : value >= g.value ? 'ok' : 'breach',
  };
}
