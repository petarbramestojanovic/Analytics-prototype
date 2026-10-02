import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { paths } from '@/config/paths';
import { hasAccess, useSession, type Access } from '@/features/session';

/**
 * Route-level enforcement, not just hidden nav links: a seat that may not
 * open a screen is redirected rather than shown an empty or read-only
 * version of it. See features/session/access.ts for what each level means.
 */
export function RequireAccess({ access, children }: { access: Access; children: ReactNode }) {
  const session = useSession();
  if (!hasAccess(session, access)) return <Navigate to={paths.overview} replace />;
  return <>{children}</>;
}
