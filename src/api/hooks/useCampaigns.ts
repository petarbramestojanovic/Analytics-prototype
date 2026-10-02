import { useQuery } from '@tanstack/react-query';
import {
  addClicktag,
  fetchCampaign,
  fetchCampaigns,
  queryKeys,
  removeClicktag,
  updateCampaign,
  useInvalidatingMutation,
  type UpdateCampaignInput,
} from '@/api';
import type { Clicktag } from '@/types';

export function useCampaigns() {
  return useQuery({ queryKey: queryKeys.campaigns.all, queryFn: fetchCampaigns });
}

export function useCampaign(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.campaigns.detail(id ?? ''),
    queryFn: () => fetchCampaign(id!),
    enabled: !!id,
  });
}

export function useUpdateCampaign() {
  return useInvalidatingMutation(
    ({ id, patch }: { id: string; patch: UpdateCampaignInput }) => updateCampaign(id, patch),
    [queryKeys.campaigns.all]
  );
}

export function useAddClicktag() {
  return useInvalidatingMutation(
    ({ campaignId, clicktag }: { campaignId: string; clicktag: Omit<Clicktag, 'id'> }) =>
      addClicktag(campaignId, clicktag),
    ({ campaignId }) => [queryKeys.campaigns.detail(campaignId)]
  );
}

export function useRemoveClicktag() {
  return useInvalidatingMutation(
    ({ campaignId, clicktagId }: { campaignId: string; clicktagId: string }) => removeClicktag(campaignId, clicktagId),
    ({ campaignId }) => [queryKeys.campaigns.detail(campaignId)]
  );
}
