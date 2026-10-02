import { GitCompare, Pencil, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { useI18n, type TranslateFn } from '@/i18n';
import { fmtPct } from '@/lib/format';
import { Button, Pill, Switch } from '@/components/ui';
import { ItemCard } from '@/components/display';
import type { AlertRule, AlertRuleScope } from '../types';

function scopeLabel(scope: AlertRuleScope, t: TranslateFn): string {
  if (scope.level === 'portfolio') return t('alerts.rules.scope.portfolio');
  if (scope.level === 'company') return scope.companyName;
  return scope.campaignName;
}

/** One custom rule — what it checks, where, and its on/off switch. */
export function AlertRuleCard({
  rule,
  onToggle,
  onEdit,
  onDelete,
}: {
  rule: AlertRule;
  onToggle: (enabled: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const metric = t(`metric.${rule.metric}.label`);
  const pct = fmtPct(rule.thresholdPct, 1);

  const condition =
    rule.type === 'sourceDivergence'
      ? t('alerts.rules.conditionDivergence', { metric, pct })
      : t('alerts.rules.conditionTrend', {
          metric,
          direction: t(`alerts.rules.direction.${rule.direction}`),
          pct,
          days: rule.windowDays,
        });

  const Icon = rule.type === 'sourceDivergence' ? GitCompare : rule.direction === 'drop' ? TrendingDown : TrendingUp;

  return (
    <ItemCard
      icon={<Icon size={16} />}
      active={rule.enabled}
      title={rule.name}
      badges={
        <>
          <Pill tone={rule.type === 'sourceDivergence' ? 'teal' : 'purple'}>{t(`alerts.rules.type.${rule.type}`)}</Pill>
          <Pill tone="neutral">{scopeLabel(rule.scope, t)}</Pill>
          {!rule.enabled && <Pill tone="neutral">{t('alerts.rules.disabled')}</Pill>}
        </>
      }
      actions={
        <>
          <Button size="sm" icon={<Pencil size={12} />} onClick={onEdit}>
            {t('common.edit')}
          </Button>
          <Button size="sm" icon={<Trash2 size={12} />} onClick={onDelete}>
            {t('common.remove')}
          </Button>
          <Switch
            checked={rule.enabled}
            onChange={onToggle}
            label={rule.enabled ? t('alerts.rules.disabled') : t('alerts.rules.enabled')}
          />
        </>
      }
    >
      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{condition}</div>
    </ItemCard>
  );
}
