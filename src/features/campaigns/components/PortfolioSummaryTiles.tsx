import type { ReactNode } from 'react';
import { FolderKanban, Radio } from 'lucide-react';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import { fmtMetric, fmtSignedPp } from '@/lib/format';
import { StatGrid, SummaryTile } from '@/components/display';
import type { PortfolioSummary } from '../lib/portfolio';
import { MetricIcon } from './MetricIcon';

const ICON = { size: 20, strokeWidth: 1.75 } as const;

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
            'tnum ml-2 font-sans text-sm font-medium tracking-normal',
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
 * The summary tiles every portfolio view opens with (Overview, a client's detail
 * page): campaigns, live, impressions, engagement, CTR and viewability, with
 * `extra` as one more tile at the end of the row. `showCampaigns` and `showLive`
 * (both default on) are the two campaign-count tiles; `showImpressions` adds an
 * impressions tile — live campaigns' by default, every campaign's with
 * `allImpressions`; `showEngagement` adds the average engagement rate.
 * `periodLabel` and `rateNote` are the small lines under the impressions and
 * the rate tiles. `previous` is a comparison period (the same window last
 * year); each rate tile then shows its change against it.
 */
export function PortfolioSummaryTiles({
  summary,
  previous,
  showCampaigns = true,
  showLive = true,
  showImpressions = false,
  allImpressions = false,
  showEngagement = false,
  periodLabel,
  rateNote,
  extra,
}: {
  summary: PortfolioSummary;
  previous?: PortfolioSummary;
  showCampaigns?: boolean;
  showLive?: boolean;
  showImpressions?: boolean;
  allImpressions?: boolean;
  showEngagement?: boolean;
  /** The small line under the impressions tile: which period it covers. */
  periodLabel?: string;
  /** The small line under the three rate tiles: what the averages span. */
  rateNote?: string;
  extra?: ReactNode;
}) {
  const { t } = useI18n();
  // A period with no delivery has nothing to compare against.
  const prev = (key: RateKey) => (previous && previous.campaignCount > 0 ? previous[key] : undefined);
  // CTR + viewability always show; the rest are optional.
  const tileCount =
    2 + Number(showLive) + Number(showCampaigns) + Number(showImpressions) + Number(showEngagement);
  const columns = tileCount >= 7 ? 7 : tileCount >= 6 ? 6 : 5;
  return (
    <StatGrid columns={columns}>
      {showCampaigns && (
        <SummaryTile
          label={t('overview.tile.campaigns')}
          value={String(summary.campaignCount)}
          // The live count is its own tile where `showLive` is on.
          footnote={showLive ? undefined : t('overview.tile.campaignsLive', { count: summary.liveCount })}
          icon={<FolderKanban {...ICON} />}
        />
      )}
      {showLive && (
        <SummaryTile label={t('overview.tile.live')} value={String(summary.liveCount)} icon={<Radio {...ICON} />} />
      )}
      {showImpressions && (
        <SummaryTile
          label={t(allImpressions ? 'overview.tile.allImpressions' : 'overview.tile.impressions')}
          value={fmtMetric('impressions', allImpressions ? summary.totalImpressions : summary.liveImpressions)}
          footnote={periodLabel}
          icon={<MetricIcon metric="impressions" />}
        />
      )}
      {showEngagement && (
        <SummaryTile
          label={t('overview.tile.avgEngagement')}
          value={<RateValue metric="engagementRate" value={summary.avgEngagementRate} previous={prev('avgEngagementRate')} />}
          footnote={rateNote}
          icon={<MetricIcon metric="engagementRate" />}
        />
      )}
      <SummaryTile
        label={t('overview.tile.avgCtr')}
        value={<RateValue metric="ctr" value={summary.avgCtr} previous={prev('avgCtr')} />}
        footnote={rateNote}
        icon={<MetricIcon metric="ctr" />}
      />
      <SummaryTile
        label={t('overview.tile.avgViewability')}
        value={<RateValue metric="viewability" value={summary.avgViewability} previous={prev('avgViewability')} />}
        footnote={rateNote}
        icon={<MetricIcon metric="viewability" />}
      />
      {extra}
    </StatGrid>
  );
}
