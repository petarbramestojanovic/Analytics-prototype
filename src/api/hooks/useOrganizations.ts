import { useQuery } from '@tanstack/react-query';
import { fetchAgencies, fetchCompanies, queryKeys } from '@/api';

/** Client companies — Salesforce-owned, synced in, never created here. */
export function useCompanies() {
  return useQuery({ queryKey: queryKeys.companies.all, queryFn: fetchCompanies });
}

/** Media agencies — same Salesforce-owned directory as companies. */
export function useAgencies() {
  return useQuery({ queryKey: queryKeys.agencies.all, queryFn: fetchAgencies });
}
