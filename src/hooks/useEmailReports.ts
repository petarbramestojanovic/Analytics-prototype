import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createEmailReport,
  deleteEmailReport,
  fetchEmailReports,
  sendTestEmailReport,
  setEmailReportEnabled,
  updateEmailReport,
  type EmailReportInput,
} from '../mock/store';
import { queryKeys } from '../lib/queryClient';

export function useEmailReports() {
  return useQuery({ queryKey: queryKeys.emailReports, queryFn: fetchEmailReports });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: queryKeys.emailReports });
}

export function useCreateEmailReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: EmailReportInput) => createEmailReport(input),
    onSuccess: () => invalidate(qc),
  });
}

export function useUpdateEmailReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: EmailReportInput }) => updateEmailReport(id, patch),
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteEmailReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEmailReport(id),
    onSuccess: () => invalidate(qc),
  });
}

export function useSetEmailReportEnabled() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => setEmailReportEnabled(id, enabled),
    onSuccess: () => invalidate(qc),
  });
}

export function useSendTestEmailReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sendTestEmailReport(id),
    onSuccess: () => invalidate(qc),
  });
}
