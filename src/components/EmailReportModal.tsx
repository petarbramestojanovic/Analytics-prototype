import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save } from 'lucide-react';
import type { EmailReport } from '../mock/types';
import type { EmailReportInput } from '../mock/store';
import { useCreateEmailReport, useUpdateEmailReport } from '../hooks/useEmailReports';
import { useCompanies } from '../hooks/useCompanies';
import { useI18n } from '../lib/i18n';
import { REPORT_METRICS, type ReportMetric } from '../lib/reportMetrics';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger } from './ui/select';
import { Button } from './primitives';
import { Field } from '../views/auth/fields';

function parseRecipients(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

const isValidRecipients = (value: string) =>
  parseRecipients(value).length > 0 && parseRecipients(value).every((email) => z.string().email().safeParse(email).success);

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri'] as const;

type FormValues = {
  // Optional because the zod schema only requires it when the company picker
  // is shown (see the dynamic schema below) — required-when-shown, not always.
  companyId: string | undefined;
  name: string;
  recipients: string;
  metrics: ReportMetric[];
  cadence: EmailReport['cadence'];
  dayOfWeek: (typeof WEEKDAYS)[number];
  format: EmailReport['format'];
};

function toFormValues(report: EmailReport | undefined, fixedCompanyId: string | undefined): FormValues {
  if (report) {
    return {
      companyId: report.companyId,
      name: report.name,
      recipients: report.recipients.join(', '),
      metrics: report.metrics.filter((m): m is ReportMetric => REPORT_METRICS.some((rm) => rm === m)),
      cadence: report.cadence,
      dayOfWeek: report.dayOfWeek ?? 'mon',
      format: report.format,
    };
  }
  return {
    companyId: fixedCompanyId ?? '',
    name: '',
    recipients: '',
    metrics: [],
    cadence: 'weekly',
    dayOfWeek: 'mon',
    format: 'emailBody',
  };
}

/**
 * One modal, two modes: pass `report` to edit an existing one, omit it to
 * create a new one. Pass `companyId`/`companyName` when opened from a
 * company-scoped context (a company_user manages their own reports); leave
 * both undefined for an internal user, who picks the client via `useCompanies()`.
 *
 * The zod schema is built per-render rather than colocated at module scope
 * (the usual convention here) because whether `companyId` is required depends
 * on whether a fixed company was supplied — there's no way to know that at
 * module load time.
 */
export default function EmailReportModal({
  report,
  companyId: fixedCompanyId,
  companyName: fixedCompanyName,
  open,
  onOpenChange,
}: {
  report?: EmailReport;
  companyId?: string;
  companyName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const createReport = useCreateEmailReport();
  const updateReport = useUpdateEmailReport();
  const { data: companies } = useCompanies();

  // Only relevant when creating — editing never reassigns a report's company.
  const showCompanyPicker = !report && !fixedCompanyId;

  const schema = z.object({
    companyId: showCompanyPicker ? z.string().min(1, 'required') : z.string().optional(),
    name: z.string().min(1, 'required'),
    recipients: z.string().min(1, 'required').refine(isValidRecipients, 'invalid'),
    metrics: z.array(z.enum([...REPORT_METRICS])).min(1, 'required'),
    cadence: z.enum(['weekly', 'monthly']),
    dayOfWeek: z.enum(WEEKDAYS),
    format: z.enum(['pdf', 'emailBody']),
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: toFormValues(report, fixedCompanyId),
  });

  // Reset dirty/error state each time the modal opens, whether for a fresh
  // create or a different report's edit — not just when `report` changes,
  // since two consecutive "New report" opens share the same `undefined`.
  useEffect(() => {
    if (open) reset(toFormValues(report, fixedCompanyId));
  }, [open, report?.id, fixedCompanyId, reset]); // eslint-disable-line react-hooks/exhaustive-deps

  const cadence = watch('cadence');
  const mutation = report ? updateReport : createReport;

  const onSubmit = (values: FormValues) => {
    const companyId = showCompanyPicker ? (values.companyId ?? '') : (fixedCompanyId ?? report!.companyId);
    const companyName = showCompanyPicker
      ? (companies?.find((c) => c.id === companyId)?.name ?? '')
      : (fixedCompanyName ?? report!.companyName);

    const payload: EmailReportInput = {
      companyId,
      companyName,
      name: values.name,
      recipients: parseRecipients(values.recipients),
      metrics: values.metrics,
      cadence: values.cadence,
      dayOfWeek: values.cadence === 'weekly' ? values.dayOfWeek : undefined,
      format: values.format,
    };

    if (report) {
      updateReport.mutate({ id: report.id, patch: payload }, { onSuccess: () => onOpenChange(false) });
    } else {
      createReport.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{report ? t('reports.email.editTitle') : t('reports.email.createTitle')}</DialogTitle>
          <DialogDescription>{t('reports.emailHint')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {showCompanyPicker && (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-brame-dark dark:text-gray-200">
                {t('reports.email.company')}
              </span>
              <Controller
                control={control}
                name="companyId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger placeholder={t('reports.filter.allClients')} />
                    <SelectContent>
                      {companies?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.companyId && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{t('common.required')}</p>
              )}
            </label>
          )}

          <div>
            <Field
              label={t('reports.email.name')}
              placeholder={t('reports.email.namePlaceholder')}
              {...register('name')}
            />
            {errors.name && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{t('common.required')}</p>}
          </div>

          <div>
            <Field
              label={t('reports.email.recipients')}
              placeholder={t('reports.email.recipientsPlaceholder')}
              {...register('recipients')}
            />
            {errors.recipients ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{t('reports.email.invalidRecipients')}</p>
            ) : (
              <span className="mt-1 block text-xs text-gray-400 dark:text-gray-500">
                {t('reports.email.recipientsHint')}
              </span>
            )}
          </div>

          <div>
            <span className="mb-1.5 block text-sm font-medium text-brame-dark dark:text-gray-200">
              {t('reports.email.metrics')}
            </span>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {REPORT_METRICS.map((m) => (
                <label key={m} className="inline-flex items-center gap-2 text-sm text-brame-dark dark:text-gray-200">
                  <input
                    type="checkbox"
                    value={m}
                    {...register('metrics')}
                    className="h-4 w-4 rounded border-gray-300 text-brame-teal focus:ring-brame-teal dark:border-white/20 dark:bg-brame-dark-light"
                  />
                  {t(`metric.${m}.label`)}
                </label>
              ))}
            </div>
            {errors.metrics && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{t('reports.email.metricsRequired')}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-brame-dark dark:text-gray-200">
                {t('reports.email.cadence')}
              </span>
              <Controller
                control={control}
                name="cadence"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger />
                    <SelectContent>
                      <SelectItem value="weekly">{t('reports.email.cadenceWeekly')}</SelectItem>
                      <SelectItem value="monthly">{t('reports.email.cadenceMonthly')}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-brame-dark dark:text-gray-200">
                {t('reports.email.format')}
              </span>
              <Controller
                control={control}
                name="format"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger />
                    <SelectContent>
                      <SelectItem value="pdf">{t('reports.email.formatPdf')}</SelectItem>
                      <SelectItem value="emailBody">{t('reports.email.formatEmailBody')}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </label>
          </div>

          {/* Monthly is always "the 1st" (see EmailReport's dayOfWeek doc
              comment) — this field only exists to disambiguate within a week. */}
          {cadence === 'weekly' && (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-brame-dark dark:text-gray-200">
                {t('reports.email.dayOfWeek')}
              </span>
              <Controller
                control={control}
                name="dayOfWeek"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger />
                    <SelectContent>
                      {WEEKDAYS.map((d) => (
                        <SelectItem key={d} value={d}>
                          {t(`reports.email.day.${d}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </label>
          )}

          <DialogFooter>
            <Button variant="secondary" type="button" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              icon={<Save size={13} />}
              disabled={(!!report && !isDirty) || mutation.isPending}
            >
              {mutation.isPending ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
