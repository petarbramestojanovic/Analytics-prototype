import type { Session } from './sessionContext';

/**
 * Who may reach a screen. The single permission model behind both the route
 * guards (app/RequireAccess) and the sidebar's section visibility (app/
 * navigation) — so a link is never shown for a page that would bounce you,
 * and vice versa.
 *
 *   everyone  — any signed-in seat
 *   seatAdmin — a seat's own admin (manage members / API keys of that seat)
 *   internal  — Admin and Brame seats: every tenant's data, read-only
 *   admin     — the Admin seat: Brame-operational configuration screens
 *
 * The RFC's RLS model would reject these reads/writes at the database for any
 * other seat, so the client app refuses the routes too — not just the links.
 */
export type Access = 'everyone' | 'seatAdmin' | 'internal' | 'admin';

export function hasAccess(session: Pick<Session, 'canManageSeat' | 'isInternal' | 'isAdmin'>, access: Access): boolean {
  switch (access) {
    case 'everyone':
      return true;
    case 'seatAdmin':
      return session.canManageSeat;
    case 'internal':
      return session.isInternal;
    case 'admin':
      return session.isAdmin;
  }
}
