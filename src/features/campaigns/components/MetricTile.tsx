import { useI18n } from '@/i18n';
import { fmtMetric } from '@/lib/format';
import { StatTile } from '@/components/display';
import { Tooltip } from '@/components/ui';
import type { MetricKey } from '@/types';

/** A headline metric with its translated label and help tooltip. */
export function MetricTile({
  metric,
  value,
  emphasis = false,
  footnote,
}: {
  metric: MetricKey;
  value: number | null | undefined;
  emphasis?: boolean;
  footnote?: string;
}) {
  const { t } = useI18n();
  return (
    <StatTile
      tone={emphasis ? 'emphasis' : 'default'}
      footnote={footnote}
      label={
        // Two-line reserve so a wrapping label ("Viewable impressions") does
        // not push its value out of line with the rest of the row.
        <>
          <span className="text-xs font-medium uppercase leading-4 tracking-wide text-gray-500 dark:text-gray-400">
            {t(`metric.${metric}.label`)}
          </span>
          <span className="mt-0.5">
            <Tooltip text={t(`metric.${metric}.help`)} />
          </span>
        </>
      }
      value={fmtMetric(metric, value)}
    />
  );
}
