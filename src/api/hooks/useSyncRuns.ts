import { useQuery } from '@tanstack/react-query';
import { fetchSyncRuns, queryKeys } from '@/api';

export function useSyncRuns() {
  return useQuery({ queryKey: queryKeys.syncRuns.all, queryFn: fetchSyncRuns });
}
