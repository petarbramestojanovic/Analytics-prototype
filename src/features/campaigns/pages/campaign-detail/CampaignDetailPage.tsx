import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { paths } from '@/config/paths';
import { useI18n } from '@/i18n';
import { usePageTitle } from '@/hooks/usePageTitle';
import { LoadingState } from '@/components/feedback';
import { NotFoundState, Page } from '@/components/page';
import { useSession } from '@/features/session';
import { useCampaign } from '@/api/hooks/useCampaigns';
import type { SourceTab } from '../../components/SourceSwitcher';
import { canSeeCampaign } from '../../lib/scope';
import { CampaignHeader } from './CampaignHeader';
import { CompareView } from './CompareView';
import { MeasurementSourcePanel } from './MeasurementSourcePanel';
import { SourceView } from './SourceView';

/** One campaign's analytics — one tab per measurement source, plus Compare. */
export function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const session = useSession();
  const { data: fetched, isLoading } = useCampaign(id);
  const { t } = useI18n();
  const [tab, setTab] = useState<SourceTab | null>(null);

  // Out of scope reads exactly like "doesn't exist" — not an access-denied
  // message, which would itself leak that the campaign exists.
  const campaign = fetched && canSeeCampaign(fetched, session) ? fetched : undefined;
  usePageTitle(campaign?.name);

  if (isLoading) return <LoadingState />;

  if (!campaign) {
    return (
      <NotFoundState
        title={t('detail.notFoundTitle')}
        body={t('detail.notFoundBody')}
        backTo={paths.campaigns}
        backLabel={t('detail.backToCampaigns')}
      />
    );
  }

  // Default the source tab to whatever is currently primary, but only once —
  // otherwise saving a primarySource edit while on this tab would yank the
  // view out from under a mid-review account manager.
  const activeTab = tab ?? campaign.primarySource;

  return (
    <Page>
      <CampaignHeader campaign={campaign} />
      <MeasurementSourcePanel campaign={campaign} activeTab={activeTab} onTabChange={setTab} />
      {activeTab === 'compare' ? (
        <CompareView campaign={campaign} />
      ) : (
        <SourceView campaign={campaign} source={activeTab} onSwitchSource={setTab} />
      )}
    </Page>
  );
}
