import type { ReactNode } from 'react';
import { useI18n } from '@/i18n';
import { fmtMetric } from '@/lib/format';
import { StatGrid, SummaryTile } from '@/components/display';
import type { PortfolioSummary } from '../lib/portfolio';

/**
 * The campaigns / live / CTR / viewability tiles every portfolio view opens
 * with (Overview, a client's detail page). `extra` renders one more tile at
 * the end of the row. `showImpressions` adds live impressions after "Live".
 */
export function PortfolioSummaryTiles({
  summary,
  showImpressions = false,
  extra,
}: {
  summary: PortfolioSummary;
  showImpressions?: boolean;
  extra?: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <StatGrid columns={5}>
      <SummaryTile label={t('overview.tile.campaigns')} value={String(summary.campaignCount)} />
      <SummaryTile label={t('overview.tile.live')} value={String(summary.liveCount)} />
      {showImpressions && (
        <SummaryTile label={t('overview.tile.impressions')} value={fmtMetric('impressions', summary.liveImpressions)} />
      )}
      <SummaryTile label={t('overview.tile.avgCtr')} value={fmtMetric('ctr', summary.avgCtr)} />
      <SummaryTile label={t('overview.tile.avgViewability')} value={fmtMetric('viewability', summary.avgViewability)} />
      {extra}
    </StatGrid>
  );
}
