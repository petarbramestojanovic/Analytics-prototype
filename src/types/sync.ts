import type { SourceKey } from './campaign';

export interface SyncRun {
  id: string;
  source: SourceKey | 'salesforce';
  startedAt: string;
  durationMs: number;
  /** Binary, deliberately — a pull either wrote what it was supposed to or
   *  it didn't. A "partial" status just hides a failure behind a softer
   *  label; the `note` field is where the actual error goes. */
  status: 'ok' | 'failed';
  rowsWritten: number;
  campaignsTouched: number;
  note?: string;
}
