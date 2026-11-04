import { useMutation, useQuery } from '@tanstack/react-query';
import {
  createEmailReport,
  deleteEmailReport,
  fetchEmailReports,
  queryKeys,
  sendSampleEmailReport,
  sendTestEmailReport,
  setEmailReportEnabled,
  updateEmailReport,
  useInvalidatingMutation,
  type EmailReportInput,
} from '@/api';

const invalidates = [queryKeys.emailReports.all, queryKeys.inbox.all];

export function useEmailReports() {
  return useQuery({ queryKey: queryKeys.emailReports.all, queryFn: fetchEmailReports });
}

export function useCreateEmailReport() {
  return useInvalidatingMutation(createEmailReport, invalidates);
}

export function useUpdateEmailReport() {
  return useInvalidatingMutation(
    ({ id, patch }: { id: string; patch: EmailReportInput }) => updateEmailReport(id, patch),
    invalidates
  );
}

export function useDeleteEmailReport() {
  return useInvalidatingMutation(deleteEmailReport, invalidates);
}

export function useSetEmailReportEnabled() {
  return useInvalidatingMutation(
    ({ id, enabled }: { id: string; enabled: boolean }) => setEmailReportEnabled(id, enabled),
    invalidates
  );
}

export function useSendTestEmailReport() {
  return useInvalidatingMutation(sendTestEmailReport, invalidates);
}

/** A one-off dummy send to a single address — touches no saved report, so it
 *  has nothing to invalidate. */
export function useSendSampleReport() {
  return useMutation({ mutationFn: sendSampleEmailReport });
}
