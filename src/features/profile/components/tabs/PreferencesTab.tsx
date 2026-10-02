import { useI18n } from '@/i18n';
import { SettingRow } from '@/components/display';
import { LanguageSwitch, ThemeToggleButton } from '@/features/preferences';

export function PreferencesTab() {
  const { t } = useI18n();
  return (
    <div className="space-y-3">
      <SettingRow title={t('profile.preferences.theme')} hint={t('profile.preferences.themeHint')} control={<ThemeToggleButton />} />
      <SettingRow
        title={t('profile.preferences.language')}
        hint={t('profile.preferences.languageHint')}
        control={<LanguageSwitch />}
      />
      <p className="pt-1 text-xs text-gray-400 dark:text-gray-500">{t('profile.preferences.appliesHere')}</p>
    </div>
  );
}
