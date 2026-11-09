import { Cloud, Lock, Target } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useI18n } from '@/i18n';
import { fmtMetric } from '@/lib/format';
import { Card, Pill, ProgressBar, Tooltip } from '@/components/ui';
import { Eyebrow } from '@/components/display';
import type { Campaign } from '@/types';
import { GOAL_STATUS_TONE, goalRead, guaranteeRead } from '../lib/goal';

const BAR_CLASS = {
  met: 'bg-green-500',
  close: 'bg-amber-400',
  behind: 'bg-red-500',
  'no-target': 'bg-brame-teal',
  'no-data': 'bg-brame-teal',
} as const;

/**
 * The campaign's main goal — the metric it was sold on — with where it stands
 * against target. Klea seats also see the performance guarantee and the total
 * budget underneath (never the client). All of it is briefed in Salesforce.
 */
export function GoalCard({
  campaign,
  isInternal,
  className,
}: {
  campaign: Campaign;
  isInternal: boolean;
  className?: string;
}) {
  const { t } = useI18n();
  const goal = goalRead(campaign);
  const guarantee = isInternal ? guaranteeRead(campaign) : null;
  const budget = isInternal ? campaign.salesforce.totalBudget : null;
  const hasInternal = !!(guarantee || budget);

  return (
    <Card className={cn('flex flex-col', className)}>
      <div className="flex items-center justify-between gap-2">
        <Eyebrow icon={<Target size={12} />} className="mb-0">
          {t('goal.title')}
          <Tooltip text={t('goal.help')} />
        </Eyebrow>
        <span className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
          <Cloud size={12} />
          {t('goal.briefedIn')}
        </span>
      </div>

      <div className="mt-3 flex flex-1 flex-col gap-4">
        {!goal ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('goal.notBriefed')}</p>
        ) : (
          <div>
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {t(`metric.${goal.metric}.label`)}
            </div>
            <div className="mt-0.5 flex flex-wrap items-end gap-x-4 gap-y-1">
              <span className="tnum text-4xl font-bold leading-none text-brame-dark dark:text-white">
                {fmtMetric(goal.metric, goal.value)}
              </span>
              {goal.target != null && (
                <span className="tnum pb-0.5 text-sm text-gray-500 dark:text-gray-400">
                  {t('goal.target')} {fmtMetric(goal.metric, goal.target)}
                </span>
              )}
              <Pill tone={GOAL_STATUS_TONE[goal.status]}>{t(`goal.status.${goal.status}`)}</Pill>
            </div>
            {goal.attainment != null && (
              <div className="mt-3">
                <ProgressBar value={goal.attainment} barClassName={BAR_CLASS[goal.status]} />
                <div className="tnum mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  {t('goal.attainment', { pct: Math.round(goal.attainment * 100) })}
                </div>
              </div>
            )}
            {goal.status === 'no-data' && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {t('goal.noData', { metric: t(`metric.${goal.metric}.label`) })}
              </p>
            )}
          </div>
        )}

        {hasInternal && (
          <dl className="mt-auto space-y-2 border-t border-gray-100 pt-3 text-sm dark:border-white/10">
            <div className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
              <Lock size={10} />
              {t('goal.internalNote')}
            </div>
            {guarantee && (
              <div>
                <dt className="text-gray-500 dark:text-gray-400">{t('goal.guarantee')}</dt>
                <dd className="mt-0.5 flex flex-wrap items-center gap-2">
                  <span className="tnum font-medium text-brame-dark dark:text-gray-100">
                    ≥ {fmtMetric(guarantee.metric, guarantee.guaranteed)}{' '}
                    {t(`metric.${guarantee.metric}.label`)}
                  </span>
                  {guarantee.status !== 'no-data' && (
                    <Pill tone={guarantee.status === 'ok' ? 'green' : 'red'}>
                      {t(`goal.guarantee.${guarantee.status}`)}
                    </Pill>
                  )}
                </dd>
              </div>
            )}
            {budget && (
              <div>
                <dt className="text-gray-500 dark:text-gray-400">{t('goal.budget')}</dt>
                <dd className="tnum mt-0.5 font-medium text-brame-dark dark:text-gray-100">
                  {budget.currency} {budget.amount.toLocaleString('de-CH').replace(/’/g, "'")}
                </dd>
              </div>
            )}
          </dl>
        )}
      </div>
    </Card>
  );
}
