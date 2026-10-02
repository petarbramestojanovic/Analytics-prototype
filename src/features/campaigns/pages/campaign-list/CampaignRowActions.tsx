import { useNavigate } from 'react-router-dom';
import { ExternalLink, Settings2 } from 'lucide-react';
import { paths } from '@/config/paths';
import { useI18n } from '@/i18n';
import { DropdownMenuItem } from '@/components/ui';
import { RowActionsMenu } from '@/components/table';
import { useSession } from '@/features/session';
import type { Campaign } from '@/types';

export function CampaignRowActions({ campaign }: { campaign: Campaign }) {
  const { t } = useI18n();
  const { isAdmin } = useSession();
  const navigate = useNavigate();
  return (
    <RowActionsMenu>
      <DropdownMenuItem onSelect={() => navigate(paths.campaign(campaign.id))}>
        <ExternalLink size={13} />
        {t('campaigns.rowMenu.viewAnalytics')}
      </DropdownMenuItem>
      {/* Setup stays Brame-operational — not a client permission, regardless
          of that client's own Admin/Viewer role. */}
      {isAdmin && (
        <DropdownMenuItem onSelect={() => navigate(paths.setup(campaign.id))}>
          <Settings2 size={13} />
          {t('campaigns.rowMenu.openSetup')}
        </DropdownMenuItem>
      )}
    </RowActionsMenu>
  );
}
