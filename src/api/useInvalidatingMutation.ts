import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';

/**
 * A mutation that refreshes the queries it affects once it succeeds — the
 * shape of every write in the app. `invalidates` lists query keys (or derives
 * them from the mutation's variables), so each feature's api file only states
 * *what* changes, not the useQueryClient/onSuccess wiring around it.
 */
export function useInvalidatingMutation<TVariables, TData>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  invalidates: readonly QueryKey[] | ((variables: TVariables) => readonly QueryKey[])
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (_data, variables) => {
      const keys = typeof invalidates === 'function' ? invalidates(variables) : invalidates;
      for (const queryKey of keys) qc.invalidateQueries({ queryKey });
    },
  });
}
