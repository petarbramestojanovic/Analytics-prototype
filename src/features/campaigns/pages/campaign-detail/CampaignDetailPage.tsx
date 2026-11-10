import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { CalendarDays, Images, LayoutDashboard } from 'lucide-react';
import { paths } from '@/config/paths';
import { useI18n } from '@/i18n';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useSearchParamState } from '@/hooks/useSearchParamState';
import { Tabs } from '@/components/ui';
import { PageSkeleton } from '@/components/feedback';
import { NotFoundState, Page } from '@/components/page';
import { useSession } from '@/features/session';
import { useCampaign } from '@/api/hooks/useCampaigns';
import type { SourceTab } from '../../components/SourceSwitcher';
import { canSeeCampaign } from '../../lib/scope';
import { CampaignHeader } from './CampaignHeader';
import { CampaignAlertsBox } from '../../components/CampaignAlertsBox';
import { DeliveryPacingCard } from '../../components/DeliveryPacingCard';
import { GoalCard } from '../../components/GoalCard';
import { CompareView } from './CompareView';
import { CreativesView } from './CreativesView';
import { DailyView } from './DailyView';
import { MeasurementSourcePanel } from './MeasurementSourcePanel';
import { SourceView } from './SourceView';

const VIEWS = ['overview', 'daily', 'creatives'] as const;
type View = (typeof VIEWS)[number];
const VIEW_ICONS = { overview: LayoutDashboard, daily: CalendarDays, creatives: Images } as const;

/** One campaign's analytics — one tab per measurement source, plus Compare.
 *  Under a source, a second row picks the view: Overview, Daily, Creatives. */
export function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const session = useSession();
  const { data: fetched, isLoading } = useCampaign(id);
  const { t } = useI18n();
  const [tab, setTab] = useState<SourceTab | null>(null);
  const [viewParam, setViewParam] = useSearchParamState('view', 'overview');
  const view: View = (VIEWS as readonly string[]).includes(viewParam) ? (viewParam as View) : 'overview';

  // Out of scope reads exactly like "doesn't exist" — not an access-denied
  // message, which would itself leak that the campaign exists.
  const campaign = fetched && canSeeCampaign(fetched, session) ? fetched : undefined;
  usePageTitle(campaign?.name);

  if (isLoading) return <PageSkeleton variant="dashboard" />;

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
  // Clients and agencies never see which source is primary or switch between
  // them: they get the primary source's numbers and nothing else.
  const activeTab = session.isInternal ? (tab ?? campaign.primarySource) : campaign.primarySource;

  return (
    <Page>
      <CampaignHeader campaign={campaign} />
      {/* By priority: how delivery is going and the goal, then anything that is
          wrong, then the numbers. */}
      <div className="mb-5 grid grid-cols-1 items-stretch gap-5 lg:grid-cols-3">
        <DeliveryPacingCard campaign={campaign} className="lg:col-span-2" />
        <GoalCard campaign={campaign} isInternal={session.isInternal} />
      </div>
      {session.isInternal && <CampaignAlertsBox campaignId={campaign.id} />}
      <MeasurementSourcePanel
        campaign={campaign}
        activeTab={activeTab}
        onTabChange={setTab}
        showSources={session.isInternal}
      >
        {/* Views only make sense where the source has data; without it
            SourceView shows the "no connector" state on its own. */}
        {activeTab !== 'compare' && campaign.sources[activeTab] && (
          <Tabs
            value={view}
            onChange={setViewParam}
            groupLabel={t('detail.view.label')}
            options={VIEWS.map((value) => {
              const Icon = VIEW_ICONS[value];
              return {
                value,
                label: (
                  <span className="inline-flex items-center gap-1.5">
                    <Icon size={13} />
                    {t(`detail.view.${value}`)}
                  </span>
                ),
              };
            })}
          />
        )}
      </MeasurementSourcePanel>
      {activeTab === 'compare' ? (
        <CompareView campaign={campaign} />
      ) : campaign.sources[activeTab] && view === 'daily' ? (
        <DailyView campaign={campaign} source={activeTab} />
      ) : campaign.sources[activeTab] && view === 'creatives' ? (
        <CreativesView campaign={campaign} source={activeTab} />
      ) : (
        <SourceView campaign={campaign} source={activeTab} onSwitchSource={setTab} />
      )}
    </Page>
  );
}
