import { useMemo, useState, type ReactNode } from 'react';
import { accounts, companies } from '@/api/mock/data';
import type { SeatCategory, SeatRole } from '@/types';
import { SessionContext, type Session } from './sessionContext';

export function SessionProvider({ children }: { children: ReactNode }) {
  const [seatCategory, setSeatCategory] = useState<SeatCategory>('admin');
  const [seatRole, setSeatRole] = useState<SeatRole>('admin');
  const [companyId, setCompanyId] = useState<string>(companies[0].id);
  const [accountId, setAccountId] = useState<string>(accounts[0].id);

  const value = useMemo<Session>(
    () => ({
      seatCategory,
      setSeatCategory,
      seatRole,
      setSeatRole,
      companyId,
      setCompanyId,
      companyName: companies.find((c) => c.id === companyId)?.name ?? '',
      accountId,
      setAccountId,
      accountName: accounts.find((a) => a.id === accountId)?.name ?? '',
      isInternal: seatCategory === 'admin' || seatCategory === 'brame',
      isAdmin: seatCategory === 'admin',
      // The Admin seat has no restricted variant — a "viewer" there would
      // still reach every Klea-operational screen, so the role is moot.
      canManageSeat: seatCategory === 'admin' || seatRole === 'admin',
    }),
    [seatCategory, seatRole, companyId, accountId]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
