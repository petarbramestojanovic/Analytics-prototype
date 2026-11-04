import type { ReactNode } from 'react';
import { FileSpreadsheet, FileText, Paperclip } from 'lucide-react';
import { useFormatters, useI18n } from '@/i18n';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui';
import { useReportRendering } from '../hooks/useReportRendering';
import type { ReportContent, ReportDraft } from '../lib/reportContent';
import { formatReportValue } from '../lib/reportCsv';

/**
 * A rendering of the email (and attachment) a report would send, built from
 * the form's current values. It always draws on white, like a real mail
 * client, so it reads the same in light and dark mode — it is what the
 * recipient sees, not part of the dashboard.
 */
export function ReportPreviewDialog({
  open,
  onClose,
  draft,
  recipients,
}: {
  open: boolean;
  onClose: () => void;
  draft: ReportDraft;
  recipients: string[];
}) {
  const { t } = useI18n();
  const { content, name, scopeLabel, period, subject, attachment, csv } = useReportRendering(draft);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t('reports.preview.title')}</DialogTitle>
          <DialogDescription>{t('reports.preview.description')}</DialogDescription>
        </DialogHeader>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white text-gray-800 shadow-sm">
          <dl className="space-y-1 border-b border-gray-200 bg-gray-50 px-5 py-3 text-xs">
            <Envelope label={t('reports.preview.from')}>
              Brame Analytics &lt;reports@brame.io&gt;
            </Envelope>
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
              <>
                <p>{t('reports.preview.intro', { scope: scopeLabel, period })}</p>
                <ReportBody content={content} />
              </>
            ) : (
              <>
                <p>{t('reports.preview.introAttached', { name, scope: scopeLabel, period })}</p>
                <KpiRow content={content} />
              </>
            )}
            <p className="border-t border-gray-100 pt-3 text-xs text-gray-400">
              {t('reports.preview.footer')}
            </p>
          </div>
        </div>

        {attachment && (
          <div className="mt-5">
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {draft.format === 'excel' ? <FileSpreadsheet size={13} /> : <FileText size={13} />}
              {t('reports.preview.attachmentPreview')}
            </h3>
            {draft.format === 'csv' ? (
              <pre className="max-h-72 overflow-auto rounded-xl border border-gray-200 bg-white p-4 font-mono text-xs leading-relaxed text-gray-800">
                {csv}
              </pre>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-gray-100 p-4">
                {draft.format === 'excel' && (
                  <div className="mb-2 flex gap-1 text-xs">
                    {[
                      t('reports.preview.summary'),
                      t('reports.preview.creatives'),
                      ...(content.campaigns.length ? [t('reports.preview.campaigns')] : []),
                      ...(content.daily ? [t('reports.preview.daily')] : []),
                    ].map((sheet) => (
                      <span
                        key={sheet}
                        className="rounded-t-md border border-b-0 border-gray-300 bg-white px-2.5 py-1 font-medium text-gray-600"
                      >
                        {sheet}
                      </span>
                    ))}
                  </div>
                )}
                <div className="space-y-5 rounded-md bg-white p-6 text-sm text-gray-800 shadow-sm">
                  <div>
                    <div className="text-base font-bold text-gray-900">{name}</div>
                    <div className="text-xs text-gray-500">
                      {scopeLabel} · {period}
                    </div>
                  </div>
                  <ReportBody content={content} />
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            {t('common.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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

function KpiRow({ content }: { content: ReportContent }) {
  const { t } = useI18n();
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {content.metrics.map((m) => (
        <div key={m} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
          <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
            {t(`metric.${m}.label`)}
          </div>
          <div className="tnum mt-0.5 text-lg font-bold text-gray-900">
            {formatReportValue(m, content.summary[m])}
          </div>
        </div>
      ))}
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section>
      <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
      {hint && <p className="mb-2 text-xs text-gray-500">{hint}</p>}
      {!hint && <div className="mb-2" />}
      {/* A wide table scrolls sideways inside the email instead of being cut off. */}
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

/** The report's tables: summary tiles, the (always present) creative split,
 *  campaigns for portfolio-level scopes, and the day-by-day breakdown. */
function ReportBody({ content }: { content: ReportContent }) {
  const { t } = useI18n();
  const { fmtDate } = useFormatters();
  const head =
    'border-b border-gray-200 px-3 py-1.5 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-500 first:text-left';
  const cellCls = 'border-b border-gray-100 px-3 py-1.5 text-right tnum first:text-left';
  const metricHeads = content.metrics.map((m) => (
    <th key={m} className={head}>
      {t(`metric.${m}.label`)}
    </th>
  ));

  return (
    <div className="space-y-5">
      {content.usedFallbackPeriod && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {t('reports.preview.fallbackPeriod')}
        </p>
      )}
      <KpiRow content={content} />

      <Section title={t('reports.preview.creatives')} hint={t('reports.preview.creativesHint')}>
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className={head}>{t('detail.col.creative')}</th>
              <th className={head}>{t('creatives.col.share')}</th>
              {metricHeads}
            </tr>
          </thead>
          <tbody>
            {content.creatives.map((c) => (
              <tr key={c.format}>
                <td className={`${cellCls} font-medium`}>{c.format}</td>
                <td className={cellCls}>{(c.share * 100).toFixed(0)}%</td>
                {content.metrics.map((m) => (
                  <td key={m} className={cellCls}>
                    {formatReportValue(m, c.values[m])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {content.campaigns.length > 0 && (
        <Section title={t('reports.preview.campaigns')}>
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className={head}>{t('campaigns.col.campaign')}</th>
                {metricHeads}
              </tr>
            </thead>
            <tbody>
              {content.campaigns.map((c) => (
                <tr key={c.id}>
                  <td className={`${cellCls} font-medium`}>{c.name}</td>
                  {content.metrics.map((m) => (
                    <td key={m} className={cellCls}>
                      {formatReportValue(m, c.values[m])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {content.daily && (
        <Section title={t('reports.preview.daily')}>
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className={head}>{t('daily.col.date')}</th>
                {metricHeads}
              </tr>
            </thead>
            <tbody>
              {content.daily.map((d) => (
                <tr key={d.date}>
                  <td className={`${cellCls} font-medium`}>{fmtDate(d.date)}</td>
                  {content.metrics.map((m) => (
                    <td key={m} className={cellCls}>
                      {formatReportValue(m, d.values[m])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}
    </div>
  );
}
