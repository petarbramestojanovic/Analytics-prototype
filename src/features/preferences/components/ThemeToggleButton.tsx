import { Moon, Sun } from 'lucide-react';
import { useI18n } from '@/i18n';
import { IconButton } from '@/components/ui';
import { useTheme } from '@/components/theme';

export function ThemeToggleButton() {
  const { theme, toggle } = useTheme();
  const { t } = useI18n();
  return (
    <IconButton
      label={theme === 'dark' ? t('topbar.lightMode') : t('topbar.darkMode')}
      icon={theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
      onClick={toggle}
    />
  );
}
