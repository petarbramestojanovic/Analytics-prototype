import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useSession } from '../lib/session';

/**
 * Benchmarks compare one client against the rest of the portfolio, so the page
 * only means anything to someone allowed to see every company's numbers —
 * Brame staff and sales. A company_user hitting it by URL is redirected rather
 * than shown an empty page, same as RequireAdmin: the RLS model would refuse
 * the read at the database, so the client app refuses the route.
 *
 * Deliberately a separate gate from RequireAdmin, which stays brame_admin-only
 * for the operational screens (setup, connectors, users, alert thresholds).
 */
export default function RequireInternal({ children }: { children: ReactNode }) {
  const { isInternal } = useSession();
  if (!isInternal) return <Navigate to="/overview" replace />;
  return <>{children}</>;
}
