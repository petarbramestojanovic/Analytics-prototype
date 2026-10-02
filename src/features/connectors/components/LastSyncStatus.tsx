import { useFormatters, useI18n } from '@/i18n';
import { Pill } from '@/components/ui';
import type { SyncRun } from '@/types';
import { SYNC_STATUS } from '../lib/syncStatus';

/** The at-a-glance answer to "when did this last run, did it work, and if not
 *  why" — the same three things the history table records per row. */
export function LastSyncStatus({ run }: { run?: SyncRun }) {
  const { t } = useI18n();
  const { fmtTime, relativeTime } = useFormatters();

  if (!run) return <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">{t('connectors.neverSynced')}</p>;

  return (
    <div className="mt-4 border-t border-gray-100 pt-3 dark:border-white/10">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500 dark:text-gray-400">{t('connectors.lastSync')}</span>
        <SyncStatusPill status={run.status} />
      </div>
      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {fmtTime(run.startedAt)} · {relativeTime(run.startedAt)}
      </div>
      {run.status === 'failed' && run.note && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{run.note}</p>}
    </div>
  );
}

export function SyncStatusPill({ status }: { status: SyncRun['status'] }) {
  const { t } = useI18n();
  const { icon: Icon, tone } = SYNC_STATUS[status];
  return (
    <Pill tone={tone} icon={<Icon size={10} />}>
      {t(`connectors.status.${status}`)}
    </Pill>
  );
}
