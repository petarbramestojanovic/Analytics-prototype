// The data layer's public surface. Query hooks (./hooks) import fetchers
// from here, never from ./mock directly — swapping the mock backend
// for a real one (Supabase/REST) means changing this one re-export, not any
// component.
export * from './mock/store';
export { queryClient, queryKeys } from './queryClient';
export { useInvalidatingMutation } from './useInvalidatingMutation';
