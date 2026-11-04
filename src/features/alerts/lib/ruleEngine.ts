// Evaluates user-defined AlertRules against live campaign data. Custom rules
// are additive — they only ever add rows to the Alerts log, never change what
// the Compare tab shows. Source-divergence rules reuse the exact delta the
// Compare tab computes (campaigns/lib/divergence's sourceDelta), just at the
// rule's own threshold instead of the shared watch/investigate pair.

import { METRIC_KEYS, checkSources, deviceSplit, primarySeries, relativeChange, sourceDelta, sourceMeta } from '@/features/campaigns';
import { fmtMetric } from '@/lib/format';
import type { Campaign, DailyPoint, MetricKey, SourceKey } from '@/types';
import type {
  AlertRule,
  AlertRuleScope,
  ConsecutiveDropRule,
  DeviceShareRule,
  MetricBelowMetricRule,
  MetricTrendRule,
  SourceDivergenceRule,
  StartDeclineRule,
  ValueThresholdRule,
} from '../types';

/** Metrics a daily value can be derived for — everything except
 *  `completionRate`, which mock data only ever produces as a flight-level
 *  total (see api/mock/data.ts's buildSeries), so a day-over-day trend can't
 *  be computed for it. */
const DAILY_METRIC_GETTERS: Partial<Record<MetricKey, (d: DailyPoint) => number>> = {
  impressions: (d) => d.impressions,
  viewable: (d) => d.viewable,
  plays: (d) => d.plays,
  ctaClicks: (d) => d.ctaClicks,
  avgDwell: (d) => d.avgDwell,
  uniqueUsers: (d) => d.uniqueUsers,
  viewability: (d) => (d.impressions ? d.viewable / d.impressions : 0),
  engagementRate: (d) => (d.impressions ? d.engagements / d.impressions : 0),
  ctr: (d) => (d.impressions ? d.ctaClicks / d.impressions : 0),
};

/** The rate metrics — what a start-vs-now decline or a point-per-day drop
 *  makes sense for. */
const RATE_METRICS: readonly MetricKey[] = ['viewability', 'engagementRate', 'ctr'];

/** Every metric a daily value can be derived for. */
const DAILY_METRICS = METRIC_KEYS.filter((m) => m in DAILY_METRIC_GETTERS);

type MetricUnit = 'rate' | 'seconds' | 'count';

/** What a metric's number is measured in. A limit is typed in it and two
 *  metrics can only be compared when they share it. */
export function metricUnit(metric: MetricKey): MetricUnit {
  if (RATE_METRICS.includes(metric)) return 'rate';
  return metric === 'avgDwell' ? 'seconds' : 'count';
}

/** Metrics a rule of one type can be compared with: same unit, not itself. */
export function comparableMetrics(metric: MetricKey): MetricKey[] {
  return RULE_METRICS.metricBelowMetric.filter((m) => m !== metric && metricUnit(m) === metricUnit(metric));
}

/** Metrics offered per rule type in the rule dialog. */
export const RULE_METRICS: Record<AlertRule['type'], readonly MetricKey[]> = {
  sourceDivergence: METRIC_KEYS.filter((m) => m !== 'conversions'),
  metricTrend: DAILY_METRICS,
  valueThreshold: DAILY_METRICS,
  startDecline: RATE_METRICS,
  // Only metrics that have another one in their unit to be compared with.
  metricBelowMetric: DAILY_METRICS.filter((m) => metricUnit(m) !== 'seconds'),
  consecutiveDrop: RATE_METRICS,
  // The share is of impressions — the device split carries nothing else.
  deviceShare: ['impressions'],
};

export interface RuleAlertRow {
  key: string;
  ruleId: string;
  ruleName: string;
  ruleType: AlertRule['type'];
  campaignId: string;
  campaignName: string;
  companyName: string;
  metric: MetricKey;
  /** Set for `sourceDivergence` rows: "ATK vs Custom". Left empty for
   *  `metricTrend` rows, which carry `windowDays` instead so the caller can
   *  format a translated "N-day trend" string. */
  detail: string;
  windowDays?: number;
  /** Set by the newer rule types: a translation key and its values for the
   *  "Comparing" cell, since the engine has no translator of its own. */
  detailParts?: { key: string; vars: Record<string, string | number> };
  /** Set for source-difference rows: the two sources that disagree. */
  sources?: { baseline: SourceKey; check: SourceKey };
  delta: number;
  /** `pp` when `delta` is a difference in percentage points rather than a
   *  relative change. Defaults to relative. */
  deltaKind?: 'pp';
  absDelta: number;
}

export function matchesScope(campaign: Campaign, scope: AlertRuleScope): boolean {
  if (scope.level === 'portfolio') return true;
  if (scope.level === 'company') return campaign.companyId === scope.companyId;
  return campaign.id === scope.campaignId;
}

function rowBase(rule: AlertRule, campaign: Campaign) {
  return {
    ruleId: rule.id,
    ruleName: rule.name,
    ruleType: rule.type,
    campaignId: campaign.id,
    campaignName: campaign.name,
    companyName: campaign.companyName,
    metric: rule.metric,
  };
}

/** Every campaign's primary source vs its other reporting sources, for one
 *  rule's metric. */
function evaluateSourceDivergence(rule: SourceDivergenceRule, campaign: Campaign): RuleAlertRow[] {
  return checkSources(campaign).flatMap((other) => {
    const d = sourceDelta(campaign, campaign.primarySource, other, rule.metric);
    if (!d || d.absDelta < rule.thresholdPct) return [];
    const detail = `${sourceMeta(campaign, campaign.primarySource).label} vs ${sourceMeta(campaign, other).label}`;
    return [
      {
        ...rowBase(rule, campaign),
        key: `${rule.id}-${campaign.id}-${other}`,
        detail,
        sources: { baseline: campaign.primarySource, check: other },
        delta: d.delta,
        absDelta: d.absDelta,
      },
    ];
  });
}

/** One metric's most recent value vs its value `windowDays` earlier, within
 *  the campaign's primary source — the "CTR drops 5% over 5 days" case. */
function evaluateMetricTrend(rule: MetricTrendRule, campaign: Campaign): RuleAlertRow[] {
  const getValue = DAILY_METRIC_GETTERS[rule.metric];
  const series = primarySeries(campaign);
  if (!getValue || !series || series.daily.length <= rule.windowDays) return [];
  if (!sourceMeta(campaign, campaign.primarySource).measures.includes(rule.metric)) return [];

  const daily = series.daily;
  const delta = relativeChange(getValue(daily[daily.length - 1 - rule.windowDays]), getValue(daily[daily.length - 1]));
  const triggered = rule.direction === 'drop' ? delta <= -rule.thresholdPct : delta >= rule.thresholdPct;
  if (!triggered) return [];

  return [
    {
      ...rowBase(rule, campaign),
      key: `${rule.id}-${campaign.id}`,
      detail: '',
      windowDays: rule.windowDays,
      delta,
      absDelta: Math.abs(delta),
    },
  ];
}

/** A day only "reported" if it delivered; a source must also measure the metric. */
function reportingDays(campaign: Campaign, metric: MetricKey): DailyPoint[] | null {
  const series = primarySeries(campaign);
  if (!series || !sourceMeta(campaign, campaign.primarySource).measures.includes(metric)) return null;
  return series.daily.filter((d) => d.impressions > 0);
}

/** One metric's value per reporting day of the campaign's primary source —
 *  what an alert's detail page plots. Empty when the source can't measure it. */
export function metricDailySeries(campaign: Campaign, metric: MetricKey): { date: string; value: number }[] {
  const getValue = DAILY_METRIC_GETTERS[metric];
  const days = reportingDays(campaign, metric);
  return getValue && days ? days.map((d) => ({ date: d.date, value: getValue(d) })) : [];
}

/** v1's absolute floor/ceiling, judged on the latest day that reported the
 *  metric (so a trailing empty day doesn't hide or flap the alert). */
function evaluateValueThreshold(rule: ValueThresholdRule, campaign: Campaign): RuleAlertRow[] {
  const getValue = DAILY_METRIC_GETTERS[rule.metric];
  const days = reportingDays(campaign, rule.metric);
  const latest = days?.[days.length - 1];
  if (!getValue || !latest) return [];
  const value = getValue(latest);
  const tripped = rule.comparison === 'below' ? value < rule.limit : value > rule.limit;
  if (!tripped) return [];
  const delta = relativeChange(rule.limit, value);
  return [
    {
      ...rowBase(rule, campaign),
      key: `${rule.id}-${campaign.id}`,
      detail: '',
      detailParts: {
        key: 'alerts.rules.valueDetail',
        vars: { value: fmtMetric(rule.metric, value), limit: fmtMetric(rule.metric, rule.limit) },
      },
      delta,
      absDelta: Math.abs(delta),
    },
  ];
}

const mean = (values: number[]) => values.reduce((a, v) => a + v, 0) / values.length;

/** v1's decline rules: the last 7 reporting days against the first 7. */
function evaluateStartDecline(rule: StartDeclineRule, campaign: Campaign): RuleAlertRow[] {
  const getValue = DAILY_METRIC_GETTERS[rule.metric];
  const days = reportingDays(campaign, rule.metric);
  if (!getValue || !days || days.length < 14) return [];
  const first = mean(days.slice(0, 7).map(getValue));
  const last = mean(days.slice(-7).map(getValue));
  const diff = last - first;
  const delta = rule.mode === 'absolute' ? diff : first > 0 ? diff / first : 0;
  if (rule.mode === 'relative' && first <= 0) return [];
  if (delta > -rule.thresholdPct) return [];
  return [
    {
      ...rowBase(rule, campaign),
      key: `${rule.id}-${campaign.id}`,
      detail: '',
      detailParts: {
        key: 'alerts.rules.startDetail',
        vars: { first: fmtMetric(rule.metric, first), last: fmtMetric(rule.metric, last) },
      },
      delta,
      deltaKind: rule.mode === 'absolute' ? 'pp' : undefined,
      absDelta: Math.abs(delta),
    },
  ];
}

/** v1's "engagement rate below CTR", on the latest day with both reported. */
function evaluateMetricBelowMetric(rule: MetricBelowMetricRule, campaign: Campaign): RuleAlertRow[] {
  const getA = DAILY_METRIC_GETTERS[rule.metric];
  const getB = DAILY_METRIC_GETTERS[rule.otherMetric];
  const a = reportingDays(campaign, rule.metric);
  const b = reportingDays(campaign, rule.otherMetric);
  if (!getA || !getB || !a || !b) return [];
  const latest = a[a.length - 1];
  if (!latest) return [];
  const valueA = getA(latest);
  const valueB = getB(latest);
  if (!(valueA < valueB)) return [];
  const delta = relativeChange(valueB, valueA);
  return [
    {
      ...rowBase(rule, campaign),
      key: `${rule.id}-${campaign.id}`,
      detail: '',
      detailParts: {
        key: 'alerts.rules.belowDetail',
        vars: { metric: fmtMetric(rule.metric, valueA), other: fmtMetric(rule.otherMetric, valueB) },
      },
      delta,
      absDelta: Math.abs(delta),
    },
  ];
}

/** "Viewability drops 1 pp on 5 consecutive days": each of the last `days`
 *  day-over-day changes is at least `dropPct` down. Days without delivery
 *  are skipped, so a gap neither breaks nor extends a run. */
function evaluateConsecutiveDrop(rule: ConsecutiveDropRule, campaign: Campaign): RuleAlertRow[] {
  const getValue = DAILY_METRIC_GETTERS[rule.metric];
  const days = reportingDays(campaign, rule.metric);
  if (!getValue || !days || days.length < rule.days + 1) return [];
  const run = days.slice(-(rule.days + 1)).map(getValue);
  // A tiny tolerance so exactly 1.0 pp, which floats can't hit, still counts.
  const allDropped = run.every((v, i) => i === 0 || run[i - 1] - v >= rule.dropPct - 1e-9);
  if (!allDropped) return [];
  const delta = run[run.length - 1] - run[0];
  return [
    {
      ...rowBase(rule, campaign),
      key: `${rule.id}-${campaign.id}`,
      detail: '',
      detailParts: {
        key: 'alerts.rules.consecutiveDetail',
        vars: { days: rule.days, from: fmtMetric(rule.metric, run[0]), to: fmtMetric(rule.metric, run[run.length - 1]) },
      },
      delta,
      deltaKind: 'pp',
      absDelta: Math.abs(delta),
    },
  ];
}

/** One device bucket's share of the campaign's impressions against a limit.
 *  Reads the whole-flight device split, so it needs no source or daily data. */
function evaluateDeviceShare(rule: DeviceShareRule, campaign: Campaign): RuleAlertRow[] {
  const split = deviceSplit(campaign);
  if (!split) return [];
  const share = split[rule.device];
  const tripped = rule.comparison === 'below' ? share < rule.limitPct : share > rule.limitPct;
  if (!tripped) return [];
  const delta = share - rule.limitPct;
  return [
    {
      ...rowBase(rule, campaign),
      key: `${rule.id}-${campaign.id}`,
      detail: '',
      detailParts: {
        key: `alerts.rules.deviceDetail.${rule.device}`,
        vars: { share: fmtMetric('viewability', share), limit: fmtMetric('viewability', rule.limitPct) },
      },
      delta,
      deltaKind: 'pp',
      absDelta: Math.abs(delta),
    },
  ];
}

function evaluateRule(rule: AlertRule, campaign: Campaign): RuleAlertRow[] {
  switch (rule.type) {
    case 'sourceDivergence':
      return evaluateSourceDivergence(rule, campaign);
    case 'metricTrend':
      return evaluateMetricTrend(rule, campaign);
    case 'valueThreshold':
      return evaluateValueThreshold(rule, campaign);
    case 'startDecline':
      return evaluateStartDecline(rule, campaign);
    case 'metricBelowMetric':
      return evaluateMetricBelowMetric(rule, campaign);
    case 'consecutiveDrop':
      return evaluateConsecutiveDrop(rule, campaign);
    case 'deviceShare':
      return evaluateDeviceShare(rule, campaign);
  }
}

/** Every enabled rule against every campaign in its scope. */
export function evaluateAlertRules(campaigns: Campaign[], rules: AlertRule[]): RuleAlertRow[] {
  return rules
    .filter((rule) => rule.enabled)
    .flatMap((rule) =>
      campaigns
        .filter((campaign) => matchesScope(campaign, rule.scope))
        .flatMap((campaign) => evaluateRule(rule, campaign))
    );
}
