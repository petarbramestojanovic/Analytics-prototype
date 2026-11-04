import type { TranslateFn } from '@/i18n';
import { fmtMetric } from '@/lib/format';
import type { AlertRule } from '../types';

/** A rule's name as shown: standard rules are translated, the user's own are
 *  whatever they typed. */
export function ruleDisplayName(rule: AlertRule | undefined, fallback: string, t: TranslateFn): string {
  return rule?.builtInKey ? t(`alerts.builtin.${rule.builtInKey}.name`) : (rule?.name ?? fallback);
}

/** One sentence saying what a rule checks, for its card. */
export function ruleCondition(rule: AlertRule, t: TranslateFn): string {
  const metric = t(`metric.${rule.metric}.label`);
  switch (rule.type) {
    case 'sourceDivergence':
      return t('alerts.rules.conditionDivergence', { metric, pct: fmtMetric('viewability', rule.thresholdPct) });
    case 'metricTrend':
      return t('alerts.rules.conditionTrend', {
        metric,
        direction: t(`alerts.rules.direction.${rule.direction}`),
        pct: fmtMetric('viewability', rule.thresholdPct),
        days: rule.windowDays,
      });
    case 'valueThreshold':
      return t('alerts.rules.conditionValue', {
        metric,
        comparison: t(`alerts.rules.comparisonWord.${rule.comparison}`),
        limit: fmtMetric(rule.metric, rule.limit),
      });
    case 'startDecline':
      return t(rule.mode === 'absolute' ? 'alerts.rules.conditionDeclineAbs' : 'alerts.rules.conditionDeclineRel', {
        metric,
        amount: rule.mode === 'absolute' ? `${(rule.thresholdPct * 100).toFixed(1)} pp` : fmtMetric('viewability', rule.thresholdPct),
      });
    case 'metricBelowMetric':
      return t('alerts.rules.conditionBelow', { metric, other: t(`metric.${rule.otherMetric}.label`) });
    case 'consecutiveDrop':
      return t('alerts.rules.conditionConsecutive', {
        metric,
        amount: `${(rule.dropPct * 100).toFixed(1)} pp`,
        days: rule.days,
      });
    case 'deviceShare':
      return t(`alerts.rules.conditionDevice.${rule.device}`, {
        comparison: t(`alerts.rules.comparisonWord.${rule.comparison}`),
        limit: fmtMetric('viewability', rule.limitPct),
      });
  }
}
