import type { TranslateFn } from '@/i18n';
import { fmtPct } from '@/lib/format';
import { paths } from '@/config/paths';
import { alertTriggeredAt, type AlertLogRow } from '@/features/alerts';
import { reportFormatLabel } from '@/features/reports';
import type { InboxEvent } from '@/types';
import type { InboxItem } from '../types';

export function alertItem(row: AlertLogRow, t: TranslateFn): InboxItem {
  const change = row.deltaKind === 'pp' ? `${(row.delta * 100).toFixed(1)} pp` : fmtPct(row.delta, 1);
  return {
    id: `alert:${row.key}`,
    kind: 'alert',
    createdAt: alertTriggeredAt(row.key),
    title: row.campaignName,
    summary: `${row.ruleLabel}: ${row.detail}`,
    tone: 'red',
    facts: [
      { label: t('alerts.col.rule'), value: row.ruleLabel },
      { label: t('alerts.col.campaign'), value: row.campaignName },
      { label: t('alerts.col.company'), value: row.companyName },
      { label: t('alerts.col.metric'), value: t(`metric.${row.metric}.label`) },
      { label: t('alerts.col.comparing'), value: row.detail },
      { label: t('alerts.col.delta'), value: change },
    ],
    actions: [
      { label: t('inbox.action.openAlert'), to: paths.alert(row.key) },
      { label: t('inbox.action.openCampaign'), to: paths.campaign(row.campaignId) },
    ],
  };
}

export function eventItem(event: InboxEvent, t: TranslateFn, opts: { canManageSeat: boolean }): InboxItem {
  if (event.kind === 'report') {
    return {
      id: event.id,
      kind: 'report',
      createdAt: event.createdAt,
      title: t('inbox.report.title', { name: event.reportName }),
      summary: t('inbox.report.summary', { count: event.recipientCount, format: reportFormatLabel(t, event.format) }),
      tone: 'green',
      facts: [
        { label: t('inbox.fact.report'), value: event.reportName },
        { label: t('inbox.fact.recipients'), value: String(event.recipientCount) },
        { label: t('inbox.fact.format'), value: reportFormatLabel(t, event.format) },
      ],
      actions: [{ label: t('inbox.action.openReports'), to: paths.reports }],
    };
  }
  return {
    id: event.id,
    kind: 'invitation',
    createdAt: event.createdAt,
    title: t('inbox.invitation.title', { name: event.memberName, seat: event.seatName }),
    summary: event.memberEmail,
    tone: 'teal',
    facts: [
      { label: t('inbox.fact.member'), value: event.memberName },
      { label: t('inbox.fact.email'), value: event.memberEmail },
      { label: t('inbox.fact.seat'), value: event.seatName },
    ],
    actions: [{ label: t('inbox.action.openUsers'), to: opts.canManageSeat ? paths.users : paths.seats(event.seatId) }],
  };
}
