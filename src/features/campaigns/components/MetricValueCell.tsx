import { useI18n } from '@/i18n';
import { fmtCompact, fmtMetric } from '@/lib/format';
import { BenchmarkValue } from '@/features/benchmarks';
import type { Campaign, MetricKey } from '@/types';
import { NotMeasured } from './NotMeasured';
import { engagementCount, primarySeries, sourceMeta } from '../lib/sources';

/** A table metric: any MetricKey, plus the engagement count, which is derived
 *  from the daily series rather than stored as a total. */
export type CellMetric = MetricKey | 'engagements';

/**
 * A campaign-table metric cell that knows some sources don't measure every
 * metric — ATK has no CTR or engagement rate, for instance. Shows the value
 * when the primary source measures it, or a muted "n/a" with a tooltip naming
 * which source and metric otherwise, rather than a bare dash that reads as
 * "zero". A campaign with no data yet at all shows the plain dash. Rates are
 * coloured against the industry benchmark (see BenchmarkValue).
 */
export function MetricValueCell({ campaign, metric }: { campaign: Campaign; metric: CellMetric }) {
  const { t } = useI18n();
  const series = primarySeries(campaign);
  const value = metric === 'engagements' ? engagementCount(campaign) : series?.totals[metric];

  if (value != null || !series) {
    if (metric === 'engagements') {
      return <span className="tnum">{value == null ? fmtMetric('impressions', value) : fmtCompact(value)}</span>;
    }
    return (
      <BenchmarkValue value={value} metric={metric} companyId={campaign.companyId} className="tnum">
        {fmtMetric(metric, value)}
      </BenchmarkValue>
    );
  }

  return (
    <NotMeasured
      source={sourceMeta(campaign, campaign.primarySource).label}
      metric={t(`metric.${metric}.label`)}
    />
  );
}
