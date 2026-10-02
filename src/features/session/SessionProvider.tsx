import { useMemo, useState, type ReactNode } from 'react';
import { agencies, companies } from '@/api/mock/data';
import type { SeatCategory, SeatRole } from '@/types';
import { SessionContext, type Session } from './sessionContext';

export function SessionProvider({ children }: { children: ReactNode }) {
  const [seatCategory, setSeatCategory] = useState<SeatCategory>('admin');
  const [seatRole, setSeatRole] = useState<SeatRole>('admin');
  const [companyId, setCompanyId] = useState<string>(companies[0].id);
  const [agencyId, setAgencyId] = useState<string>(agencies[0].id);

  const value = useMemo<Session>(
    () => ({
      seatCategory,
      setSeatCategory,
      seatRole,
      setSeatRole,
      companyId,
      setCompanyId,
      companyName: companies.find((c) => c.id === companyId)?.name ?? '',
      agencyId,
      setAgencyId,
      agencyName: agencies.find((a) => a.id === agencyId)?.name ?? '',
      isInternal: seatCategory === 'admin' || seatCategory === 'brame',
      isAdmin: seatCategory === 'admin',
      canManageSeat: seatRole === 'admin',
    }),
    [seatCategory, seatRole, companyId, agencyId]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
