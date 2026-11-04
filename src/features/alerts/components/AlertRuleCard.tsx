import { ArrowDownToLine, ArrowUpToLine, Bell, GitCompare, Pencil, Scale, Smartphone, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';
import { useI18n, type TranslateFn } from '@/i18n';
import { Button, Pill, Switch } from '@/components/ui';
import { ItemCard, TextLink } from '@/components/display';
import { paths } from '@/config/paths';
import { useSeatMembers, useSeats } from '@/features/seats';
import { notifyLabel } from '../lib/notify';
import { ruleCondition, ruleDisplayName } from '../lib/ruleText';
import type { AlertRule, AlertRuleScope } from '../types';

function scopeLabel(scope: AlertRuleScope, t: TranslateFn): string {
  if (scope.level === 'portfolio') return t('alerts.rules.scope.portfolio');
  if (scope.level === 'company') return scope.companyName;
  return scope.campaignName;
}

function ruleIcon(rule: AlertRule): ReactNode {
  switch (rule.type) {
    case 'sourceDivergence':
      return <GitCompare size={16} />;
    case 'metricTrend':
      return rule.direction === 'drop' ? <TrendingDown size={16} /> : <TrendingUp size={16} />;
    case 'valueThreshold':
      return rule.comparison === 'below' ? <ArrowDownToLine size={16} /> : <ArrowUpToLine size={16} />;
    case 'startDecline':
      return <TrendingDown size={16} />;
    case 'metricBelowMetric':
      return <Scale size={16} />;
    case 'consecutiveDrop':
      return <TrendingDown size={16} />;
    case 'deviceShare':
      return <Smartphone size={16} />;
  }
}

/** One rule — what it checks, where, and its on/off switch. The standard
 *  rules from v1 can be edited or switched off but not removed. */
export function AlertRuleCard({
  rule,
  modified = false,
  onToggle,
  onEdit,
  onDelete,
}: {
  rule: AlertRule;
  /** A standard rule whose settings differ from the shipped ones. */
  modified?: boolean;
  onToggle: (enabled: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const builtIn = !!rule.builtInKey;
  const { data: seats = [] } = useSeats();
  const { data: members = [] } = useSeatMembers();

  return (
    <ItemCard
      icon={ruleIcon(rule)}
      active={rule.enabled}
      title={
        <TextLink to={paths.alertRule(rule.id)} variant="record">
          {ruleDisplayName(rule, rule.name, t)}
        </TextLink>
      }
      badges={
        <>
          <Pill tone={rule.type === 'sourceDivergence' ? 'teal' : 'purple'}>{t(`alerts.rules.type.${rule.type}`)}</Pill>
          <Pill tone="neutral">{scopeLabel(rule.scope, t)}</Pill>
          {builtIn && <Pill tone="lime">{t('alerts.rules.builtIn')}</Pill>}
          {modified && <Pill tone="amber">{t('alerts.rules.modified')}</Pill>}
          {!rule.enabled && <Pill tone="neutral">{t('alerts.rules.disabled')}</Pill>}
        </>
      }
      actions={
        <>
          <Button size="sm" icon={<Pencil size={12} />} onClick={onEdit}>
            {t('common.edit')}
          </Button>
          {!builtIn && (
            <Button size="sm" icon={<Trash2 size={12} />} onClick={onDelete}>
              {t('common.remove')}
            </Button>
          )}
          <Switch
            checked={rule.enabled}
            onChange={onToggle}
            label={rule.enabled ? t('alerts.rules.disabled') : t('alerts.rules.enabled')}
          />
        </>
      }
    >
      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{ruleCondition(rule, t)}</div>
      <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
        <Bell size={11} />
        {t('alerts.notify.label', { who: notifyLabel(rule, seats, members, t) })}
      </div>
    </ItemCard>
  );
}
