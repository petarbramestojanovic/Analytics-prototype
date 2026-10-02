import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Send } from 'lucide-react';
import { useI18n } from '@/i18n';
import { FormModal, SelectField, TextField } from '@/components/form';
import { useInviteSeatMember } from '@/api/hooks/useSeats';

const schema = z.object({
  name: z.string().min(1, 'required'),
  email: z.string().email('invalid'),
  role: z.enum(['admin', 'viewer']),
});

type FormValues = z.infer<typeof schema>;

const defaultValues: FormValues = { name: '', email: '', role: 'viewer' };

/** Invites always target one already-known seat — the "light" Users page and
 *  the full Seats directory both open this from a specific seat's own panel,
 *  so there's no seat picker here, unlike the old per-company version. */
export function InviteUserModal({
  seatId,
  seatName,
  open,
  onOpenChange,
}: {
  seatId: string;
  seatName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const inviteMember = useInviteSeatMember();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const close = () => {
    onOpenChange(false);
    reset(defaultValues);
  };

  const onSubmit = (values: FormValues) => {
    inviteMember.mutate({ ...values, seatId }, { onSuccess: close });
  };

  return (
    <FormModal
      open={open}
      onClose={close}
      title={t('invite.title')}
      description={t('invite.subtitle', { company: seatName })}
      onSubmit={handleSubmit(onSubmit)}
      submitLabel={t('invite.submit')}
      submitIcon={<Send size={13} />}
      pending={inviteMember.isPending}
    >
      <TextField
        label={t('invite.name')}
        placeholder={t('invite.namePlaceholder')}
        error={errors.name && t('common.required')}
        {...register('name')}
      />
      <TextField
        label={t('invite.email')}
        type="email"
        placeholder={t('invite.emailPlaceholder')}
        error={errors.email && t('common.invalidEmail')}
        {...register('email')}
      />

      <SelectField
        control={control}
        name="role"
        label={t('invite.role')}
        help={t('invite.roleHelp')}
        options={[
          { value: 'admin', label: t('invite.roleAdmin') },
          { value: 'viewer', label: t('invite.roleViewer') },
        ]}
      />
    </FormModal>
  );
}
