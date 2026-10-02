import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { paths } from '@/config/paths';
import type { Access } from '@/features/session';

/**
 * The route table — every page in the app, which URL it lives at, and who
 * may open it. Pages are lazy-loaded, so each one (and heavy dependencies
 * only it uses, like the xlsx exporter) ships in its own chunk.
 *
 * To add a page: create it under features/<feature>/pages, add its URL to
 * config/paths.ts, register it here, and (if it belongs in the sidebar) add
 * it to app/navigation.ts.
 */
export interface AppRoute {
  path: string;
  Page: LazyExoticComponent<ComponentType>;
  access: Access;
}

/** `lazy()` for named exports: `page(() => import('…'), 'OverviewPage')`. */
function page<M extends Record<string, unknown>>(load: () => Promise<M>, name: keyof M & string) {
  return lazy(() => load().then((m) => ({ default: m[name] as ComponentType })));
}

/** Rendered without the app shell — nobody is signed in yet. */
export const publicRoutes: AppRoute[] = [
  { path: paths.login, Page: page(() => import('@/features/auth/pages/LoginPage'), 'LoginPage'), access: 'everyone' },
  { path: paths.signup, Page: page(() => import('@/features/auth/pages/SignupPage'), 'SignupPage'), access: 'everyone' },
  {
    path: paths.forgotPassword,
    Page: page(() => import('@/features/auth/pages/ForgotPasswordPage'), 'ForgotPasswordPage'),
    access: 'everyone',
  },
  {
    path: paths.resetPassword,
    Page: page(() => import('@/features/auth/pages/ResetPasswordPage'), 'ResetPasswordPage'),
    access: 'everyone',
  },
];

/** Rendered inside the app shell (sidebar + top bar). */
export const appRoutes: AppRoute[] = [
  { path: paths.overview, Page: page(() => import('@/features/overview/pages/OverviewPage'), 'OverviewPage'), access: 'everyone' },
  { path: paths.campaigns, Page: page(() => import('@/features/campaigns/pages/campaign-list/CampaignsPage'), 'CampaignsPage'), access: 'everyone' },
  {
    path: paths.campaign(':id'),
    Page: page(() => import('@/features/campaigns/pages/campaign-detail/CampaignDetailPage'), 'CampaignDetailPage'),
    access: 'everyone',
  },
  { path: paths.reports, Page: page(() => import('@/features/reports/pages/ReportsPage'), 'ReportsPage'), access: 'everyone' },

  // A seat's own admin manages that seat's members and API keys, whatever
  // the seat's category.
  { path: paths.users, Page: page(() => import('@/features/seats/pages/MyUsersPage'), 'MyUsersPage'), access: 'seatAdmin' },
  { path: paths.apiAccess, Page: page(() => import('@/features/api-access/pages/ApiAccessPage'), 'ApiAccessPage'), access: 'seatAdmin' },

  // Cross-tenant data reads — Brame staff and sales, not a client's own view.
  { path: paths.benchmarks(), Page: page(() => import('@/features/benchmarks/pages/BenchmarksPage'), 'BenchmarksPage'), access: 'internal' },
  {
    // Mirrors paths.benchmarkGroup() — spelled out because that helper URL-encodes the key.
    path: '/benchmarks/:dimension/:key',
    Page: page(() => import('@/features/benchmarks/pages/BenchmarkDetailPage'), 'BenchmarkDetailPage'),
    access: 'internal',
  },
  { path: paths.clients, Page: page(() => import('@/features/clients/pages/ClientsPage'), 'ClientsPage'), access: 'internal' },
  {
    path: paths.client(':id'),
    Page: page(() => import('@/features/clients/pages/ClientDetailPage'), 'ClientDetailPage'),
    access: 'internal',
  },
  { path: paths.alerts, Page: page(() => import('@/features/alerts/pages/AlertsPage'), 'AlertsPage'), access: 'internal' },

  // Brame-operational configuration — Admin seat only.
  {
    path: paths.setup(),
    Page: page(() => import('@/features/campaigns/pages/campaign-setup/CampaignSetupPage'), 'CampaignSetupPage'),
    access: 'admin',
  },
  {
    path: paths.connectors,
    Page: page(() => import('@/features/connectors/pages/ConnectorsPage'), 'ConnectorsPage'),
    access: 'admin',
  },
  { path: paths.seats(), Page: page(() => import('@/features/seats/pages/SeatsPage'), 'SeatsPage'), access: 'admin' },
];
