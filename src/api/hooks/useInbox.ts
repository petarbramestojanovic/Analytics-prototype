import { useQuery } from '@tanstack/react-query';
import { fetchInboxEvents, queryKeys } from '@/api';

/** The inbox events the backend has written — before any per-person state or
 *  seat scoping. Use `useInbox()` (features/inbox) for what a person sees. */
export function useInboxEvents() {
  return useQuery({ queryKey: queryKeys.inbox.all, queryFn: fetchInboxEvents });
}
