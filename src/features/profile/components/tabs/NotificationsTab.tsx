import { useI18n } from '@/i18n';
import { Switch } from '@/components/ui';
import { SettingRow } from '@/components/display';
import { useNotificationSettings } from '@/features/preferences';

export function NotificationsTab() {
  const { t } = useI18n();
  const n = useNotificationSettings();
  const settings = [
    { key: 'emailDigest', checked: n.emailDigest, onChange: n.setEmailDigest },
    { key: 'alertBreach', checked: n.alertBreach, onChange: n.setAlertBreach },
    { key: 'reportDelivery', checked: n.reportDelivery, onChange: n.setReportDelivery },
  ] as const;

  return (
    <div className="space-y-3">
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
