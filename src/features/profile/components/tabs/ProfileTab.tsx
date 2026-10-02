import { useEffect, useRef, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Camera, Trash2 } from 'lucide-react';
import { useI18n } from '@/i18n';
import { EMPTY_VALUE } from '@/lib/format';
import { Avatar, Button, Pill } from '@/components/ui';
import { TextField } from '@/components/form';
import { ReadOnlyRow } from '@/components/display';
import { useSession } from '@/features/session';
import { useProfile } from '../../profileContext';
import { useCurrentUser } from '../../useCurrentUser';

/** The dialog footer's Save button submits this form by id. */
export const PROFILE_FORM_ID = 'profile-form';

const schema = z.object({ name: z.string().min(1, 'required') });
type FormValues = z.infer<typeof schema>;

export function ProfileTab({ onSaved, onDirtyChange }: { onSaved: () => void; onDirtyChange: (dirty: boolean) => void }) {
  const { t } = useI18n();
  const { isInternal, seatCategory } = useSession();
  const { setCustomName, setAvatarDataUrl } = useProfile();
  const user = useCurrentUser();
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema), values: { name: user.name } });

  useEffect(() => onDirtyChange(isDirty), [isDirty, onDirtyChange]);

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarDataUrl(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const onSubmit = ({ name }: FormValues) => {
    const trimmed = name.trim();
    setCustomName(trimmed === user.defaultName ? null : trimmed);
    onSaved();
  };

  return (
    <form id={PROFILE_FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="flex items-center gap-4">
        <Avatar name={user.name} imageUrl={user.avatarUrl} size={64} />
        <div className="flex gap-2">
          <Button size="sm" icon={<Camera size={12} />} onClick={() => fileRef.current?.click()}>
            {t('profile.uploadPhoto')}
          </Button>
          {user.avatarUrl && (
            <Button size="sm" variant="ghost" icon={<Trash2 size={12} />} onClick={() => setAvatarDataUrl(null)}>
              {t('profile.removePhoto')}
            </Button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
      </div>

      <TextField label={t('profile.name')} error={errors.name && t('common.required')} {...register('name')} />

      {/* Read-only, styled like the Salesforce-owned fields in Campaign
          setup — the same "you can't edit this here" language. */}
      <ReadOnlyRow boxed label={t('profile.email')} value={user.email || EMPTY_VALUE} />
      <div>
        <ReadOnlyRow
          boxed
          label={t('profile.company')}
          value={<Pill tone={isInternal && seatCategory !== 'brame' ? 'purple' : 'teal'}>{user.scopeLabel}</Pill>}
        />
        <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">{t('profile.companyHelp')}</p>
      </div>
    </form>
  );
}
