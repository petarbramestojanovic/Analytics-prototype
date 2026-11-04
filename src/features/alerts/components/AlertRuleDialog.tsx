import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { RotateCcw, Save } from 'lucide-react';
import { useI18n } from '@/i18n';
import { Avatar, Button, Checkbox, Tabs } from '@/components/ui';
import {
  FieldLabel,
  FormModal,
  SearchSelectField,
  SelectField,
  StaticField,
  SwitchField,
  TextField,
} from '@/components/form';
import { useCampaigns } from '@/features/campaigns';
import { useCompanies } from '@/features/clients';
import { useSeatMembers, useSeats } from '@/features/seats';
import type { MetricKey } from '@/types';
import { useAlertRules } from '../alertRulesContext';
import { isInternalSeat, resolveNotify } from '../lib/notify';
import { comparableMetrics, metricUnit, RULE_METRICS } from '../lib/ruleEngine';
import { ruleCondition, ruleDisplayName } from '../lib/ruleText';
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
  /** The second metric of a metric-vs-metric rule. */
  otherMetric: string;
  /** Each type's one number: a divergence/trend/decline threshold, a
   *  points-per-day drop or a share limit in percent, or a value limit in the
   *  metric's own unit. Unused (but kept valid) for metric-vs-metric. */
  thresholdPercent: number;
  direction: 'drop' | 'rise';
  comparison: 'below' | 'above';
  /** The device bucket a device-share rule watches. */
  device: 'mobile' | 'desktop';
  declineMode: 'absolute' | 'relative';
  windowDays: number;
  scopeLevel: ScopeLevel;
  scopeCompanyId: string;
  scopeCampaignId: string;
  /** Who gets an inbox item: whole seats, and single members. */
  notifySeatIds: string[];
  notifyMemberIds: string[];
  enabled: boolean;
}

const RULE_TYPES = [
  'metricTrend',
  'valueThreshold',
  'startDecline',
  'metricBelowMetric',
  'consecutiveDrop',
  'deviceShare',
  'sourceDivergence',
] as const;

/** A sensible starting number when the type changes, in the form's units. */
const TYPE_DEFAULT: Record<RuleType, number> = {
  sourceDivergence: 5,
  metricTrend: 5,
  valueThreshold: 70,
  startDecline: 8,
  metricBelowMetric: 5,
  consecutiveDrop: 1,
  deviceShare: 50,
};

/** A fixed limit is typed as a percentage for a rate, and as it is for
 *  seconds or a count. */
const limitIsPercent = (metric: string) => metricUnit(metric as MetricKey) === 'rate';
const roundTenth = (n: number) => Math.round(n * 10) / 10;

/** The metric a metric-vs-metric rule compares with: kept if it still shares
 *  the metric's unit, else the first that does. */
function otherFor(metric: string, current: string): string {
  const options = comparableMetrics(metric as MetricKey);
  return options.includes(current as MetricKey) ? current : (options[0] ?? current);
}

/** The rule's one headline number, in the form field's units. */
function toFieldValue(rule: AlertRule): number {
  switch (rule.type) {
    case 'valueThreshold':
      return limitIsPercent(rule.metric) ? roundTenth(rule.limit * 100) : rule.limit;
    case 'metricBelowMetric':
      return 5;
    case 'consecutiveDrop':
      return roundTenth(rule.dropPct * 100);
    case 'deviceShare':
      return roundTenth(rule.limitPct * 100);
    default:
      return roundTenth(rule.thresholdPct * 100);
  }
}

function toFormValues(rule: AlertRule | undefined, defaultSeatIds: string[]): FormValues {
  if (rule) {
    return {
      name: rule.name,
      type: rule.type,
      metric: rule.metric,
      otherMetric: rule.type === 'metricBelowMetric' ? rule.otherMetric : 'ctr',
      thresholdPercent: toFieldValue(rule),
      direction: rule.type === 'metricTrend' ? rule.direction : 'drop',
      comparison: rule.type === 'valueThreshold' || rule.type === 'deviceShare' ? rule.comparison : 'below',
      device: rule.type === 'deviceShare' ? rule.device : 'mobile',
      declineMode: rule.type === 'startDecline' ? rule.mode : 'relative',
      windowDays: rule.type === 'metricTrend' ? rule.windowDays : rule.type === 'consecutiveDrop' ? rule.days : 5,
      scopeLevel: rule.scope.level,
      scopeCompanyId: rule.scope.level === 'company' ? rule.scope.companyId : '',
      scopeCampaignId: rule.scope.level === 'campaign' ? rule.scope.campaignId : '',
      notifySeatIds: rule.notify?.seatIds ?? defaultSeatIds,
      notifyMemberIds: rule.notify?.memberIds ?? [],
      enabled: rule.enabled,
    };
  }
  return {
    name: '',
    type: 'metricTrend',
    metric: 'engagementRate',
    otherMetric: 'ctr',
    thresholdPercent: 5,
    direction: 'drop',
    comparison: 'below',
    device: 'mobile',
    declineMode: 'relative',
    windowDays: 5,
    scopeLevel: 'portfolio',
    scopeCompanyId: '',
    scopeCampaignId: '',
    notifySeatIds: defaultSeatIds,
    notifyMemberIds: [],
    enabled: true,
  };
}

const schema = z
  .object({
    name: z.string().min(1, 'required'),
    type: z.enum(RULE_TYPES),
    metric: z.string().min(1, 'required'),
    otherMetric: z.string().min(1, 'required'),
    thresholdPercent: z.number({ error: 'required' }).positive('required'),
    direction: z.enum(['drop', 'rise']),
    comparison: z.enum(['below', 'above']),
    device: z.enum(['mobile', 'desktop']),
    declineMode: z.enum(['absolute', 'relative']),
    windowDays: z.number({ error: 'required' }).int().min(1).max(90),
    scopeLevel: z.enum(['portfolio', 'company', 'campaign']),
    scopeCompanyId: z.string(),
    scopeCampaignId: z.string(),
    notifySeatIds: z.array(z.string()),
    notifyMemberIds: z.array(z.string()),
    enabled: z.boolean(),
  })
  .refine((v) => v.type !== 'metricBelowMetric' || v.metric !== v.otherMetric, {
    message: 'same',
    path: ['otherMetric'],
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
  const { addRule, updateRule, resetRule, isModified } = useAlertRules();
  const { data: companies } = useCompanies();
  const { data: campaigns } = useCampaigns();
  const { data: seats = [] } = useSeats();
  const { data: members = [] } = useSeatMembers();
  const internalSeats = seats.filter(isInternalSeat);
  const defaultSeatIds = resolveNotify(undefined, seats).seatIds;

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
    values: toFormValues(rule, defaultSeatIds),
  });

  useEffect(() => {
    if (open) reset(toFormValues(rule, defaultSeatIds));
  }, [open, rule?.id, seats.length, reset]); // eslint-disable-line react-hooks/exhaustive-deps

  const type = watch('type');
  const scopeLevel = watch('scopeLevel');
  const metricOptions = RULE_METRICS[type];
  const declineMode = watch('declineMode');
  const builtIn = !!rule?.builtInKey;

  const toggle = (field: 'notifySeatIds' | 'notifyMemberIds', id: string, on: boolean) => {
    const current = watch(field);
    setValue(field, on ? [...new Set([...current, id])] : current.filter((x) => x !== id), {
      shouldDirty: true,
    });
  };

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

    const metric = (values.type === 'deviceShare' ? 'impressions' : values.metric) as MetricKey;
    const base = {
      name: values.name,
      enabled: values.enabled,
      metric,
      scope,
      notify: { seatIds: values.notifySeatIds, memberIds: values.notifyMemberIds },
    };
    const pct = values.thresholdPercent / 100;
    let input: AlertRuleInput;
    switch (values.type) {
      case 'sourceDivergence':
        input = { ...base, type: 'sourceDivergence', thresholdPct: pct };
        break;
      case 'metricTrend':
        input = {
          ...base,
          type: 'metricTrend',
          thresholdPct: pct,
          direction: values.direction,
          windowDays: values.windowDays,
        };
        break;
      case 'valueThreshold':
        input = {
          ...base,
          type: 'valueThreshold',
          comparison: values.comparison,
          limit: limitIsPercent(values.metric) ? pct : values.thresholdPercent,
        };
        break;
      case 'startDecline':
        input = { ...base, type: 'startDecline', mode: values.declineMode, thresholdPct: pct };
        break;
      case 'metricBelowMetric':
        input = {
          ...base,
          type: 'metricBelowMetric',
          otherMetric: values.otherMetric as MetricKey,
        };
        break;
      case 'consecutiveDrop':
        input = { ...base, type: 'consecutiveDrop', dropPct: pct, days: values.windowDays };
        break;
      case 'deviceShare':
        input = {
          ...base,
          type: 'deviceShare',
          device: values.device,
          comparison: values.comparison,
          limitPct: pct,
        };
        break;
    }

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
      wide
      footerStart={
        builtIn && rule && isModified(rule.id) ? (
          <Button
            type="button"
            icon={<RotateCcw size={13} />}
            onClick={() => {
              resetRule(rule.id);
              onOpenChange(false);
            }}
          >
            {t('alerts.rules.reset')}
          </Button>
        ) : undefined
      }
    >
      {/* Two columns on a wide screen — what the rule checks on the left, where it
          applies and who hears about it on the right — so the form fits without
          scrolling. */}
      <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
        <div className="space-y-4">
          {builtIn && rule ? (
            <>
              <StaticField label={t('alerts.rules.name')}>
                {ruleDisplayName(rule, rule.name, t)}
              </StaticField>
              <StaticField label={t('alerts.rules.builtInCheck')}>
                {ruleCondition(rule, t)}
              </StaticField>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('alerts.rules.builtInHint')}
              </p>
            </>
          ) : (
            <>
              <TextField
                label={t('alerts.rules.name')}
                placeholder={t('alerts.rules.namePlaceholder')}
                error={errors.name && t('common.required')}
                {...register('name')}
              />

              <SelectField
                control={control}
                name="type"
                label={t('alerts.rules.type')}
                options={RULE_TYPES.map((value) => ({
                  value,
                  label: t(`alerts.rules.type.${value}`),
                }))}
                onValueChange={(v) => {
                  const next = v as RuleType;
                  let metric = watch('metric');
                  if (!RULE_METRICS[next].includes(metric as MetricKey)) {
                    metric = RULE_METRICS[next][0];
                    setValue('metric', metric, { shouldDirty: true });
                  }
                  if (next === 'metricBelowMetric') {
                    setValue('otherMetric', otherFor(metric, watch('otherMetric')), { shouldDirty: true });
                  }
                  setValue('thresholdPercent', TYPE_DEFAULT[next], { shouldDirty: true });
                }}
              />
              <p className="-mt-2 text-xs text-gray-500 dark:text-gray-400">
                {t(`alerts.rules.typeHint.${type}`)}
              </p>

              {type === 'deviceShare' ? (
                <SelectField
                  control={control}
                  name="device"
                  label={t('alerts.rules.device')}
                  options={[
                    { value: 'mobile', label: t('detail.deviceTab.mobile') },
                    { value: 'desktop', label: t('detail.deviceTab.desktop') },
                  ]}
                />
              ) : (
                <SelectField
                  control={control}
                  name="metric"
                  label={t('alerts.rules.metric')}
                  options={metricOptions.map((m) => ({ value: m, label: t(`metric.${m}.label`) }))}
                  onValueChange={(m) => {
                    if (type === 'metricBelowMetric') {
                      setValue('otherMetric', otherFor(m, watch('otherMetric')), { shouldDirty: true });
                    }
                  }}
                  error={errors.metric && t('common.required')}
                />
              )}

              {type === 'metricBelowMetric' && (
                <SelectField
                  // Remount when the KPI changes: the options differ per unit, and the
                  // select would otherwise show nothing for the freshly picked one.
                  key={watch('metric')}
                  control={control}
                  name="otherMetric"
                  label={t('alerts.rules.otherMetric')}
                  options={comparableMetrics(watch('metric') as MetricKey).map((m) => ({
                    value: m,
                    label: t(`metric.${m}.label`),
                  }))}
                  error={errors.otherMetric && t('alerts.rules.sameMetric')}
                />
              )}
            </>
          )}

          {type !== 'metricBelowMetric' && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
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

              {!builtIn && (type === 'valueThreshold' || type === 'deviceShare') && (
                <SelectField
                  control={control}
                  name="comparison"
                  label={t('alerts.rules.comparison')}
                  options={[
                    { value: 'below', label: t('alerts.rules.comparison.below') },
                    { value: 'above', label: t('alerts.rules.comparison.above') },
                  ]}
                />
              )}

              {!builtIn && type === 'startDecline' && (
                <SelectField
                  control={control}
                  name="declineMode"
                  label={t('alerts.rules.declineMode')}
                  options={[
                    { value: 'relative', label: t('alerts.rules.declineMode.relative') },
                    { value: 'absolute', label: t('alerts.rules.declineMode.absolute') },
                  ]}
                />
              )}

              <TextField
                type="number"
                min={0}
                max={type === 'valueThreshold' && !limitIsPercent(watch('metric')) ? undefined : 100}
                // Any decimal: a CTR limit is naturally 1.25, and a fixed step would
                // make the browser block the form on such a value.
                step="any"
                label={
                  type === 'valueThreshold'
                    ? t(`alerts.rules.limit.${metricUnit(watch('metric') as MetricKey)}`)
                    : type === 'deviceShare'
                      ? t('alerts.rules.limit.rate')
                      : type === 'consecutiveDrop'
                        ? t('alerts.rules.dropPerDay')
                        : type === 'startDecline' && declineMode === 'absolute'
                          ? t('alerts.rules.thresholdPp')
                          : t('alerts.rules.threshold')
                }
                error={errors.thresholdPercent && t('common.required')}
                {...register('thresholdPercent', { valueAsNumber: true })}
              />

              {(type === 'metricTrend' || type === 'consecutiveDrop') && (
                <TextField
                  type="number"
                  min={1}
                  max={90}
                  step={1}
                  label={t(type === 'consecutiveDrop' ? 'alerts.rules.inARow' : 'alerts.rules.windowDays')}
                  error={errors.windowDays && t('common.required')}
                  {...register('windowDays', { valueAsNumber: true })}
                />
              )}
            </div>
          )}
        </div>
        <div className="space-y-4">
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
              placeholder={t('alerts.rules.companyPlaceholder')}
              options={(companies ?? []).map((c) => ({ value: c.id, label: c.name }))}
              error={errors.scopeCompanyId && t('common.required')}
            />
          )}

          {scopeLevel === 'campaign' && (
            <SearchSelectField
              control={control}
              name="scopeCampaignId"
              label={t('alerts.rules.campaign')}
              placeholder={t('alerts.rules.campaignPlaceholder')}
              options={(campaigns ?? []).map((c) => ({
                value: c.id,
                label: c.name,
                description: c.companyName,
              }))}
              error={errors.scopeCampaignId && t('common.required')}
            />
          )}

          <div>
            <FieldLabel>{t('alerts.notify.title')}</FieldLabel>
            <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
              {t('alerts.notify.hint')}
            </p>
            <div className="space-y-1.5 rounded-xl border border-gray-200 p-3 dark:border-white/10">
              {internalSeats.map((seat) => (
                <Checkbox
                  key={seat.id}
                  checked={watch('notifySeatIds').includes(seat.id)}
                  onChange={(e) => toggle('notifySeatIds', seat.id, e.target.checked)}
                  className="items-center text-brame-dark dark:text-gray-200"
                  label={
                    <span>
                      {seat.name}{' '}
                      <span className="text-gray-400 dark:text-gray-500">
                        · {t('alerts.notify.wholeSeat')}
                      </span>
                    </span>
                  }
                />
              ))}
              {members
                .filter(
                  (m) => m.status === 'accepted' && internalSeats.some((s) => s.id === m.seatId),
                )
                .map((member) => (
                  <Checkbox
                    key={member.id}
                    checked={watch('notifyMemberIds').includes(member.id)}
                    onChange={(e) => toggle('notifyMemberIds', member.id, e.target.checked)}
                    className="items-center text-brame-dark dark:text-gray-200"
                    label={
                      <span className="inline-flex items-center gap-2">
                        <Avatar name={member.name} size={20} />
                        {member.name}
                        <span className="text-gray-400 dark:text-gray-500">
                          · {seats.find((s) => s.id === member.seatId)?.name}
                        </span>
                      </span>
                    }
                  />
                ))}
            </div>
            {watch('notifySeatIds').length + watch('notifyMemberIds').length === 0 && (
              <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-300">
                {t('alerts.notify.nobodyWarning')}
              </p>
            )}
          </div>

          <SwitchField
            label={t('alerts.rules.enabled')}
            checked={watch('enabled')}
            onChange={(v) => setValue('enabled', v, { shouldDirty: true })}
          />
        </div>
      </div>
    </FormModal>
  );
}
