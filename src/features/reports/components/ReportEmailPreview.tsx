import type { ReactNode } from 'react';
import { Paperclip } from 'lucide-react';
import { useFormatters, useI18n } from '@/i18n';
import type { ReportContent, ReportDraft } from '../lib/reportContent';
import { buildReportSheets } from '../lib/reportSheets';
import { ReportKpiTiles } from './ReportKpiTiles';
import { ReportTable } from './ReportTable';

/**
 * The email as a mail client shows it: the envelope, a greeting and the
 * figures. With an attachment the body stays short (headline tiles, "full
 * report attached"); an email-only report carries its tables inline. Always on
 * white, so it reads the same in light and dark mode.
 */
export function ReportEmailPreview({
  draft,
  content,
  name,
  scopeLabel,
  period,
  subject,
  attachment,
  recipients,
}: {
  draft: ReportDraft;
  content: ReportContent;
  name: string;
  scopeLabel: string;
  period: string;
  subject: string;
  attachment: string | null;
  recipients: string[];
}) {
  const { t } = useI18n();
  const { fmtDate } = useFormatters();
  const sheets = buildReportSheets(content, t, fmtDate);
  const creativeShares = content.creatives.map((c) => c.share);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white text-gray-800 shadow-sm">
      <dl className="space-y-1 border-b border-gray-200 bg-gray-50 px-5 py-3 text-xs">
        <Envelope label={t('reports.preview.from')}>Klea Analytics &lt;reports@klea.media&gt;</Envelope>
        <Envelope label={t('reports.preview.to')}>
          {recipients.length ? recipients.join(', ') : t('reports.preview.sampleRecipient')}
        </Envelope>
        <Envelope label={t('reports.preview.subject')}>
          <span className="font-semibold text-gray-900">{subject}</span>
        </Envelope>
        {attachment && (
          <Envelope label={t('reports.preview.attachment')}>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 py-0.5 font-medium text-gray-700">
              <Paperclip size={11} />
              {attachment}
            </span>
          </Envelope>
        )}
      </dl>

      <div className="space-y-5 px-6 py-5 text-sm">
        {draft.format === 'email' ? (
          <p>{t('reports.preview.intro', { scope: scopeLabel, period })}</p>
        ) : (
          <p>{t('reports.preview.introAttached', { name, scope: scopeLabel, period })}</p>
        )}

        {content.usedFallbackPeriod && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {t('reports.preview.fallbackPeriod')}
          </p>
        )}

        <ReportKpiTiles content={content} />

        {draft.format === 'email' ? (
          sheets
            .filter((s) => s.id !== 'summary')
            .map((s) => (
              <section key={s.id}>
                <h4 className="text-sm font-semibold text-gray-900">{s.title}</h4>
                <p className="mb-2 text-xs text-gray-500">
                  {s.id === 'creatives' ? t('reports.preview.creativesHint') : ' '}
                </p>
                <ReportTable
                  sheet={s}
                  maxRows={s.id === 'daily' ? 10 : undefined}
                  bars={s.id === 'creatives' ? { column: 1, values: creativeShares } : undefined}
                />
              </section>
            ))
        ) : (
          <p className="flex items-center gap-1.5 text-xs text-gray-500">
            <Paperclip size={12} />
            {t('reports.preview.attachedNote')}
          </p>
        )}

        <p className="border-t border-gray-100 pt-3 text-xs text-gray-400">
          {t('reports.preview.footer')}
        </p>
      </div>
    </div>
  );
}

function Envelope({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="w-20 flex-shrink-0 text-gray-400">{label}</dt>
      <dd className="min-w-0 break-words text-gray-700">{children}</dd>
    </div>
  );
}
