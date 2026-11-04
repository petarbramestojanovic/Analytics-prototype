import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { paths } from '@/config/paths';
import { useI18n } from '@/i18n';
import { usePageTitle } from '@/hooks/usePageTitle';
import { PageSkeleton } from '@/components/feedback';
import { Page } from '@/components/page';
import { AlertsLevelTabs } from '../components/AlertsLevelTabs';
import { useAlertLog } from '../hooks/useAlertLog';
import { AlertRulesBody, AlertRulesHeader } from './AlertRulesPage';
import { AlertLog, AlertsHeader } from './AlertsPage';

/**
 * Both list levels of alerts, Triggered alerts and Alert rules, as one page
 * with two URLs. Rendering them from a single component keeps the level tabs
 * mounted when you switch, so the highlight slides from one to the other
 * instead of the whole page (tabs included) being rebuilt.
 */
export function AlertsHomePage() {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const view = pathname.startsWith(paths.alertRules) ? 'rules' : 'triggered';
  usePageTitle(view === 'rules' ? t('alerts.level.rules') : t('alerts.title'));
  const { rows, isLoading } = useAlertLog();
  const [creating, setCreating] = useState(false);

  if (isLoading) return <PageSkeleton variant="list" />;

  return (
    <Page>
      {view === 'rules' ? <AlertRulesHeader onNew={() => setCreating(true)} /> : <AlertsHeader />}
      <AlertsLevelTabs active={view} />
      {view === 'rules' ? <AlertRulesBody creating={creating} onCreatingChange={setCreating} /> : <AlertLog rows={rows} />}
    </Page>
  );
}
