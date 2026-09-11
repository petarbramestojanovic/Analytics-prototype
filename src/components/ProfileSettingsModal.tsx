import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Bell,
  Camera,
  Laptop,
  Lock,
  LogOut,
  Save,
  ShieldCheck,
  Smartphone,
  SlidersHorizontal,
  Trash2,
  User,
} from 'lucide-react';
import { useSession, defaultPerson } from '../lib/session';
import { useProfile } from '../lib/profile';
import { useI18n } from '../lib/i18n';
import { useNotificationSettings } from '../lib/notificationSettings';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button, Pill, SegmentedControl, Switch } from './primitives';
import { Field, PasswordField } from '../views/auth/fields';
import { LanguageSwitch, ThemeToggleButton } from './Switches';
import Avatar from './Avatar';
import ConfirmDialog from './ConfirmDialog';

const schema = z.object({ name: z.string().min(1, 'required') });
type FormValues = z.infer<typeof schema>;

type Tab = 'profile' | 'preferences' | 'notifications' | 'security';

interface MockSession {
  id: string;
  device: string;
  kind: 'desktop' | 'mobile';
  location: string;
  /** Reuses the existing time.* i18n keys (see lib/i18n.tsx useFormatters) rather than inventing new ones. */
  lastActive: { key: string; n?: number };
  current?: boolean;
}

const INITIAL_SESSIONS: MockSession[] = [
  { id: 'current', device: 'Chrome on macOS', kind: 'desktop', location: 'Zurich, CH', lastActive: { key: 'time.justNow' }, current: true },
  { id: 's2', device: 'Safari on iPhone', kind: 'mobile', location: 'Zurich, CH', lastActive: { key: 'time.hAgo', n: 2 } },
  { id: 's3', device: 'Chrome on Windows', kind: 'desktop', location: 'Bern, CH', lastActive: { key: 'time.dAgo', n: 3 } },
];

export default function ProfileSettingsModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { role, companyId, companyName, isInternal } = useSession();
  const { customName, avatarDataUrl, setCustomName, setAvatarDataUrl } = useProfile();
  const notifications = useNotificationSettings();
  const fileRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('profile');
  const [sessions, setSessions] = useState(INITIAL_SESSIONS);
  const [logOutAllOpen, setLogOutAllOpen] = useState(false);

  useEffect(() => {
    if (open) setTab('profile');
  }, [open]);

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

  const tabOptions: { value: Tab; label: string; icon: ReactNode }[] = [
    { value: 'profile', label: t('profile.tabs.profile'), icon: <User size={13} /> },
    { value: 'preferences', label: t('profile.tabs.preferences'), icon: <SlidersHorizontal size={13} /> },
    { value: 'notifications', label: t('profile.tabs.notifications'), icon: <Bell size={13} /> },
    { value: 'security', label: t('profile.tabs.security'), icon: <ShieldCheck size={13} /> },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Fixed height so switching tabs never resizes the dialog — only the
          middle section scrolls when a tab's content runs long. */}
      <DialogContent className="flex h-[min(680px,85vh)] max-w-lg flex-col p-0">
        <div className="shrink-0 px-6 pb-4 pt-6">
          <DialogHeader>
            <DialogTitle>{t('profile.title')}</DialogTitle>
            <DialogDescription>{t('profile.subtitle')}</DialogDescription>
          </DialogHeader>

          <SegmentedControl
            value={tab}
            onChange={setTab}
            groupLabel={t('profile.title')}
            className="grid grid-cols-4 gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-white/10 dark:bg-white/5"
            indicatorClassName="rounded-lg bg-white shadow-sm dark:bg-brame-dark-light"
            itemClassName="flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors"
            activeItemClassName="text-brame-dark dark:text-white"
            inactiveItemClassName="text-gray-500 hover:text-brame-dark dark:text-gray-400 dark:hover:text-gray-100"
            options={tabOptions.map((o) => ({
              value: o.value,
              label: (
                <span className="flex items-center gap-1.5">
                  {o.icon}
                  <span className="hidden sm:inline">{o.label}</span>
                </span>
              ),
            }))}
          />
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-2">
        {tab === 'profile' && (
          <form id="profile-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar name={displayName} imageUrl={avatarDataUrl} size={64} />
              <div className="flex flex-col items-start gap-2">
                <div className="flex gap-2">
                  <Button type="button" size="sm" icon={<Camera size={12} />} onClick={() => fileRef.current?.click()}>
                    {t('profile.uploadPhoto')}
                  </Button>
                  {avatarDataUrl && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      icon={<Trash2 size={12} />}
                      onClick={() => setAvatarDataUrl(null)}
                    >
                      {t('profile.removePhoto')}
                    </Button>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
              </div>
            </div>

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
          </form>
        )}

        {tab === 'preferences' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 px-3 py-2.5 dark:border-white/10">
              <div>
                <div className="text-sm font-medium text-brame-dark dark:text-gray-100">{t('profile.preferences.theme')}</div>
                <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{t('profile.preferences.themeHint')}</p>
              </div>
              <ThemeToggleButton />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 px-3 py-2.5 dark:border-white/10">
              <div>
                <div className="text-sm font-medium text-brame-dark dark:text-gray-100">{t('profile.preferences.language')}</div>
                <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{t('profile.preferences.languageHint')}</p>
              </div>
              <LanguageSwitch />
            </div>
            <p className="pt-1 text-xs text-gray-400 dark:text-gray-500">{t('profile.preferences.appliesHere')}</p>
          </div>
        )}

        {tab === 'notifications' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 px-3 py-2.5 dark:border-white/10">
              <div className="pr-4">
                <div className="text-sm font-medium text-brame-dark dark:text-gray-100">
                  {t('profile.notifications.emailDigest')}
                </div>
                <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                  {t('profile.notifications.emailDigestHint')}
                </p>
              </div>
              <Switch
                checked={notifications.emailDigest}
                onChange={notifications.setEmailDigest}
                label={t('profile.notifications.emailDigest')}
              />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 px-3 py-2.5 dark:border-white/10">
              <div className="pr-4">
                <div className="text-sm font-medium text-brame-dark dark:text-gray-100">
                  {t('profile.notifications.alertBreach')}
                </div>
                <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                  {t('profile.notifications.alertBreachHint')}
                </p>
              </div>
              <Switch
                checked={notifications.alertBreach}
                onChange={notifications.setAlertBreach}
                label={t('profile.notifications.alertBreach')}
              />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 px-3 py-2.5 dark:border-white/10">
              <div className="pr-4">
                <div className="text-sm font-medium text-brame-dark dark:text-gray-100">
                  {t('profile.notifications.reportDelivery')}
                </div>
                <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                  {t('profile.notifications.reportDeliveryHint')}
                </p>
              </div>
              <Switch
                checked={notifications.reportDelivery}
                onChange={notifications.setReportDelivery}
                label={t('profile.notifications.reportDelivery')}
              />
            </div>
            <p className="pt-1 text-xs text-gray-400 dark:text-gray-500">{t('profile.notifications.demoNote')}</p>
          </div>
        )}

        {tab === 'security' && (
          <div className="space-y-5">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-brame-dark dark:text-gray-100">
                  {t('profile.security.password')}
                </span>
                <Lock size={11} className="text-gray-300 dark:text-gray-600" />
              </div>
              <div className="space-y-2">
                <PasswordField label={t('profile.security.currentPassword')} autoComplete="current-password" />
                <PasswordField label={t('profile.security.newPassword')} autoComplete="new-password" />
                <PasswordField label={t('profile.security.confirmPassword')} autoComplete="new-password" />
              </div>
              <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">{t('profile.security.passwordHint')}</p>
            </div>

            <div>
              <span className="mb-2 block text-sm font-medium text-brame-dark dark:text-gray-100">
                {t('profile.security.sessions')}
              </span>
              <div className="space-y-2">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2.5 dark:border-white/10"
                  >
                    <div className="flex items-center gap-2.5">
                      {s.kind === 'desktop' ? (
                        <Laptop size={15} className="text-gray-400 dark:text-gray-500" />
                      ) : (
                        <Smartphone size={15} className="text-gray-400 dark:text-gray-500" />
                      )}
                      <div>
                        <div className="flex items-center gap-1.5 text-sm font-medium text-brame-dark dark:text-gray-100">
                          {s.device}
                          {s.current && <Pill tone="teal">{t('profile.security.thisDevice')}</Pill>}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          {s.location} · {t(s.lastActive.key, s.lastActive.n !== undefined ? { n: s.lastActive.n } : undefined)}
                        </div>
                      </div>
                    </div>
                    {!s.current && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSessions((prev) => prev.filter((x) => x.id !== s.id))}
                      >
                        {t('profile.security.logOutSession')}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">{t('profile.security.sessionsHint')}</p>
            </div>
          </div>
        )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-gray-200 px-6 py-4 dark:border-white/10">
          <div>
            {tab === 'security' && (
              <Button
                type="button"
                variant="secondary"
                icon={<LogOut size={13} />}
                onClick={() => setLogOutAllOpen(true)}
              >
                {t('profile.security.logOutAll')}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" type="button" onClick={() => onOpenChange(false)}>
              {tab === 'profile' ? t('common.cancel') : t('common.close')}
            </Button>
            {tab === 'profile' && (
              <Button type="submit" form="profile-form" variant="primary" icon={<Save size={13} />} disabled={!isDirty}>
                {t('common.save')}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>

      <ConfirmDialog
        open={logOutAllOpen}
        onOpenChange={setLogOutAllOpen}
        title={t('profile.security.logOutAllConfirmTitle')}
        description={t('profile.security.logOutAllConfirmBody')}
        confirmLabel={t('profile.security.logOutAll')}
        onConfirm={() => {
          setLogOutAllOpen(false);
          onOpenChange(false);
          navigate('/login');
        }}
      />
    </Dialog>
  );
}
