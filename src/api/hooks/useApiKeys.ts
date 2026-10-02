import { useQuery } from '@tanstack/react-query';
import { createApiKey, fetchApiKeys, queryKeys, revokeApiKey, useInvalidatingMutation } from '@/api';

export function useApiKeys(seatId: string) {
  return useQuery({ queryKey: queryKeys.apiKeys.bySeat(seatId), queryFn: () => fetchApiKeys(seatId) });
}

export function useCreateApiKey() {
  return useInvalidatingMutation(createApiKey, [queryKeys.apiKeys.all]);
}

export function useRevokeApiKey() {
  return useInvalidatingMutation(revokeApiKey, [queryKeys.apiKeys.all]);
}
