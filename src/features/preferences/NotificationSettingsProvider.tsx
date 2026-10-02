import type { ReactNode } from 'react';
import { STORAGE_KEYS } from '@/config/storageKeys';
import { usePersistentState } from '@/hooks/usePersistentState';
import { codecs } from '@/lib/storage';
import { NotificationSettingsContext } from './notificationSettingsContext';

export function NotificationSettingsProvider({ children }: { children: ReactNode }) {
  const [emailDigest, setEmailDigest] = usePersistentState(STORAGE_KEYS.notifEmailDigest, true, codecs.boolean);
  const [alertBreach, setAlertBreach] = usePersistentState(STORAGE_KEYS.notifAlertBreach, true, codecs.boolean);
  const [reportDelivery, setReportDelivery] = usePersistentState(STORAGE_KEYS.notifReportDelivery, false, codecs.boolean);

  return (
    <NotificationSettingsContext.Provider
      value={{ emailDigest, alertBreach, reportDelivery, setEmailDigest, setAlertBreach, setReportDelivery }}
    >
      {children}
    </NotificationSettingsContext.Provider>
  );
}
