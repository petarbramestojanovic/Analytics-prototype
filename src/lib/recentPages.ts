import { STORAGE_KEYS } from '@/config/storageKeys';
import { codecs, readStorage, writeStorage } from '@/lib/storage';

/** A page someone opened, kept so ⌘K can offer it again. */
export interface RecentPage {
  path: string;
  title: string;
  /** Whose view it was seen in. A page opened as Admin must never be offered
   *  to a client seat: its title (a campaign name, say) is that tenant's data. */
  scope: string;
  at: number;
}

const MAX_KEPT = 12;
const codec = codecs.json<RecentPage[]>();

export function readRecentPages(scope: string): RecentPage[] {
  const all = readStorage(STORAGE_KEYS.recentPages, codec);
  return Array.isArray(all) ? all.filter((p) => p.scope === scope) : [];
}

/** Notes that `path` was just opened. One entry per page and view, newest first. */
export function recordRecentPage(path: string, title: string, scope: string) {
  const all = readStorage(STORAGE_KEYS.recentPages, codec);
  const others = (Array.isArray(all) ? all : []).filter((p) => !(p.path === path && p.scope === scope));
  writeStorage(STORAGE_KEYS.recentPages, [{ path, title, scope, at: Date.now() }, ...others].slice(0, MAX_KEPT), codec);
}

/** Forgets this view's history, and only this view's. */
export function clearRecentPages(scope: string) {
  const all = readStorage(STORAGE_KEYS.recentPages, codec);
  writeStorage(STORAGE_KEYS.recentPages, (Array.isArray(all) ? all : []).filter((p) => p.scope !== scope), codec);
}
