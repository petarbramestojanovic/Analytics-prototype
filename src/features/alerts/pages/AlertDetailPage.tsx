import type { ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { paths } from '@/config/paths';
import { useFormatters, useI18n } from '@/i18n';
import { usePageTitle } from '@/hooks/usePageTitle';
import { fmtPct, fmtSignedPp } from '@/lib/format';
import { ButtonLink, Card, Pill } from '@/components/ui';
import { PageSkeleton } from '@/components/feedback';
import { NotFoundState, Page, PageHeader, SectionTitle } from '@/components/page';
import { DeltaValue, TextLink } from '@/components/display';
import { useCampaign } from '@/features/campaigns';
import { useAlertRules } from '../alertRulesContext';
import { useAlertThresholds } from '../alertThresholdsContext';
import { AlertMetricChart } from '../components/AlertMetricChart';
import { useAlertLog } from '../hooks/useAlertLog';
import { alertTriggeredAt, DEFAULT_RULE_ID } from '../lib/alertLog';
import { ruleCondition } from '../lib/ruleText';

/**
 * One triggered alert: what tripped, the KPI behind it, which rule did it, and
 * what else is flagged on the same campaign. Reached from the alert list, the
 * inbox, or a link; an alert that has stopped firing reads as not found,
 * because it's computed live and has nothing left to show.
 */
export function AlertDetailPage() {
  const { key } = useParams<{ key: string }>();
  const { t } = useI18n();
  const { fmtDateLong, fmtTime } = useFormatters();
  const { rows, isLoading } = useAlertLog();
  const { rules } = useAlertRules();
  const { watch, investigate } = useAlertThresholds();
  const row = rows.find((r) => r.key === key);
  const { data: campaign } = useCampaign(row?.campaignId);
  usePageTitle(row?.campaignName);

  if (isLoading) return <PageSkeleton variant="dashboard" />;
  if (!row) {
    return (
      <NotFoundState
        title={t('alerts.detail.goneTitle')}
        body={t('alerts.detail.goneBody')}
        backTo={paths.alerts}
        backLabel={t('alerts.back')}
      />
    );
  }

  const rule = rules.find((r) => r.id === row.ruleId);
  const triggeredAt = alertTriggeredAt(row.key);
  const others = rows.filter((r) => r.campaignId === row.campaignId && r.key !== row.key);

  return (
    <Page>
      <PageHeader
        back={{ to: paths.alerts, label: t('alerts.back') }}
        title={row.campaignName}
        badges={
          <>
            <Pill tone={row.severity === 'watch' ? 'amber' : 'red'}>{t(`detail.read.${row.severity}`)}</Pill>
            <Pill tone="neutral">{row.ruleLabel}</Pill>
          </>
        }
        subtitle={`${row.companyName} · ${t('alerts.detail.triggered', { date: fmtDateLong(triggeredAt), time: fmtTime(triggeredAt) })}`}
        actions={
          <ButtonLink to={paths.campaign(row.campaignId)} variant="primary" icon={<ArrowRight size={13} />}>
            {t('inbox.action.openCampaign')}
          </ButtonLink>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionTitle hint={row.detail}>{t('alerts.detail.chartTitle', { metric: t(`metric.${row.metric}.label`) })}</SectionTitle>
          {campaign ? <AlertMetricChart campaign={campaign} row={row} rule={rule} /> : null}
        </Card>

        <Card>
          <SectionTitle>{t('alerts.detail.factsTitle')}</SectionTitle>
          <dl className="divide-y divide-gray-100 text-sm dark:divide-white/5">
            <Fact label={t('alerts.col.metric')}>{t(`metric.${row.metric}.label`)}</Fact>
            <Fact label={t('alerts.col.comparing')}>{row.detail}</Fact>
            <Fact label={t('alerts.col.delta')}>
              {row.deltaKind === 'pp' ? (
                <span className="text-red-600 dark:text-red-400">{fmtSignedPp(row.delta)}</span>
              ) : (
                <DeltaValue delta={row.delta} severity={row.severity} />
              )}
            </Fact>
            <Fact label={t('alerts.col.read')}>{t(`detail.read.${row.severity}`)}</Fact>
          </dl>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <SectionTitle>{t('alerts.detail.ruleTitle')}</SectionTitle>
          {rule ? (
            <>
              <p className="text-sm text-brame-dark dark:text-gray-100">{ruleCondition(rule, t)}</p>
              <div className="mt-3">
                <TextLink to={paths.alertRule(rule.id)}>{t('alerts.detail.viewRule')}</TextLink>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {row.ruleId === DEFAULT_RULE_ID
                ? t('alerts.detail.defaultRule', { watch: fmtPct(watch, 0), investigate: fmtPct(investigate, 0) })
                : row.ruleLabel}
            </p>
          )}
        </Card>

        <Card>
          <SectionTitle>{t('alerts.detail.othersTitle')}</SectionTitle>
          {others.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('alerts.detail.othersNone')}</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {others.map((o) => (
                <li key={o.key} className="flex items-baseline justify-between gap-3">
                  <TextLink to={paths.alert(o.key)} variant="record">
                    {o.ruleLabel}
                  </TextLink>
                  <span className="truncate text-xs text-gray-500 dark:text-gray-400">{o.detail}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </Page>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="text-right font-medium text-brame-dark dark:text-gray-100">{children}</dd>
    </div>
  );
}
