import { AlertTriangle } from 'lucide-react';
import { paths } from '@/config/paths';
import { useI18n } from '@/i18n';
import { Pill } from '@/components/ui';
import { DeltaValue, TextLink } from '@/components/display';
import { useAlertLog } from '@/features/alerts';

/** More than this and the box would push the KPIs off the screen — the rest
 *  are one click away on the Alerts page. */
const MAX_SHOWN = 3;

/**
 * The yellow box under the pacing card: everything currently tripping an alert
 * on this campaign (source divergence plus custom rules — the same log the
 * Alerts page reads). Renders nothing when there is nothing to flag.
 */
export function CampaignAlertsBox({ campaignId }: { campaignId: string }) {
  const { t } = useI18n();
  const { rows } = useAlertLog();
  const mine = rows.filter((r) => r.campaignId === campaignId);
  if (mine.length === 0) return null;

  return (
    <div
      role="alert"
      className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100"
    >
      <div className="flex items-center gap-2 text-sm font-semibold">
        <AlertTriangle size={16} className="flex-shrink-0" />
        {t('detail.alerts.title', { count: mine.length })}
      </div>
      <ul className="mt-2 divide-y divide-amber-200/70 dark:divide-amber-400/15">
        {mine.slice(0, MAX_SHOWN).map((row) => (
          <li
            key={row.key}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-1.5 text-sm"
          >
            <span className="min-w-0">
              <span className="font-medium">{t(`metric.${row.metric}.label`)}</span>
              <span className="text-amber-800/80 dark:text-amber-200/70">
                {' '}
                · {row.ruleLabel} · {row.detail}
              </span>
            </span>
            <span className="flex items-center gap-3">
              <DeltaValue delta={row.delta} severity={row.severity} unit={row.deltaKind ?? 'pct'} />
              <Pill tone={row.severity === 'watch' ? 'amber' : 'red'}>
                {t(`detail.read.${row.severity}`)}
              </Pill>
              <TextLink to={paths.alert(row.key)} arrow>
                {t('detail.alerts.open')}
              </TextLink>
            </span>
          </li>
        ))}
      </ul>
      {mine.length > MAX_SHOWN && (
        <div className="mt-2 text-sm">
          <TextLink to={paths.alerts} arrow>
            {t('detail.alerts.more', { count: mine.length - MAX_SHOWN })}
          </TextLink>
        </div>
      )}
    </div>
  );
}
