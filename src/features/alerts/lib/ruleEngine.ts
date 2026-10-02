// Evaluates user-defined AlertRules against live campaign data. Custom rules
// are additive — they only ever add rows to the Alerts log, never change what
// the Compare tab shows. Source-divergence rules reuse the exact delta the
// Compare tab computes (campaigns/lib/divergence's sourceDelta), just at the
// rule's own threshold instead of the shared watch/investigate pair.

import { METRIC_KEYS, checkSources, primarySeries, relativeChange, sourceDelta, sourceMeta } from '@/features/campaigns';
import type { Campaign, DailyPoint, MetricKey } from '@/types';
import type { AlertRule, AlertRuleScope, MetricTrendRule, SourceDivergenceRule } from '../types';

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

/** Metrics offered per rule type in the rule dialog. */
export const RULE_METRICS: Record<AlertRule['type'], readonly MetricKey[]> = {
  sourceDivergence: METRIC_KEYS,
  metricTrend: METRIC_KEYS.filter((m) => m in DAILY_METRIC_GETTERS),
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
  delta: number;
  absDelta: number;
}

function matchesScope(campaign: Campaign, scope: AlertRuleScope): boolean {
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
    return [{ ...rowBase(rule, campaign), key: `${rule.id}-${campaign.id}-${other}`, detail, delta: d.delta, absDelta: d.absDelta }];
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

/** Every enabled rule against every campaign in its scope. */
export function evaluateAlertRules(campaigns: Campaign[], rules: AlertRule[]): RuleAlertRow[] {
  return rules
    .filter((rule) => rule.enabled)
    .flatMap((rule) =>
      campaigns
        .filter((campaign) => matchesScope(campaign, rule.scope))
        .flatMap((campaign) =>
          rule.type === 'sourceDivergence' ? evaluateSourceDivergence(rule, campaign) : evaluateMetricTrend(rule, campaign)
        )
    );
}
