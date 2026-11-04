import { useNavigate } from 'react-router-dom';
import { paths } from '@/config/paths';
import { useI18n } from '@/i18n';
import { Tabs } from '@/components/ui';

/** Switches between the two levels of alerts — what has triggered, and the
 *  rules that trigger it. Each is its own page, with its own detail pages. */
export function AlertsLevelTabs({ active }: { active: 'triggered' | 'rules' }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  return (
    <Tabs
      fill
      onPage
      size="lg"
      value={active}
      onChange={(v) => navigate(v === 'triggered' ? paths.alerts : paths.alertRules)}
      groupLabel={t('alerts.title')}
      className="mb-6 w-full max-w-[320px]"
      options={[
        { value: 'triggered', label: t('alerts.level.triggered') },
        { value: 'rules', label: t('alerts.level.rules') },
      ]}
    />
  );
}
