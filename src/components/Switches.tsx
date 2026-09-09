import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../lib/theme';
import { useI18n, type Locale } from '../lib/i18n';

export function LanguageSwitch({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useI18n();
  return (
    <div
      role="group"
      aria-label={t('topbar.language')}
      className={`flex items-center gap-0.5 rounded-full border border-gray-200 bg-white p-0.5 dark:border-white/10 dark:bg-white/5 ${compact ? '' : ''}`}
    >
      {(['en', 'de'] as const).map((l: Locale) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          aria-pressed={locale === l}
          className={`rounded-full px-2 py-1 text-xs font-semibold transition-colors ${
            locale === l
              ? 'bg-brame-teal text-white'
              : 'text-gray-500 hover:text-brame-dark dark:text-gray-400 dark:hover:text-gray-100'
          }`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export function ThemeToggleButton() {
  const { theme, toggle } = useTheme();
  const { t } = useI18n();
  const label = theme === 'dark' ? t('topbar.lightMode') : t('topbar.darkMode');
  return (
    <button
      onClick={toggle}
      aria-label={label}
      title={label}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:text-brame-dark dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:text-white"
    >
      {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
