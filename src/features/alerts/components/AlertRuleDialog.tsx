import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save } from 'lucide-react';
import { useI18n } from '@/i18n';
import { Tabs } from '@/components/ui';
import { FieldLabel, FormModal, SelectField, SwitchField, TextField } from '@/components/form';
import { useCampaigns } from '@/features/campaigns';
import { useCompanies } from '@/features/clients';
import type { MetricKey } from '@/types';
import { useAlertRules } from '../alertRulesContext';
import { RULE_METRICS } from '../lib/ruleEngine';
import type { AlertRule, AlertRuleInput, AlertRuleScope } from '../types';

type RuleType = AlertRule['type'];
type ScopeLevel = AlertRuleScope['level'];

interface FormValues {
  name: string;
  type: RuleType;
  // string rather than MetricKey: the zod schema below only validates
  // non-emptiness (the actual options are already constrained by the
  // Select), and keeping it a plain string sidesteps any variance mismatch
  // between the schema's inferred type and this form's type.
  metric: string;
  thresholdPercent: number;
  direction: 'drop' | 'rise';
  windowDays: number;
  scopeLevel: ScopeLevel;
  scopeCompanyId: string;
  scopeCampaignId: string;
  enabled: boolean;
}

function toFormValues(rule: AlertRule | undefined): FormValues {
  if (rule) {
    return {
      name: rule.name,
      type: rule.type,
      metric: rule.metric,
      thresholdPercent: Math.round(rule.thresholdPct * 1000) / 10,
      direction: rule.type === 'metricTrend' ? rule.direction : 'drop',
      windowDays: rule.type === 'metricTrend' ? rule.windowDays : 5,
      scopeLevel: rule.scope.level,
      scopeCompanyId: rule.scope.level === 'company' ? rule.scope.companyId : '',
      scopeCampaignId: rule.scope.level === 'campaign' ? rule.scope.campaignId : '',
      enabled: rule.enabled,
    };
  }
  return {
    name: '',
    type: 'metricTrend',
    metric: 'engagementRate',
    thresholdPercent: 5,
    direction: 'drop',
    windowDays: 5,
    scopeLevel: 'portfolio',
    scopeCompanyId: '',
    scopeCampaignId: '',
    enabled: true,
  };
}

const schema = z
  .object({
    name: z.string().min(1, 'required'),
    type: z.enum(['sourceDivergence', 'metricTrend']),
    metric: z.string().min(1, 'required'),
    thresholdPercent: z.number({ error: 'required' }).positive('required'),
    direction: z.enum(['drop', 'rise']),
    windowDays: z.number({ error: 'required' }).int().min(1).max(90),
    scopeLevel: z.enum(['portfolio', 'company', 'campaign']),
    scopeCompanyId: z.string(),
    scopeCampaignId: z.string(),
    enabled: z.boolean(),
  })
  .refine((v) => v.scopeLevel !== 'company' || !!v.scopeCompanyId, {
    message: 'required',
    path: ['scopeCompanyId'],
  })
  .refine((v) => v.scopeLevel !== 'campaign' || !!v.scopeCampaignId, {
    message: 'required',
    path: ['scopeCampaignId'],
  });

/**
 * One dialog, two modes: pass `rule` to edit an existing one, omit it to
 * create a new one — same convention as EmailReportModal.
 */
export function AlertRuleDialog({
  rule,
  open,
  onOpenChange,
}: {
  rule?: AlertRule;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const { addRule, updateRule } = useAlertRules();
  const { data: companies } = useCompanies();
  const { data: campaigns } = useCampaigns();

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: toFormValues(rule),
  });

  useEffect(() => {
    if (open) reset(toFormValues(rule));
  }, [open, rule?.id, reset]); // eslint-disable-line react-hooks/exhaustive-deps

  const type = watch('type');
  const scopeLevel = watch('scopeLevel');
  const metricOptions = RULE_METRICS[type];

  const onSubmit = (values: FormValues) => {
    const scope: AlertRuleScope =
      values.scopeLevel === 'portfolio'
        ? { level: 'portfolio' }
        : values.scopeLevel === 'company'
          ? {
              level: 'company',
              companyId: values.scopeCompanyId,
              companyName: companies?.find((c) => c.id === values.scopeCompanyId)?.name ?? '',
            }
          : {
              level: 'campaign',
              campaignId: values.scopeCampaignId,
              campaignName: campaigns?.find((c) => c.id === values.scopeCampaignId)?.name ?? '',
            };

    const metric = values.metric as MetricKey;
    const input: AlertRuleInput =
      values.type === 'sourceDivergence'
        ? {
            type: 'sourceDivergence',
            name: values.name,
            enabled: values.enabled,
            metric,
            scope,
            thresholdPct: values.thresholdPercent / 100,
          }
        : {
            type: 'metricTrend',
            name: values.name,
            enabled: values.enabled,
            metric,
            scope,
            thresholdPct: values.thresholdPercent / 100,
            direction: values.direction,
            windowDays: values.windowDays,
          };

    if (rule) updateRule(rule.id, input);
    else addRule(input);
    onOpenChange(false);
  };

  return (
    <FormModal
      open={open}
      onClose={() => onOpenChange(false)}
      title={rule ? t('alerts.rules.editTitle') : t('alerts.rules.createTitle')}
      description={t('alerts.rules.dialogHint')}
      onSubmit={handleSubmit(onSubmit)}
      submitLabel={t('common.save')}
      submitIcon={<Save size={13} />}
      pending={isSubmitting}
      submitDisabled={!!rule && !isDirty}
    >
      <TextField
        label={t('alerts.rules.name')}
        placeholder={t('alerts.rules.namePlaceholder')}
        error={errors.name && t('common.required')}
        {...register('name')}
      />

      <div>
        <FieldLabel>{t('alerts.rules.type')}</FieldLabel>
        <Tabs
          fill
          size="lg"
          value={type}
          onChange={(v) => {
            setValue('type', v, { shouldDirty: true });
            if (!RULE_METRICS[v].includes(watch('metric') as MetricKey)) {
              setValue('metric', 'engagementRate', { shouldDirty: true });
            }
          }}
          options={[
            { value: 'sourceDivergence', label: t('alerts.rules.type.sourceDivergence') },
            { value: 'metricTrend', label: t('alerts.rules.type.metricTrend') },
          ]}
        />
      </div>

      <SelectField
        control={control}
        name="metric"
        label={t('alerts.rules.metric')}
        options={metricOptions.map((m) => ({ value: m, label: t(`metric.${m}.label`) }))}
        error={errors.metric && t('common.required')}
      />

      <div className="grid grid-cols-2 gap-4">
        {type === 'metricTrend' && (
          <SelectField
            control={control}
            name="direction"
            label={t('alerts.rules.direction')}
            options={[
              { value: 'drop', label: t('alerts.rules.direction.drop') },
              { value: 'rise', label: t('alerts.rules.direction.rise') },
            ]}
          />
        )}

        <TextField
          type="number"
          min={0}
          max={100}
          step={0.5}
          label={t('alerts.rules.threshold')}
          error={errors.thresholdPercent && t('common.required')}
          {...register('thresholdPercent', { valueAsNumber: true })}
        />

        {type === 'metricTrend' && (
          <TextField
            type="number"
            min={1}
            max={90}
            step={1}
            label={t('alerts.rules.windowDays')}
            error={errors.windowDays && t('common.required')}
            {...register('windowDays', { valueAsNumber: true })}
          />
        )}
      </div>

      <div>
        <FieldLabel>{t('alerts.rules.scope')}</FieldLabel>
        <Tabs
          fill
          size="lg"
          value={scopeLevel}
          onChange={(v) => setValue('scopeLevel', v, { shouldDirty: true })}
          options={[
            { value: 'portfolio', label: t('alerts.rules.scope.portfolio') },
            { value: 'company', label: t('alerts.rules.scope.company') },
            { value: 'campaign', label: t('alerts.rules.scope.campaign') },
          ]}
        />
      </div>

      {scopeLevel === 'company' && (
        <SelectField
          control={control}
          name="scopeCompanyId"
          label={t('alerts.rules.company')}
          placeholder={t('reports.filter.allClients')}
          options={(companies ?? []).map((c) => ({ value: c.id, label: c.name }))}
          error={errors.scopeCompanyId && t('common.required')}
        />
      )}

      {scopeLevel === 'campaign' && (
        <SelectField
          control={control}
          name="scopeCampaignId"
          label={t('alerts.rules.campaign')}
          options={(campaigns ?? []).map((c) => ({ value: c.id, label: `${c.name} — ${c.companyName}` }))}
          error={errors.scopeCampaignId && t('common.required')}
        />
      )}

      <SwitchField
        label={t('alerts.rules.enabled')}
        checked={watch('enabled')}
        onChange={(v) => setValue('enabled', v, { shouldDirty: true })}
      />
    </FormModal>
  );
}
