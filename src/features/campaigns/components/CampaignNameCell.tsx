import { paths } from '@/config/paths';
import { useFormatters } from '@/i18n';
import { TextLink } from '@/components/display';
import type { Campaign } from '@/types';
import { CampaignStatusPill } from './CampaignStatusPill';

/** A campaign table's first column: the name (linking to its analytics),
 *  then status and flight dates underneath. */
export function CampaignNameCell({ campaign, newTab = false }: { campaign: Campaign; newTab?: boolean }) {
  const { fmtDateRange } = useFormatters();
  return (
    <div>
      <TextLink to={paths.campaign(campaign.id)} variant="record" newTab={newTab} className="whitespace-nowrap">
        {campaign.name}
      </TextLink>
      <div className="mt-1 flex items-center gap-1.5">
        <CampaignStatusPill status={campaign.status} />
        <span className="whitespace-nowrap text-xs text-gray-400 dark:text-gray-500">
          {fmtDateRange(campaign.flightStart, campaign.flightEnd)}
        </span>
      </div>
    </div>
  );
}
