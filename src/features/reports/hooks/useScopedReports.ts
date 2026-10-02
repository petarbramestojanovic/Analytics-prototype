import { useMemo } from 'react';
import { useSession } from '@/features/session';
import { useCampaigns } from '@/features/campaigns';
import { useEmailReports } from '@/api/hooks/useEmailReports';
import { scopeReports } from '../lib/reportScope';

/** The email reports the current seat may see and manage. */
export function useScopedReports() {
  const { isInternal, seatCategory, companyId, agencyId } = useSession();
  const query = useEmailReports();
  const { data: campaigns } = useCampaigns();
  const reports = useMemo(
    () => scopeReports(query.data ?? [], campaigns ?? [], { isInternal, seatCategory, companyId, agencyId }),
    [query.data, campaigns, isInternal, seatCategory, companyId, agencyId]
  );
  return { ...query, reports };
}
