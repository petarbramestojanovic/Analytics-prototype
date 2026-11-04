import { useMemo } from 'react';
import { useFormatters, useI18n } from '@/i18n';
import { slugify } from '@/lib/text';
import { useCampaigns } from '@/features/campaigns';
import { buildReportContent, type ReportDraft } from '../lib/reportContent';
import { reportToCsv } from '../lib/reportCsv';
import { reportScopeName } from '../lib/reportScope';

const EXTENSION = { excel: 'xlsx', csv: 'csv', pdf: 'pdf' } as const;

/** Everything about how a draft report reads — shared by the preview and the
 *  "send sample" action so they can never describe different emails. */
export function useReportRendering(draft: ReportDraft) {
  const { t } = useI18n();
  const { fmtDateLong, fmtDateRange } = useFormatters();
  const { data: campaigns } = useCampaigns();
  const content = useMemo(() => buildReportContent(draft, campaigns ?? []), [draft, campaigns]);

  const name = draft.name.trim() || t('reports.preview.untitled');
  const scopeLabel = draft.scope
    ? reportScopeName(draft.scope)
    : t('reports.preview.wholePortfolio');
  const period =
    content.periodStart === content.periodEnd
      ? fmtDateLong(content.periodEnd)
      : fmtDateRange(content.periodStart, content.periodEnd, true);
  const subject = `${t('reports.preview.subjectPrefix')} ${name}: ${period}`;
  const attachment =
    draft.format === 'email'
      ? null
      : `${slugify(name) || 'report'}-${content.periodEnd}.${EXTENSION[draft.format]}`;
  const csv = useMemo(
    () =>
      draft.format === 'csv'
        ? reportToCsv({ name, scopeLabel, period }, content, t, fmtDateLong)
        : null,
    [draft.format, name, scopeLabel, period, content, t, fmtDateLong],
  );

  return { content, name, scopeLabel, period, subject, attachment, csv };
}
