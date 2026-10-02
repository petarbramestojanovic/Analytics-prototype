import { Mail } from 'lucide-react';
import { paths } from '@/config/paths';
import { useI18n } from '@/i18n';
import { Card, CardHeader } from '@/components/ui';
import { EmptyText } from '@/components/feedback';
import { TextLink } from '@/components/display';
import { humanCadence, ReportStatusPill } from '@/features/reports';
import type { EmailReport } from '@/types';

/** One client's scheduled reports, read-only — managed on the Reports page. */
export function ClientReportsCard({ reports }: { reports: EmailReport[] }) {
  const { t } = useI18n();
  return (
    <Card padded={false}>
      <CardHeader
        title={t('companyDetail.reportsTitle')}
        hint={t('companyDetail.reportsHint')}
        actions={
          <TextLink to={paths.reports} newTab>
            {t('companyDetail.manageReports')}
          </TextLink>
        }
      />
      {reports.length === 0 ? (
        <EmptyText>{t('companyDetail.reportsEmpty')}</EmptyText>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-white/5">
          {reports.map((r) => (
            <div key={r.id} className="p-4">
              <div className="flex items-center gap-2">
                <Mail size={13} className="text-gray-400 dark:text-gray-500" />
                <span className="text-sm font-medium text-brame-dark dark:text-gray-100">{r.name}</span>
                <ReportStatusPill enabled={r.enabled} />
              </div>
              <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                {humanCadence(t, r)} · {r.recipients.length} {t('companyDetail.recipients')}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
