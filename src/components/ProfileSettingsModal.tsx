import { useRef, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Camera, Lock, Save, Trash2 } from 'lucide-react';
import { useSession, defaultPerson } from '../lib/session';
import { useProfile } from '../lib/profile';
import { useI18n } from '../lib/i18n';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button, Pill } from './primitives';
import { Field } from '../views/auth/fields';
import Avatar from './Avatar';

const schema = z.object({ name: z.string().min(1, 'required') });
type FormValues = z.infer<typeof schema>;

export default function ProfileSettingsModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const { role, companyId, companyName, isInternal } = useSession();
  const { customName, avatarDataUrl, setCustomName, setAvatarDataUrl } = useProfile();
  const fileRef = useRef<HTMLInputElement>(null);

  const base = defaultPerson(role, companyId);
  const displayName = customName ?? base.name;
  const org = role === 'sales' ? t('topbar.brameSales') : isInternal ? t('topbar.brameInternal') : companyName;

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema), values: { name: displayName } });

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarDataUrl(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const onSubmit = (values: FormValues) => {
    const trimmed = values.name.trim();
    setCustomName(trimmed === base.name ? null : trimmed);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('profile.title')}</DialogTitle>
          <DialogDescription>{t('profile.subtitle')}</DialogDescription>
        </DialogHeader>

        <div className="mb-5 flex items-center gap-4">
          <Avatar name={displayName} imageUrl={avatarDataUrl} size={64} />
          <div className="flex flex-col items-start gap-2">
            <div className="flex gap-2">
              <Button type="button" size="sm" icon={<Camera size={12} />} onClick={() => fileRef.current?.click()}>
                {t('profile.uploadPhoto')}
              </Button>
              {avatarDataUrl && (
                <Button type="button" size="sm" variant="ghost" icon={<Trash2 size={12} />} onClick={() => setAvatarDataUrl(null)}>
                  {t('profile.removePhoto')}
                </Button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Field label={t('profile.name')} {...register('name')} />
            {errors.name && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{t('common.required')}</p>}
          </div>

          {/* Read-only, styled like the Salesforce-owned fields in Campaign
              setup — the same "you can't edit this here" language. */}
          <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 px-3 py-2 dark:border-white/10">
            <span className="text-sm text-gray-500 dark:text-gray-400">{t('profile.email')}</span>
            <span className="flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400">
              {base.email || '—'}
              <Lock size={11} className="text-gray-300 dark:text-gray-600" />
            </span>
          </div>
          <div>
            <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 px-3 py-2 dark:border-white/10">
              <span className="text-sm text-gray-500 dark:text-gray-400">{t('profile.company')}</span>
              <span className="flex items-center gap-1.5">
                <Pill tone={isInternal && role !== 'sales' ? 'purple' : 'teal'}>{org}</Pill>
                <Lock size={11} className="text-gray-300 dark:text-gray-600" />
              </span>
            </div>
            <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">{t('profile.companyHelp')}</p>
          </div>

          <DialogFooter>
            <Button variant="secondary" type="button" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary" icon={<Save size={13} />} disabled={!isDirty}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
