import { isSessionSeat, useSession } from '@/features/session';
import { useSeats } from '@/api/hooks/useSeats';

/** The seat the signed-in person is acting under. `seat` is undefined both
 *  while loading and when an account/client has no seat yet — callers tell
 *  them apart with `isLoading`. */
export function useCurrentSeat() {
  const session = useSession();
  const { data: seats, isLoading, isError, refetch } = useSeats();
  return { seat: seats?.find((s) => isSessionSeat(s, session)), isLoading, isError, refetch };
}
