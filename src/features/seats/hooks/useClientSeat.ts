import { useSeatMembers, useSeats } from '@/api/hooks/useSeats';

/** A client company's own seat and its members — `seat` is undefined while
 *  loading or when the client has no seat yet (then `members` is empty). */
export function useClientSeat(companyId: string | undefined) {
  const { data: seats } = useSeats();
  const seat = seats?.find((s) => s.category === 'client' && s.companyId === companyId);
  const { data: members = [] } = useSeatMembers(seat?.id, !!seat);
  return { seat, members: seat ? members : [] };
}
