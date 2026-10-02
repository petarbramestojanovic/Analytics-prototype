import { useEffect, useMemo, type ReactNode } from 'react';
import { STORAGE_KEYS } from '@/config/storageKeys';
import { usePersistentState } from '@/hooks/usePersistentState';
import { codecs } from '@/lib/storage';
import { ThemeContext, type Theme, type ThemeState } from './themeContext';

const themeCodec = codecs.oneOf<Theme>(['light', 'dark']);

const systemTheme = (): Theme =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = usePersistentState<Theme>(STORAGE_KEYS.theme, systemTheme, themeCodec);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const value = useMemo<ThemeState>(
    () => ({ theme, setTheme, toggle: () => setTheme((t) => (t === 'light' ? 'dark' : 'light')) }),
    [theme, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
