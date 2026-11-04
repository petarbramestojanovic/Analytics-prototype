import { TODAY } from '@/lib/clock';
import { computePortfolioAlerts, sourceMeta, type Thresholds } from '@/features/campaigns';
import type { TranslateFn } from '@/i18n';
import type { Campaign, MetricKey, SourceKey } from '@/types';
import type { AlertRule } from '../types';
import { ruleDisplayName } from './ruleText';
import { evaluateAlertRules } from './ruleEngine';

/** Sentinel `ruleId` for rows produced by the fixed default thresholds, so
 *  the log can tell them apart from custom-rule rows without a separate flag. */
export const DEFAULT_RULE_ID = '__default__';

type AlertSeverity = 'watch' | 'investigate';

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
  /** `pp`: `delta` is percentage points, not a relative change. */
  deltaKind?: 'pp';
  absDelta: number;
  severity: AlertSeverity;
  /** Set when the alert is two sources disagreeing. */
  sources?: { baseline: SourceKey; check: SourceKey };
}

/**
 * Everything currently tripping an alert: the fixed default thresholds (the
 * exact same computation the Compare tab uses) plus every enabled custom
 * rule — one list, most severe first. The Alerts page and the sidebar's
 * Alerts badge both read this, so they can never disagree on a count.
 */
const HOUR = 3_600_000;

/** When an alert "triggered". Alerts are computed live from the data rather
 *  than stored with a timestamp, so each gets a fixed time in the last three
 *  days derived from its key — stable between reloads, and the same one the
 *  inbox shows. The backend will have the real moment. */
export function alertTriggeredAt(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return new Date(TODAY.getTime() - (1 + (hash % 70)) * HOUR).toISOString();
}

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
      sources: { baseline: row.baseline, check: row.check },
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
      ruleLabel: ruleDisplayName(rules.find((r) => r.id === row.ruleId), row.ruleName, t),
      metric: row.metric,
      detail: row.detailParts
        ? t(row.detailParts.key, row.detailParts.vars)
        : row.windowDays != null
          ? t('alerts.rules.trendDetail', { days: row.windowDays })
          : row.detail,
      cadenceGap: false,
      delta: row.delta,
      deltaKind: row.deltaKind,
      sources: row.sources,
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
