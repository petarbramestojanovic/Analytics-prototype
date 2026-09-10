import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { companies, users } from '../mock/data';
import type { Campaign } from '../mock/types';

/**
 * Stands in for Supabase Auth + Row-Level Security. The prototype's point is
 * that a company user sees only their own campaigns while Brame staff see all
 * of them — so the "viewing as" switcher exists to demonstrate the scoping,
 * not because a real product would let a user change their own tenant.
 *
 * This is deliberately separate from a user's Admin/Viewer role (see
 * mock/types.ts CompanyUser) — that's a permission within one company's data;
 * this is which company's data you're looking at in the first place.
 */
export type Role = 'brame_admin' | 'sales' | 'company_user';

interface Session {
  role: Role;
  setRole: (r: Role) => void;
  companyId: string;
  setCompanyId: (id: string) => void;
  companyName: string;
  /**
   * "Sees across all companies." Sales needs the same cross-tenant reach as
   * Brame staff — benchmarks are meaningless scoped to one client — so this is
   * the predicate for tenant scoping, column visibility and portfolio filters.
   */
  isInternal: boolean;
  /**
   * "May open Brame-operational screens." Setup, connectors, cross-company user
   * management and alert thresholds stay admin-only; sales reads numbers, it
   * does not configure the pipeline. Kept apart from isInternal because one
   * check for both would either lock sales out of benchmarks or hand it the
   * operational surfaces.
   */
  isAdmin: boolean;
}

const Ctx = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>('brame_admin');
  const [companyId, setCompanyId] = useState<string>(companies[0].id);

  const value = useMemo<Session>(
    () => ({
      role,
      setRole,
      companyId,
      setCompanyId,
      companyName: companies.find((c) => c.id === companyId)?.name ?? '',
      isInternal: role !== 'company_user',
      isAdmin: role === 'brame_admin',
    }),
    [role, companyId]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): Session {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSession outside SessionProvider');
  return v;
}

/** Applies the current tenant scope to a campaign list fetched from the
 *  query cache. Archived campaigns stay out of the default list; analytics
 *  are never deleted, so they remain reachable by URL. */
export function scopeCampaigns(all: Campaign[], role: Role, companyId: string): Campaign[] {
  const scoped = role === 'company_user' ? all.filter((c) => c.companyId === companyId) : all;
  return scoped.filter((c) => c.status !== 'archived');
}

/**
 * Who would plausibly be logged in for the current "Viewing as" scope — used
 * only to seed the account footer's default name/email before a demo viewer
 * overrides it in Profile settings (see lib/profile.tsx). Real auth would
 * make this the actual session user, not a lookup keyed on the demo switcher.
 */
export function defaultPerson(role: Role, companyId: string): { name: string; email: string } {
  if (role === 'brame_admin') {
    return { name: 'Alex Weber', email: 'alex.weber@brame.io' };
  }
  if (role === 'sales') {
    return { name: 'Nadia Brunner', email: 'nadia.brunner@brame.io' };
  }
  const person = users.find((u) => u.companyId === companyId && u.role === 'admin') ?? users.find((u) => u.companyId === companyId);
  return { name: person?.name ?? 'Guest User', email: person?.email ?? '' };
}
