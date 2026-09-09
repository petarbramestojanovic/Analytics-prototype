import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addUser, deleteUser, fetchCompanies, fetchUsers, updateUserRole, type AddUserInput } from '../mock/store';
import { queryKeys } from '../lib/queryClient';
import type { UserRole } from '../mock/types';

export function useCompanies() {
  return useQuery({ queryKey: queryKeys.companies, queryFn: fetchCompanies });
}

export function useUsers(companyId?: string) {
  return useQuery({ queryKey: queryKeys.users(companyId), queryFn: () => fetchUsers(companyId) });
}

function invalidateAllUserLists(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['users'] });
}

export function useAddUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AddUserInput) => addUser(input),
    onSuccess: () => invalidateAllUserLists(qc),
  });
}

export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) => updateUserRole(userId, role),
    onSuccess: () => invalidateAllUserLists(qc),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => deleteUser(userId),
    onSuccess: () => invalidateAllUserLists(qc),
  });
}
