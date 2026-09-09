import type { MetricKey } from '../mock/types';
import { fmtMetric } from '../mock/data';
import { useI18n } from '../lib/i18n';
import { Tooltip } from './primitives';

export default function MetricTile({
  metric,
  value,
  emphasis = false,
  footnote,
}: {
  metric: MetricKey;
  value: number | undefined;
  emphasis?: boolean;
  footnote?: string;
}) {
  const { t } = useI18n();
  return (
    <div
      className={`rounded-xl border p-4 ${
        emphasis
          ? 'border-brame-teal/30 bg-brame-teal/5 dark:border-brame-teal/40 dark:bg-brame-teal/10'
          : 'border-gray-200 bg-white dark:border-white/10 dark:bg-brame-dark-light'
      }`}
    >
      {/* Two-line reserve so a wrapping label ("Viewable impressions") does not
          push its value out of line with the rest of the row. */}
      <div className="flex min-h-8 items-start gap-1.5">
        <span className="text-xs font-medium uppercase leading-4 tracking-wide text-gray-500 dark:text-gray-400">
          {t(`metric.${metric}.label`)}
        </span>
        <span className="mt-0.5">
          <Tooltip text={t(`metric.${metric}.help`)} />
        </span>
      </div>
      <div className="tnum mt-1.5 text-2xl font-bold text-brame-dark dark:text-white">
        {fmtMetric(metric, value)}
      </div>
      {footnote && <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{footnote}</div>}
    </div>
  );
}
