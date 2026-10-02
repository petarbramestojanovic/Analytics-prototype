import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyRound } from 'lucide-react';
import { useI18n } from '@/i18n';
import { FormModal, SelectField, TextField } from '@/components/form';
import type { ApiKey } from '@/types';
import { useCreateApiKey } from '@/api/hooks/useApiKeys';
import { EXPIRY_CHOICES, EXPIRY_DAYS } from '../lib/apiKeys';

const schema = z.object({
  name: z.string().trim().min(1, 'required').max(60),
  expiry: z.enum(EXPIRY_CHOICES),
});

type FormValues = z.infer<typeof schema>;

const defaultValues: FormValues = { name: '', expiry: '365' };

/** Creates a key for one already-known seat. The secret comes back exactly
 *  once, in `onCreated` — the caller is responsible for showing it before it's gone. */
export function CreateApiKeyModal({
  seatId,
  seatName,
  createdBy,
  open,
  onOpenChange,
  onCreated,
}: {
  seatId: string;
  seatName: string;
  createdBy: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (result: { key: ApiKey; secret: string }) => void;
}) {
  const { t } = useI18n();
  const createKey = useCreateApiKey();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues });

  const close = () => {
    onOpenChange(false);
    reset(defaultValues);
  };

  const onSubmit = (values: FormValues) => {
    createKey.mutate(
      { seatId, name: values.name, createdBy, expiresInDays: EXPIRY_DAYS[values.expiry] },
      {
        onSuccess: (result) => {
          close();
          onCreated(result);
        },
      }
    );
  };

  return (
    <FormModal
      open={open}
      onClose={close}
      title={t('apiAccess.create.title')}
      description={t('apiAccess.create.subtitle', { seat: seatName })}
      onSubmit={handleSubmit(onSubmit)}
      submitLabel={t('apiAccess.create.submit')}
      submitIcon={<KeyRound size={13} />}
      pending={createKey.isPending}
    >
      <TextField
        label={t('apiAccess.create.name')}
        placeholder={t('apiAccess.create.namePlaceholder')}
        maxLength={60}
        error={errors.name && t('common.required')}
        help={t('apiAccess.create.nameHelp')}
        {...register('name')}
      />

      <SelectField
        control={control}
        name="expiry"
        label={t('apiAccess.create.expiry')}
        help={t('apiAccess.create.expiryHelp')}
        options={EXPIRY_CHOICES.map((value) => ({ value, label: t(`apiAccess.create.expiry.${value}`) }))}
      />
    </FormModal>
  );
}
