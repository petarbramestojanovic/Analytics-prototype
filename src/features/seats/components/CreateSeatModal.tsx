import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import { useI18n } from '@/i18n';
import { FieldMessage, FormModal, SelectField, StaticField } from '@/components/form';
import { useAgencies, useCompanies } from '@/features/clients';
import { useCreateSeat, useSeats } from '@/api/hooks/useSeats';

const schema = z.object({
  category: z.enum(['agency', 'client']),
  entityId: z.string().min(1, 'required'),
});

type FormValues = z.infer<typeof schema>;

const defaultValues: FormValues = { category: 'client', entityId: '' };

/**
 * Agencies and clients themselves are never created here — they live in
 * Salesforce and arrive through the sync, same as campaigns. This only ever
 * links a seat to one already pulled in, so it's a picker over the ones that
 * don't have a seat yet, never a free-text "type a name" field.
 */
export function CreateSeatModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (seatId: string) => void;
}) {
  const { t } = useI18n();
  const createSeat = useCreateSeat();
  const { data: seats } = useSeats();
  const { data: agencies } = useAgencies();
  const { data: companies } = useCompanies();

  const eligibleAgencies = useMemo(
    () => (agencies ?? []).filter((a) => !(seats ?? []).some((s) => s.category === 'agency' && s.agencyId === a.id)),
    [agencies, seats]
  );
  const eligibleCompanies = useMemo(
    () => (companies ?? []).filter((c) => !(seats ?? []).some((s) => s.category === 'client' && s.companyId === c.id)),
    [companies, seats]
  );

  const {
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const category = watch('category');
  const isAgency = category === 'agency';
  const options = isAgency ? eligibleAgencies : eligibleCompanies;

  const close = () => {
    onOpenChange(false);
    reset(defaultValues);
  };

  const onSubmit = (values: FormValues) => {
    const input =
      values.category === 'agency'
        ? ({ category: 'agency', agencyId: values.entityId } as const)
        : ({ category: 'client', companyId: values.entityId } as const);
    createSeat.mutate(input, {
      onSuccess: (seat) => {
        close();
        onCreated(seat.id);
      },
    });
  };

  return (
    <FormModal
      open={open}
      onClose={close}
      title={t('seats.create.title')}
      description={t('seats.create.subtitle')}
      onSubmit={handleSubmit(onSubmit)}
      submitLabel={t('seats.create.submit')}
      submitIcon={<Plus size={13} />}
      pending={createSeat.isPending}
      submitDisabled={options.length === 0}
    >
      <SelectField
        control={control}
        name="category"
        label={t('seats.create.category')}
        onValueChange={() => setValue('entityId', '')}
        options={[
          { value: 'client', label: t('seats.category.client') },
          { value: 'agency', label: t('seats.category.agency') },
        ]}
      />

      <div>
        {options.length === 0 ? (
          <StaticField label={isAgency ? t('seats.create.agencyPick') : t('seats.create.clientPick')}>
            {isAgency ? t('seats.create.noneEligibleAgency') : t('seats.create.noneEligibleClient')}
          </StaticField>
        ) : (
          <SelectField
            control={control}
            name="entityId"
            label={isAgency ? t('seats.create.agencyPick') : t('seats.create.clientPick')}
            placeholder={isAgency ? t('seats.create.agencyPlaceholder') : t('seats.create.clientPlaceholder')}
            options={options.map((o) => ({ value: o.id, label: o.name }))}
            error={errors.entityId && t('common.required')}
          />
        )}
        <FieldMessage help={t('seats.create.nameHelp')} />
      </div>
    </FormModal>
  );
}
