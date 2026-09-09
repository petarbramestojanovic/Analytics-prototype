import { QueryClient } from '@tanstack/react-query';

// staleTime is deliberately generous — the RFC's dashboard reads are
// pull-based (nightly sync + manual refresh), not push/real-time, so nothing
// here should silently refetch on window focus the way a live feed would.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

export const queryKeys = {
  campaigns: ['campaigns'] as const,
  campaign: (id: string) => ['campaigns', id] as const,
  companies: ['companies'] as const,
  users: (companyId?: string) => ['users', companyId ?? 'all'] as const,
  schedules: ['schedules'] as const,
};
