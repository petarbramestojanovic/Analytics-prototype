import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save } from 'lucide-react';
import type { EmailReportInput } from '@/api';
import { useI18n } from '@/i18n';
import { Checkbox, Tabs } from '@/components/ui';
import { FieldLabel, FieldMessage, FormModal, SelectField, StaticField, SwitchField, TextField } from '@/components/form';
import { useCampaigns } from '@/features/campaigns';
import { useAgencies, useCompanies } from '@/features/clients';
import type { EmailReport, ReportScope } from '@/types';
import { useCreateEmailReport, useUpdateEmailReport } from '@/api/hooks/useEmailReports';
import { REPORT_METRICS, reportMetrics, type ReportMetric } from '../lib/reportMetrics';
import { reportScopeName } from '../lib/reportScope';

function parseRecipients(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

const isValidRecipients = (value: string) =>
  parseRecipients(value).length > 0 && parseRecipients(value).every((email) => z.string().email().safeParse(email).success);

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri'] as const;
type ReportLevel = ReportScope['level'];

type FormValues = {
  level: ReportLevel;
  // Only the one matching `level` is actually read on submit — see the
  // per-level zod .refine calls below for which is required when.
  companyId: string;
  agencyId: string;
  campaignId: string;
  name: string;
  recipients: string;
  metrics: ReportMetric[];
  granularity: EmailReport['granularity'];
  cadence: EmailReport['cadence'];
  dayOfWeek: (typeof WEEKDAYS)[number];
  format: EmailReport['format'];
  enabled: boolean;
};

function toFormValues(
  report: EmailReport | undefined,
  fixedCompanyId: string | undefined,
  fixedAgencyId: string | undefined
): FormValues {
  if (report) {
    const { scope } = report;
    return {
      level: scope.level,
      companyId: scope.level === 'client' ? scope.companyId : '',
      agencyId: scope.level === 'agency' ? scope.agencyId : '',
      campaignId: scope.level === 'campaign' ? scope.campaignId : '',
      name: report.name,
      recipients: report.recipients.join(', '),
      metrics: reportMetrics(report),
      granularity: report.granularity,
      cadence: report.cadence,
      dayOfWeek: report.dayOfWeek ?? 'mon',
      format: report.format,
      enabled: report.enabled,
    };
  }
  return {
    level: fixedCompanyId ? 'client' : fixedAgencyId ? 'agency' : 'client',
    companyId: fixedCompanyId ?? '',
    agencyId: fixedAgencyId ?? '',
    campaignId: '',
    name: '',
    recipients: '',
    metrics: [],
    granularity: 'total',
    cadence: 'weekly',
    dayOfWeek: 'mon',
    format: 'email',
    enabled: true,
  };
}

/**
 * One modal, two modes: pass `report` to edit an existing one, omit it to
 * create a new one. Pass `companyId`/`companyName` when opened from a
 * client-scoped context, or `agencyId`/`agencyName` from an agency-scoped
 * one (at most one pair — a seat is scoped to one or the other, never
 * both); leave all four undefined for an internal user, who picks the
 * level and target freely.
 *
 * The zod schema is built per-render rather than colocated at module scope
 * (the usual convention here) because which target field is required
 * depends on the level picked and on whether a fixed scope was supplied —
 * there's no way to know that at module load time. Mirrors AlertRuleDialog's
 * scope handling (features/alerts AlertRuleScope).
 */
export function EmailReportModal({
  report,
  companyId: fixedCompanyId,
  companyName: fixedCompanyName,
  agencyId: fixedAgencyId,
  agencyName: fixedAgencyName,
  open,
  onOpenChange,
}: {
  report?: EmailReport;
  companyId?: string;
  companyName?: string;
  agencyId?: string;
  agencyName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const createReport = useCreateEmailReport();
  const updateReport = useUpdateEmailReport();
  const { data: companies } = useCompanies();
  const { data: agencies } = useAgencies();
  const { data: campaigns } = useCampaigns();

  // Scope is set once at creation and never reassigned after — same rule as
  // the old company-only picker had.
  const showScopePicker = !report;

  const availableLevels: readonly ReportLevel[] = fixedCompanyId
    ? (['client', 'campaign'] as const)
    : fixedAgencyId
      ? (['agency', 'campaign'] as const)
      : (['client', 'agency', 'campaign'] as const);

  const scopedCampaigns = (campaigns ?? []).filter(
    (c) => (!fixedCompanyId || c.companyId === fixedCompanyId) && (!fixedAgencyId || c.agencyId === fixedAgencyId)
  );

  const schema = z
    .object({
      level: z.enum(['client', 'agency', 'campaign']),
      companyId: z.string(),
      agencyId: z.string(),
      campaignId: z.string(),
      name: z.string().min(1, 'required'),
      recipients: z.string().min(1, 'required').refine(isValidRecipients, 'invalid'),
      metrics: z.array(z.enum([...REPORT_METRICS])).min(1, 'required'),
      granularity: z.enum(['total', 'daily']),
      cadence: z.enum(['daily', 'weekly', 'monthly']),
      dayOfWeek: z.enum(WEEKDAYS),
      format: z.enum(['excel', 'pdf', 'email']),
      enabled: z.boolean(),
    })
    .refine((v) => v.level !== 'client' || !!fixedCompanyId || !!v.companyId, { message: 'required', path: ['companyId'] })
    .refine((v) => v.level !== 'agency' || !!fixedAgencyId || !!v.agencyId, { message: 'required', path: ['agencyId'] })
    .refine((v) => v.level !== 'campaign' || !!v.campaignId, { message: 'required', path: ['campaignId'] });

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: toFormValues(report, fixedCompanyId, fixedAgencyId),
  });

  // Reset dirty/error state each time the modal opens, whether for a fresh
  // create or a different report's edit — not just when `report` changes,
  // since two consecutive "New report" opens share the same `undefined`.
  useEffect(() => {
    if (open) reset(toFormValues(report, fixedCompanyId, fixedAgencyId));
  }, [open, report?.id, fixedCompanyId, fixedAgencyId, reset]); // eslint-disable-line react-hooks/exhaustive-deps

  const level = watch('level');
  const cadence = watch('cadence');
  const mutation = report ? updateReport : createReport;

  const onSubmit = (values: FormValues) => {
    let scope: ReportScope;
    if (report) {
      scope = report.scope;
    } else if (values.level === 'client') {
      const companyId = fixedCompanyId ?? values.companyId;
      scope = { level: 'client', companyId, companyName: fixedCompanyName ?? companies?.find((c) => c.id === companyId)?.name ?? '' };
    } else if (values.level === 'agency') {
      const agencyId = fixedAgencyId ?? values.agencyId;
      scope = { level: 'agency', agencyId, agencyName: fixedAgencyName ?? agencies?.find((a) => a.id === agencyId)?.name ?? '' };
    } else {
      scope = {
        level: 'campaign',
        campaignId: values.campaignId,
        campaignName: campaigns?.find((c) => c.id === values.campaignId)?.name ?? '',
      };
    }

    const payload: EmailReportInput = {
      scope,
      name: values.name,
      recipients: parseRecipients(values.recipients),
      metrics: values.metrics,
      granularity: values.granularity,
      cadence: values.cadence,
      dayOfWeek: values.cadence === 'weekly' ? values.dayOfWeek : undefined,
      format: values.format,
      enabled: values.enabled,
    };

    if (report) {
      updateReport.mutate({ id: report.id, patch: payload }, { onSuccess: () => onOpenChange(false) });
    } else {
      createReport.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <FormModal
      open={open}
      onClose={() => onOpenChange(false)}
      title={report ? t('reports.email.editTitle') : t('reports.email.createTitle')}
      description={t('reports.emailHint')}
      onSubmit={handleSubmit(onSubmit)}
      submitLabel={t('common.save')}
      submitIcon={<Save size={13} />}
      pending={mutation.isPending}
      submitDisabled={!!report && !isDirty}
    >
      {report ? (
        <StaticField label={t('reports.email.level')}>
          {t(`reports.email.level.${report.scope.level}`)} · {reportScopeName(report.scope)}
        </StaticField>
      ) : (
        <div>
          <FieldLabel>{t('reports.email.level')}</FieldLabel>
          <Tabs
            fill
            size="lg"
            value={level}
            onChange={(v) => setValue('level', v, { shouldDirty: true })}
            options={availableLevels.map((l) => ({ value: l, label: t(`reports.email.level.${l}`) }))}
          />
        </div>
      )}

      {showScopePicker && level === 'client' && !fixedCompanyId && (
        <SelectField
          control={control}
          name="companyId"
          label={t('reports.email.company')}
          placeholder={t('reports.email.companyPlaceholder')}
          options={(companies ?? []).map((c) => ({ value: c.id, label: c.name }))}
          error={errors.companyId && t('common.required')}
        />
      )}

      {showScopePicker && level === 'agency' && !fixedAgencyId && (
        <SelectField
          control={control}
          name="agencyId"
          label={t('reports.email.agency')}
          placeholder={t('reports.email.agencyPlaceholder')}
          options={(agencies ?? []).map((a) => ({ value: a.id, label: a.name }))}
          error={errors.agencyId && t('common.required')}
        />
      )}

      {showScopePicker && level === 'campaign' && (
        <SelectField
          control={control}
          name="campaignId"
          label={t('reports.email.campaign')}
          placeholder={t('reports.email.campaignPlaceholder')}
          options={scopedCampaigns.map((c) => ({ value: c.id, label: `${c.name} — ${c.companyName}` }))}
          error={errors.campaignId && t('common.required')}
        />
      )}

      <TextField
        label={t('reports.email.name')}
        placeholder={t('reports.email.namePlaceholder')}
        error={errors.name && t('common.required')}
        {...register('name')}
      />

      <TextField
        label={t('reports.email.recipients')}
        placeholder={t('reports.email.recipientsPlaceholder')}
        error={errors.recipients && t('reports.email.invalidRecipients')}
        help={t('reports.email.recipientsHint')}
        {...register('recipients')}
      />

      <div>
        <FieldLabel>{t('reports.email.metrics')}</FieldLabel>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {REPORT_METRICS.map((m) => (
            <Checkbox
              key={m}
              value={m}
              label={t(`metric.${m}.label`)}
              className="items-center text-brame-dark dark:text-gray-200"
              {...register('metrics')}
            />
          ))}
        </div>
        <FieldMessage error={errors.metrics && t('reports.email.metricsRequired')} />
      </div>

      <SelectField
        control={control}
        name="granularity"
        label={t('reports.email.granularity')}
        options={[
          { value: 'total', label: t('reports.email.granularity.total') },
          { value: 'daily', label: t('reports.email.granularity.daily') },
        ]}
      />

      <div className="grid grid-cols-2 gap-4">
        <SelectField
          control={control}
          name="cadence"
          label={t('reports.email.cadence')}
          options={[
            { value: 'daily', label: t('reports.email.cadenceDaily') },
            { value: 'weekly', label: t('reports.email.cadenceWeekly') },
            { value: 'monthly', label: t('reports.email.cadenceMonthly') },
          ]}
        />

        <SelectField
          control={control}
          name="format"
          label={t('reports.email.format')}
          options={[
            { value: 'excel', label: t('reports.email.formatExcel') },
            { value: 'pdf', label: t('reports.email.formatPdf') },
            { value: 'email', label: t('reports.email.formatEmailBody') },
          ]}
        />
      </div>

      {/* Monthly is always "the 1st" and daily has no day to pick (see
          EmailReport's dayOfWeek doc comment) — this field only exists to
          disambiguate within a week. */}
      {cadence === 'weekly' && (
        <SelectField
          control={control}
          name="dayOfWeek"
          label={t('reports.email.dayOfWeek')}
          options={WEEKDAYS.map((d) => ({ value: d, label: t(`reports.email.day.${d}`) }))}
        />
      )}

      <SwitchField
        label={t('reports.email.scheduleEnabled')}
        hint={t('reports.email.scheduleHint')}
        checked={watch('enabled')}
        onChange={(v) => setValue('enabled', v, { shouldDirty: true })}
      />
    </FormModal>
  );
}
