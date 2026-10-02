import { createStrictContext } from '@/lib/createStrictContext';
import type { SeatCategory, SeatRole } from '@/types';

/**
 * Stands in for Supabase Auth + Row-Level Security. The prototype's point is
 * that a seat only sees its own scope while Brame/Admin staff see everything
 * — so the "viewing as" switcher exists to demonstrate the scoping, not
 * because a real product would let a user change their own seat.
 *
 * `seatCategory` is what actually scopes data and edit rights (see
 * scopeCampaigns/isAdmin). `seatRole` is a separate, narrower axis: whether
 * this person can manage *their own seat's* membership (invite, promote,
 * remove) — it never widens or narrows which data they can see.
 */
export interface Session {
  seatCategory: SeatCategory;
  setSeatCategory: (c: SeatCategory) => void;
  seatRole: SeatRole;
  setSeatRole: (r: SeatRole) => void;
  companyId: string;
  setCompanyId: (id: string) => void;
  companyName: string;
  agencyId: string;
  setAgencyId: (id: string) => void;
  agencyName: string;
  /** "Sees across all companies." Brame and Admin seats need the same
   *  cross-tenant reach — benchmarks are meaningless scoped to one client —
   *  so this is the predicate for tenant scoping, column visibility and
   *  portfolio filters. */
  isInternal: boolean;
  /** "May open Brame-operational screens and edit data." Setup, connectors,
   *  seat management and alert thresholds stay Admin-seat-only; a Brame seat
   *  reads every tenant's numbers, it does not configure the pipeline. */
  isAdmin: boolean;
  /** Can invite/promote/remove members of their OWN seat — the "light Users
   *  page" every seat admin gets, regardless of the seat's category. */
  canManageSeat: boolean;
}

export const [SessionContext, useSession] = createStrictContext<Session>('Session');
