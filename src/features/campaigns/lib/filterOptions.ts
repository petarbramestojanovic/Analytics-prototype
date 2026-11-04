import type { Campaign, Person } from '@/types';

export interface Option {
  value: string;
  label: string;
}

/** agencyId is null for direct bookings — this sentinel gives that case a
 *  stable filter/option value alongside the real agency ids. */
export const DIRECT_AGENCY_KEY = 'direct';

const unique = (entries: [string, string][]): Option[] =>
  [...new Map(entries).entries()].map(([value, label]) => ({ value, label }));

/** The distinct companies in a campaign list, for a company filter. */
export function companyOptions(campaigns: Campaign[]): Option[] {
  return unique(campaigns.map((c) => [c.companyId, c.companyName]));
}

/** The distinct agencies in a campaign list (direct bookings under one
 *  `DIRECT_AGENCY_KEY` entry labelled `directLabel`), for an agency filter. */
export function agencyOptions(campaigns: Campaign[], directLabel: string): Option[] {
  return unique(campaigns.map((c) => [c.agencyId ?? DIRECT_AGENCY_KEY, c.agencyName ?? directLabel]));
}

/** The distinct Salesforce markets in a campaign list, sorted. */
export function marketOptions(campaigns: Campaign[]): Option[] {
  return [...new Set(campaigns.map((c) => c.salesforce.market))].sort().map((m) => ({ value: m, label: m }));
}

/** The distinct Salesforce categories in a campaign list, sorted. */
export function categoryOptions(campaigns: Campaign[]): Option[] {
  return [...new Set(campaigns.map((c) => c.salesforce.category))].sort().map((m) => ({ value: m, label: m }));
}

export interface PersonOption extends Option {
  avatarUrl: string | null;
}

/** The distinct people in one Salesforce role (`pick`) across a campaign
 *  list, sorted by name — for the sales / campaign manager filters. */
export function personOptions(campaigns: Campaign[], pick: (c: Campaign) => Person): PersonOption[] {
  const people = new Map(campaigns.map((c) => [pick(c).id, pick(c)]));
  return [...people.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((p) => ({ value: p.id, label: p.name, avatarUrl: p.avatarUrl }));
}
