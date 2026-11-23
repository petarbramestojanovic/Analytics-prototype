import { useI18n } from '@/i18n';
import { fmtMetric } from '@/lib/format';
import { SummaryTile } from '@/components/display';
import type { MetricKey } from '@/types';
import { MetricIcon } from './MetricIcon';

/** A headline metric with its translated label, icon and help tooltip. */
export function MetricTile({ metric, value }: { metric: MetricKey; value: number | null | undefined }) {
  const { t } = useI18n();
  return (
    <SummaryTile
      label={t(`metric.${metric}.label`)}
      hint={t(`metric.${metric}.help`)}
      icon={<MetricIcon metric={metric} />}
      value={fmtMetric(metric, value)}
    />
  );
}
