import { createStrictContext } from '@/lib/createStrictContext';

export type Theme = 'light' | 'dark';

export interface ThemeState {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

export const [ThemeContext, useTheme] = createStrictContext<ThemeState>('Theme');
