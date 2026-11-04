import { matchPath } from 'react-router-dom';
import { appRoutes } from '../routes';

/** Whether a path is one specific record (a campaign, a client, an alert…)
 *  rather than a list page — the route has a `:param`. */
export function isRecordPath(path: string): boolean {
  return appRoutes.some((r) => r.path.includes(':') && matchPath({ path: r.path, end: true }, path));
}
