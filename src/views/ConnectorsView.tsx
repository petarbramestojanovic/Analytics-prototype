import { CheckCircle2, CircleAlert, Radio, RotateCw, XCircle } from 'lucide-react';
import { fmtInt, syncRuns } from '../mock/data';
import type { SourceKey, SyncRun } from '../mock/types';
import { useI18n, useFormatters } from '../lib/i18n';
import { usePageTitle } from '../lib/usePageTitle';
import { useCampaigns } from '../hooks/useCampaigns';
import { Button, Card, Pill, SectionTitle, Td, Th, type PillTone } from '../components/primitives';

const statusIcon: Record<SyncRun['status'], { icon: typeof CheckCircle2; tone: PillTone }> = {
  ok: { icon: CheckCircle2, tone: 'green' },
  partial: { icon: CircleAlert, tone: 'amber' },
  failed: { icon: XCircle, tone: 'red' },
};

/**
 * Operator-facing view of where the numbers come from. Included because the
 * blank-not-zero rule only works if somebody can see *why* a source is blank.
 */
export default function ConnectorsView() {
  const { t } = useI18n();
  usePageTitle(t('connectors.title'));
  const { fmtTime, relativeTime } = useFormatters();
  const { data: campaigns, isLoading } = useCampaigns();

  const sourceLabels: Record<SourceKey | 'salesforce', string> = {
    atk: t('connectors.source.atk'),
    nexd: t('connectors.source.nexd'),
    custom: t('connectors.source.custom'),
    salesforce: t('connectors.source.salesforce'),
  };

  const coverage = (['atk', 'nexd', 'custom'] as SourceKey[]).map((key) => {
    const started = (campaigns ?? []).filter((c) => c.sources[c.primarySource] || c.status !== 'scheduled');
    const withData = started.filter((c) => c.sources[key]);
    const primaryFor = (campaigns ?? []).filter((c) => c.primarySource === key);
    return { key, withData: withData.length, total: started.length, primaryFor: primaryFor.length };
  });

  if (isLoading) {
    return <div className="px-8 py-16 text-center text-sm text-gray-500 dark:text-gray-400">{t('common.loading')}</div>;
  }

  return (
    <div className="px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brame-dark dark:text-white">{t('connectors.title')}</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500 dark:text-gray-400">{t('connectors.subtitle')}</p>
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        {coverage.map((c) => {
          const pct = c.total ? c.withData / c.total : 0;
          return (
            <Card key={c.key}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-semibold text-brame-dark dark:text-gray-100">
                    {sourceLabels[c.key]}
                  </div>
                  <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {t('connectors.primaryFor', { count: c.primaryFor })}
                  </div>
                </div>
                {c.key === 'custom' ? (
                  <Pill tone="green" icon={<Radio size={10} />}>
                    {t('connectors.realTime')}
                  </Pill>
                ) : (
                  <Pill tone="amber">{t('connectors.nightly')}</Pill>
                )}
              </div>
              <div className="mt-4">
                <div className="mb-1 flex items-baseline justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">{t('connectors.coverage')}</span>
                  <span className="tnum font-medium text-brame-dark dark:text-gray-100">
                    {c.withData} / {c.total}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                  <div
                    className={`h-full rounded-full ${pct === 1 ? 'bg-green-500' : 'bg-amber-400'}`}
                    style={{ width: `${pct * 100}%` }}
                  />
                </div>
                {pct < 1 && (
                  <div className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                    {t('connectors.coverageGap', { count: c.total - c.withData })}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Card padded={false}>
        <div className="p-5 pb-0">
          <SectionTitle
            hint={t('connectors.historyHint')}
            action={
              <Button size="sm" icon={<RotateCw size={12} />}>
                {t('connectors.runAllNow')}
              </Button>
            }
          >
            {t('connectors.historyTitle')}
          </SectionTitle>
        </div>
        <div className="overflow-x-auto px-5 pb-5">
          <table className="w-full">
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
              {syncRuns.map((r) => {
                const { icon: Icon, tone } = statusIcon[r.status];
                return (
                  <tr key={r.id}>
                    <Td className="font-medium">{sourceLabels[r.source]}</Td>
                    <Td>
                      <div>{fmtTime(r.startedAt)}</div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">{relativeTime(r.startedAt)}</div>
                    </Td>
                    <Td>
                      <Pill tone={tone} icon={<Icon size={11} />}>
                        {t(`connectors.status.${r.status}`)}
                      </Pill>
                    </Td>
                    <Td align="right">{fmtInt(r.rowsWritten)}</Td>
                    <Td align="right">{r.campaignsTouched}</Td>
                    <Td align="right">{(r.durationMs / 1000).toFixed(1)}s</Td>
                    <Td className="text-xs text-gray-500 dark:text-gray-400">{r.note ?? '—'}</Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
