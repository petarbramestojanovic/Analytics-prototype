import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addClicktag,
  fetchCampaign,
  fetchCampaigns,
  removeClicktag,
  updateCampaign,
  type UpdateCampaignInput,
} from '../mock/store';
import { queryKeys } from '../lib/queryClient';
import type { Clicktag } from '../mock/types';

export function useCampaigns() {
  return useQuery({ queryKey: queryKeys.campaigns, queryFn: fetchCampaigns });
}

export function useCampaign(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.campaign(id ?? ''),
    queryFn: () => fetchCampaign(id!),
    enabled: !!id,
  });
}

export function useUpdateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateCampaignInput }) => updateCampaign(id, patch),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.campaigns });
      qc.invalidateQueries({ queryKey: queryKeys.campaign(id) });
    },
  });
}

export function useAddClicktag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ campaignId, clicktag }: { campaignId: string; clicktag: Omit<Clicktag, 'id'> }) =>
      addClicktag(campaignId, clicktag),
    onSuccess: (_data, { campaignId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.campaign(campaignId) });
    },
  });
}

export function useRemoveClicktag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ campaignId, clicktagId }: { campaignId: string; clicktagId: string }) =>
      removeClicktag(campaignId, clicktagId),
    onSuccess: (_data, { campaignId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.campaign(campaignId) });
    },
  });
}
