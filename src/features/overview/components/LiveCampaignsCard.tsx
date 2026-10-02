import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Radio } from 'lucide-react';
import { paths } from '@/config/paths';
import { useI18n } from '@/i18n';
import { fmtMetric } from '@/lib/format';
import { Card } from '@/components/ui';
import { Eyebrow, TextLink } from '@/components/display';
import { DeliveryBar, deliveryPacing, primarySeries } from '@/features/campaigns';
import type { Campaign } from '@/types';

/** A few live campaigns with delivery pacing — the "is anything at risk right
 *  now" glance a client's own Campaigns table would otherwise require a click
 *  to get to. */
export function LiveCampaignsCard({ campaigns }: { campaigns: Campaign[] }) {
  const { t } = useI18n();
  const live = useMemo(() => campaigns.filter((c) => c.status === 'live').slice(0, 3), [campaigns]);

  return (
    <Card className="h-full">
      <Eyebrow icon={<Radio size={12} />}>{t('overview.liveCampaignsTitle')}</Eyebrow>
      {live.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('overview.noLiveCampaigns')}</p>
      ) : (
        <div className="space-y-3">
          {live.map((c) => (
            <LiveCampaignRow key={c.id} campaign={c} />
          ))}
        </div>
      )}
      <TextLink to={paths.campaigns} className="mt-3">
        {t('overview.viewAllCampaigns')}
      </TextLink>
    </Card>
  );
}

function LiveCampaignRow({ campaign }: { campaign: Campaign }) {
  const pacing = deliveryPacing(campaign);
  return (
    <Link to={paths.campaign(campaign.id)} className="block">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium text-brame-dark dark:text-gray-100">{campaign.name}</span>
        {pacing != null && (
          <span className="tnum flex-shrink-0 text-xs text-gray-500 dark:text-gray-400">
            {fmtMetric('impressions', primarySeries(campaign)?.totals.impressions ?? 0)}
          </span>
        )}
      </div>
      <DeliveryBar pacing={pacing} showValue={false} className="mt-1" />
    </Link>
  );
}
