import { seatMembers, seats } from '@/api/mock/data';
import type { Seat } from '@/types';
import type { Session } from './sessionContext';

type SeatScope = Pick<Session, 'seatCategory' | 'companyId' | 'agencyId'>;

/** Whether `seat` is the one the current session is signed in under — there
 *  is exactly one Admin and one Brame seat, and one seat per agency/client. */
export function isSessionSeat(seat: Seat, { seatCategory, companyId, agencyId }: SeatScope): boolean {
  if (seatCategory === 'admin' || seatCategory === 'brame') return seat.category === seatCategory;
  if (seatCategory === 'agency') return seat.category === 'agency' && seat.agencyId === agencyId;
  return seat.category === 'client' && seat.companyId === companyId;
}

/**
 * Who would plausibly be logged in for the current "Viewing as" scope — used
 * only to seed the account's default name/email before a demo viewer
 * overrides it in Profile settings (see features/profile). Real auth would
 * make this the actual session user, not a lookup keyed on the demo switcher.
 */
export function defaultPerson(scope: SeatScope): { name: string; email: string } {
  const seatId = seats.find((s) => isSessionSeat(s, scope))?.id;
  const member =
    seatMembers.find((m) => m.seatId === seatId && m.role === 'admin') ?? seatMembers.find((m) => m.seatId === seatId);
  return { name: member?.name ?? 'Guest User', email: member?.email ?? '' };
}
