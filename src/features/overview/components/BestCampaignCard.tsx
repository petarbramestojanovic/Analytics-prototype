import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { paths } from '@/config/paths';
import { useI18n } from '@/i18n';
import { Card } from '@/components/ui';
import { Eyebrow } from '@/components/display';
import { primarySeries } from '@/features/campaigns';
import type { Campaign } from '@/types';
import { HeadlineCtr } from './HeadlineCtr';

/** Ranked within the seat's own campaigns — a client sees no cross-tenant
 *  benchmarks, so "top performer" can't mean a portfolio-wide group. */
function topCampaignByCtr(campaigns: Campaign[]): { campaign: Campaign; ctr: number } | null {
  let best: { campaign: Campaign; ctr: number } | null = null;
  for (const campaign of campaigns) {
    const ctr = primarySeries(campaign)?.totals.ctr;
    if (ctr != null && (!best || ctr > best.ctr)) best = { campaign, ctr };
  }
  return best;
}

/** Client-side counterpart to TopGroupCard — same "best by CTR" framing. */
export function BestCampaignCard({ campaigns, avgCtr }: { campaigns: Campaign[]; avgCtr: number | null }) {
  const { t } = useI18n();
  const top = useMemo(() => topCampaignByCtr(campaigns), [campaigns]);

  return (
    <Card className="h-full">
      <Eyebrow icon={<Trophy size={12} />}>{t('overview.yourBestTitle')}</Eyebrow>
      {!top ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('overview.topNone')}</p>
      ) : (
        <Link to={paths.campaign(top.campaign.id)} className="block">
          <div className="text-lg font-bold text-brame-dark hover:text-brame-teal dark:text-white dark:hover:text-brame-turquoise-light">
            {top.campaign.name}
          </div>
          <HeadlineCtr value={top.ctr} comparison={avgCtr != null ? { key: 'overview.vsYourAverage', value: avgCtr } : undefined} />
        </Link>
      )}
    </Card>
  );
}
