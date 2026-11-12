import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import { fmtMetric, fmtSignedPp } from '@/lib/format';
import { StatGrid, SummaryTile } from '@/components/display';
import type { PortfolioSummary } from '../lib/portfolio';

/** A tile that leads somewhere: the same shell, with a hover cue. */
const LINK_TILE =
  'h-full transition-colors hover:border-brame-teal/40 dark:hover:border-brame-turquoise/40';

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
 * The [campaigns] / [live] / [impressions] / [awaiting setup] / [engagement] /
 * CTR / viewability tiles every portfolio view opens with (Overview, a
 * client's detail page). `extra` renders one more tile at the end of the
 * row. `showCampaigns` (default on) is the campaign-count tile; `showLive`
 * (default on) the live-campaign count; `showImpressions` adds an impressions
 * tile — live campaigns' by default, every campaign's with `allImpressions`; `awaitingSetup`, when
 * given, adds the count of campaigns with no data source yet; `showEngagement`
 * adds the average engagement rate. `previous` is a comparison period (the same window last year); each
 * rate tile then shows its change against it.
 */
export function PortfolioSummaryTiles({
  summary,
  previous,
  showCampaigns = true,
  showLive = true,
  showImpressions = false,
  allImpressions = false,
  awaitingSetup,
  awaitingSetupTo,
  noConnector,
  noConnectorTo,
  showEngagement = false,
  extra,
}: {
  summary: PortfolioSummary;
  previous?: PortfolioSummary;
  showCampaigns?: boolean;
  showLive?: boolean;
  showImpressions?: boolean;
  allImpressions?: boolean;
  awaitingSetup?: number;
  /** Where the awaiting-setup tile leads, when it is a link. */
  awaitingSetupTo?: string;
  /** Sources with no connector, across the campaigns; the tile shows when given. */
  noConnector?: number;
  noConnectorTo?: string;
  showEngagement?: boolean;
  extra?: ReactNode;
}) {
  const { t } = useI18n();
  // A period with no delivery has nothing to compare against.
  const prev = (key: RateKey) => (previous && previous.campaignCount > 0 ? previous[key] : undefined);
  // CTR + viewability always show; the rest are optional.
  const tileCount =
    2 + Number(showLive) + Number(showCampaigns) + Number(showImpressions) + Number(awaitingSetup !== undefined) + Number(noConnector !== undefined) + Number(showEngagement);
  const columns = tileCount >= 7 ? 7 : tileCount >= 6 ? 6 : 5;
  /** A tile that, when given a destination, is a link to it. */
  const linked = (to: string | undefined, tile: ReactNode) =>
    to ? (
      <Link to={to} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brame-teal/50">
        {tile}
      </Link>
    ) : (
      tile
    );
  return (
    <StatGrid columns={columns}>
      {showCampaigns && <SummaryTile label={t('overview.tile.campaigns')} value={String(summary.campaignCount)} />}
      {showLive && <SummaryTile label={t('overview.tile.live')} value={String(summary.liveCount)} />}
      {showImpressions && (
        <SummaryTile
          label={t(allImpressions ? 'overview.tile.allImpressions' : 'overview.tile.impressions')}
          value={fmtMetric('impressions', allImpressions ? summary.totalImpressions : summary.liveImpressions)}
        />
      )}
      {awaitingSetup !== undefined &&
        linked(
          awaitingSetupTo,
          <SummaryTile
            label={t('overview.tile.awaitingSetup')}
            value={String(awaitingSetup)}
            className={awaitingSetupTo ? LINK_TILE : undefined}
          />,
        )}
      {noConnector !== undefined &&
        linked(
          noConnectorTo,
          <SummaryTile
            label={t('overview.tile.noConnector')}
            value={String(noConnector)}
            className={noConnectorTo ? LINK_TILE : undefined}
          />,
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
