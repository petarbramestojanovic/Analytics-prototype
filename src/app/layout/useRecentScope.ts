import { useSession } from '@/features/session';

/** The scope a page was seen in: what the current seat is allowed to see. */
export function useRecentScope(): string {
  const { seatCategory, companyId, agencyId } = useSession();
  return `${seatCategory}:${companyId}:${agencyId}`;
}
