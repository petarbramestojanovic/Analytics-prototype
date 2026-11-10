import { paths } from '@/config/paths';
import { cn } from '@/lib/cn';
import { useFormatters } from '@/i18n';
import { Pill } from '@/components/ui';
import { TextLink } from '@/components/display';
import type { Campaign } from '@/types';
import { CampaignStatusPill } from './CampaignStatusPill';

/** A campaign table's first column: the name (linking to its analytics),
 *  then status and flight dates underneath. */
export function CampaignNameCell({
  campaign,
  newTab = false,
  showFlight = true,
  quietLink = false,
  showStatus = true,
  showCategory = false,
}: {
  campaign: Campaign;
  newTab?: boolean;
  /** Off where the table has its own Start/End Date columns. */
  showFlight?: boolean;
  /** No hover color/underline on the name — for a table whose whole row is the
   *  hover target and click target. */
  quietLink?: boolean;
  /** Off where the table has its own Status column. */
  showStatus?: boolean;
  /** The campaign's category, next to the status. */
  showCategory?: boolean;
}) {
  const { fmtDateRange } = useFormatters();
  return (
    <div className="max-w-[10.5rem] sm:max-w-none">
      <TextLink
        to={paths.campaign(campaign.id)}
        variant="record"
        newTab={newTab}
        className={cn(
          'sm:whitespace-nowrap',
          quietLink && 'hover:text-brame-dark hover:no-underline dark:hover:text-gray-100',
        )}
      >
        {campaign.name}
      </TextLink>
      {(showStatus || showCategory || showFlight) && (
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          {showStatus && <CampaignStatusPill status={campaign.status} />}
          {showCategory && <Pill tone="purple">{campaign.salesforce.category}</Pill>}
          {showFlight && (
            <span className="whitespace-nowrap text-xs text-gray-400 dark:text-gray-500">
              {fmtDateRange(campaign.flightStart, campaign.flightEnd)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
