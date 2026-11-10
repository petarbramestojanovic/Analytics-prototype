import { useI18n } from '@/i18n';
import { EMPTY_VALUE } from '@/lib/format';
import { useSession } from '@/features/session';

/** A metric the source doesn't measure: a muted dash, not a loud "n/a" badge
 *  repeated down a column. The tooltip names which source and metric to internal seats;
 *  screen readers get the word. */
export function NotMeasured({ source, metric }: { source: string; metric: string }) {
  const { t } = useI18n();
  const { isInternal } = useSession();
  // Which platform counts what is internal knowledge; a client just learns
  // that the figure isn't measured.
  const title = isInternal
    ? t('campaigns.metricNATitle', { source, metric })
    : t('campaigns.metricNATitleClient', { metric });
  return (
    <span
      className="cursor-help text-gray-400 dark:text-gray-500"
      title={title}
    >
      {EMPTY_VALUE}
      <span className="sr-only">{t('campaigns.metricNA')}</span>
    </span>
  );
}
