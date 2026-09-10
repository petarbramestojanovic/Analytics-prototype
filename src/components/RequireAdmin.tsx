import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useSession } from '../lib/session';

/**
 * Route-level enforcement, not just hidden nav links. Setup, connectors and
 * cross-company user management are Brame-operational surfaces — the RFC's
 * RLS model would reject these reads/writes for a company_user at the
 * database, so the client app has to refuse them too, not just decline to
 * link to them.
 */
export default function RequireAdmin({ children }: { children: ReactNode }) {
  const { role } = useSession();
  if (role !== 'brame_admin') return <Navigate to="/overview" replace />;
  return <>{children}</>;
}
