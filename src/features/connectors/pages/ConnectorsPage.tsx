import { Loader2, RotateCw } from 'lucide-react';
import { useFormatters, useI18n } from '@/i18n';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useSimulatedAction } from '@/hooks/useSimulatedAction';
import { EMPTY_VALUE, fmtDuration, fmtInt } from '@/lib/format';
import { Button, Card, Pill, ProgressBar } from '@/components/ui';
import { LoadingState } from '@/components/feedback';
import { Page, PageHeader, SectionTitle } from '@/components/page';
import { Table, Td, Th } from '@/components/table';
import { LivePill, SOURCE_KEYS, useCampaigns } from '@/features/campaigns';
import type { SyncRun } from '@/types';
import { useSyncRuns } from '@/api/hooks/useSyncRuns';
import { ConnectorCard } from '../components/ConnectorCard';
import { LastSyncStatus, SyncStatusPill } from '../components/LastSyncStatus';
import { lastRunFor } from '../lib/syncStatus';

/**
 * Operator-facing view of where the numbers come from. Included because the
 * blank-not-zero rule only works if somebody can see *why* a source is blank.
 *
 * Salesforce, ATK and NEXD always run in that order — Salesforce first
 * (campaign/client metadata), then the two analytics pulls — each polled
 * every 6 hours. Brame's own instrumentation is the only live source and has
 * no "last sync" of its own.
 */
export function ConnectorsPage() {
  const { t } = useI18n();
  usePageTitle(t('connectors.title'));
  const { fmtTime, relativeTime } = useFormatters();
  const { data: campaigns = [], isLoading } = useCampaigns();
  const { data: runs = [], isLoading: runsLoading } = useSyncRuns();
  const [running, runAllNow] = useSimulatedAction();

  const sourceLabel = (source: SyncRun['source']) => t(`connectors.source.${source}`);

  if (isLoading || runsLoading) return <LoadingState />;

  const started = campaigns.filter((c) => c.sources[c.primarySource] || c.status !== 'scheduled');
  const salesforceRun = lastRunFor(runs, 'salesforce');
  const periodic = <Pill tone="amber">{t('connectors.periodic')}</Pill>;

  return (
    <Page>
      <PageHeader title={t('connectors.title')} subtitle={t('connectors.subtitle')} />

      <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-4">
        <ConnectorCard name={sourceLabel('salesforce')} description={t('connectors.salesforceHint')} badge={periodic}>
          {salesforceRun && (
            <div className="mt-4 flex items-baseline justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">{t('connectors.coverage')}</span>
              <span className="tnum font-medium text-brame-dark dark:text-gray-100">
                {salesforceRun.campaignsTouched} {t('connectors.col.campaigns').toLowerCase()}
              </span>
            </div>
          )}
          <LastSyncStatus run={salesforceRun} />
        </ConnectorCard>

        {SOURCE_KEYS.map((key) => {
          const withData = started.filter((c) => c.sources[key]).length;
          const pct = started.length ? withData / started.length : 0;
          const live = key === 'custom';
          return (
            <ConnectorCard
              key={key}
              name={sourceLabel(key)}
              description={t('connectors.primaryFor', { count: campaigns.filter((c) => c.primarySource === key).length })}
              badge={live ? <LivePill label={t('connectors.realTime')} /> : periodic}
            >
              <div className="mt-4">
                <div className="mb-1 flex items-baseline justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">{t('connectors.coverage')}</span>
                  <span className="tnum font-medium text-brame-dark dark:text-gray-100">
                    {withData} / {started.length}
                  </span>
                </div>
                <ProgressBar value={pct} barClassName={pct === 1 ? 'bg-green-500' : 'bg-amber-400'} />
                {pct < 1 && (
                  <div className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                    {t('connectors.coverageGap', { count: started.length - withData })}
                  </div>
                )}
              </div>
              {!live && <LastSyncStatus run={lastRunFor(runs, key)} />}
            </ConnectorCard>
          );
        })}
      </div>

      <Card padded={false}>
        <div className="p-5 pb-0">
          <SectionTitle
            hint={t('connectors.historyHint')}
            action={
              <Button
                size="sm"
                icon={running ? <Loader2 size={12} className="animate-spin" /> : <RotateCw size={12} />}
                disabled={running}
                onClick={runAllNow}
              >
                {running ? t('connectors.running') : t('connectors.runAllNow')}
              </Button>
            }
          >
            {t('connectors.historyTitle')}
          </SectionTitle>
        </div>
        <Table className="px-5 pb-5">
          <thead>
            <tr>
              <Th>{t('connectors.col.source')}</Th>
              <Th>{t('connectors.col.started')}</Th>
              <Th>{t('connectors.col.status')}</Th>
              <Th align="right">{t('connectors.col.rowsWritten')}</Th>
              <Th align="right">{t('connectors.col.campaigns')}</Th>
              <Th align="right">{t('connectors.col.duration')}</Th>
              <Th>{t('connectors.col.note')}</Th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id}>
                <Td className="font-medium">{sourceLabel(r.source)}</Td>
                <Td>
                  <div>{fmtTime(r.startedAt)}</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">{relativeTime(r.startedAt)}</div>
                </Td>
                <Td>
                  <SyncStatusPill status={r.status} />
                </Td>
                <Td align="right">{fmtInt(r.rowsWritten)}</Td>
                <Td align="right">{r.campaignsTouched}</Td>
                <Td align="right">{fmtDuration(r.durationMs)}</Td>
                <Td className="text-xs text-gray-500 dark:text-gray-400">{r.note ?? EMPTY_VALUE}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </Page>
  );
}
