import { Cloud, Lock, RotateCw } from 'lucide-react';
import { useFormatters, useI18n } from '@/i18n';
import { useSimulatedAction } from '@/hooks/useSimulatedAction';
import { fmtCompact } from '@/lib/format';
import { Button, Card, Pill } from '@/components/ui';
import { SectionTitle } from '@/components/page';
import { ReadOnlyRow } from '@/components/display';
import type { Campaign } from '@/types';

/** Salesforce-owned fields — shown, locked, never editable here. */
export function SalesforcePanel({ campaign }: { campaign: Campaign }) {
  const { t } = useI18n();
  const { fmtDateRange, fmtTime, relativeTime } = useFormatters();
  const [syncing, syncNow] = useSimulatedAction();

  const rows: [string, string][] = [
    [t('setup.sf.campaignName'), campaign.name],
    [t('setup.sf.company'), campaign.companyName],
    [t('setup.sf.salesforceId'), campaign.salesforceId],
    [t('setup.sf.owner'), campaign.salesforce.owner],
    [t('setup.sf.market'), campaign.salesforce.market],
    [t('setup.sf.productLine'), campaign.salesforce.productLine],
    [t('setup.sf.bookedImpressions'), fmtCompact(campaign.salesforce.bookedImpressions)],
    [t('setup.sf.flight'), fmtDateRange(campaign.flightStart, campaign.flightEnd, true)],
  ];

  return (
    <Card className="border-l-4 border-l-brame-purple">
      <SectionTitle
        hint={t('setup.sf.hint')}
        action={
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {t('setup.sf.syncedAgo', {
                time: relativeTime(campaign.salesforce.lastSyncedAt),
                clock: fmtTime(campaign.salesforce.lastSyncedAt),
              })}
            </span>
            <Button
              size="sm"
              icon={<RotateCw size={12} className={syncing ? 'animate-spin' : ''} />}
              onClick={syncNow}
              disabled={syncing}
            >
              {syncing ? t('setup.sf.syncing') : t('setup.sf.syncNow')}
            </Button>
          </div>
        }
      >
        <span className="flex items-center gap-2">
          <Cloud size={16} className="text-brame-purple" />
          {t('setup.sf.title')}
          <Pill tone="purple" icon={<Lock size={10} />}>
            {t('setup.sf.readOnlyBadge')}
          </Pill>
        </span>
      </SectionTitle>

      <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <ReadOnlyRow key={label} label={label} value={value} />
        ))}
      </dl>
    </Card>
  );
}
