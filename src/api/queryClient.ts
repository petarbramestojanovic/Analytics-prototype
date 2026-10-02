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

/**
 * Every query key in the app. Each entity has an `all` root, and every more
 * specific key starts with it — so invalidating `queryKeys.x.all` refreshes
 * every list and detail query for that entity at once.
 */
export const queryKeys = {
  campaigns: {
    all: ['campaigns'] as const,
    detail: (id: string) => ['campaigns', id] as const,
  },
  companies: { all: ['companies'] as const },
  agencies: { all: ['agencies'] as const },
  seats: { all: ['seats'] as const },
  seatMembers: {
    all: ['seatMembers'] as const,
    bySeat: (seatId?: string) => ['seatMembers', seatId ?? 'all'] as const,
  },
  apiKeys: {
    all: ['apiKeys'] as const,
    bySeat: (seatId: string) => ['apiKeys', seatId] as const,
  },
  emailReports: { all: ['emailReports'] as const },
  benchmarks: {
    all: ['benchmarks'] as const,
    byDimension: (dimension: string) => ['benchmarks', dimension] as const,
    group: (dimension: string, key: string) => ['benchmarks', dimension, key] as const,
  },
  syncRuns: { all: ['syncRuns'] as const },
};
