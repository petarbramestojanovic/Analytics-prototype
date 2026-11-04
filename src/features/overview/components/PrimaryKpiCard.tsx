import { useMemo } from 'react';
import { Target } from 'lucide-react';
import { paths } from '@/config/paths';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import { fmtMetric } from '@/lib/format';
import { Card, ProgressBar, Tooltip } from '@/components/ui';
import { Eyebrow, TextLink } from '@/components/display';
import { buildGoalGroups } from '@/features/campaigns';
import type { Campaign } from '@/types';

/** One column per KPI on a wide screen, so the row always spans the card —
 *  two, three or four groups, never a gap on the right. (Full class names,
 *  because Tailwind can't see a class built from a number.) */
const COLUMNS: Record<number, string> = {
  1: 'xl:grid-cols-1',
  2: 'xl:grid-cols-2',
  3: 'xl:grid-cols-3',
  4: 'xl:grid-cols-4',
};

/** Live campaigns grouped by the primary KPI they were sold on (briefed in
 *  Salesforce), with how many are on target — "are we delivering what we
 *  promised" at portfolio level. */
export function PrimaryKpiCard({ campaigns }: { campaigns: Campaign[] }) {
  const { t } = useI18n();
  const { groups, unbriefed } = useMemo(() => buildGoalGroups(campaigns), [campaigns]);

  return (
    <Card className="mb-4">
      <Eyebrow icon={<Target size={12} />}>
        {t('overview.kpi.title')}
        <Tooltip text={t('overview.kpi.hint')} />
      </Eyebrow>

      {groups.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('overview.kpi.empty')}</p>
      ) : (
        <div
          className={cn(
            'grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2',
            COLUMNS[Math.min(groups.length, 4)],
          )}
        >
          {groups.map((g) => {
            const share = g.judged ? g.met / g.judged : 0;
            return (
              <div key={g.metric}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-brame-dark dark:text-gray-100">
                    {t(`metric.${g.metric}.label`)}
                  </span>
                  <span className="tnum text-xs text-gray-500 dark:text-gray-400">
                    {t('overview.kpi.campaigns', { count: g.campaigns })}
                  </span>
                </div>
                <div className="tnum mt-1 text-xl font-bold text-brame-dark dark:text-white">
                  {fmtMetric(g.metric, g.avgValue)}
                  {g.avgTarget != null && (
                    <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                      {t('overview.kpi.vsTarget', { target: fmtMetric(g.metric, g.avgTarget) })}
                    </span>
                  )}
                </div>
                <ProgressBar
                  value={share}
                  className="mt-2"
                  barClassName={share >= 0.5 ? 'bg-green-500' : 'bg-amber-400'}
                />
                <div className="tnum mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {t('overview.kpi.onTarget', { met: g.met, judged: g.judged })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {unbriefed > 0 && (
        <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
          {t('overview.kpi.unbriefed', { count: unbriefed })}
        </p>
      )}
      <TextLink to={paths.campaigns} className="mt-3">
        {t('overview.viewAllCampaigns')}
      </TextLink>
    </Card>
  );
}
