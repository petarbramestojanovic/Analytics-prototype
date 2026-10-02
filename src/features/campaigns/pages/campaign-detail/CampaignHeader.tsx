import { Link } from 'react-router-dom';
import { Settings2 } from 'lucide-react';
import { paths } from '@/config/paths';
import { useFormatters, useI18n } from '@/i18n';
import { Button, Pill } from '@/components/ui';
import { PageHeader } from '@/components/page';
import { useSession } from '@/features/session';
import type { Campaign } from '@/types';
import { CampaignStatusPill } from '../../components/CampaignStatusPill';

export function CampaignHeader({ campaign }: { campaign: Campaign }) {
  const { t } = useI18n();
  const { fmtDateRange } = useFormatters();
  const { isAdmin, isInternal } = useSession();

  const facts = [
    <span key="company" className="font-medium text-brame-dark dark:text-gray-200">
      {campaign.companyName}
    </span>,
    // Who booked the campaign is Brame/sales business — never shown to the
    // client whose campaign it is.
    ...(isInternal ? [campaign.agencyName ?? t('campaigns.agency.direct')] : []),
    fmtDateRange(campaign.flightStart, campaign.flightEnd, true),
    campaign.salesforce.productLine,
    campaign.salesforce.market,
  ];

  return (
    <PageHeader
      className="mb-5"
      back={{ to: paths.campaigns, label: t('detail.back') }}
      title={campaign.name}
      badges={
        <>
          <CampaignStatusPill status={campaign.status} />
          {campaign.status === 'archived' && <Pill tone="amber">{t('detail.archivedBadge')}</Pill>}
        </>
      }
      subtitle={
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {facts.map((fact, i) => (
            <span key={i} className="contents">
              {i > 0 && <span>·</span>}
              {typeof fact === 'string' ? <span>{fact}</span> : fact}
            </span>
          ))}
        </div>
      }
      actions={
        // Setup stays Brame-operational — not a client permission,
        // regardless of that client's own Admin/Viewer role.
        isAdmin && (
          <Link to={paths.setup(campaign.id)}>
            <Button icon={<Settings2 size={14} />}>{t('detail.setup')}</Button>
          </Link>
        )
      }
    />
  );
}
