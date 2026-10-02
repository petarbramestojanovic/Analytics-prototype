import { Unplug } from 'lucide-react';
import { useI18n } from '@/i18n';
import { fmtMetric } from '@/lib/format';
import type { Campaign, MetricKey } from '@/types';
import { primarySeries, sourceMeta } from '../lib/sources';

/**
 * A campaign-table metric cell that knows some sources don't measure every
 * metric — ATK has no CTR or engagement rate, for instance. Shows the value
 * when the primary source measures it, or a muted "n/a" with a tooltip naming
 * which source and metric otherwise, rather than a bare dash that reads as
 * "zero". A campaign with no data yet at all shows the plain dash.
 */
export function MetricValueCell({ campaign, metric }: { campaign: Campaign; metric: MetricKey }) {
  const { t } = useI18n();
  const series = primarySeries(campaign);
  const value = series?.totals[metric];

  if (value != null || !series) return <span className="tnum">{fmtMetric(metric, value)}</span>;

  const meta = sourceMeta(campaign, campaign.primarySource);
  return (
    <span
      className="inline-flex items-center gap-1 text-gray-400 dark:text-gray-500"
      title={t('campaigns.metricNATitle', { source: meta.label, metric: t(`metric.${metric}.label`) })}
    >
      <Unplug size={11} />
      {t('campaigns.metricNA')}
    </span>
  );
}
