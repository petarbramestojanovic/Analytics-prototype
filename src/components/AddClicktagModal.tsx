import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import { useAddClicktag } from '../hooks/useCampaigns';
import { useI18n } from '../lib/i18n';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './primitives';
import { Field } from '../views/auth/fields';

const schema = z.object({
  label: z.string().min(1, 'required'),
  url: z.string().url('invalid'),
});

type FormValues = z.infer<typeof schema>;

export default function AddClicktagModal({
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
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { label: '', url: '' } });

  const close = () => {
    onOpenChange(false);
    reset({ label: '', url: '' });
  };

  const onSubmit = (values: FormValues) => {
    addClicktag.mutate({ campaignId, clicktag: values }, { onSuccess: close });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('clicktag.addTitle')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Field label={t('clicktag.label')} {...register('label')} />
            {errors.label && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{t('common.required')}</p>}
          </div>
          <div>
            <Field label={t('clicktag.url')} placeholder="https://" {...register('url')} />
            {errors.url && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.url.message === 'invalid' ? 'https://…' : t('common.required')}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" type="button" onClick={close}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary" icon={<Plus size={13} />} disabled={addClicktag.isPending}>
              {addClicktag.isPending ? t('common.saving') : t('clicktag.add')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
