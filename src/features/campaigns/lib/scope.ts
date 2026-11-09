import type { Campaign, SeatCategory } from '@/types';

/** Applies a seat's tenant scope to a campaign list — a client sees its own
 *  company's campaigns, an account the ones it booked, internal seats all of
 *  them. Archived campaigns stay out of the default list; analytics are never
 *  deleted, so they remain reachable by URL. */
export function scopeCampaigns(
  all: Campaign[],
  scope: { seatCategory: SeatCategory; companyId: string; accountId: string }
): Campaign[] {
  let scoped = all;
  if (scope.seatCategory === 'client') scoped = all.filter((c) => c.companyId === scope.companyId);
  else if (scope.seatCategory === 'account') scoped = all.filter((c) => c.accountId === scope.accountId);
  return scoped.filter((c) => c.status !== 'archived');
}

/** Whether the session may open this campaign at all. A client hitting
 *  another company's campaign URL must see exactly what a real RLS policy
 *  would produce: the row does not exist for them. */
export function canSeeCampaign(
  campaign: Campaign,
  scope: { isInternal: boolean; seatCategory: SeatCategory; companyId: string; accountId: string }
): boolean {
  if (scope.isInternal) return true;
  if (scope.seatCategory === 'account') return campaign.accountId === scope.accountId;
  return campaign.companyId === scope.companyId;
}
