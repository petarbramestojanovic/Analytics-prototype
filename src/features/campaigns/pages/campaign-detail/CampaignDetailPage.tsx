import { useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { CalendarDays, Images, LayoutDashboard } from 'lucide-react';
import { paths } from '@/config/paths';
import { useI18n } from '@/i18n';
import { usePageTitle } from '@/hooks/usePageTitle';
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
  // The open view and, within Creatives, the open creative both live in the
  // URL, so a link or a click elsewhere on the page can land on them directly.
  const [params, setParams] = useSearchParams();
  const viewParam = params.get('view') ?? 'overview';
  const view: View = (VIEWS as readonly string[]).includes(viewParam)
    ? (viewParam as View)
    : 'overview';
  const creativeParam = params.get('creative') ?? 'overview';
  const viewsRef = useRef<HTMLDivElement>(null);
  // One update for both params — two back-to-back updaters would each start
  // from the same stale copy and the second would undo the first.
  const updateParams = (patch: Record<string, string | null>) =>
    setParams(
      (prev) => {
        const out = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(patch)) {
          if (v === null) out.delete(k);
          else out.set(k, v);
        }
        return out;
      },
      { replace: true },
    );
  const setView = (next: string) =>
    updateParams({ view: next === 'overview' ? null : next, creative: null });
  const setCreative = (id: string) => updateParams({ creative: id === 'overview' ? null : id });
  const openCreative = (id: string) => {
    updateParams({ view: 'creatives', creative: id });
    requestAnimationFrame(() =>
      viewsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    );
  };

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
  // Only admins see which source is primary or switch between them; everyone
  // else (sales, clients, agencies) gets the primary source's numbers and the
  // same view tabs — Overview, Daily, Creatives — without the source panel.
  const activeTab = session.isAdmin ? (tab ?? campaign.primarySource) : campaign.primarySource;

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
      <div ref={viewsRef} className="scroll-mt-4">
        <MeasurementSourcePanel
          campaign={campaign}
          activeTab={activeTab}
          onTabChange={setTab}
          showSources={session.isAdmin}
        >
          {/* Views only make sense where the source has data; without it
            SourceView shows the "no connector" state on its own. */}
          {activeTab !== 'compare' && campaign.sources[activeTab] && (
            <Tabs
              value={view}
              onChange={setView}
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
      </div>
      {activeTab === 'compare' ? (
        <CompareView campaign={campaign} />
      ) : campaign.sources[activeTab] && view === 'daily' ? (
        <DailyView campaign={campaign} source={activeTab} />
      ) : campaign.sources[activeTab] && view === 'creatives' ? (
        <CreativesView
          campaign={campaign}
          source={activeTab}
          selected={creativeParam}
          onSelect={setCreative}
        />
      ) : (
        <SourceView
          campaign={campaign}
          source={activeTab}
          onOpenCreative={openCreative}
        />
      )}
    </Page>
  );
}
