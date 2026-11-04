import type { AlertRule } from '../types';

/**
 * The six alert rules the KPI dashboard v1 runs on every campaign (its
 * `alarm-rules.ts`), with the same thresholds, plus two more: viewability
 * falling day after day, and mobile share. They are the starting set of
 * Alert rules here: on by default, portfolio-wide, editable, never deletable.
 * `builtInKey` names their translated title and description.
 */
const portfolio = { level: 'portfolio' } as const;

export const BUILT_IN_RULES: readonly AlertRule[] = [
  {
    id: 'builtin-viewability-floor',
    builtInKey: 'viewabilityFloor',
    name: 'Viewability below 70%',
    enabled: true,
    scope: portfolio,
    type: 'valueThreshold',
    metric: 'viewability',
    comparison: 'below',
    limit: 0.7,
  },
  {
    id: 'builtin-viewability-decline',
    builtInKey: 'viewabilityDecline',
    name: 'Viewability decline',
    enabled: true,
    scope: portfolio,
    type: 'startDecline',
    metric: 'viewability',
    mode: 'absolute',
    thresholdPct: 0.08,
  },
  {
    id: 'builtin-ctr-decline',
    builtInKey: 'ctrDecline',
    name: 'CTR decline',
    enabled: true,
    scope: portfolio,
    type: 'startDecline',
    metric: 'ctr',
    mode: 'relative',
    thresholdPct: 0.08,
  },
  {
    id: 'builtin-engagement-decline',
    builtInKey: 'engagementDecline',
    name: 'Engagement rate decline',
    enabled: true,
    scope: portfolio,
    type: 'startDecline',
    metric: 'engagementRate',
    mode: 'relative',
    thresholdPct: 0.08,
  },
  {
    id: 'builtin-engagement-below-ctr',
    builtInKey: 'engagementBelowCtr',
    name: 'Engagement rate below CTR',
    enabled: true,
    scope: portfolio,
    type: 'metricBelowMetric',
    metric: 'engagementRate',
    otherMetric: 'ctr',
  },
  {
    id: 'builtin-engagement-ceiling',
    builtInKey: 'engagementCeiling',
    name: 'Engagement rate above 10%',
    enabled: true,
    scope: portfolio,
    type: 'valueThreshold',
    metric: 'engagementRate',
    comparison: 'above',
    limit: 0.1,
  },
  {
    id: 'builtin-viewability-streak',
    builtInKey: 'viewabilityStreak',
    name: 'Viewability falling 5 days in a row',
    enabled: true,
    scope: portfolio,
    type: 'consecutiveDrop',
    metric: 'viewability',
    dropPct: 0.01,
    days: 5,
  },
  {
    id: 'builtin-mobile-share',
    builtInKey: 'mobileShare',
    name: 'Mobile share below 50%',
    enabled: true,
    scope: portfolio,
    type: 'deviceShare',
    metric: 'impressions',
    device: 'mobile',
    comparison: 'below',
    limitPct: 0.5,
  },
];
