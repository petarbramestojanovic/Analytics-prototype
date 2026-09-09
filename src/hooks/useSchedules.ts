import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchSchedules, setScheduleEnabled } from '../mock/store';
import { queryKeys } from '../lib/queryClient';

export function useSchedules() {
  return useQuery({ queryKey: queryKeys.schedules, queryFn: fetchSchedules });
}

export function useSetScheduleEnabled() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => setScheduleEnabled(id, enabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.schedules }),
  });
}
