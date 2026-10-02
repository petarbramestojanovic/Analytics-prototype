import { useMemo } from 'react';
import { useSession } from '@/features/session';
import { useCampaigns } from '@/api/hooks/useCampaigns';
import { scopeCampaigns } from '../lib/scope';

/** The campaign list as the current seat is allowed to see it — the query
 *  every tenant-scoped page (Overview, Campaigns, …) starts from. `campaigns`
 *  is `[]` until the query resolves; check `isLoading`/`isError` for state. */
export function useScopedCampaigns() {
  const session = useSession();
  const query = useCampaigns();
  const { seatCategory, companyId, agencyId } = session;
  const campaigns = useMemo(
    () => (query.data ? scopeCampaigns(query.data, { seatCategory, companyId, agencyId }) : []),
    [query.data, seatCategory, companyId, agencyId]
  );
  return { ...query, campaigns };
}
