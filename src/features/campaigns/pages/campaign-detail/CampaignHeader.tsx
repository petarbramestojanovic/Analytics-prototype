import { ArrowLeft, Settings2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { paths } from '@/config/paths';
import { useI18n } from '@/i18n';
import { ButtonLink, Pill } from '@/components/ui';
import { useSession } from '@/features/session';
import type { Campaign } from '@/types';
import { CampaignStatusPill } from '../../components/CampaignStatusPill';
import { FlightTimeline } from '../../components/FlightTimeline';
import { isLiveCampaign } from '../../lib/sources';

/**
 * Title row: the name, its status and — while the campaign runs — the flight
 * timeline stretched across the rest of the row up to the Setup button. Under
 * it, who and what the campaign is. For a campaign that isn't live the dates
 * live in the delivery card below instead.
 */
export function CampaignHeader({ campaign }: { campaign: Campaign }) {
  const { t } = useI18n();
  const { isAdmin, isInternal } = useSession();

  const facts = [
    <span key="company" className="font-medium text-brame-dark dark:text-gray-200">
      {campaign.companyName}
    </span>,
    // Who booked the campaign is Klea/sales business — never shown to the
    // client whose campaign it is.
    ...(isInternal ? [campaign.accountName ?? t('campaigns.account.direct')] : []),
    campaign.salesforce.productLine,
    campaign.salesforce.market,
  ];

  return (
    <header className="mb-6">
      <Link
        to={paths.campaigns}
        className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brame-teal dark:text-gray-400 dark:hover:text-brame-turquoise-light"
      >
        <ArrowLeft size={14} />
        {t('detail.back')}
      </Link>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="text-2xl font-bold text-brame-dark dark:text-white">{campaign.name}</h1>
          <CampaignStatusPill status={campaign.status} />
          {campaign.status === 'archived' && <Pill tone="amber">{t('detail.archivedBadge')}</Pill>}
        </div>

        {isLiveCampaign(campaign) ? (
          <FlightTimeline
            campaign={campaign}
            className="order-last basis-full md:order-none md:basis-auto"
          />
        ) : (
          <div className="flex-1" />
        )}

        {
          // Setup stays Klea-operational — not a client permission,
          // regardless of that client's own Admin/Viewer role.
          isAdmin && (
            <ButtonLink to={paths.setup(campaign.id)} icon={<Settings2 size={14} />}>
              {t('detail.setup')}
            </ButtonLink>
          )
        }
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
        {facts.map((fact, i) => (
          // The dot belongs to the item before it, so a wrapped line never
          // starts with a stray separator.
          <span key={i} className="inline-flex items-center gap-2">
            {fact}
            {i < facts.length - 1 && <span aria-hidden>·</span>}
          </span>
        ))}
      </div>
    </header>
  );
}
