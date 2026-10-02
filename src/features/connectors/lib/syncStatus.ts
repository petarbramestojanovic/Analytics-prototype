import { CheckCircle2, XCircle, type LucideIcon } from 'lucide-react';
import type { PillTone } from '@/components/ui';
import type { SyncRun } from '@/types';

export const SYNC_STATUS: Record<SyncRun['status'], { icon: LucideIcon; tone: PillTone }> = {
  ok: { icon: CheckCircle2, tone: 'green' },
  failed: { icon: XCircle, tone: 'red' },
};

/** The most recent run for one source, if it has ever run. */
export function lastRunFor(runs: SyncRun[], source: SyncRun['source']): SyncRun | undefined {
  return runs.filter((r) => r.source === source).sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1))[0];
}
