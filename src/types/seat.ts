/**
 * A tenant boundary someone signs in under. The category is what actually
 * drives data scope and edit rights everywhere in the app (see
 * lib/session.tsx's scopeCampaigns/isAdmin) — a seat's own `role` (below) is
 * a separate, narrower thing: whether a member can manage *this seat's own*
 * membership, not what data the seat can see.
 *
 *   admin  — full app, every tenant's data, can edit (setup, connectors, …)
 *   brame  — every tenant's data, read-only (replaces the old "sales" role)
 *   account — only campaigns booked through this seat's own account
 *   client — only this seat's own company's campaigns
 *
 * There is exactly one 'admin' seat and one 'brame' seat system-wide;
 * 'account' and 'client' seats are one-per-account / one-per-company.
 */
export type SeatCategory = 'admin' | 'brame' | 'account' | 'client';

export interface Seat {
  id: string;
  category: SeatCategory;
  /** Display name — "Admin"/"Klea" for the two singleton seats, otherwise
   *  the linked account's or company's own name. */
  name: string;
  /** Set only when category === 'client'. */
  companyId?: string;
  /** Set only when category === 'account'. */
  accountId?: string;
}

/** A member's standing within their OWN seat — distinct from the seat's
 *  category above, which is what actually scopes data. 'admin' here only
 *  means "can invite/promote/remove people in this same seat". */
export type SeatRole = 'admin' | 'viewer';

export type InviteStatus = 'pending' | 'accepted';

export interface SeatMember {
  id: string;
  seatId: string;
  name: string;
  email: string;
  role: SeatRole;
  status: InviteStatus;
  /** `null` until an invitee first signs in. */
  lastSeenAt: string | null;
}

