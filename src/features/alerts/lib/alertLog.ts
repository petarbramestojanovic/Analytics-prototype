import { computePortfolioAlerts, sourceMeta, type Thresholds } from '@/features/campaigns';
import type { TranslateFn } from '@/i18n';
import type { Campaign, MetricKey } from '@/types';
import type { AlertRule } from '../types';
import { evaluateAlertRules } from './ruleEngine';

/** Sentinel `ruleId` for rows produced by the fixed default thresholds, so
 *  the log can tell them apart from custom-rule rows without a separate flag. */
export const DEFAULT_RULE_ID = '__default__';

export type AlertSeverity = 'watch' | 'investigate';

export interface AlertLogRow {
  key: string;
  campaignId: string;
  campaignName: string;
  companyId: string;
  companyName: string;
  ruleId: string;
  ruleLabel: string;
  metric: MetricKey;
  detail: string;
  cadenceGap: boolean;
  delta: number;
  absDelta: number;
  severity: AlertSeverity;
}

/**
 * Everything currently tripping an alert: the fixed default thresholds (the
 * exact same computation the Compare tab uses) plus every enabled custom
 * rule — one list, most severe first. The Alerts page and the sidebar's
 * Alerts badge both read this, so they can never disagree on a count.
 */
export function buildAlertLog(
  campaigns: Campaign[],
  thresholds: Thresholds,
  rules: AlertRule[],
  t: TranslateFn
): AlertLogRow[] {
  const byId = new Map(campaigns.map((c) => [c.id, c]));

  const defaultRows = computePortfolioAlerts(campaigns, thresholds).map((row): AlertLogRow => {
    const campaign = byId.get(row.campaignId)!;
    return {
      key: `default-${row.campaignId}-${row.check}-${row.metric}`,
      campaignId: row.campaignId,
      campaignName: row.campaignName,
      companyId: campaign.companyId,
      companyName: row.companyName,
      ruleId: DEFAULT_RULE_ID,
      ruleLabel: t('alerts.rules.defaultLabel'),
      metric: row.metric,
      detail: `${sourceMeta(campaign, row.baseline).label} vs ${sourceMeta(campaign, row.check).label}`,
      cadenceGap: row.cadenceGap,
      delta: row.delta,
      absDelta: row.absDelta,
      severity: row.read === 'watch' ? 'watch' : 'investigate',
    };
  });

  const customRows = evaluateAlertRules(campaigns, rules).map(
    (row): AlertLogRow => ({
      key: row.key,
      campaignId: row.campaignId,
      campaignName: row.campaignName,
      companyId: byId.get(row.campaignId)!.companyId,
      companyName: row.companyName,
      ruleId: row.ruleId,
      ruleLabel: row.ruleName,
      metric: row.metric,
      detail: row.windowDays != null ? t('alerts.rules.trendDetail', { days: row.windowDays }) : row.detail,
      cadenceGap: false,
      delta: row.delta,
      absDelta: row.absDelta,
      // A custom rule is a line the user drew on purpose — crossing it is
      // always worth investigating.
      severity: 'investigate',
    })
  );

  return [...defaultRows, ...customRows].sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'investigate' ? -1 : 1;
    return b.absDelta - a.absDelta;
  });
}
