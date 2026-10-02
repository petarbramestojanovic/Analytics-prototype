import { useQuery } from '@tanstack/react-query';
import {
  acceptInvite,
  createSeat,
  fetchSeatMembers,
  fetchSeats,
  inviteSeatMember,
  queryKeys,
  removeSeatMember,
  resendInvite,
  updateSeatMemberRole,
  useInvalidatingMutation,
} from '@/api';
import type { SeatRole } from '@/types';

/** Any membership change can move a seat's member count, so every seat write
 *  refreshes both the seat list and every member list. */
const invalidates = [queryKeys.seats.all, queryKeys.seatMembers.all];

export function useSeats() {
  return useQuery({ queryKey: queryKeys.seats.all, queryFn: fetchSeats });
}

/** One seat's members, or every member of every seat when `seatId` is
 *  omitted. Pass `enabled: false` while the seat id is still unknown. */
export function useSeatMembers(seatId?: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.seatMembers.bySeat(seatId),
    queryFn: () => fetchSeatMembers(seatId),
    enabled,
  });
}

export function useCreateSeat() {
  return useInvalidatingMutation(createSeat, invalidates);
}

export function useInviteSeatMember() {
  return useInvalidatingMutation(inviteSeatMember, invalidates);
}

export function useUpdateSeatMemberRole() {
  return useInvalidatingMutation(
    ({ memberId, role }: { memberId: string; role: SeatRole }) => updateSeatMemberRole(memberId, role),
    invalidates
  );
}

export function useRemoveSeatMember() {
  return useInvalidatingMutation(removeSeatMember, invalidates);
}

export function useResendInvite() {
  return useInvalidatingMutation(resendInvite, invalidates);
}

export function useAcceptInvite() {
  return useInvalidatingMutation(acceptInvite, invalidates);
}
