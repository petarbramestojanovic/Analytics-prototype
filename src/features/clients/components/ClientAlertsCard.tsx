import { ShieldCheck } from 'lucide-react';
import { paths } from '@/config/paths';
import { useI18n } from '@/i18n';
import { Card, CardHeader, Pill, Tooltip } from '@/components/ui';
import { EmptyText } from '@/components/feedback';
import { Table, Td, Th, Tr } from '@/components/table';
import { DeltaValue, TextLink } from '@/components/display';
import { sourceMeta, type DivergenceRow } from '@/features/campaigns';
import type { Campaign } from '@/types';

/** The standing source-divergence alerts for one client's campaigns. */
export function ClientAlertsCard({ alerts, campaigns }: { alerts: DivergenceRow[]; campaigns: Campaign[] }) {
  const { t } = useI18n();
  const byId = new Map(campaigns.map((c) => [c.id, c]));

  return (
    <Card padded={false} className="mb-5">
      <CardHeader
        title={t('companyDetail.alertsTitle')}
        hint={t('companyDetail.alertsHint')}
        actions={
          <TextLink to={paths.alerts} newTab>
            {t('companyDetail.manageAlerts')}
          </TextLink>
        }
      />
      {alerts.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <ShieldCheck size={28} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
          <EmptyText className="p-0">{t('companyDetail.alertsEmpty')}</EmptyText>
        </div>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>{t('alerts.col.campaign')}</Th>
              <Th>{t('alerts.col.comparing')}</Th>
              <Th>{t('alerts.col.metric')}</Th>
              <Th align="right">{t('alerts.col.delta')}</Th>
              <Th>{t('alerts.col.read')}</Th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((row) => {
              const campaign = byId.get(row.campaignId);
              const label = (s: DivergenceRow['baseline']) => (campaign ? sourceMeta(campaign, s).label : s);
              return (
                <Tr key={`${row.campaignId}-${row.check}-${row.metric}`}>
                  <Td>
                    <TextLink to={paths.campaign(row.campaignId)} variant="record" newTab>
                      {row.campaignName}
                    </TextLink>
                  </Td>
                  <Td>
                    <span className="inline-flex items-center gap-1.5">
                      {label(row.baseline)} <span className="text-gray-400">vs</span> {label(row.check)}
                      {row.cadenceGap && <Tooltip text={t('alerts.cadenceGapNote')} />}
                    </span>
                  </Td>
                  <Td>{t(`metric.${row.metric}.label`)}</Td>
                  <Td align="right">
                    <DeltaValue delta={row.delta} severity={row.read} />
                  </Td>
                  <Td>
                    <Pill tone={row.tone}>{t(`detail.read.${row.read}`)}</Pill>
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </Card>
  );
}
