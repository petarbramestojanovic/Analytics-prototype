import type { ReactNode } from 'react';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import { fmtMetric, fmtSignedPp } from '@/lib/format';
import { StatGrid, SummaryTile } from '@/components/display';
import type { PortfolioSummary } from '../lib/portfolio';

type RateKey = 'avgEngagementRate' | 'avgCtr' | 'avgViewability';

/** A rate with, when there is a comparison period, its change in percentage
 *  points. A drop reads amber; no delta is shown if either side is missing. */
function RateValue({
  metric,
  value,
  previous,
}: {
  metric: 'engagementRate' | 'ctr' | 'viewability';
  value: number | null;
  previous?: number | null;
}) {
  const hasDelta = value != null && previous != null;
  return (
    <>
      {fmtMetric(metric, value)}
      {hasDelta && (
        <span
          className={cn(
            'tnum ml-1.5 text-xs font-medium',
            value - previous < 0 ? 'text-amber-700 dark:text-amber-300' : 'text-gray-500 dark:text-gray-400',
          )}
        >
          {fmtSignedPp(value - previous, 2)}
        </span>
      )}
    </>
  );
}

/**
 * The campaigns / live / [engagement] / CTR / viewability tiles every
 * portfolio view opens with (Overview, a client's detail page). `extra`
 * renders one more tile at the end of the row. `showImpressions` adds live
 * impressions after "Live"; `showEngagement` adds the average engagement
 * rate. `previous` is a comparison period (the same window last year); each
 * rate tile then shows its change against it.
 */
export function PortfolioSummaryTiles({
  summary,
  previous,
  showImpressions = false,
  showEngagement = false,
  extra,
}: {
  summary: PortfolioSummary;
  previous?: PortfolioSummary;
  showImpressions?: boolean;
  showEngagement?: boolean;
  extra?: ReactNode;
}) {
  const { t } = useI18n();
  // A period with no delivery has nothing to compare against.
  const prev = (key: RateKey) => (previous && previous.campaignCount > 0 ? previous[key] : undefined);
  return (
    <StatGrid columns={5}>
      <SummaryTile label={t('overview.tile.campaigns')} value={String(summary.campaignCount)} />
      <SummaryTile label={t('overview.tile.live')} value={String(summary.liveCount)} />
      {showImpressions && (
        <SummaryTile label={t('overview.tile.impressions')} value={fmtMetric('impressions', summary.liveImpressions)} />
      )}
      {showEngagement && (
        <SummaryTile
          label={t('overview.tile.avgEngagement')}
          value={<RateValue metric="engagementRate" value={summary.avgEngagementRate} previous={prev('avgEngagementRate')} />}
        />
      )}
      <SummaryTile
        label={t('overview.tile.avgCtr')}
        value={<RateValue metric="ctr" value={summary.avgCtr} previous={prev('avgCtr')} />}
      />
      <SummaryTile
        label={t('overview.tile.avgViewability')}
        value={<RateValue metric="viewability" value={summary.avgViewability} previous={prev('avgViewability')} />}
      />
      {extra}
    </StatGrid>
  );
}
