import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, LogOut, Save, ShieldCheck, SlidersHorizontal, User } from 'lucide-react';
import { paths } from '@/config/paths';
import { useI18n } from '@/i18n';
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Tabs } from '@/components/ui';
import { ConfirmDialog } from '@/components/feedback';
import { NotificationsTab } from './tabs/NotificationsTab';
import { PreferencesTab } from './tabs/PreferencesTab';
import { PROFILE_FORM_ID, ProfileTab } from './tabs/ProfileTab';
import { SecurityTab } from './tabs/SecurityTab';

type Tab = 'profile' | 'preferences' | 'notifications' | 'security';

export function ProfileSettingsModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('profile');
  const [profileDirty, setProfileDirty] = useState(false);
  const [logOutAllOpen, setLogOutAllOpen] = useState(false);

  useEffect(() => {
    if (open) setTab('profile');
  }, [open]);

  const tabs: { value: Tab; label: string; icon: ReactNode }[] = [
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

          <Tabs
            columns={4}
            value={tab}
            onChange={setTab}
            groupLabel={t('profile.title')}
            options={tabs.map((o) => ({
              value: o.value,
              label: (
                <>
                  {o.icon}
                  <span className="hidden sm:inline">{o.label}</span>
                </>
              ),
            }))}
          />
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-2">
          {tab === 'profile' && <ProfileTab onSaved={() => onOpenChange(false)} onDirtyChange={setProfileDirty} />}
          {tab === 'preferences' && <PreferencesTab />}
          {tab === 'notifications' && <NotificationsTab />}
          {tab === 'security' && <SecurityTab />}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-gray-200 px-6 py-4 dark:border-white/10">
          <div>
            {tab === 'security' && (
              <Button icon={<LogOut size={13} />} onClick={() => setLogOutAllOpen(true)}>
                {t('profile.security.logOutAll')}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => onOpenChange(false)}>{tab === 'profile' ? t('common.cancel') : t('common.close')}</Button>
            {tab === 'profile' && (
              <Button type="submit" form={PROFILE_FORM_ID} variant="primary" icon={<Save size={13} />} disabled={!profileDirty}>
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
          navigate(paths.login);
        }}
      />
    </Dialog>
  );
}
