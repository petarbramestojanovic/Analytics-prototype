import { useQuery } from '@tanstack/react-query';
import { fetchAccounts, fetchCompanies, queryKeys } from '@/api';

/** Client companies — Salesforce-owned, synced in, never created here. */
export function useCompanies() {
  return useQuery({ queryKey: queryKeys.companies.all, queryFn: fetchCompanies });
}

/** Media accounts — same Salesforce-owned directory as companies. */
export function useAccounts() {
  return useQuery({ queryKey: queryKeys.accounts.all, queryFn: fetchAccounts });
}
