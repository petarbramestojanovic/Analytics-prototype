import { paths } from '@/config/paths';
import { useI18n } from '@/i18n';
import { Pill, Tooltip } from '@/components/ui';
import { Table, Td, Th } from '@/components/table';
import { DeltaValue, TextLink } from '@/components/display';
import type { AlertLogRow } from '../lib/alertLog';

export function AlertLogTable({ rows }: { rows: AlertLogRow[] }) {
  const { t } = useI18n();
  return (
    <Table className="px-5">
      <thead>
        <tr>
          <Th>{t('alerts.col.campaign')}</Th>
          <Th>{t('alerts.col.company')}</Th>
          <Th>{t('alerts.col.rule')}</Th>
          <Th>{t('alerts.col.comparing')}</Th>
          <Th>{t('alerts.col.metric')}</Th>
          <Th align="right">{t('alerts.col.delta')}</Th>
          <Th>{t('alerts.col.read')}</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key}>
            <Td>
              <TextLink to={paths.campaign(row.campaignId)} variant="record">
                {row.campaignName}
              </TextLink>
            </Td>
            <Td className="text-gray-500 dark:text-gray-400">{row.companyName}</Td>
            <Td className="text-gray-500 dark:text-gray-400">{row.ruleLabel}</Td>
            <Td>
              <span className="inline-flex items-center gap-1.5">
                {row.detail}
                {row.cadenceGap && <Tooltip text={t('alerts.cadenceGapNote')} />}
              </span>
            </Td>
            <Td>{t(`metric.${row.metric}.label`)}</Td>
            <Td align="right">
              <DeltaValue delta={row.delta} severity={row.severity} />
            </Td>
            <Td>
              <Pill tone={row.severity === 'watch' ? 'amber' : 'red'}>{t(`detail.read.${row.severity}`)}</Pill>
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
