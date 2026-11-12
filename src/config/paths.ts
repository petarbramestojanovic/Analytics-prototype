/**
 * Every in-app URL, built in one place. Components link with
 * `paths.campaign(id)` rather than hand-writing `/campaigns/${id}`, so a route
 * can move without a search-and-replace across the codebase. The route table
 * (src/app/routes.tsx) registers the `pattern` side of the same paths.
 */
export const paths = {
  login: '/login',
  signup: '/signup',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',

  overview: '/overview',
  campaigns: '/campaigns',
  /** The campaigns list narrowed to one setup gap (see campaigns' lib/setup). */
  campaignsBySetup: (
    setup: 'awaiting' | 'noConnector',
    /** Entity filters to carry over (the Campaigns list's own keys), so the list
     *  shows exactly the campaigns a filtered tile counted. */
    carry: { company?: string; account?: string; country?: string } = {},
  ) => {
    const params = new URLSearchParams({ setup });
    for (const [key, value] of Object.entries(carry))
      if (value && value !== 'all') params.set(key, value);
    return `/campaigns?${params}`;
  },
  campaign: (id: string) => `/campaigns/${id}`,
  reports: '/reports',
  inbox: '/inbox',

  users: '/users',
  apiAccess: '/api-access',

  benchmarks: (params?: { dimension?: string; metric?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string> | undefined).toString();
    return qs ? `/benchmarks?${qs}` : '/benchmarks';
  },
  benchmarkGroup: (dimension: string, key: string) =>
    `/benchmarks/${dimension}/${encodeURIComponent(key)}`,
  clients: '/admin/clients',
  client: (id: string) => `/admin/clients/${id}`,
  // Alerts sit on two levels, each with an overview and a detail page: the
  // alerts that have triggered, and the rules (definitions) that trigger them.
  alerts: '/admin/alerts',
  alert: (key: string) => `/admin/alerts/${encodeURIComponent(key)}`,
  alertRules: '/admin/alerts/rules',
  alertRule: (id: string) => `/admin/alerts/rules/${id}`,

  setup: (campaignId?: string) =>
    campaignId ? `/admin/setup?campaign=${campaignId}` : '/admin/setup',
  connectors: '/admin/connectors',
  seats: (seatId?: string) => (seatId ? `/admin/seats?seat=${seatId}` : '/admin/seats'),
} as const;
