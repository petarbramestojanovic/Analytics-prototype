import { useI18n } from '@/i18n';
import { EMPTY_VALUE } from '@/lib/format';

/** A metric the source doesn't measure: a muted dash, not a loud "n/a" badge
 *  repeated down a column. The tooltip still names which source and metric;
 *  screen readers get the word. */
export function NotMeasured({ source, metric }: { source: string; metric: string }) {
  const { t } = useI18n();
  return (
    <span
      className="cursor-help text-gray-400 dark:text-gray-500"
      title={t('campaigns.metricNATitle', { source, metric })}
    >
      {EMPTY_VALUE}
      <span className="sr-only">{t('campaigns.metricNA')}</span>
    </span>
  );
}
