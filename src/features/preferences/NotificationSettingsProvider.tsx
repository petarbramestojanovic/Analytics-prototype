import type { ReactNode } from 'react';
import { STORAGE_KEYS } from '@/config/storageKeys';
import { usePersistentState } from '@/hooks/usePersistentState';
import { codecs } from '@/lib/storage';
import { NotificationSettingsContext } from './notificationSettingsContext';

export function NotificationSettingsProvider({ children }: { children: ReactNode }) {
  const [inboxAlerts, setInboxAlerts] = usePersistentState(STORAGE_KEYS.notifInboxAlerts, true, codecs.boolean);
  const [inboxReports, setInboxReports] = usePersistentState(STORAGE_KEYS.notifInboxReports, true, codecs.boolean);
  const [inboxInvitations, setInboxInvitations] = usePersistentState(STORAGE_KEYS.notifInboxInvitations, true, codecs.boolean);
  const [emailDigest, setEmailDigest] = usePersistentState(STORAGE_KEYS.notifEmailDigest, false, codecs.boolean);

  return (
    <NotificationSettingsContext.Provider
      value={{
        inboxAlerts,
        inboxReports,
        inboxInvitations,
        emailDigest,
        setInboxAlerts,
        setInboxReports,
        setInboxInvitations,
        setEmailDigest,
      }}
    >
      {children}
    </NotificationSettingsContext.Provider>
  );
}
