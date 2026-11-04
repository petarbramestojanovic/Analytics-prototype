import { useI18n } from '@/i18n';
import { Switch } from '@/components/ui';
import { SettingRow } from '@/components/display';
import { useNotificationSettings } from '@/features/preferences';

export function NotificationsTab() {
  const { t } = useI18n();
  const n = useNotificationSettings();
  const settings = [
    { key: 'inboxAlerts', checked: n.inboxAlerts, onChange: n.setInboxAlerts },
    { key: 'inboxReports', checked: n.inboxReports, onChange: n.setInboxReports },
    { key: 'inboxInvitations', checked: n.inboxInvitations, onChange: n.setInboxInvitations },
    { key: 'emailDigest', checked: n.emailDigest, onChange: n.setEmailDigest },
  ] as const;

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500 dark:text-gray-400">{t('profile.notifications.intro')}</p>
      {settings.map((s) => (
        <SettingRow
          key={s.key}
          title={t(`profile.notifications.${s.key}`)}
          hint={t(`profile.notifications.${s.key}Hint`)}
          control={<Switch checked={s.checked} onChange={s.onChange} label={t(`profile.notifications.${s.key}`)} />}
        />
      ))}
      <p className="pt-1 text-xs text-gray-400 dark:text-gray-500">{t('profile.notifications.demoNote')}</p>
    </div>
  );
}
