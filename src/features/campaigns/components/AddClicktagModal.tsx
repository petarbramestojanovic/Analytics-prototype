import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import { useI18n } from '@/i18n';
import { FormModal, TextField } from '@/components/form';
import { useAddClicktag } from '@/api/hooks/useCampaigns';

const schema = z.object({
  label: z.string().min(1, 'required'),
  url: z.string().url('invalid'),
});

type FormValues = z.infer<typeof schema>;

const defaultValues: FormValues = { label: '', url: '' };

export function AddClicktagModal({
  campaignId,
  open,
  onOpenChange,
}: {
  campaignId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const addClicktag = useAddClicktag();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues });

  const close = () => {
    onOpenChange(false);
    reset(defaultValues);
  };

  return (
    <FormModal
      open={open}
      onClose={close}
      title={t('clicktag.addTitle')}
      onSubmit={handleSubmit((clicktag) => addClicktag.mutate({ campaignId, clicktag }, { onSuccess: close }))}
      submitLabel={t('clicktag.add')}
      submitIcon={<Plus size={13} />}
      pending={addClicktag.isPending}
    >
      <TextField label={t('clicktag.label')} error={errors.label && t('common.required')} {...register('label')} />
      <TextField
        label={t('clicktag.url')}
        placeholder="https://"
        error={errors.url && (errors.url.message === 'invalid' ? 'https://…' : t('common.required'))}
        {...register('url')}
      />
    </FormModal>
  );
}
