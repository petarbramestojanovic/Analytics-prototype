import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/api';
import { ThemeProvider } from '@/components/theme';
import { I18nProvider } from '@/i18n';
import { SessionProvider } from '@/features/session';
import { ProfileProvider } from '@/features/profile';
import { NotificationSettingsProvider } from '@/features/preferences';
import { AlertRulesProvider, AlertThresholdsProvider } from '@/features/alerts';

/**
 * Every app-wide provider, outermost first. A provider may use anything above
 * it in this list (e.g. Session reads nothing, Profile's consumers read
 * Session). Add new global state here rather than nesting it inside App.
 */
const PROVIDERS = [
  ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
  ThemeProvider,
  I18nProvider,
  SessionProvider,
  ProfileProvider,
  AlertThresholdsProvider,
  AlertRulesProvider,
  NotificationSettingsProvider,
];

export function AppProviders({ children }: { children: ReactNode }) {
  return PROVIDERS.reduceRight<ReactNode>((tree, Provider) => <Provider>{tree}</Provider>, children);
}
