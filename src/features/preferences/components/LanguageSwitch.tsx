import { LOCALES, useI18n } from '@/i18n';
import { SegmentedControl } from '@/components/ui';

export function LanguageSwitch() {
  const { locale, setLocale, t } = useI18n();
  return (
    <SegmentedControl
      value={locale}
      onChange={setLocale}
      groupLabel={t('topbar.language')}
      className="flex items-center gap-0.5 rounded-full border border-gray-200 bg-white p-0.5 dark:border-white/10 dark:bg-white/5"
      indicatorClassName="rounded-full bg-brame-teal"
      itemClassName="rounded-full px-2 py-1 text-xs font-semibold transition-colors"
      activeItemClassName="text-white"
      inactiveItemClassName="text-gray-500 hover:text-brame-dark dark:text-gray-400 dark:hover:text-gray-100"
      options={LOCALES.map((l) => ({ value: l, label: l.toUpperCase() }))}
    />
  );
}
