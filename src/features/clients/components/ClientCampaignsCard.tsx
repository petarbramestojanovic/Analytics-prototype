import { useI18n } from '@/i18n';
import { Card, CardHeader } from '@/components/ui';
import { EmptyText } from '@/components/feedback';
import { Table, Td, Th, Tr } from '@/components/table';
import { CampaignNameCell, DeliveryBar, deliveryPacing, MetricValueCell, sourceMeta } from '@/features/campaigns';
import type { Campaign, MetricKey } from '@/types';

const METRICS: MetricKey[] = ['impressions', 'ctr', 'viewability', 'engagementRate'];

/** Every campaign of one client, with its headline numbers. */
export function ClientCampaignsCard({ campaigns }: { campaigns: Campaign[] }) {
  const { t } = useI18n();
  return (
    <Card padded={false} className="mb-5">
      <CardHeader title={t('companyDetail.campaignsTitle')} hint={t('companyDetail.campaignsHint')} />
      {campaigns.length === 0 ? (
        <EmptyText>{t('companyDetail.campaignsEmpty')}</EmptyText>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>{t('campaigns.col.campaign')}</Th>
              <Th>{t('campaigns.col.agency')}</Th>
              <Th>{t('campaigns.col.primarySource')}</Th>
              {METRICS.map((m) => (
                <Th key={m} align="right">
                  {m === 'impressions' ? t('campaigns.col.impressions') : t(`metric.${m}.label`)}
                </Th>
              ))}
              <Th align="right">{t('campaigns.col.delivery')}</Th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <Tr key={c.id}>
                <Td>
                  <CampaignNameCell campaign={c} newTab />
                </Td>
                <Td>{c.agencyName ?? t('campaigns.agency.direct')}</Td>
                <Td>{sourceMeta(c, c.primarySource).label}</Td>
                {METRICS.map((m) => (
                  <Td key={m} align="right">
                    <MetricValueCell campaign={c} metric={m} />
                  </Td>
                ))}
                <Td align="right">
                  <DeliveryBar pacing={deliveryPacing(c)} />
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}
