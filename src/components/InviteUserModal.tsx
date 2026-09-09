import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Send } from 'lucide-react';
import { useAddUser } from '../hooks/useCompanies';
import { useI18n } from '../lib/i18n';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger } from './ui/select';
import { Button } from './primitives';
import { Field } from '../views/auth/fields';

const schema = z.object({
  name: z.string().min(1, 'required'),
  email: z.string().email('invalid'),
  role: z.enum(['admin', 'viewer']),
});

type FormValues = z.infer<typeof schema>;

export default function InviteUserModal({
  companyId,
  companyName,
  open,
  onOpenChange,
}: {
  companyId: string;
  companyName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const addUser = useAddUser();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', role: 'viewer' },
  });

  const close = () => {
    onOpenChange(false);
    reset({ name: '', email: '', role: 'viewer' });
  };

  const onSubmit = (values: FormValues) => {
    addUser.mutate({ ...values, companyId }, { onSuccess: close });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('invite.title')}</DialogTitle>
          <DialogDescription>{t('invite.subtitle', { company: companyName })}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Field label={t('invite.name')} {...register('name')} />
            {errors.name && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{t('common.required')}</p>}
          </div>
          <div>
            <Field label={t('invite.email')} type="email" {...register('email')} />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{t('common.invalidEmail')}</p>
            )}
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-brame-dark dark:text-gray-200">
              {t('invite.role')}
            </span>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger />
                  <SelectContent>
                    <SelectItem value="admin">{t('invite.roleAdmin')}</SelectItem>
                    <SelectItem value="viewer">{t('invite.roleViewer')}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <span className="mt-1 block text-xs text-gray-400 dark:text-gray-500">{t('invite.roleHelp')}</span>
          </label>

          <DialogFooter>
            <Button variant="secondary" type="button" onClick={close}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary" icon={<Send size={13} />} disabled={addUser.isPending}>
              {addUser.isPending ? t('common.saving') : t('invite.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
