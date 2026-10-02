// Light/dark theming is part of the design system: charts (which can't use
// Tailwind's `dark:` variants) read it here, and the theme toggle in
// features/preferences writes it.
export { ThemeProvider } from './ThemeProvider';
export { useTheme, type Theme } from './themeContext';
